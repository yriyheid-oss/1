import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface BatchResult {
  mergedCount: number;
  chunkCount: number;
  disposableGeos: THREE.BufferGeometry[];
}

function isProtectedSubtree(obj: THREE.Object3D, stopAt: THREE.Object3D): boolean {
  let curr: THREE.Object3D | null = obj;
  while (curr) {
    if (curr.userData?.noBatch === true || curr.userData?.stealableFish === true) {
      return true;
    }
    if (curr === stopAt) break;
    curr = curr.parent;
  }
  return false;
}

function normalizeForMerge(
  srcGeo: THREE.BufferGeometry,
  relMatrix: THREE.Matrix4,
  keepColor: boolean
): THREE.BufferGeometry {
  let g = srcGeo.clone();
  g.applyMatrix4(relMatrix);
  if (g.index) {
    const nonIdx = g.toNonIndexed();
    g.dispose();
    g = nonIdx;
  }

  for (const attrName of Object.keys(g.attributes)) {
    if (
      attrName !== 'position' &&
      attrName !== 'normal' &&
      attrName !== 'uv' &&
      !(keepColor && attrName === 'color')
    ) {
      g.deleteAttribute(attrName);
    }
  }

  if (!g.getAttribute('normal')) {
    g.computeVertexNormals();
  }

  const posAttr = g.getAttribute('position');
  const vertCount = posAttr ? posAttr.count : 0;

  if (!g.getAttribute('uv') && vertCount > 0) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(vertCount * 2), 2));
  }

  if (keepColor && !g.getAttribute('color') && vertCount > 0) {
    const cols = new Float32Array(vertCount * 3);
    cols.fill(1);
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }

  return g;
}

/**
 * Merges static opaque/transparent meshes inside `root` grouped by material UUID, shadow flags,
 * and 64m XZ spatial chunks so frustum culling stays effective while collapsing draw calls by >15x.
 * Any object (or ancestor) marked `userData.noBatch = true` or `userData.stealableFish = true` is untouched.
 */
export function batchStaticGroupByMaterial(root: THREE.Object3D, cellSize = 64): BatchResult {
  root.updateWorldMatrix(true, true);
  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const relMatrix = new THREE.Matrix4();
  const worldBox = new THREE.Box3();
  const center = new THREE.Vector3();

  interface Bucket {
    material: THREE.Material;
    castShadow: boolean;
    receiveShadow: boolean;
    vertexColors: boolean;
    meshes: THREE.Mesh[];
  }

  const buckets = new Map<string, Bucket>();

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!obj.visible) return;
    if (isProtectedSubtree(obj, root)) return;

    const mat = obj.material;
    if (Array.isArray(mat) || !mat || mat instanceof THREE.ShaderMaterial) return;
    if (!obj.geometry || !obj.geometry.getAttribute('position')) return;

    if (!obj.geometry.boundingBox) {
      obj.geometry.computeBoundingBox();
    }
    if (obj.geometry.boundingBox) {
      worldBox.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
      worldBox.getCenter(center);
    } else {
      center.setFromMatrixPosition(obj.matrixWorld);
    }

    const cx = Math.floor(center.x / cellSize);
    const cz = Math.floor(center.z / cellSize);
    const vtxCol = Boolean((mat as THREE.MeshStandardMaterial).vertexColors);
    const key = `${mat.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}|${vtxCol ? 1 : 0}|${cx}|${cz}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        material: mat,
        castShadow: obj.castShadow,
        receiveShadow: obj.receiveShadow,
        vertexColors: vtxCol,
        meshes: [],
      };
      buckets.set(key, bucket);
    }
    bucket.meshes.push(obj);
  });

  const disposableGeos: THREE.BufferGeometry[] = [];
  let mergedCount = 0;
  let chunkCount = 0;

  for (const bucket of buckets.values()) {
    if (bucket.meshes.length < 2) continue;

    const prepared: THREE.BufferGeometry[] = [];
    for (const mesh of bucket.meshes) {
      relMatrix.multiplyMatrices(invRoot, mesh.matrixWorld);
      prepared.push(normalizeForMerge(mesh.geometry, relMatrix, bucket.vertexColors));
    }

    const merged = mergeGeometries(prepared, false);
    for (const pg of prepared) {
      pg.dispose();
    }
    if (!merged) continue;

    merged.computeBoundingSphere();
    const mergedMesh = new THREE.Mesh(merged, bucket.material);
    mergedMesh.castShadow = bucket.castShadow;
    mergedMesh.receiveShadow = bucket.receiveShadow;
    mergedMesh.userData.batchedChunk = true;
    root.add(mergedMesh);
    disposableGeos.push(merged);
    chunkCount++;

    for (const orig of bucket.meshes) {
      const parent = orig.parent;
      if (parent) {
        parent.remove(orig);
        // Prune empty non-protected helper groups so the scene graph stays tiny
        let check: THREE.Object3D | null = parent;
        while (check && check !== root && check.children.length === 0 && !check.userData?.noBatch) {
          const up: THREE.Object3D | null = check.parent;
          if (up) up.remove(check);
          check = up;
        }
      }
      mergedCount++;
    }
  }

  return { mergedCount, chunkCount, disposableGeos };
}
