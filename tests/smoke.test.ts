import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng';
import { migrateSave, SAVE_SCHEMA_VERSION } from '../src/core/save';
import {
  CAT_BREED_ORDER,
  CAT_BREED_SPECS,
  createDefaultTuning,
  getDifficultyModifiers,
  getGraphicsSettings,
  isGraphicsAtLeast,
  type GraphicsLevel,
} from '../src/data/tuning';
import { cycleToolId, TOOL_ORDER } from '../src/data/tools';
import {
  getLocale,
  getLocalizedDialogue,
  isRtlLanguage,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '../src/data/i18n';
import {
  createCatState,
  findBestLedgeCandidate,
  pullInCameraFromColliders,
  stepCatParkour,
  WORLD_BOUNDS,
  type SolidCollider,
  type WalkSurface,
} from '../src/systems/parkour';
import {
  computeCompassCardinals,
  projectRadarBlip,
} from '../src/components/TacticalRadar';
import {
  createDogNpc,
  createPerchedBirdNpc,
  createPersonNpc,
  createSoaringBirdNpc,
  stepNpcs,
  type NpcWorldState,
} from '../src/systems/npcSystem';
import {
  computeTricksterRank,
  computeTricksterRankKey,
  createInitialStoryState,
  stepStorySystem,
  type FishSpot,
} from '../src/systems/storySystem';
import {
  createHarborMechanicsState,
  determineMusicZone,
  stepHarborMechanics,
  tipBaitPail,
} from '../src/systems/harborMechanics';
import { defaultSaveData } from '../src/core/save';
import { ACT_ORDER, ACT_SPECS, getNextActId } from '../src/data/acts';
import { getCampaignLocale } from '../src/data/campaignI18n';
import {
  ACHIEVEMENT_ORDER,
  computeActRunScore,
  computePlayerBonuses,
  evaluateAchievements,
  purchaseOrEquipCollar,
  purchaseSkill,
} from '../src/systems/progression';
import {
  applyDamageToPlayer,
  createBossState,
  createVitalityState,
  healPlayer,
  stepBossSystem,
} from '../src/systems/bossSystem';
import {
  createQuestSystemState,
  isNearFerryGondola,
  isNearRivalCat,
  stepQuestAndWeatherSystem,
} from '../src/systems/questSystem';
import * as THREE from 'three';
import {
  createSecretQuestState,
  getSecretQuestHudList,
  stepSecretQuests,
} from '../src/systems/secretQuests';
import { batchStaticGroupByMaterial } from '../src/view/batchStaticMeshes';
import {
  computeAstrolabeReadout,
  computeCameraDynamics,
  computeDaylightProfile,
} from '../src/systems/atmosphere';
import { resolvePawSurfaceType } from '../src/core/audio';
import { COLLAR_CATALOG } from '../src/systems/progression';
import { computeFelinePose } from '../src/systems/felineKinematics';

test('seeded rng produces identical sequence for same seed', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 8; i++) {
    assert.equal(a.next(), b.next());
  }
});

test('save migration upgrades old or malformed state safely', () => {
  const migrated = migrateSave({ districtIndex: 2, unlockedHarmonics: 3 });
  assert.equal(migrated.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(migrated.districtIndex, 2);
  assert.equal(migrated.unlockedHarmonics, 3);
  assert.deepEqual(migrated.unlockedLocks, []);
});

test('contextual ledge jump snaps cat onto higher rooftop across gap', () => {
  const tuning = createDefaultTuning().parkour;
  const surfaces: WalkSurface[] = [
    { id: 'start_roof', minX: -3, maxX: 3, minZ: -3, maxZ: 3, topY: 3.0, kind: 'roof' },
    { id: 'next_roof', minX: -2, maxX: 2, minZ: -8.5, maxZ: -5.0, topY: 4.5, kind: 'roof' },
  ];
  const cat = createCatState(0, 3.0, -2.2);
  cat.surfaceId = 'start_roof';
  cat.yaw = Math.PI; // facing -Z

  const cand = findBestLedgeCandidate(cat, 0, -1, surfaces, tuning);
  assert.ok(cand, 'expected ledge candidate across gap');
  assert.equal(cand.surfaceId, 'next_roof');

  const res = stepCatParkour(
    cat,
    { forward: 1, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: true },
    surfaces,
    tuning,
    1 / 60
  );
  assert.equal(res.jumped, true);
  assert.equal(res.isLedgeHop, true);

  for (let i = 0; i < 40; i++) {
    stepCatParkour(
      cat,
      { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60
    );
  }
  assert.equal(cat.grounded, true);
  assert.equal(cat.surfaceId, 'next_roof');
  assert.ok(Math.abs(cat.y - 4.5) < 0.01);
});

test('falling into canal water enters buoyant swim mode and lets cat climb or leap onto dry land', () => {
  const tuning = createDefaultTuning().parkour;
  const surfaces: WalkSurface[] = [
    { id: 'start_roof', minX: -3.2, maxX: 3.2, minZ: -3.2, maxZ: 3.2, topY: 3.0, kind: 'roof' },
    { id: 'quay_left', minX: -10.29, maxX: -6.91, minZ: -20, maxZ: 10, topY: 0.5, kind: 'roof' },
  ];
  const colliders = [
    { id: 'quay_left_body', minX: -10.2, maxX: -7.0, minZ: -20, maxZ: 10, minY: -1.0, maxY: 0.42 },
  ];

  // Drop into the open left canal between roof_start (-3.2) and quay_left (-6.91)
  const cat = createCatState(-5.2, 0.01, 0);
  cat.grounded = false;
  cat.vy = -3.0;

  const splashRes = stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
    surfaces,
    tuning,
    1 / 60,
    colliders
  );
  assert.equal(splashRes.enteredWater, true);
  assert.equal(cat.swimming, true);
  assert.equal(cat.grounded, false);

  // Settle buoyancy without teleporting back to start_roof (0, 3.0, 0)
  for (let i = 0; i < 45; i++) {
    stepCatParkour(
      cat,
      { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60,
      colliders
    );
  }
  assert.equal(cat.swimming, true);
  assert.ok(cat.x < -4.5, `cat should stay in the canal, not teleport to start: x=${cat.x}`);
  assert.ok(Math.abs(cat.y - -0.22) < 0.08, `expected buoyant swim height near -0.22, got ${cat.y}`);

  // Swim left (-X) straight against quay_left and climb smoothly onto dry quay
  for (let i = 0; i < 90; i++) {
    stepCatParkour(
      cat,
      { forward: 0, right: -1, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60,
      colliders
    );
    if (!cat.swimming && cat.grounded) break;
  }
  assert.equal(cat.swimming, false);
  assert.equal(cat.grounded, true);
  assert.equal(cat.surfaceId, 'quay_left');
  assert.ok(Math.abs(cat.y - 0.5) < 0.02, `expected cat on quay_left at y=0.5, got ${cat.y}`);

  // Also verify [Space] contextual leap out of water onto quay_left
  const swimmer = createCatState(-5.4, -0.22, 0);
  swimmer.grounded = false;
  swimmer.swimming = true;
  swimmer.yaw = -Math.PI * 0.5; // facing -X toward quay_left
  const hopRes = stepCatParkour(
    swimmer,
    { forward: 0, right: -1, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: true },
    surfaces,
    tuning,
    1 / 60,
    colliders
  );
  assert.equal(hopRes.jumped, true);
  assert.equal(hopRes.isLedgeHop, true);
  for (let i = 0; i < 40; i++) {
    stepCatParkour(
      swimmer,
      { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60,
      colliders
    );
  }
  assert.equal(swimmer.swimming, false);
  assert.equal(swimmer.grounded, true);
  assert.equal(swimmer.surfaceId, 'quay_left');
});

test('solid dormer wall collider blocks cat from clipping inside triangular roof', () => {
  const tuning = createDefaultTuning().parkour;
  const surfaces: WalkSurface[] = [
    { id: 'roof_start', minX: -3.2, maxX: 3.2, minZ: -3.2, maxZ: 3.2, topY: 3.0, kind: 'roof' },
    {
      id: 'gable_roof',
      minX: -3.2,
      maxX: -0.9,
      minZ: -3.0,
      maxZ: -0.2,
      topY: 3.44,
      kind: 'roof',
      gable: { axis: 'z', center: -2.05, halfSpan: 1.15, eaveY: 3.44, ridgeY: 4.69 },
    },
  ];
  const colliders = [
    { id: 'dormer_wall', minX: -3.06, maxX: -1.04, minZ: -2.83, maxZ: -0.37, minY: 3.0, maxY: 3.46 },
  ];

  // Start directly in front of the dormer facing -Z
  const cat = createCatState(-2.05, 3.0, 0.2);
  cat.surfaceId = 'roof_start';
  cat.yaw = Math.PI;

  for (let i = 0; i < 40; i++) {
    stepCatParkour(
      cat,
      { forward: 1, right: 0, cameraYaw: 0, sprint: true, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60,
      colliders
    );
  }

  assert.ok(cat.z >= -0.37 + 0.21, `cat clipped past dormer front wall: z=${cat.z}`);
});

test('cat stands and walks cleanly along pitched triangular gable roof slope without falling through', () => {
  const tuning = createDefaultTuning().parkour;
  const surfaces: WalkSurface[] = [
    { id: 'roof_start', minX: -3.2, maxX: 3.2, minZ: -3.2, maxZ: 3.2, topY: 3.0, kind: 'roof' },
    {
      id: 'gable_roof',
      minX: -3.2,
      maxX: -0.9,
      minZ: -3.0,
      maxZ: -0.2,
      topY: 3.44,
      kind: 'roof',
      gable: { axis: 'z', center: -2.05, halfSpan: 1.15, eaveY: 3.44, ridgeY: 4.69 },
    },
  ];

  // Drop cat gently onto the pitched gable slope near center ridge
  const cat = createCatState(-2.05, 4.75, -1.5);
  cat.grounded = false;
  cat.vy = -1.0;

  for (let i = 0; i < 20; i++) {
    stepCatParkour(
      cat,
      { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60
    );
  }

  assert.equal(cat.grounded, true);
  assert.equal(cat.surfaceId, 'gable_roof');
  assert.ok(Math.abs(cat.y - 4.69) < 0.02, `expected cat at ridge y=4.69, got ${cat.y}`);

  // Walk laterally down slope (+X): y must descend smoothly along triangle slope, never drop to flat 3.0
  for (let i = 0; i < 12; i++) {
    stepCatParkour(
      cat,
      { forward: 0, right: 1, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60
    );
  }
  assert.equal(cat.grounded, true);
  assert.equal(cat.surfaceId, 'gable_roof');
  assert.ok(cat.y > 3.5 && cat.y < 4.69, `expected cat smoothly on gable slope, got y=${cat.y}`);
});

test('walking straight across sloped plank bridge connects flush from roof_start to roof_belfry without falling through', () => {
  const tuning = createDefaultTuning().parkour;
  const surfaces: WalkSurface[] = [
    { id: 'roof_start', minX: -3.2, maxX: 3.2, minZ: -3.2, maxZ: 3.2, topY: 3.0, kind: 'roof' },
    {
      id: 'pipe_bridge',
      minX: -0.5,
      maxX: 0.5,
      minZ: -7.45,
      maxZ: -3.15,
      topY: 3.3,
      kind: 'pipe',
      ramp: { axis: 'z', startCoord: -3.2, endCoord: -7.4, startY: 3.0, endY: 3.6 },
    },
    { id: 'roof_belfry', minX: -3.4, maxX: 3.4, minZ: -13.6, maxZ: -7.4, topY: 3.6, kind: 'roof' },
  ];
  const colliders = [
    { id: 'roof_belfry_body', minX: -3.32, maxX: 3.32, minZ: -13.52, maxZ: -7.48, minY: -1, maxY: 3.46 },
  ];

  const cat = createCatState(0, 3.0, -2.5);
  cat.surfaceId = 'roof_start';
  cat.yaw = Math.PI;

  for (let i = 0; i < 120; i++) {
    const res = stepCatParkour(
      cat,
      { forward: 1, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60,
      colliders
    );
    assert.equal(res.fellInWater, false, `cat fell into water at step ${i} (z=${cat.z}, y=${cat.y})`);
  }

  assert.equal(cat.surfaceId, 'roof_belfry');
  assert.ok(Math.abs(cat.y - 3.6) < 0.02, `expected cat on roof_belfry y=3.6, got ${cat.y}`);
  assert.ok(cat.z < -7.6, `expected cat well onto roof_belfry, got z=${cat.z}`);
});

test('jumping from higher roof onto lower flanking building with solid wall collider lands on lower roof without falling through', () => {
  const tuning = createDefaultTuning().parkour;
  const surfaces: WalkSurface[] = [
    { id: 'roof_belfry', minX: -3.51, maxX: 3.51, minZ: -13.71, maxZ: -7.29, topY: 3.6, kind: 'roof' },
    { id: 'arch_bridge_l', minX: -8.9, maxX: -2.7, minZ: -5.7, maxZ: -3.1, topY: 2.02, kind: 'bridge' },
    { id: 'dist_1', minX: -16.51, maxX: -9.89, minZ: -10.71, maxZ: -2.29, topY: 2.8, kind: 'roof' },
  ];
  const colliders = [
    { id: 'dist_1_body', minX: -16.32, maxX: -10.08, minZ: -10.52, maxZ: -2.48, minY: -1.0, maxY: 2.66 },
  ];

  // Fast downward drop directly onto dist_1 near its edge (prevY just above roof, cat.y crosses body.maxY in one step)
  const cat = createCatState(-10.2, 2.84, -6.5);
  cat.grounded = false;
  cat.vy = -12.0;

  const res = stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
    surfaces,
    tuning,
    1 / 60,
    colliders
  );

  assert.equal(res.fellInWater, false);
  assert.equal(cat.grounded, true);
  assert.equal(cat.surfaceId, 'dist_1');
  assert.ok(Math.abs(cat.y - 2.8) < 0.02, `expected cat on lower roof y=2.8, got ${cat.y}`);
  assert.ok(Math.abs(cat.x - -10.2) < 0.05, `wall collider should not eject cat off lower roof edge: x=${cat.x}`);
});

test('expanded playable world bounds (~370x340m) allow exploration across outer Foundry, Cloister, South Bastion, and North Viaduct', () => {
  const tuning = createDefaultTuning().parkour;
  const foundryPier: WalkSurface = {
    id: 'pier_east_foundry',
    minX: 67.9,
    maxX: 96.1,
    minZ: -20.1,
    maxZ: 22.1,
    topY: 0.5,
    kind: 'roof',
  };
  const cloisterPier: WalkSurface = {
    id: 'pier_west_cloister',
    minX: -96.1,
    maxX: -67.9,
    minZ: -18.1,
    maxZ: 24.1,
    topY: 0.5,
    kind: 'roof',
  };
  const bastionPier: WalkSurface = {
    id: 'pier_south_bastion',
    minX: -24.1,
    maxX: 24.1,
    minZ: 67.9,
    maxZ: 92.1,
    topY: 0.5,
    kind: 'roof',
  };
  const viaductPlaza: WalkSurface = {
    id: 'plaza_north_reservoir',
    minX: -36.1,
    maxX: 36.1,
    minZ: -88.1,
    maxZ: -65.9,
    topY: 4.8,
    kind: 'roof',
  };

  const catE = createCatState(82.0, 0.5, 4.0);
  catE.surfaceId = 'pier_east_foundry';
  stepCatParkour(
    catE,
    { forward: 0, right: 1, cameraYaw: 0, sprint: true, crouch: false, purr: false, jumpPressed: false },
    [foundryPier],
    tuning,
    1 / 60
  );

  const catW = createCatState(-82.0, 0.5, 4.0);
  catW.surfaceId = 'pier_west_cloister';
  stepCatParkour(
    catW,
    { forward: 0, right: -1, cameraYaw: 0, sprint: true, crouch: false, purr: false, jumpPressed: false },
    [cloisterPier],
    tuning,
    1 / 60
  );

  const catS = createCatState(0, 0.5, 76.0);
  catS.surfaceId = 'pier_south_bastion';
  stepCatParkour(
    catS,
    { forward: -1, right: 0, cameraYaw: 0, sprint: true, crouch: false, purr: false, jumpPressed: false },
    [bastionPier],
    tuning,
    1 / 60
  );

  const catN = createCatState(0, 4.8, -76.0);
  catN.surfaceId = 'plaza_north_reservoir';
  stepCatParkour(
    catN,
    { forward: 1, right: 0, cameraYaw: 0, sprint: true, crouch: false, purr: false, jumpPressed: false },
    [viaductPlaza],
    tuning,
    1 / 60
  );

  assert.ok(WORLD_BOUNDS.minX <= -175, `expected expanded minX <= -175, got ${WORLD_BOUNDS.minX}`);
  assert.ok(WORLD_BOUNDS.maxX >= 175, `expected expanded maxX >= 175, got ${WORLD_BOUNDS.maxX}`);
  assert.ok(WORLD_BOUNDS.minZ <= -185, `expected expanded minZ <= -185, got ${WORLD_BOUNDS.minZ}`);
  assert.ok(WORLD_BOUNDS.maxZ >= 135, `expected expanded maxZ >= 135, got ${WORLD_BOUNDS.maxZ}`);
  assert.ok(catE.x > 82.0, `expected cat to explore Far East Foundry: x=${catE.x}`);
  assert.ok(catW.x < -82.0, `expected cat to explore Far West Cloister: x=${catW.x}`);
  assert.ok(catS.z > 76.0, `expected cat to explore Far South Bastion: z=${catS.z}`);
  assert.ok(catN.z < -76.0, `expected cat to explore Far North Reservoir Viaduct: z=${catN.z}`);
});

test('people, dogs, and birds patrol, react to cat proximity/chime, and return cleanly', () => {
  const cat = createCatState(0, 0.5, 0);
  cat.sprinting = false;

  const npcs: NpcWorldState = {
    people: [
      createPersonNpc('p1', 'vendor', '#8D5239', [
        { x: 10, y: 0.5, z: 0, pauseSec: 0 },
        { x: 14, y: 0.5, z: 0, pauseSec: 0 },
      ]),
    ],
    dogs: [
      createDogNpc('d1', '#9A6338', [
        { x: 6, y: 0.5, z: 0, pauseSec: 0 },
        { x: 9, y: 0.5, z: 0, pauseSec: 0 },
      ]),
    ],
    birds: [
      createPerchedBirdNpc('b1', 'gull', 4.2, 0.5, 0, 0),
      createSoaringBirdNpc('b2', 0, 0, 12, 10, 0.4, 0),
    ],
  };

  // Step while cat is distant from dog & person -> they walk along waypoints; soaring bird moves
  const startBirdX = npcs.birds[1].x;
  for (let i = 0; i < 30; i++) {
    stepNpcs(npcs, cat, false, 1 / 60);
  }
  assert.equal(npcs.people[0].walking, true);
  assert.ok(npcs.people[0].x > 10.1, `person should walk toward waypoint: x=${npcs.people[0].x}`);
  assert.equal(npcs.dogs[0].behavior, 'patrol');
  assert.notEqual(npcs.birds[1].x, startBirdX, 'soaring gull should advance along orbit');

  // Chime near perched bird & dog -> bird takes flight (chirped) and dog chases Pip on same deck (barked)
  cat.x = 4.5;
  cat.z = 0;
  const reactEvents = stepNpcs(npcs, cat, true, 1 / 60);
  assert.equal(reactEvents.barked, true, 'dog should bark when cat chimes nearby');
  assert.equal(reactEvents.chirped, true, 'perched bird should chirp and scatter on chime');
  assert.equal(npcs.dogs[0].behavior, 'chase');
  assert.equal(npcs.birds[0].mode, 'flying');
  assert.ok(npcs.people[0].lookAtCatTimer > 0, 'nearby person should turn to look at bell chime');

  // After ~5 seconds clear of cat, flying bird returns smoothly to perched state
  cat.x = 30;
  for (let i = 0; i < 300; i++) {
    stepNpcs(npcs, cat, false, 1 / 60);
  }
  assert.equal(npcs.birds[0].mode, 'perched');
  assert.ok(Math.abs(npcs.birds[0].y - 0.5) < 0.01);

  // Personal-space collision prevents cat from overlapping people or dogs
  cat.x = npcs.people[0].x + 0.1;
  cat.z = npcs.people[0].z;
  cat.y = npcs.people[0].y;
  stepNpcs(npcs, cat, false, 1 / 60);
  assert.ok(
    Math.hypot(cat.x - npcs.people[0].x, cat.z - npcs.people[0].z) >= 0.47,
    'person should separate cat outside personal radius'
  );

  cat.x = npcs.dogs[0].x + 0.1;
  cat.z = npcs.dogs[0].z;
  cat.y = npcs.dogs[0].y;
  stepNpcs(npcs, cat, false, 1 / 60);
  assert.ok(
    Math.hypot(cat.x - npcs.dogs[0].x, cat.z - npcs.dogs[0].z) >= 0.37,
    'dog should separate cat outside personal radius'
  );
});

test('standalone [F] purr works without crouch and [Q] leg rubbing + dialogue advances Chapter I -> II', () => {
  const tuning = createDefaultTuning().parkour;
  const deck: WalkSurface = { id: 'quay_right', minX: 6.5, maxX: 12, minZ: -6, maxZ: 6, topY: 0.5, kind: 'roof' };
  const cat = createCatState(7.9, 0.5, 3.1);
  cat.surfaceId = 'quay_right';

  // Standalone [F] purr activates cat.purring without holding crouch
  stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: true, jumpPressed: false },
    [deck],
    tuning,
    1 / 60
  );
  assert.equal(cat.purring, true, 'cat should purr without requiring crouch');

  const people = [createPersonNpc('fisher_quay_r', 'fisherman', '#4C6B5C', [{ x: 7.35, y: 0.5, z: 3.1 }], true)];
  const story = createInitialStoryState();
  assert.equal(story.chapter, 1);

  const purrEvents = stepStorySystem(
    story,
    cat,
    [],
    people,
    {
      interactPressed: false,
      purrActive: true,
      chimedThisStep: false,
      chasingDogs: 0,
      escapedChase: false,
      caughtByDog: false,
      onCheckpointPerch: false,
    },
    1 / 60
  );
  assert.equal(purrEvents.purredNow, true);
  assert.equal(story.purrCount, 1);
  assert.equal(story.nearby?.kind, 'rub_person');

  // Press [Q] to rub against fisherman's legs -> increments rubCount, sets dialogue, advances Chapter I -> II
  const rubEvents = stepStorySystem(
    story,
    cat,
    [],
    people,
    {
      interactPressed: true,
      purrActive: false,
      chimedThisStep: false,
      chasingDogs: 0,
      escapedChase: false,
      caughtByDog: false,
      onCheckpointPerch: false,
    },
    1 / 60
  );
  assert.equal(rubEvents.rubbedPersonId, 'fisher_quay_r');
  assert.equal(rubEvents.chapterAdvancedTo, 2);
  assert.equal(story.chapter, 2);
  assert.equal(story.rubCount, 1);
  assert.ok(cat.rubTimer > 1.0);
  assert.equal(story.dialogue?.speaker, 'Старый рыбак Лука');
});

test('stealing 3 fish triggers dog chase, catch knockback drops fish, escape counts, and rooftop chime completes story', () => {
  const cat = createCatState(12.2, 0.5, 9.6);
  const story = createInitialStoryState();
  story.chapter = 2;

  const fishSpots: FishSpot[] = [
    { id: 'board_1', label: 'скумбрия с доски', x: 12.2, y: 0.5, z: 9.6, remainingFish: 2, maxFish: 2 },
    { id: 'basket_1', label: 'улов из корзины', x: 12.5, y: 0.5, z: 10.1, remainingFish: 5, maxFish: 5 },
  ];
  const npcs: NpcWorldState = {
    people: [],
    dogs: [
      createDogNpc(
        'dog_quay_r',
        '#9A6338',
        [
          { x: 14.2, y: 0.5, z: 9.6, pauseSec: 1.0 },
          { x: 18.0, y: 0.5, z: 9.6, pauseSec: 1.0 },
        ],
        { minX: 7.4, maxX: 22.0, minZ: 5.8, maxZ: 17.0 }
      ),
    ],
    birds: [],
  };

  // Steal 1st fish -> spot decrements, cat carries fish in mouth, dog begins chasing!
  const steal1 = stepStorySystem(
    story,
    cat,
    fishSpots,
    npcs.people,
    {
      interactPressed: true,
      purrActive: false,
      chimedThisStep: false,
      chasingDogs: 0,
      escapedChase: false,
      caughtByDog: false,
      onCheckpointPerch: false,
    },
    1 / 60
  );
  assert.equal(steal1.stoleFishSpotId, 'board_1');
  assert.equal(fishSpots[0].remainingFish, 1);
  assert.equal(story.stolenFishCount, 1);
  assert.equal(cat.carryingFish, true);

  const chaseStart = stepNpcs(npcs, cat, false, 1 / 60, true);
  assert.equal(chaseStart.chasingDogs, 1);
  assert.equal(npcs.dogs[0].behavior, 'chase');

  // Dog runs onto cat and catches Pip -> caughtCat triggers knockback & drops carried fish
  npcs.dogs[0].x = cat.x + 0.35;
  npcs.dogs[0].z = cat.z;
  const catchEvents = stepNpcs(npcs, cat, false, 1 / 60, false);
  assert.equal(catchEvents.caughtCat, true);
  assert.ok(cat.frightTimer > 1.0);

  stepStorySystem(
    story,
    cat,
    fishSpots,
    npcs.people,
    {
      interactPressed: false,
      purrActive: false,
      chimedThisStep: false,
      chasingDogs: catchEvents.chasingDogs,
      escapedChase: catchEvents.escapedChase,
      caughtByDog: catchEvents.caughtCat,
      onCheckpointPerch: false,
    },
    1 / 60
  );
  assert.equal(cat.carryingFish, false, 'dog catch should knock carried fish out of mouth');

  // Climb onto higher roof (or swim into canal) so dog loses sight and escape increments
  cat.y = 3.0;
  let escaped = false;
  for (let i = 0; i < 200; i++) {
    const res = stepNpcs(npcs, cat, false, 0.05, false);
    if (res.escapedChase) {
      escaped = true;
      break;
    }
  }
  assert.equal(escaped, true, 'climbing out of reach should end dog chase with escapedChase event');
  stepStorySystem(
    story,
    cat,
    fishSpots,
    npcs.people,
    {
      interactPressed: false,
      purrActive: false,
      chimedThisStep: false,
      chasingDogs: 0,
      escapedChase: true,
      caughtByDog: false,
      onCheckpointPerch: false,
    },
    1 / 60
  );
  assert.equal(story.escapedChaseCount, 1);

  // Return to dock and steal 2 more fish -> advances Chapter II -> III
  cat.x = 12.5;
  cat.y = 0.5;
  cat.z = 10.1;
  for (let s = 0; s < 2; s++) {
    stepStorySystem(
      story,
      cat,
      fishSpots,
      npcs.people,
      {
        interactPressed: true,
        purrActive: false,
        chimedThisStep: false,
        chasingDogs: 0,
        escapedChase: false,
        caughtByDog: false,
        onCheckpointPerch: false,
      },
      1 / 60
    );
  }
  assert.equal(story.stolenFishCount, 3);
  assert.equal(story.chapter, 3);

  // Chime [E] on upper perch -> completes story (Chapter IV + epilogueReady)
  const endEvents = stepStorySystem(
    story,
    cat,
    fishSpots,
    npcs.people,
    {
      interactPressed: false,
      purrActive: false,
      chimedThisStep: true,
      chasingDogs: 0,
      escapedChase: false,
      caughtByDog: false,
      onCheckpointPerch: true,
    },
    1 / 60
  );
  assert.equal(endEvents.chapterAdvancedTo, 4);
  assert.equal(story.chapter, 4);
  assert.equal(story.epilogueReady, true);
});

test('dogs stop chasing after MAX_CHASE_SEC stamina cap and obey cooldown instead of infinite pursuit', () => {
  const cat = createCatState(12.0, 0.5, 9.6);
  const npcs: NpcWorldState = {
    people: [],
    dogs: [
      createDogNpc(
        'dog_quay_r',
        '#9A6338',
        [
          { x: 14.5, y: 0.5, z: 9.6, pauseSec: 1.0 },
          { x: 18.0, y: 0.5, z: 9.6, pauseSec: 1.0 },
        ],
        { minX: 7.4, maxX: 22.0, minZ: 5.8, maxZ: 17.0 }
      ),
    ],
    birds: [],
  };

  // Trigger chase cleanly
  stepNpcs(npcs, cat, false, 1 / 60, true);
  assert.equal(npcs.dogs[0].behavior, 'chase');

  // Keep cat moving on the same dock within sight for up to 8.5s -> dog must eventually tire and give up
  let gaveUp = false;
  for (let i = 0; i < 180; i++) {
    cat.x = 12.0 + Math.sin(i * 0.2) * 2.5;
    const ev = stepNpcs(npcs, cat, false, 0.05, false);
    if (ev.dogGaveUp) {
      gaveUp = true;
      break;
    }
  }
  assert.equal(gaveUp, true, 'dog should eventually stop chasing after stamina cap');
  assert.notEqual(npcs.dogs[0].behavior, 'chase');
  assert.ok(npcs.dogs[0].chaseCooldown > 5.0, 'dog must enter cooldown after giving up');

  // Proximity while on cooldown should NOT immediately restart endless chase
  const postCooldownEv = stepNpcs(npcs, cat, true, 0.05, false);
  assert.equal(postCooldownEv.chasingDogs, 0);
  assert.notEqual(npcs.dogs[0].behavior, 'chase');
});

test('tossing carried fish [G] or tipping bait pail [Q] immediately distracts a chasing dog', () => {
  const cat = createCatState(12.2, 0.5, 9.6);
  cat.carryingFish = true;
  cat.yaw = 0;

  const mech = createHarborMechanicsState();
  const npcs: NpcWorldState = {
    people: [],
    dogs: [
      createDogNpc(
        'dog_quay_r',
        '#9A6338',
        [
          { x: 14.2, y: 0.5, z: 9.6, pauseSec: 1.0 },
          { x: 17.5, y: 0.5, z: 9.6, pauseSec: 1.0 },
        ],
        { minX: 7.4, maxX: 22.0, minZ: 5.8, maxZ: 17.0 }
      ),
    ],
    birds: [],
  };

  stepNpcs(npcs, cat, false, 1 / 60, true);
  assert.equal(npcs.dogs[0].behavior, 'chase');

  // Drop decoy bait forward using [G]
  const mechEv = stepHarborMechanics(mech, cat, [], { chimedThisStep: false, dropBaitPressed: true }, 1 / 60);
  assert.ok(mechEv.droppedDecoyBait, 'dropping bait with [G] while carrying fish should spawn decoy bait');

  const npcEv = stepNpcs(npcs, cat, false, 1 / 60, false, mech.decoyFish);
  assert.equal(npcEv.distractedDog, true, 'chasing dog within range should break chase for decoy bait');
  assert.notEqual(npcs.dogs[0].behavior, 'chase');
  assert.ok(npcs.dogs[0].distractedTimer > 4.0);

  // Also test bait pail tipping spawns decoy fish
  const pailBait = tipBaitPail(mech, 'pail_quay_r');
  assert.ok(pailBait && pailBait.fromPail);
  assert.equal(mech.baitPails[0].tipped, true);
});

test('bell chime reveals echo sky-bridges and reverses waterwheel paddles to lift cat upward', () => {
  const tuning = createDefaultTuning().parkour;
  const mech = createHarborMechanicsState();
  const w = mech.waterwheels[0];
  const echo = mech.echoLedges[0];
  const surfaces: WalkSurface[] = [
    {
      id: echo.surfaceId,
      minX: echo.x - 2.1,
      maxX: echo.x + 2.1,
      minZ: echo.z - 1.3,
      maxZ: echo.z + 1.3,
      topY: echo.y,
      kind: 'hidden_echo',
      visible: false,
    },
    ...w.paddles.map((pad) => ({
      id: pad.surfaceId,
      minX: w.cx - w.padHalfW,
      maxX: w.cx + w.padHalfW,
      minZ: w.cz - w.padHalfD,
      maxZ: w.cz + w.padHalfD,
      topY: w.cy,
      kind: 'gear' as const,
      visible: true,
      carryDx: 0,
      carryDz: 0,
    })),
  ];

  // Ring bell halfway between echo_east_gap (6.4, 3.4, 0.6) -> echo reveals
  const echoCat = createCatState(echo.x - 1.5, echo.y, echo.z);
  const revEcho = stepHarborMechanics(mech, echoCat, surfaces, { chimedThisStep: true, dropBaitPressed: false }, 1 / 60);
  assert.ok(revEcho.echoRevealedCount >= 1);
  assert.equal(surfaces[0].visible, true);

  // Move cat near mill_wheel_w and chime -> nearby mill wheels reverse to dir === 1
  const wheelCat = createCatState(w.cx, w.cy - 0.5, w.cz + 1.5);
  const revWheel = stepHarborMechanics(mech, wheelCat, surfaces, { chimedThisStep: true, dropBaitPressed: false }, 1 / 60);
  assert.ok(revWheel.reversedWheelId === 'mill_wheel_w' || revWheel.reversedWheelId === 'mill_wheel_e');
  assert.equal(w.dir, 1);

  // Place cat on the ascending paddle (around angle = 0 where sin is rising when dir === 1)
  w.angle = 0;
  stepHarborMechanics(mech, wheelCat, surfaces, { chimedThisStep: false, dropBaitPressed: false }, 1 / 60);
  const pad0 = surfaces.find((s) => s.id === 'wheel_pad_w_0')!;
  wheelCat.x = w.cx;
  wheelCat.z = (pad0.minZ + pad0.maxZ) * 0.5;
  wheelCat.y = pad0.topY;
  wheelCat.grounded = true;
  wheelCat.surfaceId = pad0.id;
  const startY = wheelCat.y;

  for (let i = 0; i < 30; i++) {
    stepHarborMechanics(mech, wheelCat, surfaces, { chimedThisStep: false, dropBaitPressed: false }, 1 / 60);
    stepCatParkour(
      wheelCat,
      { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60
    );
  }
  assert.ok(wheelCat.y > startY + 0.35, `reversed waterwheel paddle should lift cat upward: start=${startY}, now=${wheelCat.y}`);
});

test('owl searchlight alarms on un-purred exposure vs stealth sync on [F] purr, plus letters, cozy nest, crouch gull & rank', () => {
  const tuning = createDefaultTuning().parkour;
  const mech = createHarborMechanicsState();
  const owl = mech.owls[0];
  // Step once to compute initial spotX/spotZ
  const cat = createCatState(0, 3.6, 0);
  stepHarborMechanics(mech, cat, [], { chimedThisStep: false, dropBaitPressed: false }, 1 / 60);

  // Stand directly inside owl spotlight WITHOUT purring -> alarm fires after exposure
  let alarm = false;
  for (let i = 0; i < 45; i++) {
    cat.x = owl.spotX;
    cat.z = owl.spotZ;
    cat.y = owl.groundY;
    cat.purring = false;
    const ev = stepHarborMechanics(mech, cat, [], { chimedThisStep: false, dropBaitPressed: false }, 0.05);
    if (ev.owlAlarmFired) {
      alarm = true;
      break;
    }
  }
  assert.equal(alarm, true, 'standing inside owl beam without purring should trigger alarm');

  // Clear grace & step inside owl beam WHILE purring [F] -> stealthSynced = true, zero alarm
  mech.stealthGraceTimer = 0;
  owl.suspicion = 0.4;
  cat.x = owl.spotX;
  cat.z = owl.spotZ;
  cat.purring = true;
  const stealthEv = stepHarborMechanics(mech, cat, [], { chimedThisStep: false, dropBaitPressed: false }, 0.1);
  assert.equal(stealthEv.owlInBeam, true);
  assert.equal(stealthEv.owlStealthSynced, true);
  assert.equal(stealthEv.owlAlarmFired, false);
  assert.ok(owl.suspicion < 0.4, 'purring inside owl beam should drain suspicion cleanly');

  // Marco letter collection (use letter_2 on moored skiff outside owl spot radius)
  const letter2 = mech.letters[1];
  cat.x = letter2.x;
  cat.y = letter2.y;
  cat.z = letter2.z;
  const letterEv = stepHarborMechanics(mech, cat, [], { chimedThisStep: false, dropBaitPressed: false }, 1 / 60);
  assert.equal(letterEv.collectedLetter?.id, letter2.id);

  // Cozy nest sleep + warmth speed buff
  const story = createInitialStoryState();
  const nest0 = mech.nests[0];
  cat.x = nest0.x;
  cat.y = nest0.y;
  cat.z = nest0.z;
  const sleepEv = stepStorySystem(
    story,
    cat,
    [],
    [],
    {
      interactPressed: true,
      purrActive: false,
      chimedThisStep: false,
      chasingDogs: 0,
      escapedChase: false,
      caughtByDog: false,
      onCheckpointPerch: false,
      nests: mech.nests,
    },
    1 / 60
  );
  assert.equal(sleepEv.sleptNestId, nest0.id);
  assert.equal(cat.sleeping, true);
  assert.ok(cat.warmthTimer >= 24.5);

  // Movement wakes cat and keeps warmthTimer active
  const roof: WalkSurface = { id: 'nest_roof', minX: -5, maxX: 5, minZ: -5, maxZ: 5, topY: nest0.y, kind: 'roof' };
  stepCatParkour(
    cat,
    { forward: 1, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
    [roof],
    tuning,
    1 / 60
  );
  assert.equal(cat.sleeping, false);
  assert.ok(cat.warmthTimer > 20.0);

  // Crouch lets cat approach within 0.85m of perched gull without spooking, then [Q] pounces it
  const gullNpc: NpcWorldState = {
    people: [],
    dogs: [],
    birds: [createPerchedBirdNpc('gull_test', 'gull', 1.0, 0.5, 1.0, 0)],
  };
  cat.x = 1.85; // dist = 0.85m (> 0.62 crouch spook, < 2.1 standing spook)
  cat.y = 0.5;
  cat.z = 1.0;
  cat.crouching = true;
  stepNpcs(gullNpc, cat, false, 1 / 60);
  assert.equal(gullNpc.birds[0].mode, 'perched', 'crouching cat at 0.85m should NOT spook gull');

  const pounceRes = stepNpcs(gullNpc, cat, false, 1 / 60, false, [], 'gull_test');
  assert.ok(pounceRes.stalkedGullPos, 'explicit pounce should emit feather burst coordinates');
  assert.equal(gullNpc.birds[0].mode, 'flying');

  // Trickster rank calculation
  story.lettersFound = 5;
  story.chapter = 4;
  assert.equal(computeTricksterRankKey(story), 'guardian');
  assert.equal(computeTricksterRank(story), 'Хранитель Затопленных Курантов');
});

test('16 languages are supported with English default, RTL for Arabic/Farsi, and fantasy dialects', () => {
  const expectedCodes: LanguageCode[] = [
    'en', 'fr', 'de', 'es', 'pt', 'zh', 'ar', 'uk', 'ru', 'ja', 'pl', 'it', 'vi', 'fa', 'qya', 'ork',
  ];
  assert.equal(SUPPORTED_LANGUAGES.length, 16);
  assert.equal(SUPPORTED_LANGUAGES[0].code, 'en');
  for (const code of expectedCodes) {
    assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === code), `missing language ${code}`);
    const loc = getLocale(code);
    assert.ok(loc.startBtn.length > 0, `empty startBtn for ${code}`);
    assert.ok(loc.tools.bell.name.length > 0, `empty tool name for ${code}`);
    assert.ok(loc.difficultyNames.relaxed.length > 0, `empty difficulty name for ${code}`);
    assert.ok(loc.graphicsLabel.length > 0, `empty graphicsLabel for ${code}`);
    assert.ok(loc.graphicsNames.ultra.length > 0, `empty graphicsNames.ultra for ${code}`);
    assert.ok(loc.catLabel.length > 0, `empty catLabel for ${code}`);
    for (const breedId of CAT_BREED_ORDER) {
      assert.ok(loc.catNames[breedId].length > 0, `empty catNames.${breedId} for ${code}`);
    }
  }
  assert.equal(isRtlLanguage('ar'), true);
  assert.equal(isRtlLanguage('fa'), true);
  assert.equal(isRtlLanguage('en'), false);
  assert.equal(isRtlLanguage('qya'), false);
});

test('weapon wheel cycling wraps cleanly across all 4 feline tools', () => {
  assert.equal(TOOL_ORDER.length, 4);
  let tool = TOOL_ORDER[0];
  assert.equal(tool, 'bell');
  tool = cycleToolId(tool, 1);
  assert.equal(tool, 'fish_sling');
  tool = cycleToolId(tool, 1);
  assert.equal(tool, 'sonic_claw');
  tool = cycleToolId(tool, 1);
  assert.equal(tool, 'lantern_flare');
  tool = cycleToolId(tool, 1);
  assert.equal(tool, 'bell');
  tool = cycleToolId(tool, -1);
  assert.equal(tool, 'lantern_flare');
});

test('difficulty modifiers scale dog chase speed/duration/cooldown and owl suspicion rate', () => {
  const relaxed = getDifficultyModifiers('relaxed');
  const standard = getDifficultyModifiers('standard');
  const challenger = getDifficultyModifiers('challenger');

  assert.ok(relaxed.dogChaseSpeedMult < standard.dogChaseSpeedMult);
  assert.ok(standard.dogChaseSpeedMult < challenger.dogChaseSpeedMult);
  assert.ok(relaxed.dogMaxChaseSec < standard.dogMaxChaseSec);
  assert.ok(standard.dogMaxChaseSec < challenger.dogMaxChaseSec);
  assert.ok(relaxed.dogCooldownSec > standard.dogCooldownSec);
  assert.ok(relaxed.owlSuspicionFillMult < challenger.owlSuspicionFillMult);
});

test('secondary weapons (Fish Sling, Gale Claw, Dawn Flare) affect dogs, birds, and owl beams', () => {
  const mech = createHarborMechanicsState();
  const cat = createCatState(13.0, 0.5, 9.6);
  cat.yaw = 0;

  const npcs: NpcWorldState = {
    people: [],
    dogs: [
      createDogNpc(
        'dog_test',
        '#9A6338',
        [
          { x: 14.5, y: 0.5, z: 9.6, pauseSec: 1.0 },
          { x: 18.0, y: 0.5, z: 9.6, pauseSec: 1.0 },
        ],
        { minX: 7.4, maxX: 22.0, minZ: 5.8, maxZ: 17.0 }
      ),
    ],
    birds: [createPerchedBirdNpc('bird_test', 'gull', 14.0, 0.5, 9.8, 0)],
  };

  // Start a chase
  stepNpcs(npcs, cat, false, 1 / 60, true);
  assert.equal(npcs.dogs[0].behavior, 'chase');

  // Fire Sonic Claw -> knocks dog back, ends chase, puts on cooldown, and scatters nearby bird
  const clawEv = stepHarborMechanics(
    mech,
    cat,
    [],
    { chimedThisStep: false, dropBaitPressed: false, activeToolFired: 'sonic_claw' },
    1 / 60
  );
  assert.ok(clawEv.sonicClawImpact);
  const afterClaw = stepNpcs(npcs, cat, false, 1 / 60, false, [], null, {
    sonicClawImpact: clawEv.sonicClawImpact,
  });
  assert.equal(afterClaw.escapedChase, true);
  assert.notEqual(npcs.dogs[0].behavior, 'chase');
  assert.equal(npcs.birds[0].mode, 'flying');

  // Fire Fish Sling -> spawns decoy bait ahead even without carried fish
  const slingEv = stepHarborMechanics(
    mech,
    cat,
    [],
    { chimedThisStep: false, dropBaitPressed: false, activeToolFired: 'fish_sling' },
    1 / 60
  );
  assert.ok(slingEv.droppedDecoyBait);
  assert.ok(mech.decoyFish.length >= 1);

  // Move under owl searchlight and fire Dawn Flare -> blinds owl and keeps suspicion 0
  const owl = mech.owls[0];
  cat.x = owl.spotX;
  cat.y = owl.groundY;
  cat.z = owl.spotZ;
  owl.suspicion = 0.65;
  const flareEv = stepHarborMechanics(
    mech,
    cat,
    [],
    { chimedThisStep: false, dropBaitPressed: false, activeToolFired: 'lantern_flare' },
    0.1
  );
  assert.ok(flareEv.flareSpawned);
  assert.equal(owl.catInBeam, false);
  assert.ok(owl.suspicion < 0.65, 'dawn flare should blind nearby owl beam and drain suspicion');
});

test('determineMusicZone adapts cleanly to chase, stealth, water, summit, docks, and rooftops', () => {
  assert.equal(
    determineMusicZone({ mode: 'title', chasingDogs: 0, owlInBeam: false, swimming: false, catY: 3, catZ: 0 }),
    'title'
  );
  assert.equal(
    determineMusicZone({ mode: 'playing', chasingDogs: 1, owlInBeam: true, swimming: false, catY: 0.5, catZ: 5 }),
    'chase'
  );
  assert.equal(
    determineMusicZone({ mode: 'playing', chasingDogs: 0, owlInBeam: true, swimming: false, catY: 3.6, catZ: -10 }),
    'stealth'
  );
  assert.equal(
    determineMusicZone({ mode: 'playing', chasingDogs: 0, owlInBeam: false, swimming: true, catY: -0.2, catZ: 0 }),
    'swimming'
  );
  assert.equal(
    determineMusicZone({ mode: 'playing', chasingDogs: 0, owlInBeam: false, swimming: false, catY: 9.5, catZ: -26 }),
    'dam_summit'
  );
  assert.equal(
    determineMusicZone({ mode: 'playing', chasingDogs: 0, owlInBeam: false, swimming: false, catY: 0.5, catZ: 4 }),
    'waterfront'
  );
  assert.equal(
    determineMusicZone({ mode: 'playing', chasingDogs: 0, owlInBeam: false, swimming: false, catY: 3.0, catZ: 0 }),
    'rooftops'
  );
});

test('getLocalizedDialogue translates story messages into English without Cyrillic leakage', () => {
  const translated = getLocalizedDialogue('en', {
    id: 'intro_thought',
    speaker: 'Пип (мысли кота)',
    text: 'Утро свежее, а на причалах пахнет рыбой!',
  });
  assert.ok(translated);
  assert.equal(translated.speaker, 'Pip (Cat Thoughts)');
  assert.equal(/[А-Яа-яЁё]/.test(translated.text), false);

  const ruKept = getLocalizedDialogue('ru', {
    id: 'intro_thought',
    speaker: 'Пип (мысли кота)',
    text: 'Утро свежее, а на причалах пахнет рыбой!',
  });
  assert.equal(ruKept?.speaker, 'Пип (мысли кота)');
});

test('graphics quality presets scale resolution, shadows, bloom, particles, tilt, shake, aiming arc, and eco mode', () => {
  const levels: GraphicsLevel[] = ['low', 'medium', 'high', 'ultra'];
  const configs = levels.map((lvl) => getGraphicsSettings(lvl, false));

  // 4. Low (Eco): particles, UI animations, complex gradients, shadows, post-processing all disabled
  assert.equal(configs[0].shadowsEnabled, false);
  assert.equal(configs[0].postProcessing, false);
  assert.equal(configs[0].particlesEnabled, false);
  assert.equal(configs[0].uiAnimationsEnabled, false);
  assert.equal(configs[0].complexGradientsEnabled, false);
  assert.equal(configs[0].heavyDrawEffectsEnabled, false);
  assert.equal(configs[0].tilt3DEnabled, false);
  assert.equal(configs[0].screenShakeEnabled, false);
  assert.equal(configs[0].aimArcEnabled, false);

  // 3. Medium: no post-effects, no shadows, no heavy draw VFX, basic colors & sprites
  assert.equal(configs[1].shadowsEnabled, false);
  assert.equal(configs[1].postProcessing, false);
  assert.equal(configs[1].glowEffectsEnabled, false);
  assert.equal(configs[1].particlesEnabled, false);
  assert.equal(configs[1].heavyDrawEffectsEnabled, false);
  assert.equal(configs[1].uiAnimationsEnabled, true);

  // 2. High: Bloom & shadows kept, heavy VFX active (>= High), particles reduced vs Ultra, 3D tilt disabled
  assert.equal(configs[2].postProcessing, true);
  assert.equal(configs[2].shadowsEnabled, true);
  assert.equal(configs[2].shadowMapSize, 1024);
  assert.equal(configs[2].heavyDrawEffectsEnabled, true);
  assert.equal(configs[2].tilt3DEnabled, false);
  assert.equal(configs[2].aimArcEnabled, true);
  assert.equal(configs[2].screenShakeEnabled, true);

  // 1. Ultra: all effects enabled (Bloom, full particles, 3D tilt, shadows, screen shake, aiming arc)
  assert.equal(configs[3].postProcessing, true);
  assert.equal(configs[3].shadowsEnabled, true);
  assert.equal(configs[3].shadowMapSize, 2048);
  assert.equal(configs[3].tilt3DEnabled, true);
  assert.equal(configs[3].screenShakeEnabled, true);
  assert.equal(configs[3].aimArcEnabled, true);
  assert.equal(configs[3].heavyDrawEffectsEnabled, true);
  assert.ok(configs[3].bloomStrength > configs[2].bloomStrength);
  assert.ok(configs[3].moteVisibilityRatio > configs[2].moteVisibilityRatio);
  assert.ok(configs[3].pixelRatioCap >= configs[2].pixelRatioCap);
  assert.ok(configs[3].cameraFar > configs[1].cameraFar);
  assert.ok(configs[3].fogDensity < configs[0].fogDensity);
  assert.ok(configs[0].toneMappingExposure >= 1.2);
  assert.ok(configs[1].toneMappingExposure >= 1.3);

  // Explicit >= High check helper
  assert.equal(isGraphicsAtLeast('low', 'high'), false);
  assert.equal(isGraphicsAtLeast('medium', 'high'), false);
  assert.equal(isGraphicsAtLeast('high', 'high'), true);
  assert.equal(isGraphicsAtLeast('ultra', 'high'), true);

  // Software GL safeguard must disable heavy shadows & post-processing even on Ultra
  const swUltra = getGraphicsSettings('ultra', true);
  assert.equal(swUltra.shadowsEnabled, false);
  assert.equal(swUltra.postProcessing, false);
  assert.equal(swUltra.pixelRatioCap, 1.0);
});

test('all 6 playable cat breeds have valid coat specs and outer archipelago mechanics exist', () => {
  assert.equal(CAT_BREED_ORDER.length, 6);
  for (const breedId of CAT_BREED_ORDER) {
    const spec = CAT_BREED_SPECS[breedId];
    assert.equal(spec.id, breedId);
    assert.match(spec.coatHex, /^#[0-9A-Fa-f]{6}$/);
    assert.match(spec.eyeHex, /^#[0-9A-Fa-f]{6}$/);
    assert.match(spec.swatchPrimary, /^#[0-9A-Fa-f]{6}$/);
    assert.match(spec.swatchSecondary, /^#[0-9A-Fa-f]{6}$/);
  }
  const mech = createHarborMechanicsState();
  assert.ok(mech.echoLedges.length >= 11);
  assert.ok(mech.owls.length >= 7);
  assert.ok(mech.baitPails.length >= 11);
  assert.ok(mech.nests.length >= 11);
});

test('save v1 migrates cleanly to v2 with fishBank, acts, skills, and valid defaults', () => {
  const migrated = migrateSave({
    schemaVersion: 1,
    districtIndex: 2,
    unlockedHarmonics: 3,
    checkpointId: 'cp_mid',
  });
  assert.equal(migrated.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(migrated.districtIndex, 2);
  assert.equal(migrated.highestReachedAct, 0);
  assert.equal(migrated.currentAct, 'harbor');
  assert.equal(migrated.fishBank, 3);
  assert.deepEqual(migrated.unlockedCollars, ['brass_bell']);
  assert.equal(migrated.equippedCollar, 'brass_bell');
  assert.equal(migrated.bestActScores.harbor, 0);
  assert.equal(migrated.bestActScores.cistern, 0);
  assert.equal(migrated.bestActScores.spire, 0);
});

test('progression shop purchases skills/collars, computes bonuses, and awards achievements & scores', () => {
  const base = defaultSaveData();
  const s1 = purchaseSkill(base, 'double_jump');
  assert.ok(s1);
  assert.equal(s1.fishBank, 1);
  assert.ok(s1.unlockedSkills.includes('double_jump'));
  assert.equal(purchaseSkill(s1, 'velvet_paws'), null, 'insufficient fishBank blocks purchase');

  const rich = { ...s1, fishBank: 10 };
  const s2 = purchaseOrEquipCollar(rich, 'sea_silk');
  assert.ok(s2);
  assert.equal(s2.equippedCollar, 'sea_silk');
  assert.equal(s2.fishBank, 7);

  const bonuses = computePlayerBonuses(s2.unlockedSkills, s2.equippedCollar);
  assert.equal(bonuses.maxAirJumps, 1);
  assert.ok(bonuses.swimMult > 1.15);

  const stats = {
    actId: 'harbor' as const,
    rubCount: 2,
    stolenFishCount: 5,
    escapedChaseCount: 2,
    distractedDogsCount: 1,
    stealthAvoidedCount: 4,
    lettersFound: 5,
    doubleJumpsUsed: 1,
    raceWon: true,
    bossDefeated: true,
    chimesCount: 4,
  };
  const score = computeActRunScore(stats);
  assert.ok(score > 2000);
  const { updatedSave, newlyUnlocked } = evaluateAchievements(s2, stats);
  assert.ok(newlyUnlocked.includes('harbor_clear'));
  assert.ok(newlyUnlocked.includes('race_champion'));
  assert.ok(updatedSave.bestActScores.harbor >= score);
  assert.equal(ACHIEVEMENT_ORDER.length, 13);
});

test('parkour double jump works mid-air when maxAirJumps=1 and resets on landing', () => {
  const tuning = createDefaultTuning();
  const deck: WalkSurface = {
    id: 'deck',
    kind: 'roof',
    minX: -10,
    maxX: 10,
    minZ: -10,
    maxZ: 10,
    topY: 1.0,
  };
  const cat = createCatState(0, 1.0, 0);
  cat.surfaceId = 'deck';

  // Primary ground jump
  stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, jumpPressed: true, crouch: false, sprint: false, purr: false },
    [deck],
    tuning.parkour,
    1 / 60,
    [],
    { maxAirJumps: 1 }
  );
  assert.equal(cat.grounded, false);
  assert.equal(cat.airJumpsRemaining, 1);

  // Advance a few air frames, then trigger second jump in mid-air
  for (let i = 0; i < 6; i++) {
    stepCatParkour(
      cat,
      { forward: 0, right: 0, cameraYaw: 0, jumpPressed: false, crouch: false, sprint: false, purr: false },
      [deck],
      tuning.parkour,
      1 / 60,
      [],
      { maxAirJumps: 1 }
    );
  }
  const dj = stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, jumpPressed: true, crouch: false, sprint: false, purr: false },
    [deck],
    tuning.parkour,
    1 / 60,
    [],
    { maxAirJumps: 1 }
  );
  assert.equal(dj.doubleJumped, true);
  assert.equal(cat.airJumpsRemaining, 0);

  // Land back on deck -> airJumpsRemaining resets immediately
  for (let i = 0; i < 120 && !cat.grounded; i++) {
    stepCatParkour(
      cat,
      { forward: 0, right: 0, cameraYaw: 0, jumpPressed: false, crouch: false, sprint: false, purr: false },
      [deck],
      tuning.parkour,
      1 / 60,
      [],
      { maxAirJumps: 1 }
    );
  }
  assert.equal(cat.grounded, true);
  assert.equal(cat.airJumpsRemaining, 1);
});

test('bossSystem supports engage, anchor stagger, defeat, and player vitality HP / Game Over', () => {
  const act = ACT_SPECS.harbor;
  const boss = createBossState(act);
  const vit = createVitalityState('challenger');
  assert.equal(vit.maxHp, 3);

  const cat = createCatState(act.boss.anchors[0].x, act.boss.anchors[0].y, act.boss.anchors[0].z);

  // Engage boss when entering arena
  const e1 = stepBossSystem(boss, vit, cat, { activeToolFired: null, chimeRadius: 8, difficulty: 'challenger' }, 1 / 60);
  assert.equal(e1.engagedNow, true);
  assert.equal(boss.phase, 'patrol');

  // Ring anchor [E] to stagger boss
  const e2 = stepBossSystem(boss, vit, cat, { activeToolFired: 'bell', chimeRadius: 8, difficulty: 'challenger' }, 1 / 60);
  assert.equal(e2.staggeredNow, true);
  assert.equal(boss.phase, 'vulnerable');

  // Move near boss and strike 3 times (stagger via sonic_claw / bell) -> defeat
  cat.x = boss.x;
  cat.y = boss.y;
  cat.z = boss.z;
  const hit1 = stepBossSystem(boss, vit, cat, { activeToolFired: 'bell', chimeRadius: 8, difficulty: 'challenger' }, 1 / 60);
  assert.equal(hit1.damagedBossNow, true);
  assert.equal(boss.hp, act.boss.maxHp - 1);

  // Force remaining hits
  boss.phase = 'vulnerable';
  stepBossSystem(boss, vit, cat, { activeToolFired: 'bell', chimeRadius: 8, difficulty: 'challenger' }, 1 / 60);
  boss.phase = 'vulnerable';
  const hitFinal = stepBossSystem(boss, vit, cat, { activeToolFired: 'bell', chimeRadius: 8, difficulty: 'challenger' }, 1 / 60);
  assert.equal(hitFinal.bossDefeatedNow, true);
  assert.equal(boss.phase, 'defeated');

  // Player vitality damage & heal check
  const vit2 = createVitalityState('standard');
  assert.equal(applyDamageToPlayer(vit2, 1), true);
  assert.equal(vit2.hp, 3);
  assert.equal(healPlayer(vit2, 1), true);
  assert.equal(vit2.hp, 4);
  vit2.invulnTimer = 0;
  applyDamageToPlayer(vit2, 4);
  assert.equal(vit2.defeated, true);
});

test('questSystem tracks Rival Cat 6-ring rooftop race, weather cycle, and 3-act specs & locales', () => {
  assert.equal(ACT_ORDER.length, 3);
  assert.equal(getNextActId('harbor'), 'cistern');
  assert.equal(getNextActId('cistern'), 'spire');
  assert.equal(getNextActId('spire'), null);

  for (const id of ACT_ORDER) {
    const spec = ACT_SPECS[id];
    assert.ok(spec.boss.anchors.length >= 3);
    assert.equal(spec.rivalCat.rings.length, 6);
    assert.ok(spec.spawn.x >= spec.bounds.minX && spec.spawn.x <= spec.bounds.maxX);
  }

  const harbor = ACT_SPECS.harbor;
  const qs = createQuestSystemState(harbor);
  const cat = createCatState(harbor.rivalCat.x, harbor.rivalCat.y, harbor.rivalCat.z);
  assert.equal(isNearRivalCat(cat, harbor), true);

  const started = stepQuestAndWeatherSystem(
    qs,
    harbor,
    cat,
    { stolenFishCount: 0, lettersFound: 0, bossDefeated: false, startRacePressed: true },
    1 / 60
  );
  assert.equal(started.raceStartedNow, true);
  assert.equal(qs.race.active, true);

  // Pass through all 6 rings
  let totalFishEarned = 0;
  for (let i = 0; i < harbor.rivalCat.rings.length; i++) {
    const r = harbor.rivalCat.rings[i];
    cat.x = r.x;
    cat.y = r.y;
    cat.z = r.z;
    const ev = stepQuestAndWeatherSystem(
      qs,
      harbor,
      cat,
      { stolenFishCount: 3, lettersFound: 5, bossDefeated: true, startRacePressed: false },
      0.5
    );
    totalFishEarned += ev.bonusFishEarned;
    if (i === harbor.rivalCat.rings.length - 1) {
      assert.equal(ev.raceWonNow, true);
      assert.ok(totalFishEarned >= 15);
    }
  }
  assert.equal(qs.race.completed, true);
  assert.ok(qs.quests.every((q) => q.completed));

  // Verify weather transitions after cycleDuration
  const wEv = stepQuestAndWeatherSystem(
    qs,
    harbor,
    cat,
    { stolenFishCount: 3, lettersFound: 5, bossDefeated: true, startRacePressed: false },
    qs.weather.cycleDuration + 1
  );
  assert.ok(wEv.weatherChangedTo);
  assert.ok(qs.weather.owlDetectionMult < 1.0);

  // Ferry proximity check
  cat.x = harbor.ferry.x;
  cat.y = harbor.ferry.y;
  cat.z = harbor.ferry.z;
  assert.equal(isNearFerryGondola(cat, harbor), true);

  // All 16 supported languages provide complete campaign locale objects
  for (const lang of SUPPORTED_LANGUAGES) {
    const cl = getCampaignLocale(lang.code);
    assert.ok(cl.acts.harbor.title.length > 0);
    assert.ok(cl.bosses.gufo_oro.name.length > 0);
    assert.ok(cl.den.title.length > 0);
    assert.ok(cl.secretQuests.four_winds_resonance.length > 0);
  }
});

test('parkour multi-step climb blocks ground-to-roof warp and ascends via crate -> awning -> roof with smooth Bezier vy', () => {
  const tuning = createDefaultTuning().parkour;
  const surfaces: WalkSurface[] = [
    { id: 'quay', minX: -12, maxX: -7, minZ: -6, maxZ: 6, topY: 0.5, kind: 'roof' },
    { id: 'crate', minX: -9.8, maxX: -8.3, minZ: -1.1, maxZ: 0.4, topY: 1.58, kind: 'roof' },
    { id: 'awning', minX: -10.3, maxX: -9.0, minZ: -3.7, maxZ: -1.3, topY: 2.62, kind: 'roof' },
    { id: 'rooftop', minX: -16.4, maxX: -10.0, minZ: -1.6, maxZ: 5.6, topY: 3.4, kind: 'roof' },
  ];

  // Ground (0.5m) -> Rooftop (3.4m) is 2.9m high and must NOT be snapped directly
  const cat = createCatState(-8.2, 0.5, 1.5);
  cat.surfaceId = 'quay';
  const highOnly = findBestLedgeCandidate(cat, -0.8, -0.6, [surfaces[0], surfaces[3]], tuning);
  assert.equal(highOnly, null, 'cat cannot warp straight from ground quay (0.5m) to rooftop (3.4m)');

  // Standing on quay facing crate (dy = +1.08m <= 1.70m) MUST find crate
  const step1 = findBestLedgeCandidate(cat, -0.5, -0.86, surfaces, tuning);
  assert.ok(step1);
  assert.equal(step1.surfaceId, 'crate');

  // Initiate hop -> vy must reflect real upward Bezier arc velocity on launch frame
  const jumpRes = stepCatParkour(
    cat,
    { forward: 0.9, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: true },
    surfaces,
    tuning,
    1 / 60
  );
  assert.equal(jumpRes.isLedgeHop, true);
  assert.ok(cat.vy > 1.5, 'Bezier hop must drive upward cat.vy smoothly');

  // Settle on crate, then hop onto awning, then rooftop
  for (let i = 0; i < 45; i++) {
    stepCatParkour(cat, { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false }, surfaces, tuning, 1 / 60);
  }
  assert.equal(cat.surfaceId, 'crate');
  const step2 = findBestLedgeCandidate(cat, -0.2, -0.98, surfaces, tuning);
  assert.ok(step2);
  assert.equal(step2.surfaceId, 'awning');
});

test('secretQuests executes all 3 Harbor mysteries, resets Silent Paw on alarm, drops Mackerel on hit, and unlocks trophies', () => {
  const s = createSecretQuestState('harbor');
  const cat = createCatState(79.0, 0.5, 10.5);

  // 1. Four-Winds Tuning Forks (3 bell chimes across Harbor)
  const b1 = stepSecretQuests(s, cat, {
    bellChimedNow: true,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: false,
  });
  assert.equal(b1.beaconActivatedId, 'fork_east_foundry');
  assert.equal(b1.vaultRevealedNow, false);

  cat.x = -79.5;
  cat.y = 0.5;
  cat.z = 11.5;
  stepSecretQuests(s, cat, {
    bellChimedNow: true,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: false,
  });

  cat.x = 0.0;
  cat.y = 4.8;
  cat.z = -76.5;
  const b3 = stepSecretQuests(s, cat, {
    bellChimedNow: true,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: false,
  });
  assert.equal(b3.vaultRevealedNow, true);
  assert.equal(b3.bonusFishEarned, 6);

  // 2. Order of the Silent Paw: partial feat reset by Owl alarm, then completed cleanly
  stepSecretQuests(s, cat, {
    bellChimedNow: false,
    chimeRadius: 8,
    owlStealthSynced: true,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: false,
  });
  assert.equal(s.silentFeats.purredInBeam, true);

  const alarmEv = stepSecretQuests(s, cat, {
    bellChimedNow: false,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: true,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: false,
  });
  assert.equal(alarmEv.silentResetByAlarm, true);
  assert.equal(s.silentFeats.purredInBeam, false);

  const silentDone = stepSecretQuests(s, cat, {
    bellChimedNow: false,
    chimeRadius: 8,
    owlStealthSynced: true,
    owlAlarmFired: false,
    stalkedGullNow: true,
    sleptNestNow: true,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: false,
  });
  assert.equal(silentDone.bonusFishEarned, 5);
  assert.ok(silentDone.completedSecretIds.includes('silent_paw_order'));

  // 3. Old Salvatore's Clockwork Mackerel: start -> pickup -> drop on hit -> re-pickup -> deliver (+10 fish)
  cat.x = 0;
  cat.y = 0.5;
  cat.z = 73.0;
  const startSal = stepSecretQuests(s, cat, {
    bellChimedNow: false,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: 'bastion_angler',
    interactPressed: true,
    caughtOrHitNow: false,
  });
  assert.equal(startSal.salvatoreStartedNow, true);

  cat.x = 41.0;
  cat.y = 0.5;
  cat.z = 14.5;
  const pickEv = stepSecretQuests(s, cat, {
    bellChimedNow: false,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: false,
  });
  assert.equal(pickEv.mackerelPickedUpNow, true);
  assert.equal(s.salvatoreStage, 'carrying');

  const dropEv = stepSecretQuests(s, cat, {
    bellChimedNow: false,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: true,
  });
  assert.equal(dropEv.mackerelDroppedNow, true);
  assert.equal(s.salvatoreStage, 'active');

  // Re-pickup and deliver to Salvatore
  stepSecretQuests(s, cat, {
    bellChimedNow: false,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: null,
    interactPressed: false,
    caughtOrHitNow: false,
  });
  cat.x = 0.2;
  cat.y = 0.5;
  cat.z = 73.0;
  const deliverEv = stepSecretQuests(s, cat, {
    bellChimedNow: false,
    chimeRadius: 8,
    owlStealthSynced: false,
    owlAlarmFired: false,
    stalkedGullNow: false,
    sleptNestNow: false,
    rubbedPersonId: 'bastion_angler',
    interactPressed: true,
    caughtOrHitNow: false,
  });
  assert.equal(deliverEv.mackerelDeliveredNow, true);
  assert.equal(deliverEv.bonusFishEarned, 10);

  const hudList = getSecretQuestHudList(s);
  assert.equal(hudList.length, 3);
  assert.ok(hudList.every((item) => item.completed));

  const save = defaultSaveData();
  const evalAch = evaluateAchievements(save, {
    actId: 'harbor',
    rubCount: 1,
    stolenFishCount: 0,
    escapedChaseCount: 0,
    distractedDogsCount: 0,
    stealthAvoidedCount: 0,
    lettersFound: 0,
    doubleJumpsUsed: 0,
    raceWon: false,
    bossDefeated: false,
    chimesCount: 3,
    secretQuestsCompleted: s.rewardedIds,
  });
  assert.ok(evalAch.newlyUnlocked.includes('secret_four_winds'));
  assert.ok(evalAch.newlyUnlocked.includes('secret_silent_paw'));
  assert.ok(evalAch.newlyUnlocked.includes('secret_clockwork_fish'));
});

test('hugging close against a crate, bridge, or roof wall still detects upward ledge and jumps cleanly onto it', () => {
  const tuning = createDefaultTuning().parkour;
  const surfaces: WalkSurface[] = [
    { id: 'bridge_to_arsenal', minX: 22.0, maxX: 35.0, minZ: 10.2, maxZ: 13.0, topY: 2.12, kind: 'bridge' },
    { id: 'dist_8', minX: 23.29, maxX: 30.31, minZ: 1.49, maxZ: 8.51, topY: 3.6, kind: 'roof' },
    { id: 'step_bridge_arsenal_w', minX: 21.05, maxX: 22.55, minZ: 8.45, maxZ: 9.95, topY: 1.48, kind: 'roof' },
  ];
  const colliders = [
    { id: 'dist_8_body', minX: 23.48, maxX: 30.12, minZ: 1.68, maxZ: 8.32, minY: -1.0, maxY: 3.46 },
    { id: 'step_bridge_arsenal_w_col', minX: 21.1, maxX: 22.5, minZ: 8.5, maxZ: 9.9, minY: 0.5, maxY: 1.4 },
  ];

  // 1. Hugging close to step crate wall (pressed against minZ - catRadius): must still snap upward cleanly
  const catCrate = createCatState(21.8, 0.5, 8.26);
  catCrate.yaw = 0; // facing +Z directly into step_bridge_arsenal_w
  const crateCand = findBestLedgeCandidate(catCrate, 0, 1, surfaces, tuning);
  assert.ok(crateCand, 'expected close-wall ledge candidate onto crate');
  assert.equal(crateCand.surfaceId, 'step_bridge_arsenal_w');

  // 2. Standing on bridge_to_arsenal facing north (-Z) toward relocated dist_8 (y=3.6): hops straight onto roof
  const catBridge = createCatState(26.8, 2.12, 10.45);
  catBridge.surfaceId = 'bridge_to_arsenal';
  catBridge.yaw = Math.PI; // facing -Z toward dist_8

  const bridgeJumpRes = stepCatParkour(
    catBridge,
    { forward: 1, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: true },
    surfaces,
    tuning,
    1 / 60,
    colliders
  );
  assert.equal(bridgeJumpRes.jumped, true);
  assert.equal(bridgeJumpRes.isLedgeHop, true);

  for (let i = 0; i < 45; i++) {
    stepCatParkour(
      catBridge,
      { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60,
      colliders
    );
  }
  assert.equal(catBridge.surfaceId, 'dist_8');
  assert.ok(Math.abs(catBridge.y - 3.6) < 0.02);

  // 3. Walking straight East across bridge_to_arsenal (x: 22.2 -> 34.5) must never be blocked at z = 11.6
  const walker = createCatState(22.4, 2.12, 11.6);
  walker.surfaceId = 'bridge_to_arsenal';
  walker.yaw = Math.PI * 0.5;
  for (let i = 0; i < 120; i++) {
    stepCatParkour(
      walker,
      { forward: 0, right: 1, cameraYaw: 0, sprint: true, crouch: false, purr: false, jumpPressed: false },
      surfaces,
      tuning,
      1 / 60,
      colliders
    );
  }
  assert.ok(walker.x > 33.5, `cat should cross bridge_to_arsenal unobstructed: x=${walker.x}`);
});

test('pullInCameraFromColliders prevents masonry wall occlusion and preserves open-air camera distance', () => {
  const target = { x: 0, y: 1.5, z: 0 };
  const desired = { x: 0, y: 2.5, z: 4.0 };
  const wall: SolidCollider = {
    id: 'brick_facade',
    minX: -3.0,
    maxX: 3.0,
    minZ: 2.0,
    maxZ: 3.5,
    minY: 0,
    maxY: 6.0,
  };
  const out = { x: 0, y: 0, z: 0 };

  // Open air: unchanged
  pullInCameraFromColliders(target, desired, [], out, 0.3);
  assert.ok(Math.abs(out.z - 4.0) < 1e-4);

  // Occluded by wall at z = 2.0: pulled closer than wall face (z < 2.0)
  pullInCameraFromColliders(target, desired, [wall], out, 0.3);
  assert.ok(out.z < 2.0, `camera must pull forward of wall face: got z=${out.z}`);
  assert.ok(out.z > 1.0, `camera must not collapse inside player target: got z=${out.z}`);
});

test('tactical radar projection and compass cardinals rotate smoothly with camera yaw and clamp range', () => {
  // Yaw = 0 (facing North / -Z): target straight ahead at (0, -24) projects upward (cy < 52, cx === 52)
  const north = projectRadarBlip(0, -24, 0, 0, 0);
  assert.equal(north.inRange, true);
  assert.ok(Math.abs(north.cx - 52) < 0.01);
  assert.ok(north.cy < 52);

  // Far target outside 48m range clamps cleanly inside ring radius (40px from center 52)
  const farEast = projectRadarBlip(120, 0, 0, 0, 0);
  assert.equal(farEast.inRange, false);
  assert.ok(Math.hypot(farEast.cx - 52, farEast.cy - 52) <= 40.01);

  // Compass cardinals: at yaw = 0, 'N' sits at top (x=52, y<52); at yaw = PI/2, 'E' rotates to top
  const c0 = computeCompassCardinals(0);
  const n0 = c0.find((c) => c.label === 'N')!;
  assert.ok(Math.abs(n0.x - 52) < 0.01 && n0.y < 20);

  const c90 = computeCompassCardinals(Math.PI * 0.5);
  const w90 = c90.find((c) => c.label === 'W')!;
  assert.ok(w90.y < 20 || c90.some((c) => c.y < 20));
});

test('cat.lastAirVy captures downward fall speed upon landing for proportional squash and dust VFX', () => {
  const tuning = createDefaultTuning().parkour;
  const roof: WalkSurface = { id: 'flat_roof', minX: -4, maxX: 4, minZ: -4, maxZ: 4, topY: 3.0, kind: 'roof' };
  const cat = createCatState(0, 3.12, 0);
  cat.grounded = false;
  cat.vy = -8.4;

  const res = stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
    [roof],
    tuning,
    1 / 60
  );
  assert.equal(res.landedSurfaceId, 'flat_roof');
  assert.equal(cat.vy, 0);
  assert.ok(cat.lastAirVy <= -8.0, `expected lastAirVy <= -8.0 upon landing, got ${cat.lastAirVy}`);
});

test('Shadow Dash triggers horizontal burst, cooldown, and invulnerability frames against dogs and boss', () => {
  const tuning = createDefaultTuning().parkour;
  const deck: WalkSurface = { id: 'quay_deck', minX: -12, maxX: 12, minZ: -12, maxZ: 12, topY: 0.5, kind: 'roof' };
  const cat = createCatState(0, 0.5, 0);
  cat.surfaceId = 'quay_deck';
  cat.yaw = 0;

  // Trigger Shadow Dash forward (-Z when cameraYaw=0 and forward=1)
  const dashRes = stepCatParkour(
    cat,
    { forward: 1, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false, dashPressed: true },
    [deck],
    tuning,
    1 / 60
  );
  assert.equal(dashRes.dashedNow, true);
  assert.ok(cat.dashTimer > 0.15);
  assert.ok(cat.dashCooldown > 1.4);
  assert.ok(Math.hypot(cat.vx, cat.vz) > 13.5, `expected high dash speed, got ${Math.hypot(cat.vx, cat.vz)}`);

  // Repeated dash input during cooldown must not retrigger
  const blockedRes = stepCatParkour(
    cat,
    { forward: 1, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false, dashPressed: true },
    [deck],
    tuning,
    1 / 60
  );
  assert.equal(blockedRes.dashedNow, false);

  // Dash grants i-frames against an attacking chasing dog
  const dog = createDogNpc('guard', '#885533', [{ x: cat.x, y: cat.y, z: cat.z - 0.3 }]);
  dog.behavior = 'chase';
  dog.chaseTimer = 2.0;
  dog.caughtCooldown = 0;
  const npcState: NpcWorldState = { people: [], dogs: [dog], birds: [] };
  const npcEv = stepNpcs(npcState, cat, false, 1 / 60, false, []);
  assert.equal(npcEv.caughtCat, false, 'dog must not catch Pip while Shadow Dash i-frames active');

  // Dash grants i-frames against boss attack lunge
  const boss = createBossState(ACT_SPECS.harbor);
  boss.active = true;
  boss.phase = 'attack';
  boss.phaseTimer = 0.5;
  boss.x = cat.x;
  boss.y = cat.y;
  boss.z = cat.z;
  const vitality = createVitalityState('standard');
  const bossEv = stepBossSystem(boss, vitality, cat, { activeToolFired: null, chimeRadius: 6, difficulty: 'standard' }, 1 / 60);
  assert.equal(bossEv.damagedPlayerNow, false, 'boss attack must not damage Pip while Shadow Dash i-frames active');
  assert.equal(vitality.hp, vitality.maxHp);
});

test('Moonlight Coat-Glide slows mid-air descent when holding jump and disengages on landing', () => {
  const tuning = createDefaultTuning().parkour;
  const ground: WalkSurface = { id: 'harbor_quay', minX: -10, maxX: 10, minZ: -10, maxZ: 10, topY: 0.5, kind: 'roof' };
  const cat = createCatState(0, 8.0, 0);
  cat.grounded = false;
  cat.vy = -5.5;

  const glideRes = stepCatParkour(
    cat,
    { forward: 1, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false, jumpHeld: true },
    [ground],
    tuning,
    1 / 60
  );
  assert.equal(glideRes.glideStarted, true);
  assert.equal(cat.gliding, true);
  assert.ok(cat.vy >= -1.86, `expected clamped glide fall speed >= -1.86, got ${cat.vy}`);

  // Dropping onto surface exits glide automatically
  cat.y = 0.55;
  cat.vy = -1.8;
  stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false, jumpHeld: true },
    [ground],
    tuning,
    1 / 60
  );
  assert.equal(cat.grounded, true);
  assert.equal(cat.gliding, false);
});

test('batchStaticGroupByMaterial merges static meshes by material & chunk while preserving protected dynamic nodes', () => {
  const root = new THREE.Group();
  const matA = new THREE.MeshStandardMaterial({ color: '#c48f60' });
  const matB = new THREE.MeshStandardMaterial({ color: '#456878' });

  // 3 static Box/Cylinder meshes with matA in cell (0,0) -> should merge into 1 chunk mesh
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(i === 2 ? new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8) : new THREE.BoxGeometry(1, 1, 1), matA);
    m.position.set(i * 2, 0.5, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }

  // 2 static meshes with matB -> 1 merged chunk mesh
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), matB);
    m.position.set(i * 3, 1.0, 2);
    root.add(m);
  }

  // Protected dynamic gear & stealable fish must remain separate and unbatched
  const gearGrp = new THREE.Group();
  gearGrp.userData.noBatch = true;
  gearGrp.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), matA));
  root.add(gearGrp);

  const fishGrp = new THREE.Group();
  fishGrp.userData.stealableFish = true;
  fishGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.2), matA));
  root.add(fishGrp);

  const res = batchStaticGroupByMaterial(root, 64);
  assert.equal(res.mergedCount, 5);
  assert.equal(res.chunkCount, 2);
  assert.equal(gearGrp.children.length, 1);
  assert.equal(fishGrp.children.length, 1);

  for (const g of res.disposableGeos) g.dispose();
  matA.dispose();
  matB.dispose();
});

test('computeDaylightProfile transitions cleanly from Dawn through Noon to Starry Dusk with firefly & window glow boosts', () => {
  const dawn = computeDaylightProfile(0.05, 'clear', 'harbor');
  const noon = computeDaylightProfile(0.34, 'clear', 'harbor');
  const dusk = computeDaylightProfile(0.7, 'clear', 'harbor');

  assert.equal(dawn.phaseName, 'dawn');
  assert.equal(noon.phaseName, 'noon');
  assert.equal(dusk.phaseName, 'dusk');

  // Sun rises highest at Noon and drops low toward Dusk
  assert.ok(noon.sunDir[1] > dawn.sunDir[1]);
  assert.ok(noon.sunDir[1] > dusk.sunDir[1]);

  // Dusk ignites glowing windows, lanterns & fireflies strongly compared to bright Noon
  assert.ok(dusk.duskFactor > noon.duskFactor + 0.8);
  assert.ok(dusk.windowGlowMult > noon.windowGlowMult * 2.5);
  assert.ok(dusk.fireflyVisibility > noon.fireflyVisibility * 4.0);

  // Rain weather softens sunlight intensity smoothly
  const noonRain = computeDaylightProfile(0.34, 'rain', 'harbor');
  assert.ok(noonRain.sunIntensityMult < noon.sunIntensityMult);

  // Cistern keeps dedicated cool subterranean tone regardless of outdoor phase
  const cisternNoon = computeDaylightProfile(0.34, 'clear', 'cistern');
  assert.equal(cisternNoon.phaseName, 'dusk');
  assert.ok(cisternNoon.sunColor.g > cisternNoon.sunColor.r);

  // Collar catalog retains valid hex accents for dynamic scarf dyeing
  assert.ok(COLLAR_CATALOG.every((c) => /^#[0-9A-Fa-f]{6}$/.test(c.accentHex)));
});

test('computeAstrolabeReadout tracks sun/moon angles and horizons across day phases', () => {
  const dawn = computeAstrolabeReadout(0.06, 'harbor');
  const noon = computeAstrolabeReadout(0.34, 'harbor');
  const dusk = computeAstrolabeReadout(0.7, 'harbor');

  assert.equal(dawn.phaseName, 'dawn');
  assert.equal(noon.phaseName, 'noon');
  assert.equal(dusk.phaseName, 'dusk');

  // At 0.34 noon sun should sit near dial zenith (270 deg in SVG screen space) & moon opposite at 90 deg
  assert.ok(Math.abs(noon.sunAngleDeg - 270) < 0.5, `expected noon sun zenith ~270, got ${noon.sunAngleDeg}`);
  assert.ok(Math.abs(((noon.sunAngleDeg + 180) % 360) - noon.moonAngleDeg) < 1e-4);
  assert.ok(dusk.horizonWarmth > noon.horizonWarmth);

  // Subterranean cistern stays in deep dusk calibration
  const cistern = computeAstrolabeReadout(0.34, 'cistern');
  assert.equal(cistern.phaseName, 'dusk');
});

test('computeCameraDynamics scales FOV, look-ahead, distance, and speed streaks accurately', () => {
  const idle = computeCameraDynamics({ horizSpeed: 0, gliding: false, dashing: false, swimming: false, sprinting: false });
  assert.equal(idle.targetFov, 52.0);
  assert.equal(idle.speedLineIntensity, 0);
  assert.equal(idle.distOffset, 0);

  const sprint = computeCameraDynamics({ horizSpeed: 8.6, gliding: false, dashing: false, swimming: false, sprinting: true });
  assert.ok(sprint.targetFov > idle.targetFov);
  assert.ok(sprint.speedLineIntensity > 0.4);

  const dash = computeCameraDynamics({ horizSpeed: 14.0, gliding: false, dashing: true, swimming: false, sprinting: true });
  assert.equal(dash.targetFov, 59.0);
  assert.equal(dash.speedLineIntensity, 1.0);
  assert.ok(dash.lookAheadFactor > idle.lookAheadFactor);

  const swim = computeCameraDynamics({ horizSpeed: 3.5, gliding: false, dashing: false, swimming: true, sprinting: false });
  assert.ok(swim.distOffset < 0);
  assert.equal(swim.speedLineIntensity, 0);
});

test('resolvePawSurfaceType maps ground materials cleanly for surface acoustics', () => {
  assert.equal(resolvePawSurfaceType('harbor_quay', true, null), 'water');
  assert.equal(resolvePawSurfaceType('pipe_span', false, 'pipe'), 'metal');
  assert.equal(resolvePawSurfaceType('bridge_to_arsenal', false, 'bridge'), 'wood');
  assert.equal(resolvePawSurfaceType('skiff_2', false, null), 'wood');
  assert.equal(resolvePawSurfaceType('dist_3', false, 'roof'), 'roof');
  assert.equal(resolvePawSurfaceType('south_quay', false, null), 'stone');
});

test('perched birds turn their head curiously toward crouching/purring Pip without spooking', () => {
  const bird = createPerchedBirdNpc('gull_1', 'gull', 0, 1.0, 0, 0);
  const cat = createCatState(1.6, 1.0, 1.6);
  cat.crouching = true;
  cat.purring = true;

  const npcState: NpcWorldState = { people: [], dogs: [], birds: [bird] };
  for (let i = 0; i < 20; i++) {
    stepNpcs(npcState, cat, false, 1 / 60);
  }
  assert.equal(bird.mode, 'perched');
  assert.ok(Math.abs(bird.headTurn ?? 0) > 0.25, `expected curious bird headTurn, got ${bird.headTurn}`);

  // When cat sprints close, bird takes flight and resets headTurn
  cat.crouching = false;
  cat.purring = false;
  cat.sprinting = true;
  cat.x = 0.5;
  cat.z = 0.5;
  stepNpcs(npcState, cat, false, 1 / 60);
  assert.equal(bird.mode, 'flying');
  assert.equal(bird.headTurn, 0);
});

test('computeFelinePose produces bent-limb feline launch, curved descent reach, and shock-absorbing landing', () => {
  const standCat = createCatState(0, 1.0, 0);
  const standPose = computeFelinePose(standCat, 0, 1.0);
  assert.ok(standPose.shinFL < -0.1, 'standing front elbow should stay naturally softly curved');
  assert.ok(standPose.shinBL > 0.3, 'standing hind hock should hold natural Z-bend');

  // 1. Takeoff drive: front paws tuck tightly under chin while hind legs kick back
  const takeoffCat = createCatState(0, 1.4, 0);
  takeoffCat.grounded = false;
  takeoffCat.vy = 5.4;
  takeoffCat.jumpAnimTimer = 0.02;
  const takeoffPose = computeFelinePose(takeoffCat, 4.0, 1.1);
  assert.ok(takeoffPose.shinFL < -1.0, `expected tucked front elbows on takeoff, got ${takeoffPose.shinFL}`);
  assert.ok(takeoffPose.legBL > 0.4, `expected hind legs extending backward on launch, got ${takeoffPose.legBL}`);

  // 2. Descent reach: bent front elbows & forward-swung hind thighs (never straight robot stilts!)
  const descendCat = createCatState(0, 2.2, 0);
  descendCat.grounded = false;
  descendCat.vy = -4.2;
  descendCat.jumpAnimTimer = 0.42;
  const descendPose = computeFelinePose(descendCat, 3.8, 1.5);
  assert.ok(descendPose.shinFL < -0.35, `descending front elbows must stay curved, got ${descendPose.shinFL}`);
  assert.ok(descendPose.legBL < -0.3, `descending hind thighs must swing forward to absorb shock, got ${descendPose.legBL}`);
  assert.ok(descendPose.shinBL > 0.6, `descending hind hocks must stay bent, got ${descendPose.shinBL}`);

  // 3. Touchdown shock absorption: deep elbow & hock compression + bodyY sink + head gimbal stabilization
  const landCat = createCatState(0, 1.0, 0);
  landCat.grounded = true;
  landCat.landTimer = 0.14;
  landCat.landImpact = 0.9;
  const landPose = computeFelinePose(landCat, 0, 2.0);
  assert.ok(landPose.bodyY < standPose.bodyY - 0.05, `expected landing crouch drop bodyY=${landPose.bodyY} < ${standPose.bodyY}`);
  assert.ok(landPose.shinFL < -0.65, `expected compressed front elbows on landing, got ${landPose.shinFL}`);
  assert.ok(landPose.legBL < -0.55 && landPose.shinBL > 0.85, 'expected deeply coiled hind legs on landing');
  assert.ok(landPose.headCounterPitch < -0.05, 'expected head stabilization counter-pitch on touchdown');
});

test('feline wall-kick rebounds off vertical masonry without spending double-jump and builds parkour flow chain', () => {
  const tuning = createDefaultTuning().parkour;
  const wall: SolidCollider = {
    id: 'harbor_wall',
    minX: 1.0,
    maxX: 3.0,
    minZ: -5.0,
    maxZ: 5.0,
    minY: 0.0,
    maxY: 6.0,
  };
  const ground: WalkSurface = { id: 'courtyard', minX: -6, maxX: 6, minZ: -6, maxZ: 6, topY: 0.5, kind: 'roof' };

  const cat = createCatState(0.76, 2.2, 0);
  cat.grounded = false;
  cat.vy = 1.0;
  cat.vx = 4.2;
  cat.airTime = 0.14;
  cat.maxAirJumps = 1;
  cat.airJumpsRemaining = 1;
  cat.parkourChain = 1;
  cat.parkourFlowTimer = 3.0;

  // Brush directly into the west face of harbor_wall (minX = 1.0)
  stepCatParkour(
    cat,
    { forward: 0, right: 1, cameraYaw: 0, sprint: true, crouch: false, purr: false, jumpPressed: false },
    [ground],
    tuning,
    1 / 60,
    [wall]
  );
  assert.ok(cat.wallContactTimer > 0, 'airborne contact against masonry should arm wallContactTimer');
  assert.ok(cat.lastWallNormalX < -0.5, `expected outward -X wall normal, got ${cat.lastWallNormalX}`);

  // Press Jump -> triggers agile wall-kick rebound away from wall without consuming airJumpsRemaining
  const kickRes = stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: true },
    [ground],
    tuning,
    1 / 60,
    [wall]
  );
  assert.equal(kickRes.jumped, true);
  assert.equal(kickRes.wallKicked, true);
  assert.ok(cat.vx < -2.0, `wall-kick should launch cat away from wall (-X), got vx=${cat.vx}`);
  assert.ok(cat.airSpinTimer > 0.2, 'wall-kick should trigger aerial corkscrew flip');
  assert.equal(cat.airJumpsRemaining, 1, 'wall-kick must preserve double-jump charge');
  assert.equal(cat.parkourChain, 2, 'consecutive wall-kick should build Parkour Flow chain to x2');

  // Entering water resets Parkour Flow cleanly
  cat.y = -0.25;
  cat.vy = -2.0;
  cat.x = -12;
  const splashRes = stepCatParkour(
    cat,
    { forward: 0, right: 0, cameraYaw: 0, sprint: false, crouch: false, purr: false, jumpPressed: false },
    [ground],
    tuning,
    1 / 60,
    [wall]
  );
  assert.equal(splashRes.enteredWater, true);
  assert.equal(cat.parkourChain, 0, 'splashing into canal should reset Parkour Flow chain');
});





