import * as THREE from 'three';
import type { WorldMaterialSet } from './materials';

export interface HarborPropAssets {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

export function createHarborPropAssets(): HarborPropAssets {
  // Tapered organic fusiform fish body via LatheGeometry
  const fishProfile = [
    new THREE.Vector2(0.001, 0.16),
    new THREE.Vector2(0.032, 0.115),
    new THREE.Vector2(0.046, 0.035),
    new THREE.Vector2(0.038, -0.05),
    new THREE.Vector2(0.018, -0.13),
    new THREE.Vector2(0.006, -0.16),
  ];
  const fishBodyGeo = new THREE.LatheGeometry(fishProfile, 12);
  fishBodyGeo.rotateZ(-Math.PI * 0.5);
  fishBodyGeo.scale(1.0, 0.52, 1.05);

  const tailLobeGeo = new THREE.BoxGeometry(0.08, 0.01, 0.032);
  const dorsalFinGeo = new THREE.ConeGeometry(0.028, 0.052, 3);
  dorsalFinGeo.scale(1.3, 1.0, 0.28);

  const silverFishMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9EC0C8'),
    roughness: 0.14,
    metalness: 0.42,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
  });
  const mackerelFishMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#5A8290'),
    roughness: 0.16,
    metalness: 0.36,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });
  const wickerMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8F663C'),
    roughness: 0.92,
    metalness: 0.02,
  });
  const wickerDarkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5E4024'),
    roughness: 0.94,
    metalness: 0.02,
  });
  const oakBoardMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#9F7449'),
    roughness: 0.72,
    metalness: 0.02,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#B59467'),
    roughness: 0.92,
    metalness: 0.0,
  });
  const floatRedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D14B34'),
    roughness: 0.42,
    metalness: 0.04,
  });
  const floatWhiteMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#E8E1D3'),
    roughness: 0.42,
    metalness: 0.04,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#BAC5C8'),
    roughness: 0.22,
    metalness: 0.88,
  });

  return {
    geometries: [fishBodyGeo, tailLobeGeo, dorsalFinGeo],
    materials: [
      silverFishMat,
      mackerelFishMat,
      wickerMat,
      ropeMat,
      floatRedMat,
      floatWhiteMat,
      steelMat,
      wickerDarkMat,
      oakBoardMat,
    ],
  };
}

export function makeSingleFishMesh(assets: HarborPropAssets, altTint = false): THREE.Group {
  const g = new THREE.Group();
  const [bodyGeo, tailLobeGeo, dorsalGeo] = assets.geometries;
  const mat = altTint ? assets.materials[1] : assets.materials[0];

  const body = new THREE.Mesh(bodyGeo, mat);
  body.castShadow = true;
  g.add(body);

  // Forked V-tail fin seamlessly anchored into the narrow tail peduncle (x = -0.15)
  for (const side of [-1, 1]) {
    const lobe = new THREE.Mesh(tailLobeGeo, mat);
    lobe.position.set(-0.155, 0, side * 0.014);
    lobe.rotation.y = side * 0.46;
    g.add(lobe);
  }

  const dorsal = new THREE.Mesh(dorsalGeo, mat);
  dorsal.position.set(0.01, 0, -0.026);
  dorsal.rotation.x = -Math.PI * 0.5;
  dorsal.rotation.z = 0.18;
  g.add(dorsal);

  g.userData.stealableFish = true;
  return g;
}

export function collectStealableFishMeshes(root: THREE.Object3D): THREE.Object3D[] {
  const list: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData.stealableFish) list.push(obj);
  });
  return list;
}

/**
 * Weathered timber filleting table / stand with oak cutting board, fresh catch fish & steel cleaver.
 */
export function buildFishCuttingBoard(
  mats: WorldMaterialSet,
  assets: HarborPropAssets,
  onTable = true
): THREE.Group {
  const g = new THREE.Group();
  const tableH = onTable ? 0.64 : 0.0;

  if (onTable) {
    const legGeo = new THREE.BoxGeometry(0.08, 0.62, 0.08);
    assets.geometries.push(legGeo);
    for (const sx of [-0.52, 0.52]) {
      for (const sz of [-0.28, 0.28]) {
        const leg = new THREE.Mesh(legGeo, mats.woodCatwalk);
        leg.position.set(sx, 0.31, sz);
        leg.castShadow = true;
        g.add(leg);
      }
    }

    const topGeo = new THREE.BoxGeometry(1.24, 0.07, 0.72);
    assets.geometries.push(topGeo);
    const tableTop = new THREE.Mesh(topGeo, mats.woodCatwalk);
    tableTop.position.y = 0.62;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    g.add(tableTop);
  }

  // Thick oak butcher/cutting board plank resting cleanly on surface
  const boardGeo = new THREE.BoxGeometry(0.76, 0.045, 0.44);
  const handleGeo = new THREE.BoxGeometry(0.12, 0.036, 0.1);
  assets.geometries.push(boardGeo, handleGeo);

  const oakMat = assets.materials[8];
  const board = new THREE.Mesh(boardGeo, oakMat);
  board.position.set(-0.08, tableH + 0.04, 0);
  board.rotation.y = 0.06;
  board.castShadow = true;
  board.receiveShadow = true;
  g.add(board);

  const boardHandle = new THREE.Mesh(handleGeo, oakMat);
  boardHandle.position.set(-0.5, tableH + 0.038, 0.02);
  boardHandle.rotation.y = 0.06;
  g.add(boardHandle);

  // Two fresh whole fish laid across the board
  const fish1 = makeSingleFishMesh(assets, false);
  fish1.position.set(-0.1, tableH + 0.088, -0.075);
  fish1.rotation.y = 0.18;
  fish1.scale.setScalar(1.12);
  g.add(fish1);

  const fish2 = makeSingleFishMesh(assets, true);
  fish2.position.set(-0.04, tableH + 0.086, 0.09);
  fish2.rotation.y = -0.14;
  fish2.scale.setScalar(0.98);
  g.add(fish2);

  // Filleting knife / cleaver beside the fish
  const bladeGeo = new THREE.BoxGeometry(0.18, 0.012, 0.055);
  const hiltGeo = new THREE.CylinderGeometry(0.015, 0.017, 0.1, 8);
  hiltGeo.rotateZ(Math.PI * 0.5);
  assets.geometries.push(bladeGeo, hiltGeo);

  const blade = new THREE.Mesh(bladeGeo, assets.materials[6]);
  blade.position.set(0.32, tableH + 0.05, 0.04);
  blade.rotation.y = 0.65;
  g.add(blade);

  const hilt = new THREE.Mesh(hiltGeo, mats.darkIron);
  hilt.position.set(0.41, tableH + 0.052, -0.03);
  hilt.rotation.y = 0.65;
  g.add(hilt);

  return g;
}

/**
 * Woven wicker fish basket with braided reed rings, vertical ribs, dark seaweed bed & gleaming fish.
 */
export function buildFishBasket(
  mats: WorldMaterialSet,
  assets: HarborPropAssets
): THREE.Group {
  const g = new THREE.Group();
  const wickerMat = assets.materials[2];
  const wickerDarkMat = assets.materials[7];

  const basketGeo = new THREE.CylinderGeometry(0.28, 0.2, 0.34, 14);
  const rimGeo = new THREE.TorusGeometry(0.295, 0.032, 8, 18);
  const ringGeo = new THREE.TorusGeometry(0.245, 0.018, 6, 16);
  const ribGeo = new THREE.BoxGeometry(0.026, 0.34, 0.022);
  const bedGeo = new THREE.CylinderGeometry(0.25, 0.23, 0.05, 12);
  assets.geometries.push(basketGeo, rimGeo, ringGeo, ribGeo, bedGeo);

  const basket = new THREE.Mesh(basketGeo, wickerMat);
  basket.position.y = 0.17;
  basket.castShadow = true;
  basket.receiveShadow = true;
  g.add(basket);

  // Horizontal woven wicker bands
  for (let w = 0; w < 4; w++) {
    const band = new THREE.Mesh(ringGeo, w % 2 === 0 ? wickerDarkMat : wickerMat);
    band.rotation.x = Math.PI * 0.5;
    band.position.y = 0.06 + w * 0.08;
    const s = 0.86 + w * 0.095;
    band.scale.setScalar(s);
    g.add(band);
  }

  // Vertical wicker stave ribs around exterior
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const stave = new THREE.Mesh(ribGeo, wickerDarkMat);
    stave.position.set(Math.cos(ang) * 0.245, 0.17, Math.sin(ang) * 0.245);
    stave.rotation.y = -ang;
    g.add(stave);
  }

  const rim = new THREE.Mesh(rimGeo, wickerMat);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 0.35;
  g.add(rim);

  const iceBed = new THREE.Mesh(bedGeo, mats.mossFoliage);
  iceBed.position.y = 0.32;
  g.add(iceBed);

  // 5 Fish peeking out at lively angles
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2 + 0.3;
    const f = makeSingleFishMesh(assets, i % 2 === 1);
    f.position.set(Math.cos(ang) * 0.075, 0.36 + (i % 2) * 0.03, Math.sin(ang) * 0.075);
    f.rotation.y = ang;
    f.rotation.z = 0.72 + (i % 3) * 0.1;
    f.scale.setScalar(0.92 + (i % 2) * 0.14);
    g.add(f);
  }

  return g;
}

/**
 * Dockside fishing tackle set: wooden tackle chest, leaning bamboo rods with brass reels, coiled hemp rope, and red-white cork floats.
 */
export function buildFishingTackleSet(
  mats: WorldMaterialSet,
  assets: HarborPropAssets
): THREE.Group {
  const g = new THREE.Group();
  const ropeMat = assets.materials[3];
  const floatRedMat = assets.materials[4];
  const floatWhiteMat = assets.materials[5];

  // 1. Weathered wooden tackle box with brass clasps
  const boxGeo = new THREE.BoxGeometry(0.52, 0.28, 0.3);
  const latchGeo = new THREE.BoxGeometry(0.06, 0.06, 0.03);
  assets.geometries.push(boxGeo, latchGeo);

  const tackleBox = new THREE.Mesh(boxGeo, mats.woodCatwalk);
  tackleBox.position.set(0, 0.14, 0);
  tackleBox.castShadow = true;
  tackleBox.receiveShadow = true;
  g.add(tackleBox);

  for (const sx of [-0.14, 0.14]) {
    const latch = new THREE.Mesh(latchGeo, mats.brassTrim);
    latch.position.set(sx, 0.22, 0.16);
    g.add(latch);
  }

  // Spare red-and-white cork bobbers on top of tackle box
  const bobTopGeo = new THREE.SphereGeometry(0.038, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const bobBotGeo = new THREE.SphereGeometry(0.038, 10, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  assets.geometries.push(bobTopGeo, bobBotGeo);

  for (let i = 0; i < 2; i++) {
    const bx = -0.1 + i * 0.16;
    const bTop = new THREE.Mesh(bobTopGeo, floatRedMat);
    bTop.position.set(bx, 0.31, 0.03);
    g.add(bTop);

    const bBot = new THREE.Mesh(bobBotGeo, floatWhiteMat);
    bBot.position.set(bx, 0.31, 0.03);
    g.add(bBot);
  }

  // 2. Coiled hemp fishing rope stack beside the box
  const coilGeo = new THREE.TorusGeometry(0.18, 0.038, 8, 18);
  assets.geometries.push(coilGeo);
  for (let layer = 0; layer < 3; layer++) {
    const coil = new THREE.Mesh(coilGeo, ropeMat);
    coil.rotation.x = Math.PI * 0.5;
    coil.position.set(0.46, 0.038 + layer * 0.055, 0.05);
    coil.scale.setScalar(1 - layer * 0.12);
    coil.castShadow = true;
    g.add(coil);
  }

  // 3. Leaning bamboo fishing rods + brass reels + landing net
  const rodGeo = new THREE.CylinderGeometry(0.012, 0.025, 2.05, 8);
  const reelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10);
  const netHoopGeo = new THREE.TorusGeometry(0.18, 0.016, 6, 16);
  const netMeshGeo = new THREE.ConeGeometry(0.17, 0.32, 10, 1, true);
  assets.geometries.push(rodGeo, reelGeo, netHoopGeo, netMeshGeo);

  for (let r = 0; r < 2; r++) {
    const rodGroup = new THREE.Group();
    rodGroup.position.set(-0.34 + r * 0.14, 0, -0.16);
    rodGroup.rotation.z = -0.22 + r * 0.1;
    rodGroup.rotation.x = -0.18;

    const pole = new THREE.Mesh(rodGeo, mats.woodCatwalk);
    pole.position.y = 1.02;
    pole.castShadow = true;
    rodGroup.add(pole);

    const reel = new THREE.Mesh(reelGeo, mats.brassTrim);
    reel.rotation.z = Math.PI * 0.5;
    reel.position.set(0.03, 0.44, 0.02);
    rodGroup.add(reel);

    g.add(rodGroup);
  }

  // Landing net leaning beside tackle box
  const netPoleGeo = new THREE.CylinderGeometry(0.016, 0.02, 1.35, 8);
  assets.geometries.push(netPoleGeo);
  const netGroup = new THREE.Group();
  netGroup.position.set(-0.48, 0, 0.04);
  netGroup.rotation.z = -0.28;
  const netPole = new THREE.Mesh(netPoleGeo, mats.woodCatwalk);
  netPole.position.y = 0.66;
  netGroup.add(netPole);

  const hoop = new THREE.Mesh(netHoopGeo, mats.brassTrim);
  hoop.rotation.x = Math.PI * 0.5;
  hoop.position.set(0, 1.34, 0.16);
  netGroup.add(hoop);

  const netCone = new THREE.Mesh(netMeshGeo, ropeMat);
  netCone.rotation.x = Math.PI;
  netCone.position.set(0, 1.18, 0.16);
  netGroup.add(netCone);
  g.add(netGroup);

  return g;
}

/**
 * Dockside wooden drying rack holding draped fishing nets & cork floats.
 */
export function buildFishingNetDryingRack(
  mats: WorldMaterialSet,
  assets: HarborPropAssets
): THREE.Group {
  const g = new THREE.Group();
  const ropeMat = assets.materials[3];
  const floatRedMat = assets.materials[4];

  const postGeo = new THREE.CylinderGeometry(0.055, 0.065, 1.75, 8);
  const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
  const netGeo = new THREE.PlaneGeometry(1.88, 1.24, 14, 9);
  const netMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#B59467'),
    roughness: 0.9,
    metalness: 0.0,
    wireframe: true,
  });
  const corkGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.07, 8);
  assets.geometries.push(postGeo, barGeo, netGeo, corkGeo);
  assets.materials.push(netMat);

  for (const sx of [-0.98, 0.98]) {
    const post = new THREE.Mesh(postGeo, mats.woodCatwalk);
    post.position.set(sx, 0.87, 0);
    post.castShadow = true;
    g.add(post);
  }

  const topBar = new THREE.Mesh(barGeo, mats.woodCatwalk);
  topBar.rotation.z = Math.PI * 0.5;
  topBar.position.y = 1.66;
  topBar.castShadow = true;
  g.add(topBar);

  const netSheet = new THREE.Mesh(netGeo, netMat);
  netSheet.position.set(0, 1.0, 0.05);
  netSheet.rotation.x = 0.07;
  g.add(netSheet);

  const netSheetBack = new THREE.Mesh(netGeo, netMat);
  netSheetBack.position.set(0, 1.0, -0.05);
  netSheetBack.rotation.x = -0.07;
  g.add(netSheetBack);

  for (let i = -2; i <= 2; i++) {
    const cork = new THREE.Mesh(corkGeo, floatRedMat);
    cork.rotation.z = Math.PI * 0.5;
    cork.position.set(i * 0.36, 1.66, 0.05);
    g.add(cork);
  }

  return g;
}

export interface EchoBridgeVisual {
  group: THREE.Group;
  surfaceMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
}

export function buildEchoBridgeMesh(
  width: number,
  depth: number,
  mats: WorldMaterialSet,
  assets: HarborPropAssets
): EchoBridgeVisual {
  const group = new THREE.Group();
  const surfaceMat = mats.echoLedge.clone();
  surfaceMat.transparent = true;
  surfaceMat.opacity = 0.72;
  surfaceMat.emissiveIntensity = 0.7;

  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F4A949'),
    emissive: new THREE.Color('#C87822'),
    emissiveIntensity: 0.45,
    roughness: 0.32,
    metalness: 0.72,
    transparent: true,
    opacity: 0.85,
  });

  const deckGeo = new THREE.BoxGeometry(width, 0.14, depth);
  const railGeo = new THREE.BoxGeometry(0.08, 0.08, depth + 0.08);
  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.34, 8);
  assets.geometries.push(deckGeo, railGeo, postGeo);
  assets.materials.push(surfaceMat, trimMat);

  const deck = new THREE.Mesh(deckGeo, surfaceMat);
  deck.position.y = -0.07;
  group.add(deck);

  for (const sx of [-width * 0.5 + 0.05, width * 0.5 - 0.05]) {
    const rail = new THREE.Mesh(railGeo, trimMat);
    rail.position.set(sx, 0.04, 0);
    group.add(rail);
    for (const sz of [-depth * 0.46, depth * 0.46]) {
      const post = new THREE.Mesh(postGeo, trimMat);
      post.position.set(sx, 0.12, sz);
      group.add(post);
    }
  }

  group.visible = false;
  return { group, surfaceMat, trimMat };
}

export interface WaterwheelVisual {
  wheelGroup: THREE.Group;
  wheelRotor: THREE.Group;
  paddles: THREE.Group[];
  rimMat: THREE.MeshStandardMaterial;
}

export function buildMillWaterwheelVisual(
  radius: number,
  padHalfW: number,
  padHalfD: number,
  mats: WorldMaterialSet,
  assets: HarborPropAssets
): WaterwheelVisual {
  const wheelGroup = new THREE.Group();
  const wheelRotor = new THREE.Group();
  wheelGroup.add(wheelRotor);

  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8F5E46'),
    emissive: new THREE.Color('#3A220E'),
    emissiveIntensity: 0.15,
    roughness: 0.42,
    metalness: 0.65,
  });
  assets.materials.push(rimMat);

  const rimGeo = new THREE.TorusGeometry(radius, 0.11, 10, 28);
  rimGeo.rotateY(Math.PI * 0.5); // Lies in Z-Y plane so spoke points toward +Z when angle = 0
  const spokeGeo = new THREE.BoxGeometry(0.11, 0.11, radius * 2);
  const hubGeo = new THREE.CylinderGeometry(0.38, 0.38, padHalfW * 2.15, 14);
  hubGeo.rotateZ(Math.PI * 0.5);
  const axleGeo = new THREE.CylinderGeometry(0.16, 0.16, padHalfW * 2.55, 12);
  axleGeo.rotateZ(Math.PI * 0.5);
  const padGeo = new THREE.BoxGeometry(padHalfW * 2, 0.14, padHalfD * 2);
  const padRimGeo = new THREE.BoxGeometry(padHalfW * 2 + 0.08, 0.05, padHalfD * 2 + 0.08);
  assets.geometries.push(rimGeo, spokeGeo, hubGeo, axleGeo, padGeo, padRimGeo);

  for (const sx of [-padHalfW * 0.92, padHalfW * 0.92]) {
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.x = sx;
    rim.castShadow = true;
    wheelRotor.add(rim);

    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(spokeGeo, mats.woodCatwalk);
      spoke.position.x = sx;
      spoke.rotation.x = (s * Math.PI) / 4;
      spoke.castShadow = true;
      wheelRotor.add(spoke);
    }
  }

  const hub = new THREE.Mesh(hubGeo, rimMat);
  hub.castShadow = true;
  wheelRotor.add(hub);

  const axle = new THREE.Mesh(axleGeo, mats.darkIron);
  wheelGroup.add(axle);

  const paddles: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const padRoot = new THREE.Group();
    const plank = new THREE.Mesh(padGeo, mats.woodCatwalk);
    plank.position.y = -0.07;
    plank.castShadow = true;
    plank.receiveShadow = true;
    padRoot.add(plank);

    const trim = new THREE.Mesh(padRimGeo, rimMat);
    trim.position.y = -0.11;
    padRoot.add(trim);

    wheelGroup.add(padRoot);
    paddles.push(padRoot);
  }

  return { wheelGroup, wheelRotor, paddles, rimMat };
}

export interface OwlSearchlightVisual {
  root: THREE.Group;
  pivot: THREE.Group;
  eyeMat: THREE.MeshBasicMaterial;
  beamCone: THREE.Mesh;
  beamMat: THREE.ShaderMaterial;
  spotRing: THREE.Mesh;
  spotMat: THREE.MeshBasicMaterial;
  stanchion: THREE.Mesh;
  collar: THREE.Mesh;
}

export function buildOwlSearchlightRig(
  mats: WorldMaterialSet,
  assets: HarborPropAssets,
  postHeight = 3.2
): OwlSearchlightVisual {
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);

  const postGeo = new THREE.CylinderGeometry(0.055, 0.085, postHeight, 8);
  const collarGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10);
  const bodyGeo = new THREE.SphereGeometry(0.32, 12, 10);
  const earGeo = new THREE.ConeGeometry(0.11, 0.24, 5);
  const eyeGeo = new THREE.SphereGeometry(0.11, 10, 8);
  const coneGeo = new THREE.ConeGeometry(1.85, 1.0, 22, 1, true);
  coneGeo.translate(0, -0.5, 0);
  coneGeo.rotateX(-Math.PI * 0.5);
  const ringGeo = new THREE.RingGeometry(1.52, 1.88, 36);
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF5733') });
  const beamMat = mats.beamMaterial.clone();
  beamMat.uniforms.uColor.value.set('#FF5733');
  beamMat.uniforms.uOpacity.value = 0.16;
  const spotMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#FF5733'),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  assets.geometries.push(postGeo, collarGeo, bodyGeo, earGeo, eyeGeo, coneGeo, ringGeo);
  assets.materials.push(eyeMat, beamMat, spotMat);

  const stanchion = new THREE.Mesh(postGeo, mats.darkIron);
  stanchion.position.set(0, -postHeight * 0.5 - 0.15, 0);
  stanchion.castShadow = true;
  root.add(stanchion);

  const collar = new THREE.Mesh(collarGeo, mats.brassTrim);
  collar.position.set(0, -0.22, 0);
  root.add(collar);

  const owlBody = new THREE.Mesh(bodyGeo, mats.darkIron);
  owlBody.castShadow = true;
  pivot.add(owlBody);

  for (const sx of [-0.18, 0.18]) {
    const ear = new THREE.Mesh(earGeo, mats.brassTrim);
    ear.position.set(sx, 0.26, 0.05);
    ear.rotation.z = -sx * 0.9;
    pivot.add(ear);
  }

  const owlEye = new THREE.Mesh(eyeGeo, eyeMat);
  owlEye.position.set(0, -0.04, 0.28);
  pivot.add(owlEye);

  const beamCone = new THREE.Mesh(coneGeo, beamMat);
  pivot.add(beamCone);

  const spotRing = new THREE.Mesh(ringGeo, spotMat);
  spotRing.rotation.x = -Math.PI * 0.5;
  root.add(spotRing);

  return { root, pivot, eyeMat, beamCone, beamMat, spotRing, spotMat, stanchion, collar };
}

export interface BaitPailVisual {
  root: THREE.Group;
  bucketGroup: THREE.Group;
  spilledGroup: THREE.Group;
}

export function buildBaitPail(
  mats: WorldMaterialSet,
  assets: HarborPropAssets
): BaitPailVisual {
  const root = new THREE.Group();
  const bucketGroup = new THREE.Group();
  root.add(bucketGroup);

  const tubGeo = new THREE.CylinderGeometry(0.22, 0.17, 0.34, 12);
  const bandGeo = new THREE.TorusGeometry(0.2, 0.016, 6, 16);
  assets.geometries.push(tubGeo, bandGeo);

  const tub = new THREE.Mesh(tubGeo, mats.woodCatwalk);
  tub.position.y = 0.17;
  tub.castShadow = true;
  bucketGroup.add(tub);

  const band = new THREE.Mesh(bandGeo, mats.brassTrim);
  band.rotation.x = Math.PI * 0.5;
  band.position.y = 0.27;
  bucketGroup.add(band);

  for (let i = 0; i < 3; i++) {
    const f = makeSingleFishMesh(assets, i % 2 === 1);
    f.position.set((i - 1) * 0.07, 0.34, (i % 2) * 0.05);
    f.rotation.z = 0.95;
    f.rotation.y = i * 0.7;
    bucketGroup.add(f);
  }

  const spilledGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const sf = makeSingleFishMesh(assets, i === 1);
    sf.position.set(0.32 + i * 0.15, 0.04, (i - 1) * 0.18);
    sf.rotation.y = 0.5 + i * 0.9;
    spilledGroup.add(sf);
  }
  spilledGroup.visible = false;
  root.add(spilledGroup);

  return { root, bucketGroup, spilledGroup };
}

export function buildDecoyFishVisual(assets: HarborPropAssets): THREE.Group {
  const g = new THREE.Group();
  const fish = makeSingleFishMesh(assets, false);
  fish.position.y = 0.05;
  fish.scale.setScalar(1.22);
  g.add(fish);

  const ringGeo = new THREE.RingGeometry(0.22, 0.31, 20);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#F4A949'),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  assets.geometries.push(ringGeo);
  assets.materials.push(ringMat);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI * 0.5;
  ring.position.y = 0.02;
  g.add(ring);
  return g;
}

export function buildMarcoLetterMesh(
  mats: WorldMaterialSet,
  assets: HarborPropAssets
): THREE.Group {
  const g = new THREE.Group();
  const paperGeo = new THREE.BoxGeometry(0.38, 0.03, 0.27);
  const sealGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.025, 10);
  const glowGeo = new THREE.RingGeometry(0.25, 0.34, 20);

  const paperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F4E6C8'),
    emissive: new THREE.Color('#6E5229'),
    emissiveIntensity: 0.32,
    roughness: 0.78,
  });
  const sealMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#C43A2B'),
    emissive: new THREE.Color('#701A12'),
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#F4A949'),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  assets.geometries.push(paperGeo, sealGeo, glowGeo);
  assets.materials.push(paperMat, sealMat, glowMat);

  const card = new THREE.Mesh(paperGeo, paperMat);
  card.position.y = 0.36;
  card.rotation.x = 0.32;
  card.rotation.z = 0.14;
  card.castShadow = true;
  g.add(card);

  const seal = new THREE.Mesh(sealGeo, sealMat);
  seal.position.set(0, 0.38, 0.02);
  seal.rotation.x = 0.32;
  seal.rotation.z = 0.14;
  g.add(seal);

  const ring = new THREE.Mesh(glowGeo, glowMat);
  ring.rotation.x = -Math.PI * 0.5;
  ring.position.y = 0.03;
  g.add(ring);

  // Use mats reference intentionally to keep linter happy
  void mats;
  return g;
}

export function buildCozyNestMesh(
  mats: WorldMaterialSet,
  assets: HarborPropAssets
): THREE.Group {
  const g = new THREE.Group();
  const baseGeo = new THREE.CylinderGeometry(0.42, 0.47, 0.12, 16);
  const rimGeo = new THREE.TorusGeometry(0.39, 0.09, 10, 20);
  const haloGeo = new THREE.RingGeometry(0.48, 0.56, 24);

  const fabricMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#B85D3B'),
    emissive: new THREE.Color('#471F11'),
    emissiveIntensity: 0.22,
    roughness: 0.92,
  });
  const cushionMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#DFBA8C'),
    emissive: new THREE.Color('#473119'),
    emissiveIntensity: 0.18,
    roughness: 0.95,
  });
  const haloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#F4A949'),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  assets.geometries.push(baseGeo, rimGeo, haloGeo);
  assets.materials.push(fabricMat, cushionMat, haloMat);

  const base = new THREE.Mesh(baseGeo, cushionMat);
  base.position.y = 0.06;
  base.receiveShadow = true;
  g.add(base);

  const rim = new THREE.Mesh(rimGeo, fabricMat);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 0.11;
  rim.castShadow = true;
  g.add(rim);

  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI * 0.5;
  halo.position.y = 0.02;
  g.add(halo);

  void mats;
  return g;
}

export interface FeatherBurst {
  group: THREE.Group;
  feathers: THREE.Mesh[];
  velX: Float32Array;
  velY: Float32Array;
  velZ: Float32Array;
  age: number;
  active: boolean;
}

export function createFeatherBurst(assets: HarborPropAssets): FeatherBurst {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(0.14, 0.06);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#F7F5EE'),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  assets.geometries.push(geo);
  assets.materials.push(mat);

  const count = 10;
  const feathers: THREE.Mesh[] = [];
  const velX = new Float32Array(count);
  const velY = new Float32Array(count);
  const velZ = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const f = new THREE.Mesh(geo, mat);
    group.add(f);
    feathers.push(f);
  }
  group.visible = false;
  return { group, feathers, velX, velY, velZ, age: 0, active: false };
}

