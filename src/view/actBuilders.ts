import * as THREE from 'three';
import type { ActId, ActSpec, BossId } from '../data/acts';
import type { WalkSurface, SolidCollider } from '../systems/parkour';
import type { WorldMaterialSet } from './materials';
import {
  buildCanalMooringPost,
  buildCanalQuayWall,
  buildCanalSkiff,
  buildClockworkGear,
  buildCopperPipeBridge,
  buildLanternPost,
  buildRooftopBuilding,
  buildStoneCanalBridge,
  getBuildingPhysics,
} from './worldProps';
import {
  buildBaitPail,
  buildCozyNestMesh,
  buildEchoBridgeMesh,
  buildFishBasket,
  buildFishCuttingBoard,
  buildMarcoLetterMesh,
  buildOwlSearchlightRig,
  collectStealableFishMeshes,
  type BaitPailVisual,
  type EchoBridgeVisual,
  type HarborPropAssets,
  type OwlSearchlightVisual,
} from './harborProps';
import {
  createDogNpc,
  createPerchedBirdNpc,
  createPersonNpc,
  createSoaringBirdNpc,
  type NpcWorldState,
} from '../systems/npcSystem';
import type { FishSpot } from '../systems/storySystem';
import type { HarborMechanicsState } from '../systems/harborMechanics';

export interface BossRig {
  root: THREE.Group;
  body: THREE.Group;
  telegraphRing: THREE.Mesh;
  telegraphMat: THREE.MeshBasicMaterial;
  vulnAura: THREE.Mesh;
  vulnMat: THREE.MeshBasicMaterial;
  coreMat: THREE.MeshStandardMaterial;
  wingL?: THREE.Mesh;
  wingR?: THREE.Mesh;
  disposables: { geos: THREE.BufferGeometry[]; mats: THREE.Material[] };
}

export interface AnchorVisual {
  group: THREE.Group;
  ring: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
}

export interface FerryVisual {
  root: THREE.Group;
  lanternMat: THREE.MeshStandardMaterial;
  beaconRing: THREE.Mesh;
  beaconMat: THREE.MeshBasicMaterial;
}

export interface RaceRingVisual {
  group: THREE.Group;
  mat: THREE.MeshStandardMaterial;
}

export interface SecondaryActWorld {
  root: THREE.Group;
  surfaces: WalkSurface[];
  colliders: SolidCollider[];
  fishSpots: FishSpot[];
  fishMeshMap: Map<string, THREE.Object3D[]>;
  npcState: NpcWorldState;
  mechanics: HarborMechanicsState;
  echoVisuals: EchoBridgeVisual[];
  owlVisuals: OwlSearchlightVisual[];
  pailVisuals: BaitPailVisual[];
  letterVisuals: THREE.Group[];
  rotatingGears: Array<{ mesh: THREE.Object3D; speed: number }>;
  disposableGeos: THREE.BufferGeometry[];
  disposableMats: THREE.Material[];
}

export function createBossRig(bossId: BossId, contactShadowMat: THREE.MeshBasicMaterial): BossRig {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const shadowGeo = new THREE.CircleGeometry(1.3, 24);
  geos.push(shadowGeo);
  const shadow = new THREE.Mesh(shadowGeo, contactShadowMat);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.02;
  root.add(shadow);

  const telegraphMat = new THREE.MeshBasicMaterial({
    color: '#FF3B1F',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  mats.push(telegraphMat);
  const teleGeo = new THREE.RingGeometry(0.6, 2.2, 32);
  geos.push(teleGeo);
  const telegraphRing = new THREE.Mesh(teleGeo, telegraphMat);
  telegraphRing.rotation.x = -Math.PI * 0.5;
  telegraphRing.position.y = 0.05;
  root.add(telegraphRing);

  const vulnMat = new THREE.MeshBasicMaterial({
    color: '#FFE066',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  mats.push(vulnMat);
  const vulnGeo = new THREE.RingGeometry(1.15, 1.55, 28);
  geos.push(vulnGeo);
  const vulnAura = new THREE.Mesh(vulnGeo, vulnMat);
  vulnAura.rotation.x = -Math.PI * 0.5;
  vulnAura.position.y = 0.07;
  root.add(vulnAura);

  const coreMat = new THREE.MeshStandardMaterial({
    color: bossId === 'gufo_oro' ? '#D69F3A' : bossId === 'captain_ironsnout' ? '#4C5A68' : '#7A3E26',
    roughness: 0.42,
    metalness: bossId === 'gufo_oro' ? 0.65 : 0.25,
    emissive: new THREE.Color('#281408'),
    emissiveIntensity: 0.25,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: '#D8A24A',
    roughness: 0.3,
    metalness: 0.72,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: '#FF4E2A',
    emissive: new THREE.Color('#FF3814'),
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  mats.push(coreMat, trimMat, eyeMat);

  let wingL: THREE.Mesh | undefined;
  let wingR: THREE.Mesh | undefined;

  if (bossId === 'gufo_oro') {
    // Giant Clockwork Great Owl with articulated brass wings & glowing core
    const torsoGeo = new THREE.CylinderGeometry(0.72, 0.95, 1.9, 14);
    const crownGeo = new THREE.ConeGeometry(0.78, 0.65, 8);
    const wingGeo = new THREE.BoxGeometry(1.75, 0.16, 0.85);
    const eyeGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const ringGeo = new THREE.TorusGeometry(0.92, 0.08, 10, 28);
    geos.push(torsoGeo, crownGeo, wingGeo, eyeGeo, ringGeo);

    const torso = new THREE.Mesh(torsoGeo, coreMat);
    torso.position.y = 1.65;
    torso.castShadow = true;
    body.add(torso);

    const crown = new THREE.Mesh(crownGeo, trimMat);
    crown.position.y = 2.85;
    body.add(crown);

    const gearHalo = new THREE.Mesh(ringGeo, trimMat);
    gearHalo.position.set(0, 1.85, -0.35);
    body.add(gearHalo);

    wingL = new THREE.Mesh(wingGeo, trimMat);
    wingL.position.set(-1.35, 1.85, 0);
    wingL.castShadow = true;
    body.add(wingL);

    wingR = new THREE.Mesh(wingGeo, trimMat);
    wingR.position.set(1.35, 1.85, 0);
    wingR.castShadow = true;
    body.add(wingR);

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.26, 2.22, 0.72);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.26, 2.22, 0.72);
    body.add(eyeL, eyeR);
  } else {
    // Broad Armored Harbor Bulldog / Sluice Hound Boss
    const barrelGeo = new THREE.BoxGeometry(1.25, 0.92, 1.75);
    const headGeo = new THREE.BoxGeometry(0.92, 0.76, 0.88);
    const collarGeo = new THREE.TorusGeometry(0.55, 0.11, 10, 20);
    const legGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.62, 8);
    const eyeGeo = new THREE.SphereGeometry(0.1, 10, 10);
    geos.push(barrelGeo, headGeo, collarGeo, legGeo, eyeGeo);

    const barrel = new THREE.Mesh(barrelGeo, coreMat);
    barrel.position.set(0, 0.88, 0);
    barrel.castShadow = true;
    body.add(barrel);

    const head = new THREE.Mesh(headGeo, coreMat);
    head.position.set(0, 1.05, 1.02);
    head.castShadow = true;
    body.add(head);

    const brassCollar = new THREE.Mesh(collarGeo, trimMat);
    brassCollar.position.set(0, 1.0, 0.72);
    body.add(brassCollar);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.24, 12), trimMat);
    geos.push(cap.geometry);
    cap.position.set(0, 1.54, 1.02);
    body.add(cap);

    const legCoords: Array<[number, number]> = [
      [-0.44, 0.56],
      [0.44, 0.56],
      [-0.44, -0.58],
      [0.44, -0.58],
    ];
    for (const [lx, lz] of legCoords) {
      const leg = new THREE.Mesh(legGeo, coreMat);
      leg.position.set(lx, 0.31, lz);
      leg.castShadow = true;
      body.add(leg);
    }

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.24, 1.18, 1.45);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.24, 1.18, 1.45);
    body.add(eyeL, eyeR);
  }

  return {
    root,
    body,
    telegraphRing,
    telegraphMat,
    vulnAura,
    vulnMat,
    coreMat,
    wingL,
    wingR,
    disposables: { geos, mats },
  };
}

export function createArenaAnchorVisual(mats: WorldMaterialSet): AnchorVisual {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: '#F4A949',
    emissive: new THREE.Color('#E88B28'),
    emissiveIntensity: 0.9,
    roughness: 0.28,
    metalness: 0.72,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.58, 0.38, 12), mats.darkIron);
  base.position.y = 0.19;
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 12), mat);
  bell.position.y = 0.78;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.06, 8, 22), mat);
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = 0.75;
  group.add(base, bell, ring);
  return { group, ring, mat };
}

export function createFerryGondolaVisual(mats: WorldMaterialSet): FerryVisual {
  const root = new THREE.Group();
  const hull = buildCanalSkiff(mats);
  hull.scale.setScalar(1.35);
  root.add(hull);

  const lanternMat = new THREE.MeshStandardMaterial({
    color: '#FFD57E',
    emissive: new THREE.Color('#F4A949'),
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.85, 8), mats.brassTrim);
  mast.position.set(0, 1.0, 0.95);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), lanternMat);
  orb.position.set(0, 1.98, 0.95);
  root.add(mast, orb);

  const beaconMat = new THREE.MeshBasicMaterial({
    color: '#4CE0B3',
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 28), beaconMat);
  beaconRing.rotation.x = -Math.PI * 0.5;
  beaconRing.position.y = 0.08;
  root.add(beaconRing);

  return { root, lanternMat, beaconRing, beaconMat };
}

export function createRaceRingVisual(index: number): RaceRingVisual {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: '#F4A949',
    emissive: new THREE.Color('#D97E1E'),
    emissiveIntensity: 0.95,
    roughness: 0.22,
    metalness: 0.75,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 10, 26), mat);
  group.add(torus);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mat);
  gem.position.y = 1.08 + (index % 2) * 0.02;
  group.add(gem);
  return { group, mat };
}

export function buildSecondaryActWorld(
  actId: Exclude<ActId, 'harbor'>,
  act: ActSpec,
  mats: WorldMaterialSet,
  propAssets: HarborPropAssets
): SecondaryActWorld {
  const root = new THREE.Group();
  const surfaces: WalkSurface[] = [];
  const colliders: SolidCollider[] = [];
  const fishSpots: FishSpot[] = [];
  const fishMeshMap = new Map<string, THREE.Object3D[]>();
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const rotatingGears: Array<{ mesh: THREE.Object3D; speed: number }> = [];

  const mechanics: HarborMechanicsState = {
    echoLedges: [],
    waterwheels: [],
    owls: [],
    baitPails: [],
    decoyFish: [],
    flareSpots: [],
    letters: [],
    nests: [],
    stealthGraceTimer: 0,
    nextDecoySeq: 1,
  };

  const echoVisuals: EchoBridgeVisual[] = [];
  const owlVisuals: OwlSearchlightVisual[] = [];
  const pailVisuals: BaitPailVisual[] = [];
  const letterVisuals: THREE.Group[] = [];

  const addQuayPlatform = (id: string, x: number, z: number, w: number, d: number, topY: number) => {
    const q = buildCanalQuayWall(w, d, topY, mats);
    q.position.set(x, 0, z);
    root.add(q);
    surfaces.push({
      id,
      minX: x - w * 0.5 - 0.12,
      maxX: x + w * 0.5 + 0.12,
      minZ: z - d * 0.5 - 0.12,
      maxZ: z + d * 0.5 + 0.12,
      topY,
      kind: 'roof',
    });
    colliders.push({
      id: `${id}_col`,
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      minY: -1.0,
      maxY: Math.max(0.1, topY - 0.12),
    });
  };

  const addBuilding = (id: string, x: number, z: number, w: number, d: number, y: number, rail = true) => {
    const mesh = buildRooftopBuilding(w, d, y, mats, true, rail, true);
    mesh.position.set(x, 0, z);
    root.add(mesh);
    const phys = getBuildingPhysics(id, x, z, w, d, y, true);
    surfaces.push({
      id,
      minX: x - w * 0.5 - 0.12,
      maxX: x + w * 0.5 + 0.12,
      minZ: z - d * 0.5 - 0.12,
      maxZ: z + d * 0.5 + 0.12,
      topY: y,
      kind: 'roof',
    });
    if (phys.gableSurface) surfaces.push(phys.gableSurface);
    colliders.push(...phys.colliders);
  };

  const addPipe = (id: string, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    root.add(buildCopperPipeBridge(x1, y1, z1, x2, y2, z2, mats));
    const axis = Math.abs(z2 - z1) >= Math.abs(x2 - x1) ? 'z' : 'x';
    surfaces.push({
      id,
      minX: Math.min(x1, x2) - 0.65,
      maxX: Math.max(x1, x2) + 0.65,
      minZ: Math.min(z1, z2) - 0.65,
      maxZ: Math.max(z1, z2) + 0.65,
      topY: (y1 + y2) * 0.5,
      kind: 'pipe',
      ramp:
        axis === 'z'
          ? { axis: 'z', startCoord: z1, endCoord: z2, startY: y1, endY: y2 }
          : { axis: 'x', startCoord: x1, endCoord: x2, startY: y1, endY: y2 },
    });
  };

  const addEcho = (id: string, x: number, y: number, z: number, w = 4.6, d = 3.2) => {
    mechanics.echoLedges.push({ id, surfaceId: id, x, y, z, revealTimer: 0 });
    surfaces.push({
      id,
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      topY: y,
      kind: 'hidden_echo',
      visible: false,
    });
    const vis = buildEchoBridgeMesh(w, d, mats, propAssets);
    vis.group.position.set(x, y, z);
    root.add(vis.group);
    echoVisuals.push(vis);
  };

  const addFishBoard = (id: string, x: number, y: number, z: number, label: string) => {
    const bg = buildFishCuttingBoard(mats, propAssets, true);
    bg.position.set(x, y, z);
    root.add(bg);
    const meshes = collectStealableFishMeshes(bg);
    fishMeshMap.set(id, meshes);
    fishSpots.push({ id, label, x, y, z, remainingFish: meshes.length, maxFish: meshes.length });
  };

  const addBasket = (id: string, x: number, y: number, z: number, label: string) => {
    const b = buildFishBasket(mats, propAssets);
    b.position.set(x, y, z);
    root.add(b);
    const meshes = collectStealableFishMeshes(b);
    fishMeshMap.set(id, meshes);
    fishSpots.push({ id, label, x, y, z, remainingFish: meshes.length, maxFish: meshes.length });
  };

  const npcState: NpcWorldState = { people: [], dogs: [], birds: [] };

  const addStepCrate = (id: string, x: number, baseY: number, z: number, height = 1.25) => {
    const stepGeo = new THREE.BoxGeometry(1.7, height, 1.7);
    const step = new THREE.Mesh(stepGeo, mats.woodCatwalk);
    step.position.set(x, baseY + height * 0.5, z);
    step.castShadow = true;
    step.receiveShadow = true;
    root.add(step);
    disposableGeos.push(stepGeo);
    surfaces.push({
      id,
      minX: x - 0.88,
      maxX: x + 0.88,
      minZ: z - 0.88,
      maxZ: z + 0.88,
      topY: baseY + height,
      kind: 'roof',
    });
    colliders.push({
      id: `${id}_col`,
      minX: x - 0.82,
      maxX: x + 0.82,
      minZ: z - 0.82,
      maxZ: z + 0.82,
      minY: baseY,
      maxY: baseY + height - 0.06,
    });
  };

  if (actId === 'cistern') {
    // Subterranean Vaulted Mill Cistern: emerald glowing canal, stone piers, catwalk arches, boss arena
    addQuayPlatform('cistern_entry_quay', 0, 24, 14, 12, 2.2);
    addQuayPlatform('cistern_boss_arena', 0, -10, 24, 24, 1.4);
    addQuayPlatform('cistern_ferry_dock', 0, -38, 12, 12, 4.2);

    addBuilding('cistern_west_mill', -16, 6, 8, 22, 2.6, true);
    addBuilding('cistern_east_mill', 16, 6, 8, 22, 2.6, true);
    addBuilding('cistern_west_vault', -14, -18, 8, 14, 4.2, true);
    addBuilding('cistern_east_vault', 14, -18, 8, 14, 4.2, true);

    // Intermediate step crates from boss arena (1.4) toward side vaults (4.2) & catwalks
    addStepCrate('cistern_step_w1', -9.2, 1.4, -15.0, 1.4);
    addStepCrate('cistern_step_e1', 9.2, 1.4, -15.0, 1.4);

    // Grand stone arch & copper pipe connectors
    const bridgeEntry = buildStoneCanalBridge(12, 2.0, 3.4, mats);
    bridgeEntry.position.set(0, 0, 9.0);
    bridgeEntry.rotation.y = Math.PI * 0.5;
    root.add(bridgeEntry);
    surfaces.push({
      id: 'cistern_entry_bridge',
      minX: -1.8,
      maxX: 1.8,
      minZ: 2.0,
      maxZ: 18.0,
      topY: 1.8,
      kind: 'bridge',
    });

    addPipe('cistern_pipe_w', -9.0, 2.2, 20.0, -13.0, 2.6, 15.0);
    addPipe('cistern_pipe_e', 9.0, 2.2, 20.0, 13.0, 2.6, 15.0);
    addPipe('cistern_pipe_nw', -14.0, 4.2, -25.0, -4.5, 4.2, -33.0);
    addPipe('cistern_pipe_ne', 14.0, 4.2, -25.0, 4.5, 4.2, -33.0);
    addPipe('cistern_boss_exit_ramp', 0, 1.4, -22.0, 0, 4.2, -32.0);

    addEcho('cistern_echo_w', -15.0, 3.6, -7.0);
    addEcho('cistern_echo_e', 15.0, 3.6, -7.0);
    addEcho('cistern_echo_mid', 0, 4.2, -27.0);

    // Overhead stone cavern arch pillars & emerald lantern sconces
    const vaultMat = new THREE.MeshStandardMaterial({
      color: '#203234',
      roughness: 0.9,
      metalness: 0.05,
    });
    const archGeo = new THREE.TorusGeometry(22, 1.8, 10, 28, Math.PI);
    disposableMats.push(vaultMat);
    disposableGeos.push(archGeo);
    for (const az of [18, 2, -14, -30]) {
      const arch = new THREE.Mesh(archGeo, vaultMat);
      arch.position.set(0, 1.0, az);
      root.add(arch);
    }

    // Giant bronze rotating sluice gears along walls
    for (const [gx, gy, gz, spd] of [
      [-21, 5.2, -10, 0.25],
      [21, 5.2, -10, -0.25],
      [0, 8.5, -45, 0.18],
    ] as const) {
      const g = buildClockworkGear(4.2, 18, 0.55, mats);
      g.position.set(gx, gy, gz);
      if (Math.abs(gx) > 5) g.rotation.y = Math.PI * 0.5;
      root.add(g);
      rotatingGears.push({ mesh: g, speed: spd });
    }

    for (const [lx, ly, lz] of [
      [-4.2, 2.2, 22],
      [4.2, 2.2, 22],
      [-10.5, 1.4, -4],
      [10.5, 1.4, -4],
      [-4.2, 4.2, -35],
      [4.2, 4.2, -35],
    ]) {
      const l = buildLanternPost(mats, true);
      l.position.set(lx, ly, lz);
      root.add(l);
    }

    // Fish, Bait Pails, Nests, Letters, Owls, People, Dogs
    addFishBoard('cistern_fish_1', -3.5, 2.2, 22.0, 'свежей подземной форели');
    addFishBoard('cistern_fish_2', -15.5, 2.6, 2.0, 'вяленого угря');
    addBasket('cistern_fish_3', 15.5, 2.6, 4.0, 'корзины шлюзового улова');
    addBasket('cistern_fish_4', 4.5, 1.4, -17.5, 'армейского пайка');

    mechanics.baitPails.push(
      { id: 'cistern_pail_1', x: -5.5, y: 1.4, z: -2.5, tipped: false, respawnTimer: 0 },
      { id: 'cistern_pail_2', x: 5.5, y: 1.4, z: -14.5, tipped: false, respawnTimer: 0 }
    );
    mechanics.nests.push(
      { id: 'cistern_nest_1', label: 'Сухая ниша у шлюза', x: 3.2, y: 2.2, z: 26.5 },
      { id: 'cistern_nest_2', label: 'Тёплый войлок у свода', x: -13.5, y: 4.2, z: -18.0 }
    );
    mechanics.letters.push(
      {
        id: 'cistern_l1',
        title: 'Записка Марко · Подземный шлюз',
        text: '«Под каналами скрыты древние мельничные своды. Отбивай звон [E] у якорей, чтобы сбить броню стража!»',
        x: -16.0,
        y: 2.6,
        z: 10.0,
        collected: false,
      },
      {
        id: 'cistern_l2',
        title: 'Записка Марко · Эхо подземелья',
        text: '«Туман под землёй держит звук дольше — хрустальные мосты выводят прямо к подъёмнику Шпиля.»',
        x: 14.0,
        y: 4.2,
        z: -16.0,
        collected: false,
      },
      {
        id: 'cistern_l3',
        title: 'Записка Марко · Ключ от лифта',
        text: '«Капитан Железнорыл боится громкого колокольного звона и ударного когтя!»',
        x: 3.0,
        y: 4.2,
        z: -36.5,
        collected: false,
      }
    );

    mechanics.owls.push({
      id: 'cistern_owl_1',
      pivotX: 0,
      pivotY: 6.2,
      pivotZ: -20.0,
      baseYaw: 0,
      sweepAngle: 0,
      sweepSpan: 0.9,
      sweepSpeed: 0.72,
      phase: 0.5,
      groundY: 1.4,
      spotDist: 5.5,
      spotRadius: 2.2,
      spotX: 0,
      spotZ: -14.5,
      suspicion: 0,
      catInBeam: false,
      stealthSynced: false,
    });

    npcState.people.push(
      createPersonNpc('cistern_keeper', 'fisherman', '#3D6A62', [{ x: -2.8, y: 2.2, z: 22.8, pauseSec: 3.0 }], true, 0.2),
      createPersonNpc('cistern_engineer', 'stroller', '#A3663B', [{ x: 15.0, y: 2.6, z: 9.0, pauseSec: 2.5 }, { x: 15.0, y: 2.6, z: -1.0, pauseSec: 2.5 }], false, -1.2)
    );
    npcState.dogs.push(
      createDogNpc(
        'cistern_dog_1',
        '#6E513A',
        [
          { x: -15.5, y: 2.6, z: 10.0, pauseSec: 1.4 },
          { x: -15.5, y: 2.6, z: -2.0, pauseSec: 1.4 },
        ],
        { minX: -19.5, maxX: -12.5, minZ: -4.5, maxZ: 16.0 }
      ),
      createDogNpc(
        'cistern_dog_2',
        '#4C4A47',
        [
          { x: 15.5, y: 2.6, z: 12.0, pauseSec: 1.4 },
          { x: 15.5, y: 2.6, z: 0.0, pauseSec: 1.4 },
        ],
        { minX: 12.5, maxX: 19.5, minZ: -4.5, maxZ: 16.0 }
      )
    );
    npcState.birds.push(
      createPerchedBirdNpc('cistern_pigeon_1', 'pigeon', 2.4, 2.2, 20.5, 2.2),
      createPerchedBirdNpc('cistern_pigeon_2', 'pigeon', -12.8, 4.2, -16.0, 0.4)
    );
  } else {
    // ACT III: Grand Clockwork Belfry & Floating Twilight Festival Barges (Vertical Ascent)
    addQuayPlatform('spire_entry_barge', 0, 26, 12, 10, 2.0);
    addBuilding('spire_step_east', 12, 18, 8, 8, 3.6, true);
    addBuilding('spire_step_mid', 0, 8, 10, 9, 5.4, true);
    addBuilding('spire_step_west', -12, 0, 8, 9, 7.4, true);
    addBuilding('spire_belfry_ledge', -9, -10, 7, 7, 9.4, true);
    addQuayPlatform('spire_summit_arena', 0, -18, 22, 22, 11.2);

    // Ascending wooden/clockwork step-crates for multi-step climbs even without double jump
    addStepCrate('spire_crate_1', 9.0, 3.6, 15.0, 1.0);
    addStepCrate('spire_crate_2', -3.6, 5.4, 5.0, 1.1);
    addStepCrate('spire_crate_3', -10.5, 7.4, -3.5, 1.1);
    addStepCrate('spire_crate_4', -7.0, 9.4, -12.0, 1.0);

    // Ascending copper walkways connecting floating barges & clockwork spire terraces
    addPipe('spire_pipe_1', 3.5, 2.0, 22.0, 9.0, 3.6, 19.0);
    addPipe('spire_pipe_2', 9.0, 3.6, 15.0, 4.5, 5.4, 11.0);
    addPipe('spire_pipe_3', -4.5, 5.4, 6.0, -9.0, 7.4, 3.5);
    addPipe('spire_pipe_4', -11.0, 7.4, -4.0, -9.5, 9.4, -7.0);
    addPipe('spire_pipe_5', -7.0, 9.4, -12.0, -4.5, 11.2, -15.0);

    addEcho('spire_echo_direct_1', 0, 4.2, 16.5);
    addEcho('spire_echo_direct_2', 0, 8.2, -2.5);
    addEcho('spire_echo_summit', 9.0, 10.6, -9.0);

    // Giant majestic golden clockwork rings rotating around the Summit Carillon
    for (const [gx, gy, gz, rad, spd] of [
      [0, 14.5, -31, 6.8, 0.22],
      [-14, 10.0, -18, 4.2, -0.32],
      [14, 10.0, -18, 4.2, 0.32],
    ] as const) {
      const g = buildClockworkGear(rad, 22, 0.65, mats);
      g.position.set(gx, gy, gz);
      if (Math.abs(gx) > 5) g.rotation.y = Math.PI * 0.5;
      root.add(g);
      rotatingGears.push({ mesh: g, speed: spd });
    }

    for (const [lx, ly, lz] of [
      [-4.0, 2.0, 24],
      [4.0, 2.0, 24],
      [0.0, 5.4, 10],
      [-10.0, 7.4, 2],
      [-8.5, 11.2, -11],
      [8.5, 11.2, -11],
      [0.0, 11.2, -27],
    ]) {
      const l = buildLanternPost(mats, true);
      l.position.set(lx, ly, lz);
      root.add(l);
    }

    const skiff = buildCanalSkiff(mats);
    skiff.position.set(-7.5, 0.05, 22.0);
    root.add(skiff);

    addFishBoard('spire_fish_1', -3.0, 2.0, 23.0, 'звёздной скумбрии');
    addFishBoard('spire_fish_2', 11.5, 3.6, 17.0, 'копчёного леща');
    addBasket('spire_fish_3', -1.5, 5.4, 8.5, 'корзины звонаря');
    addBasket('spire_fish_4', 7.5, 11.2, -14.5, 'золотых анчоусов вершины');

    mechanics.baitPails.push(
      { id: 'spire_pail_1', x: 2.5, y: 5.4, z: 7.0, tipped: false, respawnTimer: 0 },
      { id: 'spire_pail_2', x: -6.5, y: 11.2, z: -18.0, tipped: false, respawnTimer: 0 }
    );
    mechanics.nests.push(
      { id: 'spire_nest_1', label: 'Тёплый гамак у причала', x: 3.5, y: 2.0, z: 27.5 },
      { id: 'spire_nest_2', label: 'Шёлковая подушка курантов', x: -7.5, y: 11.2, z: -24.5 }
    );
    mechanics.letters.push(
      {
        id: 'spire_l1',
        title: 'Записка Марко · Небесный подъём',
        text: '«Последняя башня уходит в звёздное небо. Используй воздушный двойной прыжок и эхо-мосты!»',
        x: 12.0,
        y: 3.6,
        z: 18.0,
        collected: false,
      },
      {
        id: 'spire_l2',
        title: 'Записка Марко · Великий Филин',
        text: '«Механический Филин боится Вспышки Зари [4] и звона на Небесных Якорях!»',
        x: -12.0,
        y: 7.4,
        z: 0.0,
        collected: false,
      },
      {
        id: 'spire_l3',
        title: 'Записка Марко · Сердце курантов',
        text: '«Когда замолкнет Золотой Филин, весь рассвет над Венецией станет твоим!»',
        x: 6.0,
        y: 11.2,
        z: -24.0,
        collected: false,
      }
    );

    mechanics.owls.push({
      id: 'spire_owl_mid',
      pivotX: 0,
      pivotY: 9.2,
      pivotZ: 4.0,
      baseYaw: 0,
      sweepAngle: 0,
      sweepSpan: 0.85,
      sweepSpeed: 0.88,
      phase: 1.2,
      groundY: 5.4,
      spotDist: 4.0,
      spotRadius: 2.0,
      spotX: 0,
      spotZ: 8.0,
      suspicion: 0,
      catInBeam: false,
      stealthSynced: false,
    });

    npcState.people.push(
      createPersonNpc('spire_clockmaker', 'stroller', '#C58A48', [{ x: -2.2, y: 2.0, z: 24.5, pauseSec: 3.0 }], false, 0.3)
    );
    npcState.dogs.push(
      createDogNpc(
        'spire_dog_mid',
        '#8E5B3A',
        [
          { x: -3.2, y: 5.4, z: 8.0, pauseSec: 1.6 },
          { x: 3.2, y: 5.4, z: 8.0, pauseSec: 1.6 },
        ],
        { minX: -4.8, maxX: 4.8, minZ: 4.0, maxZ: 12.0 }
      )
    );
    npcState.birds.push(
      createSoaringBirdNpc('spire_gull_1', 0, -14, 16.5, 18, 0.36, 0),
      createSoaringBirdNpc('spire_gull_2', 0, -14, 18.0, 22, -0.3, 2.2),
      createPerchedBirdNpc('spire_pigeon_1', 'pigeon', 3.0, 2.0, 23.0, 2.4)
    );
  }

  for (const l of mechanics.letters) {
    const lv = buildMarcoLetterMesh(mats, propAssets);
    lv.position.set(l.x, l.y + 0.42, l.z);
    root.add(lv);
    letterVisuals.push(lv);
  }

  for (const pail of mechanics.baitPails) {
    const pv = buildBaitPail(mats, propAssets);
    pv.root.position.set(pail.x, pail.y, pail.z);
    root.add(pv.root);
    pailVisuals.push(pv);
  }

  for (const nest of mechanics.nests) {
    const nv = buildCozyNestMesh(mats, propAssets);
    nv.position.set(nest.x, nest.y, nest.z);
    root.add(nv);
  }

  for (const owl of mechanics.owls) {
    const postH = Math.max(1.2, owl.pivotY - owl.groundY);
    const oVis = buildOwlSearchlightRig(mats, propAssets, postH);
    oVis.pivot.position.set(owl.pivotX, owl.pivotY, owl.pivotZ);
    oVis.stanchion.position.set(owl.pivotX, owl.pivotY - postH * 0.5 - 0.12, owl.pivotZ);
    oVis.collar.position.set(owl.pivotX, owl.pivotY - 0.22, owl.pivotZ);
    oVis.spotRing.position.set(owl.spotX, owl.groundY + 0.04, owl.spotZ);
    root.add(oVis.root);
    owlVisuals.push(oVis);
  }

  // Mooring posts around ferry/spawn for scenic grounding
  root.add(buildCanalMooringPost(act.ferry.x - 2.6, act.ferry.z + 1.8, 1.6, mats));
  root.add(buildCanalMooringPost(act.ferry.x + 2.6, act.ferry.z + 1.8, 1.6, mats));

  return {
    root,
    surfaces,
    colliders,
    fishSpots,
    fishMeshMap,
    npcState,
    mechanics,
    echoVisuals,
    owlVisuals,
    pailVisuals,
    letterVisuals,
    rotatingGears,
    disposableGeos,
    disposableMats,
  };
}
