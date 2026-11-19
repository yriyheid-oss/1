import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { afterDraw, detectSoftwareGl } from '../core/loop';
import {
  InputManager,
  type InputSnapshot,
  type VirtualHeldAction,
  type VirtualPulseAction,
} from '../core/input';
import { EventBus } from '../core/events';
import { createRng, getSeedFromUrl } from '../core/rng';
import { playSound, resolvePawSurfaceType, soundEngine } from '../core/audio';
import {
  createDefaultTuning,
  getDifficultyModifiers,
  getGraphicsSettings,
  getSavedCatBreed,
  getSavedGraphicsLevel,
  GRAPHICS_LEVEL_RANK,
  isGraphicsAtLeast,
  saveCatBreed,
  saveGraphicsLevel,
  type CatBreedId,
  type DifficultyLevel,
  type GameTuning,
  type GraphicsLevel,
} from '../data/tuning';
import { cycleToolId, TOOL_ORDER, TOOL_SPECS, type ToolId } from '../data/tools';
import type { MusicZone, RightClickMode } from '../data/i18n';
import { createCatState, pullInCameraFromColliders, stepCatParkour, WORLD_BOUNDS, type SolidCollider, type WalkSurface } from '../systems/parkour';
import {
  createDogNpc,
  createPerchedBirdNpc,
  createPersonNpc,
  createSoaringBirdNpc,
  stepNpcs,
  type NpcWorldState,
} from '../systems/npcSystem';
import {
  createDawnEnvironment,
  createDawnSkyDome,
  createWorldMaterials,
  PALETTE,
} from './materials';
import { createCatRig, updateCatVisual } from './catMesh';
import { batchStaticGroupByMaterial } from './batchStaticMeshes';
import {
  createBirdRig,
  createDogRig,
  createPersonRig,
  updateBirdVisual,
  updateDogVisual,
  updatePersonVisual,
  type BirdRig,
  type DogRig,
  type PersonRig,
} from './npcMesh';
import {
  computeTricksterRank,
  computeTricksterRankKey,
  createInitialStoryState,
  getStoryChapterInfo,
  stepStorySystem,
  type FishSpot,
  type NearbyInteraction,
  type StoryChapter,
  type TricksterRankKey,
} from '../systems/storySystem';
import {
  createHarborMechanicsState,
  determineMusicZone,
  stepHarborMechanics,
  tipBaitPail,
  type HarborMechanicsState,
} from '../systems/harborMechanics';
import {
  ACT_SPECS,
  getNextActId,
  type ActId,
  type ActSpec,
  type BossId,
  type WeatherKind,
} from '../data/acts';
import {
  loadSave,
  writeSave,
  type CollarId,
  type SaveData,
  type SkillId,
} from '../core/save';
import {
  COLLAR_CATALOG,
  computeActRunScore,
  computePlayerBonuses,
  evaluateAchievements,
  purchaseOrEquipCollar,
  purchaseSkill,
  type PlayerBonuses,
} from '../systems/progression';
import {
  computeCameraDynamics,
  computeDaylightProfile,
  DAY_CYCLE_DURATION_SEC,
  DEFAULT_HARBOR_START_PHASE,
  type DayPhaseName,
} from '../systems/atmosphere';
import {
  applyDamageToPlayer,
  createBossState,
  createVitalityState,
  healPlayer,
  stepBossSystem,
  type BossPhase,
  type BossState,
  type VitalityState,
} from '../systems/bossSystem';
import {
  createQuestSystemState,
  isNearFerryGondola,
  isNearRivalCat,
  stepQuestAndWeatherSystem,
  type QuestProgressItem,
  type QuestSystemState,
} from '../systems/questSystem';
import {
  buildSecondaryActWorld,
  createArenaAnchorVisual,
  createBossRig,
  createFerryGondolaVisual,
  createRaceRingVisual,
  type AnchorVisual,
  type BossRig,
  type FerryVisual,
  type RaceRingVisual,
  type SecondaryActWorld,
} from './actBuilders';
import type { RadarBlip } from '../components/TacticalRadar';
import {
  createSecretQuestState,
  getSecretQuestHudList,
  SECRET_VAULT_SURFACE_SPEC,
  stepSecretQuests,
  type SecretQuestHudItem,
  type SecretQuestState,
} from '../systems/secretQuests';
import {
  buildBaitPail,
  buildCozyNestMesh,
  buildDecoyFishVisual,
  buildEchoBridgeMesh,
  buildFishBasket,
  buildFishCuttingBoard,
  buildFishingNetDryingRack,
  buildFishingTackleSet,
  buildMarcoLetterMesh,
  buildMillWaterwheelVisual,
  buildOwlSearchlightRig,
  collectStealableFishMeshes,
  createFeatherBurst,
  createHarborPropAssets,
  type BaitPailVisual,
  type EchoBridgeVisual,
  type OwlSearchlightVisual,
  type WaterwheelVisual,
} from './harborProps';
import {
  buildBuntingLine,
  buildCanalMooringPost,
  buildCanalQuayWall,
  buildCanalSkiff,
  buildClockworkDamWall,
  buildClockworkGear,
  buildCopperPipeBridge,
  buildDawnSunShaft,
  buildDistantCampanile,
  buildFloodedShopAwning,
  buildHangingCable,
  buildHarborLighthouse,
  buildLanternPost,
  buildOlivePot,
  buildPierBarrels,
  buildRooftopBuilding,
  buildStoneCanalBridge,
  getBuildingPhysics,
} from './worldProps';

export type GameModeState = 'title' | 'playing' | 'paused' | 'gameover';

export type HudNearbyKind =
  | NearbyInteraction['kind']
  | 'rival_race'
  | 'board_ferry'
  | 'ferry_locked'
  | 'salvatore_start'
  | 'salvatore_deliver'
  | 'pickup_mackerel';

export interface HudBossInfo {
  id: BossId;
  active: boolean;
  phase: BossPhase;
  hp: number;
  maxHp: number;
}

export interface HudRaceInfo {
  active: boolean;
  completed: boolean;
  nextRingIndex: number;
  totalRings: number;
  timeRemaining: number;
}

export interface HudTelemetry {
  actId: ActId;
  districtLabel: string;
  objectiveText: string;
  chapter: StoryChapter;
  rank: string;
  rankKey: TricksterRankKey;
  chimesCount: number;
  jumpsCount: number;
  rubCount: number;
  stolenFishCount: number;
  purrCount: number;
  escapedChaseCount: number;
  distractedDogsCount: number;
  wheelsReversedCount: number;
  lettersFound: number;
  lettersTotal: number;
  gullsStalkedCount: number;
  nestsSleptCount: number;
  chasedByDog: boolean;
  carryingFish: boolean;
  owlInBeam: boolean;
  owlSuspicion: number;
  owlStealthSynced: boolean;
  warmthTimer: number;
  sleeping: boolean;
  nearbyPrompt: string | null;
  nearbyKind: HudNearbyKind | null;
  dialogue: { id?: string; speaker: string; text: string } | null;
  storyComplete: boolean;
  targetLedgeReady: boolean;
  swimming: boolean;
  crouching: boolean;
  purring: boolean;
  bellCooldownPct: number;
  checkpointReached: boolean;
  activeTool: ToolId;
  toolCooldowns: Record<ToolId, number>;
  musicZone: MusicZone;
  difficulty: DifficultyLevel;
  graphicsLevel: GraphicsLevel;
  catBreed: CatBreedId;
  rightClickMode: RightClickMode;
  hp: number;
  maxHp: number;
  boss: HudBossInfo;
  quests: QuestProgressItem[];
  secretQuests: SecretQuestHudItem[];
  carryingGoldenMackerel: boolean;
  race: HudRaceInfo;
  weather: WeatherKind;
  catX: number;
  catZ: number;
  camYaw: number;
  radarBlips: RadarBlip[];
  save: SaveData;
  outcome: 'victory' | 'defeat' | null;
  runScore: number;
  hasDoubleJump: boolean;
  airJumpsRemaining: number;
  dashCooldownPct: number;
  dashActive: boolean;
  gliding: boolean;
  senseCooldownPct: number;
  senseActive: boolean;
  dayPhase: DayPhaseName;
  dayCyclePhase: number;
  speed: number;
  parkourChain: number;
  wallKicksUsed: number;
}

export interface SceneController {
  setMode: (mode: GameModeState) => void;
  resetRun: () => void;
  setAct: (actId: ActId) => void;
  advanceToNextAct: () => void;
  continueAfterVictory: () => void;
  buySkill: (id: SkillId) => SaveData;
  collarAction: (id: CollarId) => SaveData;
  getSaveData: () => SaveData;
  toggleMute: () => boolean;
  toggleMusic: () => boolean;
  toggleSfx: () => boolean;
  selectTool: (tool: ToolId) => void;
  setDifficulty: (level: DifficultyLevel) => void;
  setGraphicsQuality: (level: GraphicsLevel) => void;
  setCatBreed: (breed: CatBreedId) => void;
  setRightClickMode: (mode: RightClickMode) => void;
  setVirtualAxis: (forward: number, right: number) => void;
  setVirtualHeld: (action: VirtualHeldAction, active: boolean) => void;
  pressVirtualAction: (action: VirtualPulseAction) => void;
  dispose: () => void;
}

interface RippleRing {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  maxAge: number;
  maxRadius: number;
}

const CinematicGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 col = tex.rgb;
      // Subtle split-tone contrast: cool deep canal shadows + warm amber dawn highlights
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.92, 0.99, 1.04);
      vec3 highTint = vec3(1.05, 1.01, 0.94);
      col *= mix(shadowTint, highTint, smoothstep(0.18, 0.78, lum));
      // Soft cinema optical vignette
      vec2 centered = vUv - 0.5;
      float vignette = smoothstep(0.92, 0.24, dot(centered, centered) * 1.45);
      col *= mix(0.68, 1.0, vignette);
      // Ultra-fine film grain
      float grain = (hash12(vUv * 1200.0 + fract(uTime) * 37.0) - 0.5) * 0.018;
      col += grain;
      gl_FragColor = vec4(max(vec3(0.0), col), tex.a);
    }
  `,
};

declare global {
  interface Window {
    __metrics?: Record<string, unknown>;
    __GAME__?: Record<string, unknown>;
  }
}

export function mountHelloGameScene(
  container: HTMLElement,
  initialMode: GameModeState,
  onModeChange: (mode: GameModeState) => void,
  onTelemetry: (hud: HudTelemetry) => void
): SceneController {
  const seed = getSeedFromUrl();
  const rng = createRng(seed);
  const tuning: GameTuning = createDefaultTuning();
  const events = new EventBus();
  const input = new InputManager();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  const isSoftwareGl = detectSoftwareGl(renderer);
  let graphicsLevel: GraphicsLevel = getSavedGraphicsLevel();
  let gfxSettings = getGraphicsSettings(graphicsLevel, isSoftwareGl);

  renderer.setPixelRatio(
    isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, gfxSettings.pixelRatioCap)
  );
  renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
  renderer.toneMapping = graphicsLevel === 'low' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = gfxSettings.toneMappingExposure;
  renderer.shadowMap.enabled = gfxSettings.shadowsEnabled;
  if (!isSoftwareGl) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.fogTeal);
  const sceneFog = new THREE.FogExp2(PALETTE.fogTeal, gfxSettings.fogDensity);
  scene.fog = sceneFog;

  // Atmospheric Dawn Sky Dome + HDR Dawn Environment reflections
  const skyDome = createDawnSkyDome();
  skyDome.setEcoMode(graphicsLevel === 'low');
  scene.add(skyDome.mesh);
  const envTarget = createDawnEnvironment(renderer);
  scene.environment = envTarget.texture;
  scene.environmentIntensity =
    graphicsLevel === 'low' ? 0 : graphicsLevel === 'medium' ? 0.28 : graphicsLevel === 'high' ? 0.95 : 1.25;

  const camera = new THREE.PerspectiveCamera(
    52,
    (container.clientWidth || 1280) / (container.clientHeight || 720),
    0.1,
    gfxSettings.cameraFar
  );

  // Post-processing stack on hardware GPU (Bloom + Filmic Split-Tone Grade + Vignette)
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  let gradePass: ShaderPass | null = null;
  if (!isSoftwareGl) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth || 1280, container.clientHeight || 720),
      gfxSettings.bloomStrength || 0.36,
      0.42,
      0.8
    );
    composer.addPass(bloomPass);
    gradePass = new ShaderPass(CinematicGradeShader);
    composer.addPass(gradePass);
    composer.addPass(new OutputPass());
  }

  // Three-point Dawn Atmospheric Lighting
  const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 0.95);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(PALETTE.dawnKey, 2.65);
  keyLight.position.set(22, 16, 18);
  scene.add(keyLight.target);
  if (!isSoftwareGl) {
    keyLight.castShadow = gfxSettings.shadowsEnabled;
    keyLight.shadow.mapSize.set(gfxSettings.shadowMapSize, gfxSettings.shadowMapSize);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 110;
    keyLight.shadow.camera.left = -38;
    keyLight.shadow.camera.right = 38;
    keyLight.shadow.camera.top = 38;
    keyLight.shadow.camera.bottom = -38;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight('#67A1B3', 0.85);
  rimLight.position.set(-18, 9, -22);
  scene.add(rimLight);

  const mats = createWorldMaterials(renderer);
  mats.waterSurface.envMapIntensity = gfxSettings.waterEnvIntensity;
  mats.waterUniforms.uWaterQuality.value = gfxSettings.waterQualityTier;
  mats.waterUniforms.uEnableGlints.value = isGraphicsAtLeast(graphicsLevel, 'high') ? 1 : 0;

  // Reflective Dawn Canal Water Surface at y = 0.0 (vast 370x340m Venetian lagoon & open horizon)
  const waterGeo = new THREE.PlaneGeometry(1080, 1080, 48, 48);
  const waterMesh = new THREE.Mesh(waterGeo, mats.waterSurface);
  waterMesh.rotation.x = -Math.PI * 0.5;
  waterMesh.position.y = 0;
  waterMesh.receiveShadow = gfxSettings.shadowsEnabled;
  scene.add(waterMesh);

  // Isolate Act I Harbor world inside a dedicated group so Acts II & III swap cleanly
  const harborGroup = new THREE.Group();
  scene.add(harborGroup);

  // Walkable surfaces + solid obstacle colliders for Rooftop Awakening course & flanking canal city
  const surfaces: WalkSurface[] = [
    { id: 'roof_start', minX: -3.31, maxX: 3.31, minZ: -3.31, maxZ: 3.31, topY: 3.0, kind: 'roof' },
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
    { id: 'roof_belfry', minX: -3.51, maxX: 3.51, minZ: -13.71, maxZ: -7.29, topY: 3.6, kind: 'roof' },
    { id: 'roof_perch', minX: -2.31, maxX: 2.31, minZ: -18.31, maxZ: -14.69, topY: 4.8, kind: 'roof' },
  ];
  const colliders: SolidCollider[] = [];
  const chimneyVents: Array<{ x: number; y: number; z: number }> = [];

  const registerBuilding = (
    id: string,
    x: number,
    z: number,
    w: number,
    d: number,
    y: number,
    withGable: boolean,
    withProps: boolean
  ) => {
    const phys = getBuildingPhysics(id, x, z, w, d, y, withGable);
    if (phys.gableSurface) surfaces.push(phys.gableSurface);
    colliders.push(...phys.colliders);
    if (phys.chimneyTop) chimneyVents.push(phys.chimneyTop);
    if (withProps) {
      colliders.push(
        {
          id: `${id}_crate`,
          minX: x - w * 0.34 - 0.28,
          maxX: x - w * 0.34 + 0.28,
          minZ: z + d * 0.34 - 0.28,
          maxZ: z + d * 0.34 + 0.28,
          minY: y,
          maxY: y + 0.44,
        },
        {
          id: `${id}_planter`,
          minX: x + w * 0.36 - 0.35,
          maxX: x + w * 0.36 + 0.35,
          minZ: z + d * 0.32 - 0.19,
          maxZ: z + d * 0.32 + 0.19,
          minY: y,
          maxY: y + 0.32,
        }
      );
    }
  };

  const roofStart = buildRooftopBuilding(6.4, 6.4, 3.0, mats, true, false, true);
  roofStart.position.set(0, 0, 0);
  harborGroup.add(roofStart);
  registerBuilding('roof_start', 0, 0, 6.4, 6.4, 3.0, true, true);

  // Continuous sloped copper pipe & timber bridge flush from roofStart (3.0) up to roofBelfry (3.6)
  const pipeBridge = buildCopperPipeBridge(0, 3.0, -3.2, 0, 3.6, -7.4, mats);
  harborGroup.add(pipeBridge);

  const roofBelfry = buildRooftopBuilding(6.8, 6.2, 3.6, mats, true, true, true);
  roofBelfry.position.set(0, 0, -10.5);
  harborGroup.add(roofBelfry);
  registerBuilding('roof_belfry', 0, -10.5, 6.8, 6.2, 3.6, true, true);

  const roofPerch = buildRooftopBuilding(4.4, 3.4, 4.8, mats, false, true, false);
  roofPerch.position.set(0, 0, -16.5);
  harborGroup.add(roofPerch);
  registerBuilding('roof_perch', 0, -16.5, 4.4, 3.4, 4.8, false, false);

  // Extended flooded stone canal embankments flanking the expanded waterway
  const quayLeft = buildCanalQuayWall(3.2, 72, 0.48, mats);
  quayLeft.position.set(-8.6, 0, -12.0);
  harborGroup.add(quayLeft);
  surfaces.push({ id: 'quay_left', minX: -10.29, maxX: -6.91, minZ: -48.09, maxZ: 24.09, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'quay_left_body', minX: -10.2, maxX: -7.0, minZ: -48.0, maxZ: 24.0, minY: -1.0, maxY: 0.42 });

  const quayRight = buildCanalQuayWall(3.2, 72, 0.48, mats);
  quayRight.position.set(8.6, 0, -12.0);
  quayRight.rotation.y = Math.PI;
  harborGroup.add(quayRight);
  surfaces.push({ id: 'quay_right', minX: 6.91, maxX: 10.29, minZ: -48.09, maxZ: 24.09, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'quay_right_body', minX: 7.0, maxX: 10.2, minZ: -48.0, maxZ: 24.0, minY: -1.0, maxY: 0.42 });

  // Expanded East & West Fish Market Waterfront Piers (open walkable harbor plazas)
  const pierMarketE = buildCanalQuayWall(12.6, 12.0, 0.48, mats);
  pierMarketE.position.set(16.5, 0, 11.6);
  harborGroup.add(pierMarketE);
  surfaces.push({ id: 'pier_market_e', minX: 10.1, maxX: 22.9, minZ: 5.5, maxZ: 17.7, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'pier_market_e_body', minX: 10.2, maxX: 22.8, minZ: 5.6, maxZ: 17.6, minY: -1.0, maxY: 0.42 });

  const pierMarketW = buildCanalQuayWall(12.6, 12.0, 0.48, mats);
  pierMarketW.position.set(-16.5, 0, 11.6);
  pierMarketW.rotation.y = Math.PI;
  harborGroup.add(pierMarketW);
  surfaces.push({ id: 'pier_market_w', minX: -22.9, maxX: -10.1, minZ: 5.5, maxZ: 17.7, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'pier_market_w_body', minX: -22.8, maxX: -10.2, minZ: 5.6, maxZ: 17.6, minY: -1.0, maxY: 0.42 });

  // Venetian stone canal arch bridges linking flanking city blocks & southern market piers
  const archBridgeL = buildStoneCanalBridge(6.2, 1.85, 2.6, mats);
  archBridgeL.position.set(-5.8, 0, -4.4);
  harborGroup.add(archBridgeL);
  surfaces.push({ id: 'arch_bridge_l', minX: -8.9, maxX: -2.7, minZ: -5.7, maxZ: -3.1, topY: 2.02, kind: 'bridge' });
  colliders.push(
    { id: 'arch_l_pier_l', minX: -9.2, maxX: -8.1, minZ: -5.8, maxZ: -3.0, minY: -1.0, maxY: 1.82 },
    { id: 'arch_l_pier_r', minX: -3.5, maxX: -2.4, minZ: -5.8, maxZ: -3.0, minY: -1.0, maxY: 1.82 }
  );

  const archBridgeR = buildStoneCanalBridge(6.2, 2.05, 2.6, mats);
  archBridgeR.position.set(5.8, 0, -11.8);
  harborGroup.add(archBridgeR);
  surfaces.push({ id: 'arch_bridge_r', minX: 2.7, maxX: 8.9, minZ: -13.1, maxZ: -10.5, topY: 2.22, kind: 'bridge' });
  colliders.push(
    { id: 'arch_r_pier_l', minX: 2.4, maxX: 3.5, minZ: -13.2, maxZ: -10.4, minY: -1.0, maxY: 2.02 },
    { id: 'arch_r_pier_r', minX: 8.1, maxX: 9.2, minZ: -13.2, maxZ: -10.4, minY: -1.0, maxY: 2.02 }
  );

  const southBridge = buildStoneCanalBridge(14.8, 1.85, 2.8, mats);
  southBridge.position.set(0, 0, 11.6);
  harborGroup.add(southBridge);
  surfaces.push({ id: 'south_bridge', minX: -7.4, maxX: 7.4, minZ: 10.2, maxZ: 13.0, topY: 2.02, kind: 'bridge' });
  colliders.push(
    { id: 'south_bridge_pier_l', minX: -7.8, maxX: -6.5, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 1.82 },
    { id: 'south_bridge_pier_r', minX: 6.5, maxX: 7.8, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 1.82 }
  );

  // EXPANDED DISTRICT 1: Eastern Grand Canal Promenade & Arsenal Shipyard (x: 34..78, z: -48..+24)
  const quayArsenalE = buildCanalQuayWall(15.0, 34.0, 0.48, mats);
  quayArsenalE.position.set(41.5, 0, 4.0);
  harborGroup.add(quayArsenalE);
  surfaces.push({ id: 'quay_arsenal_e', minX: 33.9, maxX: 49.1, minZ: -13.1, maxZ: 21.1, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'quay_arsenal_e_body', minX: 34.0, maxX: 49.0, minZ: -13.0, maxZ: 21.0, minY: -1.0, maxY: 0.42 });

  const bridgeToArsenal = buildStoneCanalBridge(13.0, 1.95, 2.8, mats);
  bridgeToArsenal.position.set(28.5, 0, 11.6);
  harborGroup.add(bridgeToArsenal);
  surfaces.push({ id: 'bridge_to_arsenal', minX: 22.0, maxX: 35.0, minZ: 10.2, maxZ: 13.0, topY: 2.12, kind: 'bridge' });
  colliders.push(
    { id: 'bridge_arsenal_pl', minX: 21.8, maxX: 23.0, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 1.92 },
    { id: 'bridge_arsenal_pr', minX: 34.0, maxX: 35.2, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 1.92 }
  );

  // EXPANDED DISTRICT 2: Western Artisan Lagoon & Old Fishermen's Quarter (x: -78..-34, z: -52..+24)
  const quayLagoonW = buildCanalQuayWall(15.0, 34.0, 0.48, mats);
  quayLagoonW.position.set(-41.5, 0, 4.0);
  quayLagoonW.rotation.y = Math.PI;
  harborGroup.add(quayLagoonW);
  surfaces.push({ id: 'quay_lagoon_w', minX: -49.1, maxX: -33.9, minZ: -13.1, maxZ: 21.1, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'quay_lagoon_w_body', minX: -49.0, maxX: -34.0, minZ: -13.0, maxZ: 21.0, minY: -1.0, maxY: 0.42 });

  const bridgeToLagoon = buildStoneCanalBridge(13.0, 1.95, 2.8, mats);
  bridgeToLagoon.position.set(-28.5, 0, 11.6);
  harborGroup.add(bridgeToLagoon);
  surfaces.push({ id: 'bridge_to_lagoon', minX: -35.0, maxX: -22.0, minZ: 10.2, maxZ: 13.0, topY: 2.12, kind: 'bridge' });
  colliders.push(
    { id: 'bridge_lagoon_pl', minX: -35.2, maxX: -34.0, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 1.92 },
    { id: 'bridge_lagoon_pr', minX: -23.0, maxX: -21.8, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 1.92 }
  );

  // EXPANDED DISTRICT 3: Southern Bay Breakwater Promenade & Harbor Lighthouse (z: 24..64)
  const pierSouthBreakwater = buildCanalQuayWall(14.0, 16.0, 0.48, mats);
  pierSouthBreakwater.position.set(0, 0, 48.0);
  harborGroup.add(pierSouthBreakwater);
  surfaces.push({ id: 'pier_south_breakwater', minX: -7.1, maxX: 7.1, minZ: 39.9, maxZ: 56.1, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'pier_south_bw_body', minX: -7.0, maxX: 7.0, minZ: 40.0, maxZ: 56.0, minY: -1.0, maxY: 0.42 });

  const lighthouseMesh = buildHarborLighthouse(mats);
  lighthouseMesh.position.set(0, 0, 54.0);
  harborGroup.add(lighthouseMesh);
  surfaces.push({ id: 'lighthouse_deck', minX: -2.9, maxX: 2.9, minZ: 51.1, maxZ: 56.9, topY: 2.58, kind: 'roof' });
  colliders.push(
    { id: 'lighthouse_plinth', minX: -2.8, maxX: 2.8, minZ: 51.2, maxZ: 56.8, minY: -1.0, maxY: 2.4 },
    { id: 'lighthouse_shaft', minX: -1.65, maxX: 1.65, minZ: 52.35, maxZ: 55.65, minY: 2.5, maxY: 16.0 }
  );

  // EXPANDED DISTRICT 4: Northern Hydro-Aqueduct Ridge Terraces behind Dam (z: -40..-76)
  const aqueductRidgeW = buildCanalQuayWall(16.0, 20.0, 3.6, mats);
  aqueductRidgeW.position.set(-28.0, 0, -48.0);
  harborGroup.add(aqueductRidgeW);
  surfaces.push({ id: 'aqueduct_ridge_w', minX: -36.1, maxX: -19.9, minZ: -58.1, maxZ: -37.9, topY: 3.6, kind: 'roof' });
  colliders.push({ id: 'aqueduct_ridge_w_body', minX: -36.0, maxX: -20.0, minZ: -58.0, maxZ: -38.0, minY: -1.0, maxY: 3.45 });

  const aqueductRidgeE = buildCanalQuayWall(16.0, 20.0, 3.6, mats);
  aqueductRidgeE.position.set(28.0, 0, -48.0);
  aqueductRidgeE.rotation.y = Math.PI;
  harborGroup.add(aqueductRidgeE);
  surfaces.push({ id: 'aqueduct_ridge_e', minX: 19.9, maxX: 36.1, minZ: -58.1, maxZ: -37.9, topY: 3.6, kind: 'roof' });
  colliders.push({ id: 'aqueduct_ridge_e_body', minX: 20.0, maxX: 36.0, minZ: -58.0, maxZ: -38.0, minY: -1.0, maxY: 3.45 });

  // EXPANDED DISTRICT 5: Far East Grand Shipyard Foundry & Bell Bellfoundry (x: 68..105, z: -20..+24)
  const pierEastFoundry = buildCanalQuayWall(28.0, 42.0, 0.48, mats);
  pierEastFoundry.position.set(82.0, 0, 1.0);
  harborGroup.add(pierEastFoundry);
  surfaces.push({ id: 'pier_east_foundry', minX: 67.9, maxX: 96.1, minZ: -20.1, maxZ: 22.1, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'pier_east_foundry_body', minX: 68.0, maxX: 96.0, minZ: -20.0, maxZ: 22.0, minY: -1.0, maxY: 0.42 });

  const bridgeToFoundry = buildStoneCanalBridge(20.0, 2.05, 2.8, mats);
  bridgeToFoundry.position.set(58.5, 0, 11.6);
  harborGroup.add(bridgeToFoundry);
  surfaces.push({ id: 'bridge_to_foundry', minX: 48.5, maxX: 68.5, minZ: 10.2, maxZ: 13.0, topY: 2.22, kind: 'bridge' });
  colliders.push(
    { id: 'bridge_foundry_pl', minX: 48.2, maxX: 49.6, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 2.02 },
    { id: 'bridge_foundry_pr', minX: 67.4, maxX: 68.8, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 2.02 }
  );

  // EXPANDED DISTRICT 6: Far West Sunken Basilica Cloister (x: -105..-68, z: -20..+24)
  const pierWestCloister = buildCanalQuayWall(28.0, 42.0, 0.48, mats);
  pierWestCloister.position.set(-82.0, 0, 3.0);
  pierWestCloister.rotation.y = Math.PI;
  harborGroup.add(pierWestCloister);
  surfaces.push({ id: 'pier_west_cloister', minX: -96.1, maxX: -67.9, minZ: -18.1, maxZ: 24.1, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'pier_west_cloister_body', minX: -96.0, maxX: -68.0, minZ: -18.0, maxZ: 24.0, minY: -1.0, maxY: 0.42 });

  const bridgeToCloister = buildStoneCanalBridge(20.0, 2.05, 2.8, mats);
  bridgeToCloister.position.set(-58.5, 0, 11.6);
  harborGroup.add(bridgeToCloister);
  surfaces.push({ id: 'bridge_to_cloister', minX: -68.5, maxX: -48.5, minZ: 10.2, maxZ: 13.0, topY: 2.22, kind: 'bridge' });
  colliders.push(
    { id: 'bridge_cloister_pl', minX: -68.8, maxX: -67.4, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 2.02 },
    { id: 'bridge_cloister_pr', minX: -49.6, maxX: -48.2, minZ: 10.1, maxZ: 13.1, minY: -1.0, maxY: 2.02 }
  );

  // EXPANDED DISTRICT 7: Far South Outer Sea-Wall Bastion (x: -24..+24, z: 68..94)
  const pierSouthBastion = buildCanalQuayWall(48.0, 24.0, 0.48, mats);
  pierSouthBastion.position.set(0, 0, 80.0);
  harborGroup.add(pierSouthBastion);
  surfaces.push({ id: 'pier_south_bastion', minX: -24.1, maxX: 24.1, minZ: 67.9, maxZ: 92.1, topY: 0.5, kind: 'roof' });
  colliders.push({ id: 'pier_south_bastion_body', minX: -24.0, maxX: 24.0, minZ: 68.0, maxZ: 92.0, minY: -1.0, maxY: 0.42 });

  const bridgeToBastion = buildStoneCanalBridge(13.0, 1.95, 2.8, mats);
  bridgeToBastion.position.set(0, 0, 62.0);
  bridgeToBastion.rotation.y = Math.PI * 0.5;
  harborGroup.add(bridgeToBastion);
  surfaces.push({ id: 'bridge_to_bastion', minX: -1.4, maxX: 1.4, minZ: 55.5, maxZ: 68.5, topY: 2.12, kind: 'bridge' });
  colliders.push(
    { id: 'bridge_bastion_pn', minX: -1.5, maxX: 1.5, minZ: 55.3, maxZ: 56.5, minY: -1.0, maxY: 1.92 },
    { id: 'bridge_bastion_ps', minX: -1.5, maxX: 1.5, minZ: 67.5, maxZ: 68.7, minY: -1.0, maxY: 1.92 }
  );

  // EXPANDED DISTRICT 8: Far North Clockwork Reservoir Viaduct (x: -36..+36, z: -88..-66, y: 4.8)
  const plazaNorthReservoir = buildCanalQuayWall(72.0, 22.0, 4.8, mats);
  plazaNorthReservoir.position.set(0, 0, -77.0);
  harborGroup.add(plazaNorthReservoir);
  surfaces.push({ id: 'plaza_north_reservoir', minX: -36.1, maxX: 36.1, minZ: -88.1, maxZ: -65.9, topY: 4.8, kind: 'roof' });
  colliders.push({ id: 'plaza_north_reservoir_body', minX: -36.0, maxX: 36.0, minZ: -88.0, maxZ: -66.0, minY: -1.0, maxY: 4.65 });

  harborGroup.add(
    buildCopperPipeBridge(-28, 3.6, -58, -28, 4.8, -66, mats),
    buildCopperPipeBridge(28, 3.6, -58, 28, 4.8, -66, mats)
  );
  surfaces.push(
    {
      id: 'viaduct_bridge_w',
      minX: -28.6,
      maxX: -27.4,
      minZ: -66.2,
      maxZ: -57.8,
      topY: 4.2,
      kind: 'pipe',
      ramp: { axis: 'z', startCoord: -58.0, endCoord: -66.0, startY: 3.6, endY: 4.8 },
    },
    {
      id: 'viaduct_bridge_e',
      minX: 27.4,
      maxX: 28.6,
      minZ: -66.2,
      maxZ: -57.8,
      topY: 4.2,
      kind: 'pipe',
      ramp: { axis: 'z', startCoord: -58.0, endCoord: -66.0, startY: 3.6, endY: 4.8 },
    }
  );

  // Continuous flanking & vastly expanded outer Venetian city districts
  const distantDefs = [
    // Inner Harbor Core
    { x: -13.2, z: 2.0, w: 6.4, d: 7.2, y: 3.4, rail: false },
    { x: -13.2, z: -6.5, w: 6.4, d: 8.2, y: 2.8, rail: false },
    { x: -13.2, z: -15.5, w: 6.8, d: 8.0, y: 4.9, rail: true },
    { x: -12.6, z: -23.8, w: 7.2, d: 7.2, y: 5.7, rail: true },
    { x: 13.4, z: 1.5, w: 6.6, d: 7.2, y: 3.8, rail: true },
    { x: 13.4, z: -7.5, w: 6.8, d: 8.2, y: 4.3, rail: true },
    { x: 13.4, z: -16.5, w: 6.8, d: 8.0, y: 5.1, rail: false },
    { x: 12.6, z: -24.2, w: 7.0, d: 7.4, y: 4.6, rail: false },
    // Mid-Ring Harbor Blocks (kept cleanly clear of canal bridges)
    { x: 26.8, z: 5.0, w: 6.8, d: 6.8, y: 3.6, rail: true },
    { x: 26.8, z: -3.5, w: 7.2, d: 8.4, y: 5.0, rail: false },
    { x: -26.8, z: 5.0, w: 6.8, d: 6.8, y: 3.5, rail: true },
    { x: -26.8, z: -3.5, w: 7.2, d: 8.4, y: 4.7, rail: false },
    { x: -14.2, z: -34.5, w: 7.4, d: 8.0, y: 5.3, rail: true },
    { x: 14.2, z: -34.5, w: 7.4, d: 8.0, y: 4.8, rail: true },
    // Eastern Arsenal Shipyard Rooftop Quarter (x: 42..72)
    { x: 48.0, z: -4.0, w: 8.4, d: 9.2, y: 5.2, rail: true },
    { x: 48.5, z: -16.0, w: 7.8, d: 8.6, y: 6.0, rail: false },
    { x: 56.5, z: 4.5, w: 8.2, d: 8.4, y: 3.8, rail: true },
    { x: 64.0, z: -5.5, w: 8.6, d: 9.8, y: 5.8, rail: true },
    { x: 65.5, z: -19.5, w: 9.0, d: 9.0, y: 6.9, rail: false },
    { x: 56.0, z: 18.5, w: 7.8, d: 8.4, y: 3.8, rail: true },
    // Western Artisan Lagoon Rooftop Quarter (x: -72..-42)
    { x: -44.2, z: 4.8, w: 7.2, d: 7.8, y: 4.6, rail: true },
    { x: -48.5, z: -4.5, w: 8.0, d: 8.8, y: 5.4, rail: false },
    { x: -56.5, z: 4.2, w: 8.2, d: 8.2, y: 3.8, rail: true },
    { x: -62.0, z: -2.0, w: 8.6, d: 9.6, y: 5.6, rail: true },
    { x: -64.5, z: -16.5, w: 9.0, d: 9.2, y: 6.4, rail: false },
    { x: -38.5, z: -12.0, w: 7.6, d: 8.4, y: 4.5, rail: true },
    // Northern Aqueduct & Far Harbor Bastions (z: -42..-74)
    { x: -42.0, z: -42.0, w: 8.8, d: 9.2, y: 6.2, rail: true },
    { x: 42.0, z: -42.0, w: 8.8, d: 9.2, y: 6.4, rail: true },
    { x: -24.0, z: -64.0, w: 9.4, d: 9.6, y: 7.0, rail: true },
    { x: 24.0, z: -64.0, w: 9.4, d: 9.6, y: 7.2, rail: true },
    // Southern Flanking Breakwater Houses
    { x: -18.5, z: 34.0, w: 7.6, d: 8.2, y: 3.6, rail: true },
    { x: 18.5, z: 34.0, w: 7.6, d: 8.2, y: 3.8, rail: true },
    // Far East Bellfoundry Archipelago (x: 74..102)
    { x: 82.0, z: -10.0, w: 9.6, d: 10.4, y: 6.4, rail: true },
    { x: 92.0, z: 4.0, w: 8.8, d: 9.6, y: 7.6, rail: true },
    { x: 82.0, z: 16.0, w: 8.6, d: 8.6, y: 4.8, rail: true },
    { x: 74.0, z: -16.0, w: 7.8, d: 8.2, y: 5.2, rail: false },
    // Far West Sunken Basilica Cloister (x: -102..-74)
    { x: -83.0, z: -8.0, w: 10.2, d: 10.8, y: 6.6, rail: true },
    { x: -91.0, z: 8.0, w: 8.6, d: 9.4, y: 5.5, rail: true },
    { x: -76.0, z: 17.0, w: 8.0, d: 8.2, y: 4.3, rail: true },
    { x: -75.0, z: -16.0, w: 8.2, d: 8.4, y: 5.0, rail: false },
    // Far South Outer Sea-Wall Bastion (z: 74..98)
    { x: -16.0, z: 82.0, w: 8.8, d: 9.0, y: 5.8, rail: true },
    { x: 16.0, z: 82.0, w: 8.8, d: 9.0, y: 5.6, rail: true },
    { x: 0.0, z: 89.0, w: 10.4, d: 7.6, y: 4.6, rail: true },
    // Far North Clockwork Reservoir Towers (z: -94..-72)
    { x: -24.0, z: -84.0, w: 9.8, d: 9.8, y: 8.6, rail: true },
    { x: 24.0, z: -84.0, w: 9.8, d: 9.8, y: 8.8, rail: true },
    { x: 0.0, z: -86.0, w: 12.0, d: 9.4, y: 9.8, rail: true },
  ];
  for (let i = 0; i < distantDefs.length; i++) {
    const b = distantDefs[i];
    const mesh = buildRooftopBuilding(b.w, b.d, b.y, mats, true, b.rail, i % 3 === 0);
    mesh.position.set(b.x, 0, b.z);
    harborGroup.add(mesh);
    surfaces.push({
      id: `dist_${i}`,
      minX: b.x - b.w * 0.5 - 0.11,
      maxX: b.x + b.w * 0.5 + 0.11,
      minZ: b.z - b.d * 0.5 - 0.11,
      maxZ: b.z + b.d * 0.5 + 0.11,
      topY: b.y,
      kind: 'roof',
    });
    const p = getBuildingPhysics(`dist_${i}`, b.x, b.z, b.w, b.d, b.y, true);
    if (p.gableSurface) surfaces.push(p.gableSurface);
    colliders.push(...p.colliders);
    if (p.chimneyTop && i < 22) chimneyVents.push(p.chimneyTop);
  }

  // Rooftop copper pipe & plank sky-bridges connecting Eastern Arsenal/Foundry & Western Lagoon/Cloister & South Bastion
  const extraPipeBridges: Array<[number, number, number, number, number, number]> = [
    [48.0, 5.2, -8.6, 48.5, 6.0, -11.7],
    [52.2, 5.2, -2.0, 59.7, 5.8, -3.5],
    [-46.0, 4.6, 4.0, -48.5, 5.4, -0.1],
    [-46.0, 4.6, 4.0, -38.5, 4.5, -7.8],
    [68.3, 5.8, -5.5, 77.2, 6.4, -9.0],
    [82.0, 6.4, -4.8, 87.6, 7.6, 1.5],
    [-66.3, 5.6, -2.0, -77.9, 6.6, -6.5],
    [-83.0, 6.6, -2.6, -86.7, 5.5, 5.0],
    [-11.6, 5.8, 84.0, -5.2, 4.6, 87.0],
    [11.6, 5.6, 84.0, 5.2, 4.6, 87.0],
    [-19.1, 8.6, -84.0, -6.0, 9.8, -85.0],
    [19.1, 8.8, -84.0, 6.0, 9.8, -85.0],
  ];
  for (let i = 0; i < extraPipeBridges.length; i++) {
    const [x1, y1, z1, x2, y2, z2] = extraPipeBridges[i];
    harborGroup.add(buildCopperPipeBridge(x1, y1, z1, x2, y2, z2, mats));
    const axis = Math.abs(z2 - z1) >= Math.abs(x2 - x1) ? 'z' : 'x';
    surfaces.push({
      id: `ext_pipe_${i}`,
      minX: Math.min(x1, x2) - 0.55,
      maxX: Math.max(x1, x2) + 0.55,
      minZ: Math.min(z1, z2) - 0.55,
      maxZ: Math.max(z1, z2) + 0.55,
      topY: (y1 + y2) * 0.5,
      kind: 'pipe',
      ramp:
        axis === 'z'
          ? { axis: 'z', startCoord: z1, endCoord: z2, startY: y1, endY: y2 }
          : { axis: 'x', startCoord: x1, endCoord: x2, startY: y1, endY: y2 },
    });
  }

  // Venetian storefront awnings mounted along the quay building facades above pedestrian height
  const awningCoords: Array<[number, number, number]> = [
    [-9.65, -2.5, Math.PI * 0.5],
    [9.65, -5.2, -Math.PI * 0.5],
    [-9.65, -14.2, Math.PI * 0.5],
    [22.8, 7.2, -Math.PI * 0.5],
    [-22.8, 7.2, Math.PI * 0.5],
    [43.6, -4.0, -Math.PI * 0.5],
    [-40.4, 4.8, Math.PI * 0.5],
    [77.6, 15.0, -Math.PI * 0.5],
    [-72.0, 16.0, Math.PI * 0.5],
    [0.0, 84.8, Math.PI],
  ];
  for (let i = 0; i < awningCoords.length; i++) {
    const [ax, az, rotY] = awningCoords[i];
    const aw = buildFloodedShopAwning(mats);
    aw.position.set(ax, 1.9, az);
    aw.rotation.y = rotY;
    harborGroup.add(aw);
    surfaces.push({
      id: `awning_${i}`,
      minX: ax - 0.65,
      maxX: ax + 0.65,
      minZ: az - 1.2,
      maxZ: az + 1.2,
      topY: 2.62,
      kind: 'roof',
    });
  }

  // Monumental Clockwork Dam & Aqueduct Wall physically supporting the giant waterwheels
  const clockworkDam = buildClockworkDamWall(24, 10.2, mats);
  clockworkDam.position.set(-1.0, 0, -26.2);
  harborGroup.add(clockworkDam);
  surfaces.push({ id: 'clockwork_dam', minX: -13.2, maxX: 11.2, minZ: -28.2, maxZ: -24.2, topY: 9.5, kind: 'roof' });
  colliders.push({ id: 'clockwork_dam_body', minX: -13.0, maxX: 11.0, minZ: -28.0, maxZ: -24.4, minY: -1.0, maxY: 9.35 });

  // Distant Venetian Campanile clock-towers anchoring the vast 370x340m misty horizon skyline
  const campanileSpecs: Array<[number, number, number, number, number]> = [
    [3.8, 17.5, -22.5, -46, 0.18],
    [4.2, 20.0, 21.5, -48, -0.22],
    [4.8, 24.0, -68.0, -78, 0.35],
    [5.0, 26.0, 68.0, -82, -0.3],
    [5.4, 29.0, 0.0, -118, 0.0],
    [4.0, 19.0, -84.0, 18, 0.4],
    [4.0, 19.0, 84.0, 16, -0.4],
    [5.6, 31.0, -124.0, -24, 0.25],
    [5.6, 31.0, 124.0, -24, -0.25],
    [5.2, 27.0, -98.0, -118, 0.3],
    [5.2, 27.0, 98.0, -118, -0.3],
    [4.6, 23.0, -72.0, 86, 0.45],
    [4.6, 23.0, 72.0, 86, -0.45],
  ];
  for (const [cw, ch, cx, cz, croy] of campanileSpecs) {
    const camp = buildDistantCampanile(cw, ch, mats);
    camp.position.set(cx, 0, cz);
    camp.rotation.y = croy;
    harborGroup.add(camp);
  }

  // Moored Venetian wooden canal skiffs tethered beside the stone quays, outer islands & southern bay
  const skiffDefs = [
    { id: 'skiff_a', x: 5.4, z: -3.8, rotY: 0.22 },
    { id: 'skiff_b', x: -5.6, z: -11.4, rotY: -0.18 },
    { id: 'skiff_c', x: 5.5, z: 7.4, rotY: -0.12 },
    { id: 'skiff_d', x: -5.2, z: 6.8, rotY: 0.15 },
    { id: 'skiff_e', x: 16.0, z: 20.4, rotY: 1.48 },
    { id: 'skiff_f', x: 31.2, z: 4.2, rotY: 0.1 },
    { id: 'skiff_g', x: -31.2, z: 4.6, rotY: -0.15 },
    { id: 'skiff_south_1', x: 0.0, z: 24.0, rotY: 0.05 },
    { id: 'skiff_south_2', x: 0.0, z: 31.5, rotY: -0.08 },
    { id: 'skiff_arsenal_e', x: 52.0, z: 11.0, rotY: 1.52 },
    { id: 'skiff_foundry_e', x: 65.5, z: 4.5, rotY: 0.14 },
    { id: 'skiff_cloister_w', x: -65.5, z: 4.5, rotY: -0.14 },
    { id: 'skiff_bastion_s1', x: -12.0, z: 65.0, rotY: 1.45 },
    { id: 'skiff_bastion_s2', x: 12.0, z: 65.0, rotY: -1.45 },
  ];
  const skiffs: Array<{ mesh: THREE.Group; phase: number }> = [];
  for (let i = 0; i < skiffDefs.length; i++) {
    const sd = skiffDefs[i];
    const sk = buildCanalSkiff(mats);
    sk.position.set(sd.x, 0.02, sd.z);
    sk.rotation.y = sd.rotY;
    harborGroup.add(sk);
    skiffs.push({ mesh: sk, phase: i * 1.4 });
    const isHorizontal = Math.abs(Math.sin(sd.rotY)) > 0.7;
    surfaces.push({
      id: sd.id,
      minX: sd.x - (isHorizontal ? 1.65 : 0.55),
      maxX: sd.x + (isHorizontal ? 1.65 : 0.55),
      minZ: sd.z - (isHorizontal ? 0.55 : 1.65),
      maxZ: sd.z + (isHorizontal ? 0.55 : 1.65),
      topY: 0.28,
      kind: 'bridge',
    });
  }

  // Canal mooring pilings (bricole) emerging from reflective canal water
  const pilings: Array<[number, number, number]> = [
    [-4.8, -5.8, 1.5],
    [4.6, -5.8, 1.65],
    [-5.4, -14.8, 1.4],
    [5.1, -15.6, 1.6],
    [-6.6, 1.8, 1.45],
    [6.4, -0.6, 1.55],
    [6.2, 8.2, 1.5],
    [-6.2, 8.0, 1.5],
    [13.5, 19.6, 1.55],
    [-14.5, 19.8, 1.5],
    [29.5, 3.0, 1.6],
    [-29.5, 3.0, 1.6],
    [5.0, 36.5, 1.5],
    [-5.0, 36.5, 1.5],
    [63.0, 2.5, 1.6],
    [-63.0, 2.5, 1.6],
    [8.0, 62.5, 1.5],
    [-8.0, 62.5, 1.5],
  ];
  for (const [px, pz, ph] of pilings) {
    harborGroup.add(buildCanalMooringPost(px, pz, ph, mats));
  }

  // Harbor Fish Market Props: Fish on cutting boards, Fish baskets, Fishing tackle & Drying nets
  const harborPropAssets = createHarborPropAssets();
  const fishSpots: FishSpot[] = [];
  const fishMeshMap = new Map<string, THREE.Object3D[]>();

  const fishBoardCoords: Array<{ id: string; x: number; y: number; z: number; rotY: number }> = [
    { id: 'board_quay_r', x: 8.6, y: 0.5, z: 1.5, rotY: -Math.PI * 0.5 },
    { id: 'board_market_e1', x: 13.0, y: 0.5, z: 8.6, rotY: 0.15 },
    { id: 'board_market_e2', x: 16.4, y: 0.5, z: 11.4, rotY: -0.25 },
    { id: 'board_market_w1', x: -13.2, y: 0.5, z: 8.8, rotY: 0.18 },
    { id: 'board_quay_l', x: -8.6, y: 0.5, z: -1.0, rotY: Math.PI * 0.5 },
    { id: 'board_arsenal_e', x: 37.8, y: 0.5, z: 6.5, rotY: -0.2 },
    { id: 'board_lagoon_w', x: -37.8, y: 0.5, z: 7.2, rotY: 0.25 },
    { id: 'board_south_pier', x: -3.2, y: 0.5, z: 45.2, rotY: 0.1 },
    { id: 'board_foundry_e', x: 73.5, y: 0.5, z: 7.0, rotY: -0.15 },
    { id: 'board_cloister_w', x: -73.0, y: 0.5, z: 6.5, rotY: 0.2 },
    { id: 'board_bastion_s', x: -3.5, y: 0.5, z: 73.0, rotY: 0.1 },
  ];
  for (const fb of fishBoardCoords) {
    const boardGroup = buildFishCuttingBoard(mats, harborPropAssets, true);
    boardGroup.position.set(fb.x, fb.y, fb.z);
    boardGroup.rotation.y = fb.rotY;
    harborGroup.add(boardGroup);
    const meshes = collectStealableFishMeshes(boardGroup);
    fishMeshMap.set(fb.id, meshes);
    fishSpots.push({
      id: fb.id,
      label: 'свежую рыбку с разделочной доски',
      x: fb.x,
      y: fb.y,
      z: fb.z,
      remainingFish: meshes.length,
      maxFish: meshes.length,
    });
    surfaces.push({
      id: fb.id,
      minX: fb.x - 0.58,
      maxX: fb.x + 0.58,
      minZ: fb.z - 0.58,
      maxZ: fb.z + 0.58,
      topY: fb.y + 0.65,
      kind: 'roof',
    });
    colliders.push({
      id: `${fb.id}_col`,
      minX: fb.x - 0.52,
      maxX: fb.x + 0.52,
      minZ: fb.z - 0.52,
      maxZ: fb.z + 0.52,
      minY: fb.y,
      maxY: fb.y + 0.58,
    });
  }

  const basketCoords: Array<[number, number, number, number]> = [
    [7.6, 0.5, 2.5, 0.2],
    [7.8, 0.5, 0.5, 1.1],
    [11.8, 0.5, 8.2, 0.4],
    [12.3, 0.5, 9.7, -0.7],
    [15.4, 0.5, 10.6, 0.8],
    [17.4, 0.5, 11.9, -0.3],
    [-7.6, 0.5, -1.9, 0.6],
    [-12.0, 0.5, 8.2, -0.5],
    [-14.2, 0.5, 9.8, 1.2],
    [36.4, 0.5, 8.2, 0.3],
    [40.2, 0.5, 15.2, -0.4],
    [-36.5, 0.5, 9.4, -0.6],
    [-39.8, 0.5, 16.0, 0.5],
    [3.1, 0.5, 44.5, 0.2],
    [76.0, 0.5, 14.0, -0.3],
    [-75.5, 0.5, 12.2, 0.4],
    [4.5, 0.5, 73.5, -0.2],
  ];
  for (let bi = 0; bi < basketCoords.length; bi++) {
    const [bx, by, bz, rotY] = basketCoords[bi];
    const basketId = `basket_${bi}`;
    const basket = buildFishBasket(mats, harborPropAssets);
    basket.position.set(bx, by, bz);
    basket.rotation.y = rotY;
    harborGroup.add(basket);
    const meshes = collectStealableFishMeshes(basket);
    fishMeshMap.set(basketId, meshes);
    fishSpots.push({
      id: basketId,
      label: 'рыбу из плетёной корзины',
      x: bx,
      y: by,
      z: bz,
      remainingFish: meshes.length,
      maxFish: meshes.length,
    });
    colliders.push({
      id: `${basketId}_col`,
      minX: bx - 0.28,
      maxX: bx + 0.28,
      minZ: bz - 0.28,
      maxZ: bz + 0.28,
      minY: by,
      maxY: by + 0.38,
    });
  }

  const tackleCoords: Array<[number, number, number, number]> = [
    [7.7, 0.5, 4.3, -Math.PI * 0.4],
    [14.5, 0.5, 7.2, 0.25],
    [-7.7, 0.5, 2.8, Math.PI * 0.45],
    [-15.2, 0.5, 7.4, -0.2],
    [8.2, 0.5, -7.8, -Math.PI * 0.5],
    [36.0, 0.5, 12.8, 0.3],
    [-36.2, 0.5, 12.8, -0.35],
    [4.2, 0.5, 48.0, -0.5],
    [71.5, 0.5, 16.5, 0.25],
    [-71.5, 0.5, 13.5, -0.3],
    [10.0, 0.5, 72.0, 0.15],
  ];
  for (const [tx, ty, tz, rotY] of tackleCoords) {
    const tackle = buildFishingTackleSet(mats, harborPropAssets);
    tackle.position.set(tx, ty, tz);
    tackle.rotation.y = rotY;
    harborGroup.add(tackle);
    colliders.push({
      id: `tackle_${tx}_${tz}`,
      minX: tx - 0.35,
      maxX: tx + 0.35,
      minZ: tz - 0.3,
      maxZ: tz + 0.3,
      minY: ty,
      maxY: ty + 0.32,
    });
  }

  const rackCoords: Array<[number, number, number, number]> = [
    [19.2, 0.5, 9.5, -Math.PI * 0.35],
    [-19.2, 0.5, 9.5, Math.PI * 0.35],
    [9.2, 0.5, -17.5, Math.PI * 0.5],
    [42.4, 0.5, 11.2, -Math.PI * 0.45],
    [-40.5, 0.5, 1.5, Math.PI * 0.4],
    [-4.8, 0.5, 49.0, 0.2],
    [84.0, 0.5, 9.0, -Math.PI * 0.3],
    [-84.0, 0.5, 11.0, Math.PI * 0.3],
    [-10.5, 0.5, 75.0, 0.15],
  ];
  for (const [rx, ry, rz, rotY] of rackCoords) {
    const rack = buildFishingNetDryingRack(mats, harborPropAssets);
    rack.position.set(rx, ry, rz);
    rack.rotation.y = rotY;
    harborGroup.add(rack);
  }

  // Catenary hanging brass cables spanning between urban blocks across the canal
  harborGroup.add(
    buildHangingCable(new THREE.Vector3(2.1, 4.9, -2.1), new THREE.Vector3(10.2, 5.8, -6.5), 1.05, mats),
    buildHangingCable(new THREE.Vector3(-2.1, 4.7, -2.0), new THREE.Vector3(-10.2, 4.5, -5.2), 0.9, mats),
    buildHangingCable(new THREE.Vector3(2.3, 5.5, -12.6), new THREE.Vector3(10.2, 5.9, -12.0), 0.85, mats),
    buildHangingCable(new THREE.Vector3(-2.3, 5.5, -12.6), new THREE.Vector3(-10.2, 6.4, -16.0), 1.05, mats),
    buildHangingCable(new THREE.Vector3(-10.2, 6.2, -9.0), new THREE.Vector3(10.2, 6.5, -9.5), 1.4, mats)
  );

  // Festive Venetian festival bunting lines, dock wine barrels, olive urns & warm dawn sun shafts
  const extraDisposableGeos: THREE.BufferGeometry[] = [];
  const extraDisposableMats: THREE.Material[] = [];
  const buntingFlags: Array<{ mesh: THREE.Mesh; phase: number }> = [];
  const buntingCoords: Array<[THREE.Vector3, THREE.Vector3, number]> = [
    [new THREE.Vector3(-8.4, 3.3, 4.5), new THREE.Vector3(8.4, 3.5, 4.5), 0.85],
    [new THREE.Vector3(-9.5, 4.1, -6.2), new THREE.Vector3(9.5, 4.4, -6.8), 1.0],
    [new THREE.Vector3(-10.5, 4.6, -18.2), new THREE.Vector3(10.5, 4.8, -18.2), 0.95],
    [new THREE.Vector3(24.0, 4.2, 9.0), new THREE.Vector3(44.5, 4.8, -1.5), 1.15],
    [new THREE.Vector3(-24.0, 4.0, 9.0), new THREE.Vector3(-42.5, 4.5, 6.5), 1.1],
    [new THREE.Vector3(-15.0, 3.6, 33.5), new THREE.Vector3(15.0, 3.8, 33.5), 1.3],
    [new THREE.Vector3(56.0, 4.6, 8.0), new THREE.Vector3(77.5, 5.6, 12.0), 1.2],
    [new THREE.Vector3(-56.0, 4.4, 10.0), new THREE.Vector3(-78.0, 5.5, 8.0), 1.2],
    [new THREE.Vector3(-12.0, 5.4, 78.0), new THREE.Vector3(12.0, 5.4, 78.0), 1.1],
  ];
  for (let i = 0; i < buntingCoords.length; i++) {
    const [bStart, bEnd, bSag] = buntingCoords[i];
    const built = buildBuntingLine(bStart, bEnd, bSag, mats);
    harborGroup.add(built.group);
    extraDisposableGeos.push(...built.disposedGeos);
    extraDisposableMats.push(...built.disposedMats);
    for (let f = 0; f < built.flags.length; f++) {
      buntingFlags.push({ mesh: built.flags[f], phase: i * 1.3 + f * 0.45 });
    }
  }

  const barrelCoords: Array<[number, number, number, number]> = [
    [11.0, 0.5, 6.5, 0.3],
    [20.6, 0.5, 14.5, -0.4],
    [-11.4, 0.5, 6.6, 0.8],
    [9.4, 0.5, -13.6, 0.15],
    [41.5, 0.5, 4.2, 0.5],
    [45.0, 0.5, 17.5, -0.35],
    [-40.5, 0.5, 17.8, 0.7],
    [5.2, 0.5, 42.5, -0.25],
    [79.0, 0.5, 6.0, 0.4],
    [-79.0, 0.5, 6.0, -0.4],
    [8.0, 0.5, 79.0, 0.2],
  ];
  for (const [bx, by, bz, brot] of barrelCoords) {
    const bar = buildPierBarrels(mats);
    bar.position.set(bx, by, bz);
    bar.rotation.y = brot;
    harborGroup.add(bar);
  }

  const oliveCoords: Array<[number, number, number]> = [
    [2.55, 3.0, 2.35],
    [-2.55, 3.6, -7.8],
    [9.4, 0.5, 9.2],
    [-9.4, 0.5, 9.2],
    [35.2, 0.5, 18.2],
    [-35.2, 0.5, 18.2],
    [-4.8, 0.5, 42.2],
    [4.8, 0.5, 42.2],
    [72.0, 0.5, 19.0],
    [-72.0, 0.5, 19.0],
    [-18.0, 0.5, 72.0],
    [18.0, 0.5, 72.0],
  ];
  for (const [ox, oy, oz] of oliveCoords) {
    const pot = buildOlivePot(mats);
    pot.position.set(ox, oy, oz);
    harborGroup.add(pot);
  }

  const sunShafts: Array<{ mesh: THREE.Mesh; baseOpacity: number }> = [];
  const shaftSpecs: Array<[number, number, number, number, number]> = [
    [-2.8, 9.5, -5.5, 19, 3.6],
    [4.6, 10.2, -13.0, 21, 4.0],
    [0.0, 11.8, -21.5, 22, 4.5],
    [41.0, 10.5, 4.0, 22, 4.2],
    [-41.0, 10.5, 4.0, 22, 4.2],
    [0.0, 12.0, 48.0, 24, 4.8],
    [82.0, 11.5, 2.0, 24, 4.6],
    [-82.0, 11.5, 2.0, 24, 4.6],
    [0.0, 11.5, 78.0, 24, 4.8],
    [0.0, 14.5, -76.0, 26, 5.2],
  ];
  for (const [sx, sy, sz, sh, sr] of shaftSpecs) {
    const shaft = buildDawnSunShaft(sh, sr);
    shaft.mesh.position.set(sx, sy, sz);
    shaft.mesh.visible = gfxSettings.shaftsEnabled;
    harborGroup.add(shaft.mesh);
    extraDisposableGeos.push(shaft.geo);
    extraDisposableMats.push(shaft.mat);
    sunShafts.push({ mesh: shaft.mesh, baseOpacity: 0.055 });
  }

  // Multi-step dockside cargo crates & balcony terraces so Pip ascends in natural stages instead of ground-to-roof leaps
  const addDockStepCrate = (
    id: string,
    x: number,
    baseY: number,
    z: number,
    topY: number,
    w = 1.45,
    d = 1.45,
    isBalcony = false
  ) => {
    const h = Math.max(0.45, topY - baseY);
    const geo = new THREE.BoxGeometry(w, h, d);
    extraDisposableGeos.push(geo);
    const mesh = new THREE.Mesh(geo, isBalcony ? mats.masonryWall : mats.woodCatwalk);
    mesh.position.set(x, baseY + h * 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    harborGroup.add(mesh);

    const trimGeo = new THREE.BoxGeometry(w + 0.08, 0.14, d + 0.08);
    extraDisposableGeos.push(trimGeo);
    const trim = new THREE.Mesh(trimGeo, isBalcony ? mats.slateRoof : mats.brassTrim);
    trim.position.set(x, topY - 0.07, z);
    trim.receiveShadow = true;
    harborGroup.add(trim);

    surfaces.push({
      id,
      minX: x - w * 0.52,
      maxX: x + w * 0.52,
      minZ: z - d * 0.52,
      maxZ: z + d * 0.52,
      topY,
      kind: 'roof',
    });
    colliders.push({
      id: `${id}_col`,
      minX: x - w * 0.48,
      maxX: x + w * 0.48,
      minZ: z - d * 0.48,
      maxZ: z + d * 0.48,
      minY: baseY,
      maxY: topY - 0.08,
    });
  };

  const harborStepDefs: Array<[string, number, number, number, number, number?, number?, boolean?]> = [
    ['step_roof_start_e', 4.15, 0.0, 0.6, 1.55, 1.5, 1.5, false],
    ['step_roof_start_w', -4.15, 0.0, 0.6, 1.55, 1.5, 1.5, false],
    ['step_awning_0', -9.1, 0.5, -0.4, 1.58],
    ['step_awning_1', 9.1, 0.5, -3.1, 1.58],
    ['step_awning_2', -9.1, 0.5, -12.1, 1.58],
    ['terrace_awning_2', -9.65, 2.62, -16.8, 3.85, 1.7, 1.7, true],
    ['step_awning_3', 21.4, 0.5, 7.2, 1.58],
    ['step_awning_4', -21.4, 0.5, 7.2, 1.58],
    ['step_awning_5', 42.2, 0.5, -2.0, 1.58],
    ['terrace_awning_5', 43.6, 2.62, -6.5, 3.88, 1.7, 1.7, true],
    ['step_awning_6', -39.0, 0.5, 4.8, 1.58],
    ['terrace_awning_6', -40.4, 2.62, 2.3, 3.68, 1.7, 1.7, true],
    ['step_awning_7', 76.2, 0.5, 15.0, 1.58],
    ['terrace_awning_7', 77.6, 2.62, 12.8, 3.75, 1.7, 1.7, true],
    ['step_awning_8', -70.6, 0.5, 16.0, 1.58],
    ['step_awning_9', -2.0, 0.5, 83.2, 1.58],
    ['terrace_awning_9', 2.4, 2.62, 84.8, 3.65, 1.7, 1.7, true],
    ['step_lighthouse_w', -3.8, 0.5, 53.5, 1.58],
    ['step_south_bridge_w', -8.2, 0.5, 9.2, 1.42],
    ['step_south_bridge_e', 8.2, 0.5, 9.2, 1.42],
    ['step_bridge_arch_r', 9.4, 0.5, -10.8, 1.48],
    ['step_bridge_arsenal_w', 21.8, 0.5, 9.2, 1.48],
    ['step_bridge_arsenal_e', 35.4, 0.5, 9.4, 1.48],
    ['step_bridge_lagoon_e', -21.8, 0.5, 9.2, 1.48],
    ['step_bridge_lagoon_w', -35.4, 0.5, 9.4, 1.48],
    ['step_bridge_foundry_w', 48.2, 0.5, 9.4, 1.48],
    ['step_bridge_foundry_e', 68.4, 0.5, 9.4, 1.48],
    ['step_bridge_cloister_e', -48.2, 0.5, 9.4, 1.48],
    ['step_bridge_cloister_w', -68.4, 0.5, 9.4, 1.48],
  ];
  for (const def of harborStepDefs) {
    addDockStepCrate(...def);
  }

  // Grand Clockwork Gears mounted directly against the Clockwork Dam Wall piers
  const gearMain = buildClockworkGear(4.6, 20, 0.58, mats);
  gearMain.position.set(-5.8, 7.2, -23.6);
  harborGroup.add(gearMain);

  const gearSmall = buildClockworkGear(2.5, 14, 0.45, mats);
  gearSmall.position.set(1.3, 5.4, -23.5);
  harborGroup.add(gearSmall);

  // Ornate Iron-Caged Brass Lanterns with warm PointLights
  const starterLantern = buildLanternPost(mats, true);
  starterLantern.position.set(2.15, 3.0, 1.35);
  starterLantern.rotation.y = -0.7;
  harborGroup.add(starterLantern);

  const midLantern = buildLanternPost(mats, true);
  midLantern.position.set(-2.3, 3.6, -8.3);
  midLantern.rotation.y = 0.45;
  harborGroup.add(midLantern);

  const goalLantern = buildLanternPost(mats, true);
  goalLantern.position.set(1.65, 4.8, -16.1);
  goalLantern.rotation.y = -2.2;
  harborGroup.add(goalLantern);

  // Interactive Harbor Mechanics: Echo Sky-Bridges, Reversible Waterwheels, Owl Searchlights, Pails, Decoy Fish, Letters & Nests
  const harborMechanics = createHarborMechanicsState();

  const echoVisuals: EchoBridgeVisual[] = [];
  for (const echo of harborMechanics.echoLedges) {
    const w = echo.id === 'echo_dam_crest' ? 5.2 : 4.2;
    const d = echo.id === 'echo_dam_crest' ? 3.4 : 2.6;
    surfaces.push({
      id: echo.surfaceId,
      minX: echo.x - w * 0.5,
      maxX: echo.x + w * 0.5,
      minZ: echo.z - d * 0.5,
      maxZ: echo.z + d * 0.5,
      topY: echo.y,
      kind: 'hidden_echo',
      visible: false,
    });
    const vis = buildEchoBridgeMesh(w, d, mats, harborPropAssets);
    vis.group.position.set(echo.x, echo.y, echo.z);
    harborGroup.add(vis.group);
    echoVisuals.push(vis);
  }

  // Secret Quest 1: Acoustic Echo Vault platform (permanently reveals when all 3 Four-Winds tuning forks chime)
  surfaces.push({
    id: SECRET_VAULT_SURFACE_SPEC.surfaceId,
    minX: SECRET_VAULT_SURFACE_SPEC.x - SECRET_VAULT_SURFACE_SPEC.w * 0.5,
    maxX: SECRET_VAULT_SURFACE_SPEC.x + SECRET_VAULT_SURFACE_SPEC.w * 0.5,
    minZ: SECRET_VAULT_SURFACE_SPEC.z - SECRET_VAULT_SURFACE_SPEC.d * 0.5,
    maxZ: SECRET_VAULT_SURFACE_SPEC.z + SECRET_VAULT_SURFACE_SPEC.d * 0.5,
    topY: SECRET_VAULT_SURFACE_SPEC.y,
    kind: 'hidden_echo',
    visible: false,
  });
  const secretVaultVisual = buildEchoBridgeMesh(
    SECRET_VAULT_SURFACE_SPEC.w,
    SECRET_VAULT_SURFACE_SPEC.d,
    mats,
    harborPropAssets
  );
  secretVaultVisual.group.position.set(
    SECRET_VAULT_SURFACE_SPEC.x,
    SECRET_VAULT_SURFACE_SPEC.y,
    SECRET_VAULT_SURFACE_SPEC.z
  );
  secretVaultVisual.group.visible = false;
  harborGroup.add(secretVaultVisual.group);

  // Secret Quest 1 Visuals: 3 Brass Four-Winds Tuning Fork Pylons
  const forkVisuals: Array<{ group: THREE.Group; core: THREE.Mesh; coreMat: THREE.MeshStandardMaterial }> = [];
  const forkBaseGeo = new THREE.CylinderGeometry(0.42, 0.54, 0.65, 10);
  const forkStemGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.65, 8);
  const forkBridgeGeo = new THREE.BoxGeometry(0.66, 0.1, 0.12);
  const forkProngGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.95, 8);
  const forkCoreGeo = new THREE.OctahedronGeometry(0.18, 0);
  extraDisposableGeos.push(forkBaseGeo, forkStemGeo, forkBridgeGeo, forkProngGeo, forkCoreGeo);

  const initialSecretPositions = createSecretQuestState('harbor');
  for (const b of initialSecretPositions.beacons) {
    const fg = new THREE.Group();
    const plinth = new THREE.Mesh(forkBaseGeo, mats.masonryWall);
    plinth.position.y = 0.32;
    const stem = new THREE.Mesh(forkStemGeo, mats.brassTrim);
    stem.position.y = 0.96;
    const bridge = new THREE.Mesh(forkBridgeGeo, mats.brassTrim);
    bridge.position.y = 1.28;
    const prongL = new THREE.Mesh(forkProngGeo, mats.brassTrim);
    prongL.position.set(-0.27, 1.78, 0);
    const prongR = new THREE.Mesh(forkProngGeo, mats.brassTrim);
    prongR.position.set(0.27, 1.78, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#4CE0B3',
      emissive: '#163D34',
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.35,
    });
    extraDisposableMats.push(coreMat);
    const core = new THREE.Mesh(forkCoreGeo, coreMat);
    core.position.y = 1.85;
    fg.add(plinth, stem, bridge, prongL, prongR, core);
    fg.position.set(b.x, b.y, b.z);
    harborGroup.add(fg);
    forkVisuals.push({ group: fg, core, coreMat });
  }

  // Secret Quest 3 Visual: Golden Clockwork Mackerel (on East Arsenal quay at 41, 0.5, 14.5 + companion orb when Pip carries it)
  const mackerelMat = new THREE.MeshStandardMaterial({
    color: '#FFD57E',
    emissive: '#B87616',
    emissiveIntensity: 0.65,
    metalness: 0.78,
    roughness: 0.22,
  });
  const mackerelBodyGeo = new THREE.ConeGeometry(0.18, 0.56, 8);
  const mackerelTailGeo = new THREE.ConeGeometry(0.15, 0.22, 4);
  extraDisposableGeos.push(mackerelBodyGeo, mackerelTailGeo);
  extraDisposableMats.push(mackerelMat);

  const createMackerelGroup = () => {
    const g = new THREE.Group();
    const head = new THREE.Mesh(mackerelBodyGeo, mackerelMat);
    head.rotation.z = -Math.PI * 0.5;
    const tail = new THREE.Mesh(mackerelTailGeo, mackerelMat);
    tail.rotation.z = Math.PI * 0.5;
    tail.position.x = -0.32;
    g.add(head, tail);
    return g;
  };
  const mackerelVisual = createMackerelGroup();
  mackerelVisual.position.set(
    initialSecretPositions.mackerelPos.x,
    initialSecretPositions.mackerelPos.y + 0.42,
    initialSecretPositions.mackerelPos.z
  );
  mackerelVisual.visible = false;
  harborGroup.add(mackerelVisual);

  const mackerelCarrierMesh = createMackerelGroup();
  mackerelCarrierMesh.scale.setScalar(0.75);
  mackerelCarrierMesh.visible = false;
  scene.add(mackerelCarrierMesh);

  const wheelVisuals: WaterwheelVisual[] = [];
  for (const wheel of harborMechanics.waterwheels) {
    for (const pad of wheel.paddles) {
      surfaces.push({
        id: pad.surfaceId,
        minX: wheel.cx - wheel.padHalfW,
        maxX: wheel.cx + wheel.padHalfW,
        minZ: wheel.cz - wheel.padHalfD,
        maxZ: wheel.cz + wheel.padHalfD,
        topY: wheel.cy,
        kind: 'gear',
        visible: true,
        carryDx: 0,
        carryDz: 0,
      });
    }
    const wVis = buildMillWaterwheelVisual(
      wheel.radius,
      wheel.padHalfW,
      wheel.padHalfD,
      mats,
      harborPropAssets
    );
    wVis.wheelGroup.position.set(wheel.cx, wheel.cy, wheel.cz);
    harborGroup.add(wVis.wheelGroup);
    wheelVisuals.push(wVis);
  }

  const owlVisuals: OwlSearchlightVisual[] = [];
  for (const owl of harborMechanics.owls) {
    const postH = Math.max(1.2, owl.pivotY - owl.groundY);
    const oVis = buildOwlSearchlightRig(mats, harborPropAssets, postH);
    oVis.pivot.position.set(owl.pivotX, owl.pivotY, owl.pivotZ);
    oVis.stanchion.position.set(owl.pivotX, owl.pivotY - postH * 0.5 - 0.12, owl.pivotZ);
    oVis.collar.position.set(owl.pivotX, owl.pivotY - 0.22, owl.pivotZ);
    oVis.spotRing.position.set(owl.spotX, owl.groundY + 0.04, owl.spotZ);
    harborGroup.add(oVis.root);
    owlVisuals.push(oVis);
  }

  const pailVisuals: BaitPailVisual[] = [];
  for (const pail of harborMechanics.baitPails) {
    const pVis = buildBaitPail(mats, harborPropAssets);
    pVis.root.position.set(pail.x, pail.y, pail.z);
    harborGroup.add(pVis.root);
    pailVisuals.push(pVis);
  }

  const decoyFishMeshes: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const dMesh = buildDecoyFishVisual(harborPropAssets);
    dMesh.visible = false;
    scene.add(dMesh);
    decoyFishMeshes.push(dMesh);
  }

  const letterVisuals: THREE.Group[] = [];
  for (const letter of harborMechanics.letters) {
    const lMesh = buildMarcoLetterMesh(mats, harborPropAssets);
    lMesh.position.set(letter.x, letter.y, letter.z);
    harborGroup.add(lMesh);
    letterVisuals.push(lMesh);
  }

  const nestVisuals: THREE.Group[] = [];
  for (const nest of harborMechanics.nests) {
    const nMesh = buildCozyNestMesh(mats, harborPropAssets);
    nMesh.position.set(nest.x, nest.y, nest.z);
    harborGroup.add(nMesh);
    nestVisuals.push(nMesh);
  }

  const featherBurst = createFeatherBurst(harborPropAssets);
  scene.add(featherBurst.group);

  // Subtle floating dawn dust & harbor mist motes across the 370x340m archipelago
  const MOTE_COUNT = 220;
  const motePositions = new Float32Array(MOTE_COUNT * 3);
  const moteBaseX = new Float32Array(MOTE_COUNT);
  const moteBaseY = new Float32Array(MOTE_COUNT);
  const motePhase = new Float32Array(MOTE_COUNT);
  for (let i = 0; i < MOTE_COUNT; i++) {
    const x = rng.range(-110, 110);
    const y = rng.range(1.6, 11.2);
    const z = rng.range(-120, 100);
    motePositions[i * 3] = x;
    motePositions[i * 3 + 1] = y;
    motePositions[i * 3 + 2] = z;
    moteBaseX[i] = x;
    moteBaseY[i] = y;
    motePhase[i] = rng.range(0, Math.PI * 2);
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = new THREE.PointsMaterial({
    size: 0.22,
    map: mats.moteTexture,
    transparent: true,
    opacity: 0.65 * gfxSettings.moteVisibilityRatio,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const motePoints = new THREE.Points(moteGeo, moteMat);
  motePoints.visible = gfxSettings.particlesEnabled;
  scene.add(motePoints);

  // Rising chimney steam wisps + low drifting canal mist banks (pooled sprites, zero per-frame alloc)
  interface SteamWisp {
    sprite: THREE.Sprite;
    baseX: number;
    baseY: number;
    baseZ: number;
    phase: number;
    speed: number;
  }
  const steamSprites: SteamWisp[] = [];
  const steamBaseMat = new THREE.SpriteMaterial({
    map: mats.steamTexture,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  for (let v = 0; v < chimneyVents.length; v++) {
    const vent = chimneyVents[v];
    for (let k = 0; k < 3; k++) {
      const mat = steamBaseMat.clone();
      const sp = new THREE.Sprite(mat);
      sp.visible = gfxSettings.particlesEnabled;
      harborGroup.add(sp);
      steamSprites.push({
        sprite: sp,
        baseX: vent.x,
        baseY: vent.y,
        baseZ: vent.z,
        phase: (v * 0.37 + k / 3) % 1,
        speed: 0.24 + (v % 3) * 0.04,
      });
    }
  }
  steamBaseMat.dispose();

  const canalMistMat = new THREE.SpriteMaterial({
    map: mats.steamTexture,
    color: new THREE.Color('#6F9296'),
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const canalMistCoords: Array<[number, number, number]> = [
    [-6.5, 0.55, -8.5],
    [7.2, 0.65, -14.5],
    [-8.0, 0.6, -24.0],
    [6.5, 0.7, -28.5],
    [0.0, 0.65, -36.0],
    [28.5, 0.65, 2.0],
    [-28.5, 0.65, 2.0],
    [45.0, 0.7, -18.0],
    [-45.0, 0.7, -18.0],
    [0.0, 0.6, 30.0],
    [0.0, 0.75, -52.0],
    [78.0, 0.7, 2.0],
    [-78.0, 0.7, 2.0],
    [0.0, 0.65, 66.0],
    [0.0, 1.1, -76.0],
  ];
  const canalMists: THREE.Sprite[] = [];
  for (const [mx, my, mz] of canalMistCoords) {
    const mSp = new THREE.Sprite(canalMistMat);
    mSp.position.set(mx, my, mz);
    mSp.scale.set(9.5, 2.2, 1);
    mSp.visible = graphicsLevel !== 'low';
    harborGroup.add(mSp);
    canalMists.push(mSp);
  }

  // Subtle brass ledge highlight ring + inner crisp directional diamond accent
  const targetMarkerGeo = new THREE.RingGeometry(0.24, 0.36, 28);
  const targetMarkerInnerGeo = new THREE.RingGeometry(0.08, 0.14, 4);
  const targetMarkerMat = new THREE.MeshBasicMaterial({
    color: PALETTE.amberChime,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const targetMarkerGroup = new THREE.Group();
  const targetMarker = new THREE.Mesh(targetMarkerGeo, targetMarkerMat);
  targetMarker.rotation.x = -Math.PI * 0.5;
  const targetMarkerInner = new THREE.Mesh(targetMarkerInnerGeo, targetMarkerMat);
  targetMarkerInner.rotation.x = -Math.PI * 0.5;
  targetMarkerInner.position.y = 0.01;
  targetMarkerGroup.add(targetMarker, targetMarkerInner);
  targetMarkerGroup.visible = false;
  scene.add(targetMarkerGroup);

  // Pulsing canal wake ring surrounding Pip while swimming
  const swimWakeGeo = new THREE.RingGeometry(0.26, 0.39, 28);
  const swimWakeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#9EB4AD'),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const swimWakeMesh = new THREE.Mesh(swimWakeGeo, swimWakeMat);
  swimWakeMesh.rotation.x = -Math.PI * 0.5;
  swimWakeMesh.position.y = 0.032;
  swimWakeMesh.visible = false;
  scene.add(swimWakeMesh);

  // Pooled expanding acoustic bell & water-splash ripple rings
  const rippleGeo = new THREE.RingGeometry(0.88, 1.0, 44);
  const ripples: RippleRing[] = [];
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: PALETTE.amberChime,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(rippleGeo, mat);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.visible = false;
    scene.add(mesh);
    ripples.push({ mesh, active: false, age: 0, maxAge: 1.0, maxRadius: tuning.bell.chimeRadius });
  }

  // Pooled landing dust puff rings (High/Ultra only, zero per-frame allocations)
  const landDustGeo = new THREE.RingGeometry(0.16, 0.38, 20);
  const landDustPool: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; active: boolean; age: number; maxAge: number; maxScale: number }> = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: '#EADCC4',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(landDustGeo, mat);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.visible = false;
    scene.add(mesh);
    landDustPool.push({ mesh, mat, active: false, age: 0, maxAge: 0.42, maxScale: 1.45 });
  }
  let landDustCursor = 0;

  // Section 3: Pooled Air-Step / Wall-Kick Crescent Ring (4 rings, zero per-frame allocations)
  const airStepGeo = new THREE.RingGeometry(0.20, 0.36, 24);
  const airStepPool: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; active: boolean; age: number; maxAge: number }> = [];
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: '#6FE6D6',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(airStepGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    airStepPool.push({ mesh, mat, active: false, age: 0, maxAge: 0.36 });
  }
  let airStepCursor = 0;

  // Section 3: Floating Harbor Sunbeam Petals (28 single-draw-call Points, High/Ultra only)
  const PETAL_COUNT = 28;
  const petalPositions = new Float32Array(PETAL_COUNT * 3);
  const petalBaseX = new Float32Array(PETAL_COUNT);
  const petalBaseY = new Float32Array(PETAL_COUNT);
  const petalBaseZ = new Float32Array(PETAL_COUNT);
  const petalPhase = new Float32Array(PETAL_COUNT);
  for (let i = 0; i < PETAL_COUNT; i++) {
    const px = rng.range(-36, 36);
    const py = rng.range(1.6, 8.2);
    const pz = rng.range(-48, 32);
    petalBaseX[i] = px;
    petalBaseY[i] = py;
    petalBaseZ[i] = pz;
    petalPhase[i] = rng.range(0, Math.PI * 2);
    petalPositions[i * 3] = px;
    petalPositions[i * 3 + 1] = py;
    petalPositions[i * 3 + 2] = pz;
  }
  const petalGeo = new THREE.BufferGeometry();
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));
  const petalMat = new THREE.PointsMaterial({
    size: 0.20,
    color: new THREE.Color('#FFD9A0'),
    map: mats.moteTexture,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const petalPoints = new THREE.Points(petalGeo, petalMat);
  petalPoints.visible = false;
  petalPoints.frustumCulled = false;
  scene.add(petalPoints);

  // Ability 1 VFX: Shadow Dash translucent cyan-gold afterimage silhouettes
  const dashGhostBodyGeo = new THREE.CapsuleGeometry(0.13, 0.34, 4, 8);
  dashGhostBodyGeo.rotateX(Math.PI * 0.5);
  const dashGhostHeadGeo = new THREE.SphereGeometry(0.115, 8, 6);
  interface DashGhost {
    group: THREE.Group;
    mat: THREE.MeshBasicMaterial;
    age: number;
    maxAge: number;
    active: boolean;
  }
  const dashGhosts: DashGhost[] = [];
  for (let i = 0; i < 5; i++) {
    const gMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? '#6FE6D6' : '#FFD57E',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const gGrp = new THREE.Group();
    const gBody = new THREE.Mesh(dashGhostBodyGeo, gMat);
    gBody.position.y = 0.34;
    const gHead = new THREE.Mesh(dashGhostHeadGeo, gMat);
    gHead.position.set(0, 0.44, 0.24);
    gGrp.add(gBody, gHead);
    gGrp.visible = false;
    scene.add(gGrp);
    dashGhosts.push({ group: gGrp, mat: gMat, age: 0, maxAge: 0.28, active: false });
  }
  let dashGhostCursor = 0;
  let dashTrailAccum = 0;

  // Ability 2 VFX: Moonlight Coat-Glide wind halo ring beneath Pip
  const glideHaloGeo = new THREE.RingGeometry(0.32, 0.54, 28);
  const glideHaloMat = new THREE.MeshBasicMaterial({
    color: '#A5F3FC',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glideHaloMesh = new THREE.Mesh(glideHaloGeo, glideHaloMat);
  glideHaloMesh.rotation.x = -Math.PI * 0.5;
  glideHaloMesh.visible = false;
  scene.add(glideHaloMesh);
  let glideSparkAccum = 0;

  // Ability 3 VFX: Whisker Sense expanding sonar ring + 16 pooled harmonic target beacons
  const SENSE_COOLDOWN_SEC = 7.0;
  const SENSE_DURATION_SEC = 5.5;
  let senseCooldown = 0;
  let senseTimer = 0;
  let senseWaveAge = -1;
  const senseWaveGeo = new THREE.RingGeometry(0.92, 1.0, 44);
  const senseWaveMat = new THREE.MeshBasicMaterial({
    color: '#6FE6D6',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const senseWaveMesh = new THREE.Mesh(senseWaveGeo, senseWaveMat);
  senseWaveMesh.rotation.x = -Math.PI * 0.5;
  senseWaveMesh.visible = false;
  scene.add(senseWaveMesh);

  const senseBeamGeo = new THREE.CylinderGeometry(0.11, 0.23, 9.0, 10, 1, true);
  senseBeamGeo.translate(0, 4.5, 0);
  const senseBeamGoldMat = new THREE.MeshBasicMaterial({
    color: '#FFD57E',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const senseBeamAquaMat = new THREE.MeshBasicMaterial({
    color: '#6FE6D6',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.30,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const senseBeams: Array<{ mesh: THREE.Mesh; isGold: boolean }> = [];
  for (let i = 0; i < 16; i++) {
    const isGold = i % 2 === 0;
    const bm = new THREE.Mesh(senseBeamGeo, isGold ? senseBeamGoldMat : senseBeamAquaMat);
    bm.visible = false;
    scene.add(bm);
    senseBeams.push({ mesh: bm, isGold });
  }

  // Section 1A: Clockwork Fireflies (110 pooled glowing particles over canals, lanterns, forks & dam — 1 draw call)
  const FIREFLY_COUNT = 110;
  const fireflyPositions = new Float32Array(FIREFLY_COUNT * 3);
  const fireflyBaseX = new Float32Array(FIREFLY_COUNT);
  const fireflyBaseY = new Float32Array(FIREFLY_COUNT);
  const fireflyBaseZ = new Float32Array(FIREFLY_COUNT);
  const fireflyPhase = new Float32Array(FIREFLY_COUNT);
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const fx = rng.range(-56, 56);
    const fy = rng.range(0.55, 4.4);
    const fz = rng.range(-64, 48);
    fireflyBaseX[i] = fx;
    fireflyBaseY[i] = fy;
    fireflyBaseZ[i] = fz;
    fireflyPhase[i] = rng.range(0, Math.PI * 2);
    fireflyPositions[i * 3] = fx;
    fireflyPositions[i * 3 + 1] = fy;
    fireflyPositions[i * 3 + 2] = fz;
  }
  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
  const fireflyMat = new THREE.PointsMaterial({
    size: 0.28,
    color: new THREE.Color('#FFE084'),
    map: mats.moteTexture,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
  fireflyPoints.visible = gfxSettings.particlesEnabled;
  fireflyPoints.frustumCulled = false;
  scene.add(fireflyPoints);

  // Section 1B: Wet Paw Prints Pool (18 decals trailing behind Pip for 6s after swimming)
  function makeWetPawTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    ctx.shadowColor = 'rgba(10, 24, 28, 0.85)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(130, 224, 214, 0.94)';
    // Main metacarpal pad
    ctx.beginPath();
    ctx.ellipse(32, 41, 13, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 4 cute feline toe beans
    const toes: Array<[number, number, number]> = [
      [17, 25, -0.25],
      [27, 18, -0.08],
      [37, 18, 0.08],
      [47, 25, 0.25],
    ];
    for (const [tx, ty, rot] of toes) {
      ctx.beginPath();
      ctx.ellipse(tx, ty, 5.0, 6.8, rot, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const wetPawTex = makeWetPawTexture();
  const wetPawGeo = new THREE.PlaneGeometry(0.14, 0.17);
  interface WetPawSlot {
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    age: number;
    maxAge: number;
  }
  const wetPawPool: WetPawSlot[] = [];
  for (let i = 0; i < 18; i++) {
    const pMat = new THREE.MeshBasicMaterial({
      map: wetPawTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const pMesh = new THREE.Mesh(wetPawGeo, pMat);
    pMesh.rotation.x = -Math.PI * 0.5;
    pMesh.visible = false;
    scene.add(pMesh);
    wetPawPool.push({ mesh: pMesh, mat: pMat, active: false, age: 0, maxAge: 4.2 });
  }
  let wetPawTimer = 0;
  let wetPawCursor = 0;
  let lastPawX = 0;
  let lastPawZ = 0;
  let pawSide = 1;
  let activeWetPawsCount = 0;

  // Section 1C: Boat / Ferry & Boss Water Wake Ring Pool (10 expanding ripples on canal surface)
  const wakeRingGeo = new THREE.RingGeometry(0.45, 0.56, 28);
  interface WaterWakeSlot {
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    age: number;
    maxAge: number;
    startScale: number;
    endScale: number;
    maxOpacity: number;
  }
  const waterWakePool: WaterWakeSlot[] = [];
  for (let i = 0; i < 10; i++) {
    const wMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#9ED4CC'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const wMesh = new THREE.Mesh(wakeRingGeo, wMat);
    wMesh.rotation.x = -Math.PI * 0.5;
    wMesh.position.y = 0.028;
    wMesh.visible = false;
    scene.add(wMesh);
    waterWakePool.push({
      mesh: wMesh,
      mat: wMat,
      active: false,
      age: 0,
      maxAge: 1.8,
      startScale: 1.0,
      endScale: 3.2,
      maxOpacity: 0.34,
    });
  }
  let waterWakeCursor = 0;
  let skiffWakeAccum = 0;
  let skiffWakeIndex = 0;
  let lastBossWakePhase = '';

  function spawnWaterWake(
    x: number,
    z: number,
    startScale = 1.0,
    endScale = 3.2,
    maxAge = 1.85,
    maxOpacity = 0.34
  ): void {
    if (graphicsLevel === 'low') return;
    const slot = waterWakePool[waterWakeCursor % waterWakePool.length];
    waterWakeCursor++;
    slot.active = true;
    slot.age = 0;
    slot.maxAge = maxAge;
    slot.startScale = startScale;
    slot.endScale = endScale;
    slot.maxOpacity = maxOpacity;
    slot.mesh.position.set(x, 0.028, z);
    slot.mesh.scale.setScalar(startScale);
    slot.mat.opacity = maxOpacity;
    slot.mesh.visible = true;
  }

  // Living NPCs: Venetian townsfolk & fishermen, harbor dogs, perched gulls/pigeons & soaring sea gulls
  const npcState: NpcWorldState = {
    people: [
      createPersonNpc('fisher_quay_r', 'fisherman', '#4C6B5C', [{ x: 7.35, y: 0.5, z: 3.1 }], true, -Math.PI * 0.5),
      createPersonNpc('fisher_quay_l', 'fisherman', '#5B4E3E', [{ x: -7.35, y: 0.5, z: -1.6 }], true, Math.PI * 0.5),
      createPersonNpc('fisher_pier_e', 'fisherman', '#3F5D6B', [{ x: 16.5, y: 0.5, z: 16.9 }], true, 0),
      createPersonNpc('vendor_market_e', 'vendor', '#8D5239', [
        { x: 13.4, y: 0.5, z: 9.8, pauseSec: 2.6 },
        { x: 16.2, y: 0.5, z: 12.6, pauseSec: 2.8 },
      ]),
      createPersonNpc('stroller_quay_r', 'stroller', '#584E68', [
        { x: 8.6, y: 0.5, z: -3.2, pauseSec: 2.0 },
        { x: 8.6, y: 0.5, z: -16.2, pauseSec: 2.2 },
      ]),
      createPersonNpc('stroller_south_w', 'stroller', '#4A6758', [
        { x: -11.5, y: 0.5, z: 11.4, pauseSec: 1.8 },
        { x: -16.8, y: 0.5, z: 14.2, pauseSec: 2.5 },
      ]),
      createPersonNpc('shipwright_arsenal', 'vendor', '#6B4837', [
        { x: 39.5, y: 0.5, z: 2.0, pauseSec: 2.2 },
        { x: 39.5, y: 0.5, z: 14.5, pauseSec: 2.6 },
      ]),
      createPersonNpc('baker_lagoon', 'stroller', '#755346', [
        { x: -39.5, y: 0.5, z: 6.0, pauseSec: 2.4 },
        { x: -39.5, y: 0.5, z: 16.8, pauseSec: 2.2 },
      ]),
      createPersonNpc('keeper_lighthouse', 'fisherman', '#364E63', [{ x: 2.8, y: 0.5, z: 50.8 }], true, 0),
      createPersonNpc('foundry_master', 'vendor', '#78422B', [
        { x: 76.0, y: 0.5, z: 7.0, pauseSec: 2.3 },
        { x: 84.0, y: 0.5, z: 13.0, pauseSec: 2.6 },
      ]),
      createPersonNpc('cloister_weaver', 'stroller', '#644B73', [
        { x: -76.0, y: 0.5, z: 9.0, pauseSec: 2.5 },
        { x: -84.0, y: 0.5, z: 15.0, pauseSec: 2.4 },
      ]),
      createPersonNpc('bastion_angler', 'fisherman', '#3B635E', [
        { x: -1.6, y: 0.5, z: 73.0, pauseSec: 3.5 },
        { x: 1.6, y: 0.5, z: 73.0, pauseSec: 3.5 },
      ]),
      createPersonNpc('viaduct_tinker', 'vendor', '#5E5340', [
        { x: -14.0, y: 4.8, z: -74.0, pauseSec: 2.4 },
        { x: 14.0, y: 4.8, z: -74.0, pauseSec: 2.4 },
      ]),
    ],
    dogs: [
      createDogNpc(
        'dog_quay_r',
        '#9A6338',
        [
          { x: 8.4, y: 0.5, z: 6.2, pauseSec: 2.5 },
          { x: 14.5, y: 0.5, z: 12.2, pauseSec: 3.0 },
        ],
        { minX: 7.4, maxX: 22.0, minZ: 5.8, maxZ: 17.0 }
      ),
      createDogNpc(
        'dog_quay_l',
        '#5A4638',
        [
          { x: -8.5, y: 0.5, z: 4.5, pauseSec: 2.4 },
          { x: -8.5, y: 0.5, z: -8.8, pauseSec: 2.2 },
        ],
        { minX: -9.8, maxX: -7.4, minZ: -20.0, maxZ: 16.0 }
      ),
      createDogNpc(
        'dog_market_w',
        '#BA8B57',
        [
          { x: -12.4, y: 0.5, z: 7.4, pauseSec: 2.6 },
          { x: -17.6, y: 0.5, z: 13.8, pauseSec: 2.8 },
        ],
        { minX: -22.2, maxX: -10.5, minZ: 5.8, maxZ: 17.0 }
      ),
      createDogNpc(
        'dog_arsenal_e',
        '#7A4F30',
        [
          { x: 36.8, y: 0.5, z: 3.5, pauseSec: 2.5 },
          { x: 42.2, y: 0.5, z: 16.5, pauseSec: 2.7 },
        ],
        { minX: 34.8, maxX: 46.5, minZ: -11.5, maxZ: 19.5 }
      ),
      createDogNpc(
        'dog_lagoon_w',
        '#8D7458',
        [
          { x: -37.2, y: 0.5, z: 5.0, pauseSec: 2.4 },
          { x: -41.5, y: 0.5, z: 16.5, pauseSec: 2.9 },
        ],
        { minX: -46.5, maxX: -34.8, minZ: -11.5, maxZ: 19.5 }
      ),
      createDogNpc(
        'dog_foundry_e',
        '#69462C',
        [
          { x: 75.0, y: 0.5, z: 14.5, pauseSec: 2.5 },
          { x: 86.0, y: 0.5, z: 4.0, pauseSec: 2.8 },
        ],
        { minX: 69.5, maxX: 90.0, minZ: -4.0, maxZ: 19.5 }
      ),
      createDogNpc(
        'dog_cloister_w',
        '#A48562',
        [
          { x: -74.0, y: 0.5, z: 15.0, pauseSec: 2.4 },
          { x: -84.0, y: 0.5, z: 3.0, pauseSec: 2.9 },
        ],
        { minX: -90.0, maxX: -69.5, minZ: -4.0, maxZ: 21.0 }
      ),
      createDogNpc(
        'dog_bastion_s',
        '#5E4A3A',
        [
          { x: 6.0, y: 0.5, z: 76.0, pauseSec: 2.4 },
          { x: 14.0, y: 0.5, z: 84.0, pauseSec: 2.7 },
        ],
        { minX: -12.0, maxX: 18.0, minZ: 69.5, maxZ: 88.0 }
      ),
    ],
    birds: [
      createPerchedBirdNpc('bird_start_pigeon', 'pigeon', -2.1, 3.0, -1.7, 0.8),
      createPerchedBirdNpc('bird_quay_r_gull', 'gull', 7.4, 0.5, -0.2, -1.3),
      createPerchedBirdNpc('bird_quay_l_pigeon', 'pigeon', -7.4, 0.5, -5.5, 1.4),
      createPerchedBirdNpc('bird_market_e1', 'gull', 11.6, 0.5, 11.2, -0.6),
      createPerchedBirdNpc('bird_market_e2', 'pigeon', 15.2, 0.5, 13.9, 2.2),
      createPerchedBirdNpc('bird_market_w1', 'gull', -14.2, 0.5, 10.6, 0.5),
      createPerchedBirdNpc('bird_belfry_pigeon', 'pigeon', 2.4, 3.6, -9.6, -2.1),
      createPerchedBirdNpc('bird_skiff_gull', 'gull', 5.4, 0.3, -2.7, 0.4),
      createPerchedBirdNpc('bird_arsenal_gull1', 'gull', 35.8, 0.5, 15.6, -0.9),
      createPerchedBirdNpc('bird_arsenal_pigeon', 'pigeon', 48.0, 5.2, -1.2, 1.2),
      createPerchedBirdNpc('bird_lagoon_gull1', 'gull', -35.8, 0.5, 15.2, 1.1),
      createPerchedBirdNpc('bird_lagoon_pigeon', 'pigeon', -46.0, 4.6, 9.8, -1.5),
      createPerchedBirdNpc('bird_south_gull1', 'gull', 4.6, 0.5, 46.5, -0.7),
      createPerchedBirdNpc('bird_south_gull2', 'gull', -4.2, 0.5, 43.2, 0.9),
      createPerchedBirdNpc('bird_foundry_gull', 'gull', 71.0, 0.5, 9.5, -0.5),
      createPerchedBirdNpc('bird_foundry_pigeon', 'pigeon', 82.0, 6.4, -7.2, 1.0),
      createPerchedBirdNpc('bird_cloister_gull', 'gull', -71.0, 0.5, 9.5, 0.5),
      createPerchedBirdNpc('bird_cloister_pigeon', 'pigeon', -83.0, 6.6, -5.0, -1.2),
      createPerchedBirdNpc('bird_bastion_gull', 'gull', 0.0, 0.5, 76.0, 0.2),
      createPerchedBirdNpc('bird_viaduct_pigeon', 'pigeon', 0.0, 4.8, -70.0, -0.8),
      createSoaringBirdNpc('bird_sky_1', 0, -6, 11.5, 14.0, 0.32, 0.2),
      createSoaringBirdNpc('bird_sky_2', 6, 4, 13.2, 18.0, -0.27, 2.1),
      createSoaringBirdNpc('bird_sky_3', -8, -14, 14.5, 16.5, 0.24, 4.0),
      createSoaringBirdNpc('bird_sky_4', 12, 10, 10.8, 12.0, -0.35, 1.1),
      createSoaringBirdNpc('bird_sky_arsenal', 48, 0, 15.5, 22.0, 0.22, 0.8),
      createSoaringBirdNpc('bird_sky_lagoon', -48, 2, 14.8, 22.0, -0.25, 2.6),
      createSoaringBirdNpc('bird_sky_south', 0, 42, 16.0, 20.0, 0.29, 4.4),
      createSoaringBirdNpc('bird_sky_north', 0, -45, 17.5, 26.0, -0.21, 5.1),
      createSoaringBirdNpc('bird_sky_foundry', 82, 0, 18.0, 26.0, 0.19, 1.5),
      createSoaringBirdNpc('bird_sky_cloister', -82, 2, 18.0, 26.0, -0.2, 3.3),
      createSoaringBirdNpc('bird_sky_bastion', 0, 80, 17.0, 24.0, 0.23, 0.6),
      createSoaringBirdNpc('bird_sky_viaduct', 0, -78, 19.5, 28.0, -0.18, 2.9),
    ],
  };

  const personRigs: PersonRig[] = npcState.people.map((p) => {
    const rig = createPersonRig(p, mats);
    harborGroup.add(rig.root);
    return rig;
  });
  const dogRigs: DogRig[] = npcState.dogs.map((d) => {
    const rig = createDogRig(d, mats);
    harborGroup.add(rig.root);
    return rig;
  });
  const birdRigs: BirdRig[] = npcState.birds.map((b) => {
    const rig = createBirdRig(b, mats);
    harborGroup.add(rig.root);
    return rig;
  });

  // Protect animated/interactive harbor nodes before static mesh batching
  for (const s of sunShafts) s.mesh.userData.noBatch = true;
  gearMain.userData.noBatch = true;
  gearSmall.userData.noBatch = true;
  for (const sk of skiffs) sk.mesh.userData.noBatch = true;
  for (const bf of buntingFlags) bf.mesh.userData.noBatch = true;
  for (const ev of echoVisuals) ev.group.userData.noBatch = true;
  secretVaultVisual.group.userData.noBatch = true;
  for (const fv of forkVisuals) fv.group.userData.noBatch = true;
  mackerelVisual.userData.noBatch = true;
  for (const wv of wheelVisuals) wv.wheelGroup.userData.noBatch = true;
  for (const ov of owlVisuals) ov.root.userData.noBatch = true;
  for (const pv of pailVisuals) pv.root.userData.noBatch = true;
  for (const lv of letterVisuals) lv.userData.noBatch = true;
  for (const pr of personRigs) pr.root.userData.noBatch = true;
  for (const dr of dogRigs) dr.root.userData.noBatch = true;
  for (const br of birdRigs) br.root.userData.noBatch = true;

  const harborBatch = batchStaticGroupByMaterial(harborGroup, 64);
  extraDisposableGeos.push(...harborBatch.disposableGeos);
  let activeBatchedChunks = harborBatch.chunkCount;
  let activeMergedMeshes = harborBatch.mergedCount;

  // Active World Bundle & Multi-Act Campaign Management (Acts I, II, III)
  interface ActiveWorldBundle {
    surfaces: WalkSurface[];
    colliders: SolidCollider[];
    fishSpots: FishSpot[];
    fishMeshMap: Map<string, THREE.Object3D[]>;
    npcState: NpcWorldState;
    personRigs: PersonRig[];
    dogRigs: DogRig[];
    birdRigs: BirdRig[];
    mechanics: HarborMechanicsState;
    echoVisuals: EchoBridgeVisual[];
    wheelVisuals: WaterwheelVisual[];
    owlVisuals: OwlSearchlightVisual[];
    pailVisuals: BaitPailVisual[];
    letterVisuals: THREE.Group[];
  }

  const harborBundle: ActiveWorldBundle = {
    surfaces,
    colliders,
    fishSpots,
    fishMeshMap,
    npcState,
    personRigs,
    dogRigs,
    birdRigs,
    mechanics: harborMechanics,
    echoVisuals,
    wheelVisuals,
    owlVisuals,
    pailVisuals,
    letterVisuals,
  };

  let activeActId: ActId = 'harbor';
  let activeActSpec: ActSpec = ACT_SPECS.harbor;
  let activeWorld: ActiveWorldBundle = harborBundle;
  let secondaryWorld: SecondaryActWorld | null = null;
  let secondaryPersonRigs: PersonRig[] = [];
  let secondaryDogRigs: DogRig[] = [];
  let secondaryBirdRigs: BirdRig[] = [];

  // Shared Act Encounter & Campaign Entities (Boss + Resonance Anchors + Ferry + Rival Cat + Race Rings + Rain)
  let saveData: SaveData = loadSave();
  let playerBonuses: PlayerBonuses = computePlayerBonuses(saveData.unlockedSkills, saveData.equippedCollar);

  const actEntitiesGroup = new THREE.Group();
  scene.add(actEntitiesGroup);

  let bossRig: BossRig | null = null;
  let anchorVisuals: AnchorVisual[] = [];
  let ferryVisual: FerryVisual | null = null;
  let rivalCatRig = createCatRig(mats.contactShadow, 'tuxedo');
  let raceRingVisuals: RaceRingVisual[] = [];

  // Pooled Dynamic Weather Rain Particle Cloud (only updated/rendered when isHighOrUltra() && rain)
  const RAIN_COUNT = 160;
  const rainPositions = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPositions[i * 3] = ((i * 73) % 100) * 0.24 - 12;
    rainPositions[i * 3 + 1] = ((i * 29) % 100) * 0.11;
    rainPositions[i * 3 + 2] = ((i * 47) % 100) * 0.24 - 12;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.PointsMaterial({
    size: 0.14,
    color: new THREE.Color('#B5D9E6'),
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const rainPoints = new THREE.Points(rainGeo, rainMat);
  rainPoints.visible = false;
  rainPoints.frustumCulled = false;
  scene.add(rainPoints);

  function clearActEntitiesVisuals(): void {
    while (actEntitiesGroup.children.length > 0) {
      actEntitiesGroup.remove(actEntitiesGroup.children[0]);
    }
    if (bossRig) {
      for (const g of bossRig.disposables.geos) g.dispose();
      for (const m of bossRig.disposables.mats) m.dispose();
      bossRig = null;
    }
    for (const av of anchorVisuals) av.mat.dispose();
    anchorVisuals = [];
    if (ferryVisual) {
      ferryVisual.lanternMat.dispose();
      ferryVisual.beaconMat.dispose();
      ferryVisual = null;
    }
    for (const rr of raceRingVisuals) rr.mat.dispose();
    raceRingVisuals = [];
  }

  function clearSecondaryWorld(): void {
    for (const pr of secondaryPersonRigs) {
      for (const g of pr.geometries) g.dispose();
      for (const m of pr.materials) m.dispose();
    }
    for (const dr of secondaryDogRigs) {
      for (const g of dr.geometries) g.dispose();
      for (const m of dr.materials) m.dispose();
    }
    for (const br of secondaryBirdRigs) {
      for (const g of br.geometries) g.dispose();
      for (const m of br.materials) m.dispose();
    }
    secondaryPersonRigs = [];
    secondaryDogRigs = [];
    secondaryBirdRigs = [];
    if (secondaryWorld) {
      scene.remove(secondaryWorld.root);
      for (const g of secondaryWorld.disposableGeos) g.dispose();
      for (const m of secondaryWorld.disposableMats) m.dispose();
      secondaryWorld = null;
    }
  }

  function getEquippedCollarHex(collarId: CollarId): string {
    return COLLAR_CATALOG.find((c) => c.id === collarId)?.accentHex ?? '#F4A949';
  }

  // Sculpted playable cat rig with live breed selection + dynamic equipped collar silk scarf
  const cat = createCatState(ACT_SPECS.harbor.spawn.x, ACT_SPECS.harbor.spawn.y, ACT_SPECS.harbor.spawn.z);
  cat.yaw = ACT_SPECS.harbor.spawn.yaw;
  cat.surfaceId = ACT_SPECS.harbor.spawn.surfaceId;
  cat.maxAirJumps = playerBonuses.maxAirJumps;
  cat.airJumpsRemaining = playerBonuses.maxAirJumps;
  let catBreed: CatBreedId = getSavedCatBreed();
  let catRig = createCatRig(mats.contactShadow, catBreed, getEquippedCollarHex(saveData.equippedCollar));
  catRig.contactShadow.visible = gfxSettings.contactShadowsEnabled;
  scene.add(catRig.root);
  updateCatVisual(catRig, cat, 0, 1 / 60);

  // Sonic Claw sweeping golden crescent VFX & Dawn Flare orb VFX
  const clawArcGeo = new THREE.RingGeometry(0.45, 1.35, 24, 1, -Math.PI * 0.42, Math.PI * 0.84);
  const clawArcMat = new THREE.MeshBasicMaterial({
    color: '#FF9A52',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const clawArcMesh = new THREE.Mesh(clawArcGeo, clawArcMat);
  clawArcMesh.rotation.x = -Math.PI * 0.5;
  clawArcMesh.visible = false;
  scene.add(clawArcMesh);
  let clawVfxAge = 0;
  let clawVfxActive = false;

  const flareOrbGeo = new THREE.SphereGeometry(0.24, 16, 12);
  const flareOrbMat = new THREE.MeshBasicMaterial({
    color: '#FFE08A',
    transparent: true,
    opacity: 0.92,
  });
  const flareHaloGeo = new THREE.RingGeometry(0.42, 1.15, 28);
  const flareHaloMat = new THREE.MeshBasicMaterial({
    color: '#FFD57E',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flareVisuals: Array<{ group: THREE.Group; orb: THREE.Mesh; halo: THREE.Mesh }> = [];
  for (let i = 0; i < 4; i++) {
    const fg = new THREE.Group();
    const orb = new THREE.Mesh(flareOrbGeo, flareOrbMat);
    const halo = new THREE.Mesh(flareHaloGeo, flareHaloMat);
    halo.rotation.x = -Math.PI * 0.5;
    halo.position.y = -0.35;
    fg.add(orb, halo);
    fg.visible = false;
    scene.add(fg);
    flareVisuals.push({ group: fg, orb, halo });
  }

  // Pooled Heavy Sparks Burst VFX (only updated/rendered when graphicsLevel >= High)
  const SPARK_COUNT = 48;
  const sparkPositions = new Float32Array(SPARK_COUNT * 3);
  const sparkVelX = new Float32Array(SPARK_COUNT);
  const sparkVelY = new Float32Array(SPARK_COUNT);
  const sparkVelZ = new Float32Array(SPARK_COUNT);
  const sparkLife = new Float32Array(SPARK_COUNT);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.24,
    map: mats.moteTexture,
    color: new THREE.Color('#FFD27A'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  sparkPoints.visible = false;
  sparkPoints.frustumCulled = false;
  scene.add(sparkPoints);
  let sparkCursor = 0;

  // Pooled 3D Parabolic Aiming Trajectory Arc (only updated/rendered when graphicsLevel >= High)
  const AIM_DOT_COUNT = 12;
  const aimDotGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const aimDotMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#FFD580'),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const aimArcGroup = new THREE.Group();
  const aimDots: THREE.Mesh[] = [];
  for (let i = 0; i < AIM_DOT_COUNT; i++) {
    const dot = new THREE.Mesh(aimDotGeo, aimDotMat);
    const s = 1.0 - (i / AIM_DOT_COUNT) * 0.42;
    dot.scale.setScalar(s);
    aimArcGroup.add(dot);
    aimDots.push(dot);
  }
  aimArcGroup.visible = false;
  scene.add(aimArcGroup);

  // Pooled Dynamic Wind / Dash Speed Streak Lines (zero per-frame heap allocation; skipped in Low Eco)
  const WIND_STREAK_COUNT = 16;
  const windPositions = new Float32Array(WIND_STREAK_COUNT * 6);
  const windSeedAngle = new Float32Array(WIND_STREAK_COUNT);
  const windSeedRadius = new Float32Array(WIND_STREAK_COUNT);
  const windSeedPhase = new Float32Array(WIND_STREAK_COUNT);
  for (let i = 0; i < WIND_STREAK_COUNT; i++) {
    windSeedAngle[i] = (i / WIND_STREAK_COUNT) * Math.PI * 2;
    windSeedRadius[i] = 0.55 + (i % 4) * 0.28;
    windSeedPhase[i] = (i * 0.37) % 1;
  }
  const windLinesGeo = new THREE.BufferGeometry();
  windLinesGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
  const windLinesMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#CBEFE9'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const windLines = new THREE.LineSegments(windLinesGeo, windLinesMat);
  windLines.visible = false;
  windLines.frustumCulled = false;
  scene.add(windLines);

  let lastStrideIndex = 0;
  let lanternShimmerTimer = 0;
  let landingDipOffset = 0;
  let prevDayPhaseName: DayPhaseName = 'dawn';

  let shakeTrauma = 0;
  let camTiltRoll = 0;
  const isHighOrUltra = () => isGraphicsAtLeast(graphicsLevel, 'high');
  document.body.dataset.graphicsLevel = graphicsLevel;

  let difficultyLevel: DifficultyLevel = 'standard';
  let difficultyMods = getDifficultyModifiers(difficultyLevel);
  let rightClickMode: RightClickMode = 'jump';
  let activeTool: ToolId = 'bell';
  const toolCooldowns: Record<ToolId, number> = {
    bell: 0,
    fish_sling: 0,
    sonic_claw: 0,
    lantern_flare: 0,
  };
  let currentMusicZone: MusicZone = initialMode === 'playing' ? 'rooftops' : 'title';

  let storyState = createInitialStoryState();
  let vitality: VitalityState = createVitalityState(difficultyLevel);
  let bossState: BossState = createBossState(activeActSpec);
  let questState: QuestSystemState = createQuestSystemState(activeActSpec);
  let secretState: SecretQuestState = createSecretQuestState(activeActId);
  const rivalCatState = createCatState(
    activeActSpec.rivalCat.x,
    activeActSpec.rivalCat.y,
    activeActSpec.rivalCat.z
  );
  rivalCatState.yaw = activeActSpec.rivalCat.yaw;
  rivalCatState.grounded = true;

  let chasingDogsCount = 0;
  let fishStolenLastFrame = false;
  let pouncedBirdNextFrame: string | null = null;
  let lastOwlInBeam = false;
  let lastOwlSuspicion = 0;
  let lastOwlStealthSynced = false;
  let doubleJumpsUsed = 0;
  let wallKicksUsed = 0;
  let lastFlowChimeChain = 0;
  let adaptivePixelScale = 1.0;
  let perfDtAccum = 0;
  let perfFrames = 0;
  let hitstopTimer = 0;
  let victoryDelayTimer = 0;
  let bossVictoryHandled = false;
  let runOutcome: 'victory' | 'defeat' | null = null;
  let lastRunScore = 0;
  let effectiveNearbyKind: HudNearbyKind | null = null;
  let effectiveNearbyPrompt: string | null = null;

  let mode: GameModeState = initialMode;
  let elapsed = 0;
  let chimesCount = 0;
  let jumpsCount = 0;
  let chimePulse = 0;
  let checkpointReached = false;
  let camYaw = 0.08;
  let camPitch = 0.32;
  let hudPushTimer = 0;
  let rafHandle = 0;
  let timerHandle = 0;
  let disposed = false;

  const baseWaterColor = new THREE.Color('#ffffff');
  let dayCyclePhase = DEFAULT_HARBOR_START_PHASE;
  let currentDayPhaseName: DayPhaseName = 'dawn';
  let currentDuskFactor = 0.14;
  const _todBg = new THREE.Color();
  const _todFog = new THREE.Color();
  const _todHemiGround = new THREE.Color();
  const _todMid = new THREE.Color();
  const _todTop = new THREE.Color();
  const _todSunGlow = new THREE.Color();
  const _lowHarborSkyLift = new THREE.Color('#457682');
  const _lowSecSkyLift = new THREE.Color('#586A74');
  const _lowGroundLift = new THREE.Color('#4E6B70');
  const _medHarborSkyLift = new THREE.Color('#27535E');
  const _medSecSkyLift = new THREE.Color('#3C4D56');
  const _medGroundLift = new THREE.Color('#465B5B');

  function updateDaylightAtmosphere(spec: ActSpec, weather: WeatherKind): void {
    const isHarbor = spec.id === 'harbor';
    const isLow = graphicsLevel === 'low';
    const isMedium = graphicsLevel === 'medium';

    const daylight = computeDaylightProfile(dayCyclePhase, weather, spec.id);
    currentDayPhaseName = daylight.phaseName;
    currentDuskFactor = daylight.duskFactor;

    if (isHarbor) {
      _todBg.setRGB(daylight.skyHorizon.r, daylight.skyHorizon.g, daylight.skyHorizon.b);
      _todFog.setRGB(daylight.fogColor.r, daylight.fogColor.g, daylight.fogColor.b);
      _todHemiGround.setRGB(daylight.hemiGround.r, daylight.hemiGround.g, daylight.hemiGround.b);
      _todMid.setRGB(daylight.skyMid.r, daylight.skyMid.g, daylight.skyMid.b);
      _todTop.setRGB(daylight.skyTop.r, daylight.skyTop.g, daylight.skyTop.b);
      _todSunGlow.setRGB(daylight.sunColor.r, daylight.sunColor.g, daylight.sunColor.b);

      if (isLow) {
        _todBg.lerp(_lowHarborSkyLift, 0.52);
        _todFog.lerp(_lowHarborSkyLift, 0.52);
        _todHemiGround.lerp(_lowGroundLift, 0.55);
      } else if (isMedium) {
        _todBg.lerp(_medHarborSkyLift, 0.34);
        _todFog.lerp(_medHarborSkyLift, 0.34);
        _todHemiGround.lerp(_medGroundLift, 0.35);
      }

      if (!(scene.background instanceof THREE.Color)) {
        scene.background = _todBg.clone();
      } else {
        scene.background.copy(_todBg);
      }
      sceneFog.color.copy(_todFog);
      hemi.color.setRGB(daylight.hemiSky.r, daylight.hemiSky.g, daylight.hemiSky.b);
      hemi.groundColor.copy(_todHemiGround);
      hemi.intensity = (isLow ? 1.85 : isMedium ? 1.42 : 0.95) * daylight.hemiIntensityMult;

      keyLight.color.setRGB(daylight.sunColor.r, daylight.sunColor.g, daylight.sunColor.b);
      const keyGfxMult = isLow ? 1.32 : isMedium ? 1.24 : 1.0;
      keyLight.intensity = spec.atmosphere.keyIntensity * keyGfxMult * daylight.sunIntensityMult;

      skyDome.setDaylight({
        time: elapsed,
        duskFactor: daylight.duskFactor,
        horizonColor: _todFog,
        midColor: _todMid,
        topColor: _todTop,
        sunDir: daylight.sunDir,
        sunGlowColor: _todSunGlow,
      });

      mats.waterUniforms.uSunDir.value.set(daylight.sunDir[0], daylight.sunDir[1], daylight.sunDir[2]).normalize();
      mats.waterUniforms.uSkyReflectTint.value.setRGB(
        daylight.waterReflectTint.r,
        daylight.waterReflectTint.g,
        daylight.waterReflectTint.b
      );
    } else {
      _todBg.set(spec.atmosphere.skyHex);
      _todFog.set(spec.atmosphere.fogHex);
      _todHemiGround.set(spec.atmosphere.hemiGroundHex);

      if (isLow) {
        _todBg.lerp(_lowSecSkyLift, 0.52);
        _todFog.lerp(_lowSecSkyLift, 0.52);
        _todHemiGround.lerp(_lowGroundLift, 0.55);
      } else if (isMedium) {
        _todBg.lerp(_medSecSkyLift, 0.34);
        _todFog.lerp(_medSecSkyLift, 0.34);
        _todHemiGround.lerp(_medGroundLift, 0.35);
      }

      if (!(scene.background instanceof THREE.Color)) {
        scene.background = _todBg.clone();
      } else {
        scene.background.copy(_todBg);
      }
      sceneFog.color.copy(_todFog);
      hemi.color.set(spec.atmosphere.hemiSkyHex);
      hemi.groundColor.copy(_todHemiGround);
      hemi.intensity = isLow ? 1.85 : isMedium ? 1.42 : 0.95;

      keyLight.color.set(spec.atmosphere.keyHex);
      const keyGfxMult = isLow ? 1.32 : isMedium ? 1.24 : 1.0;
      keyLight.intensity = spec.atmosphere.keyIntensity * keyGfxMult * (weather === 'rain' ? 0.78 : 1.0);
    }

    mats.windowGlass.emissiveIntensity = 1.15 * daylight.windowGlowMult;
    const shimmerBoost =
      lanternShimmerTimer > 0 && graphicsLevel !== 'low'
        ? 1 + Math.sin(elapsed * 16) * 0.45 * (lanternShimmerTimer / 1.1)
        : 1.0;
    mats.lanternGlow.emissiveIntensity = 2.1 * daylight.lanternGlowMult * shimmerBoost;
    if (gfxSettings.particlesEnabled) {
      fireflyMat.opacity = Math.min(0.95, 0.92 * daylight.fireflyVisibility);
    }
  }

  function applyActAtmosphere(spec: ActSpec, weather: WeatherKind): void {
    const isHarbor = spec.id === 'harbor';
    const isLow = graphicsLevel === 'low';
    const isMedium = graphicsLevel === 'medium';

    skyDome.mesh.visible = isHarbor;
    updateDaylightAtmosphere(spec, weather);

    const weatherFogMult = weather === 'mist' ? 1.38 : weather === 'rain' ? 1.24 : 1.0;
    const gfxScale = gfxSettings.fogDensity / 0.0082;
    sceneFog.density = spec.atmosphere.fogDensity * gfxScale * weatherFogMult;
    rimLight.intensity = isLow ? 1.35 : isMedium ? 1.2 : 0.85;

    if (isHarbor) {
      mats.waterSurface.color.copy(baseWaterColor);
    } else {
      mats.waterSurface.color.set(spec.atmosphere.waterColorHex);
    }
    rainPoints.visible = isHighOrUltra() && weather === 'rain' && !spec.id.includes('cistern');
    mats.causticsUniforms.uCausticsStrength.value = isLow ? 0 : isMedium ? 0.45 : 1.0;
  }

  function setupActEntitiesForSpec(spec: ActSpec): void {
    clearActEntitiesVisuals();

    bossRig = createBossRig(spec.boss.id, mats.contactShadow);
    bossRig.root.position.set(spec.boss.x, spec.boss.y, spec.boss.z);
    actEntitiesGroup.add(bossRig.root);

    for (const a of spec.boss.anchors) {
      const av = createArenaAnchorVisual(mats);
      av.group.position.set(a.x, a.y, a.z);
      actEntitiesGroup.add(av.group);
      anchorVisuals.push(av);
    }

    ferryVisual = createFerryGondolaVisual(mats);
    ferryVisual.root.position.set(spec.ferry.x, Math.max(0.04, spec.ferry.y - 0.35), spec.ferry.z);
    actEntitiesGroup.add(ferryVisual.root);

    rivalCatState.x = spec.rivalCat.x;
    rivalCatState.y = spec.rivalCat.y;
    rivalCatState.z = spec.rivalCat.z;
    rivalCatState.yaw = spec.rivalCat.yaw;
    rivalCatState.grounded = true;
    updateCatVisual(rivalCatRig, rivalCatState, elapsed, 1 / 60);
    actEntitiesGroup.add(rivalCatRig.root);

    for (let i = 0; i < spec.rivalCat.rings.length; i++) {
      const ringSpec = spec.rivalCat.rings[i];
      const rr = createRaceRingVisual(i);
      rr.group.position.set(ringSpec.x, ringSpec.y + 0.65, ringSpec.z);
      rr.group.visible = false;
      actEntitiesGroup.add(rr.group);
      raceRingVisuals.push(rr);
    }
  }

  setupActEntitiesForSpec(activeActSpec);
  applyActAtmosphere(activeActSpec, questState.weather.kind);

  const camTarget = new THREE.Vector3(cat.x, cat.y + 0.65, cat.z);
  const camDesiredPos = new THREE.Vector3();
  const camAdjustedPos = { x: 0, y: 0, z: 0 };
  const camLerpTarget = new THREE.Vector3();
  const titleOffsetAngle = rng.range(-0.06, 0.06);

  const inputSnap: InputSnapshot = {
    forward: 0,
    right: 0,
    sprint: false,
    crouch: false,
    purr: false,
    jumpPressed: false,
    jumpHeld: false,
    dashPressed: false,
    sensePressed: false,
    chimePressed: false,
    interactPressed: false,
    dropBaitPressed: false,
    rightClickPressed: false,
    wheelDelta: 0,
    toolSlotPressed: null,
    resetPressed: false,
    pausePressed: false,
    togglePanelPressed: false,
    toggleOverlayPressed: false,
    presetPressed: null,
    cameraYawDelta: 0,
    cameraPitchDelta: 0,
  };

  function triggerScreenShake(amount: number): void {
    if (!gfxSettings.screenShakeEnabled) return;
    const scale = graphicsLevel === 'ultra' ? 1.0 : 0.68;
    shakeTrauma = Math.min(1, shakeTrauma + amount * scale);
  }

  function emitHeavySparks(x: number, y: number, z: number, count: number, spread = 2.6): void {
    if (!isHighOrUltra()) return;
    sparkPoints.visible = true;
    for (let i = 0; i < count; i++) {
      const idx = sparkCursor % SPARK_COUNT;
      sparkCursor++;
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + (idx % 5) * 0.37;
      const spd = spread * (0.55 + (idx % 4) * 0.22);
      sparkPositions[idx * 3] = x;
      sparkPositions[idx * 3 + 1] = y;
      sparkPositions[idx * 3 + 2] = z;
      sparkVelX[idx] = Math.cos(ang) * spd;
      sparkVelY[idx] = 1.6 + (idx % 3) * 0.75;
      sparkVelZ[idx] = Math.sin(ang) * spd;
      sparkLife[idx] = 0.42 + (idx % 4) * 0.1;
    }
    (sparkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  function updateHeavySparkEffects(dt: number): void {
    let anyAlive = false;
    for (let i = 0; i < SPARK_COUNT; i++) {
      if (sparkLife[i] <= 0) {
        sparkPositions[i * 3 + 1] = -999;
        continue;
      }
      anyAlive = true;
      sparkLife[i] -= dt;
      sparkVelY[i] -= 6.5 * dt;
      sparkPositions[i * 3] += sparkVelX[i] * dt;
      sparkPositions[i * 3 + 1] += sparkVelY[i] * dt;
      sparkPositions[i * 3 + 2] += sparkVelZ[i] * dt;
    }
    if (anyAlive) {
      sparkPoints.visible = true;
      (sparkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    } else {
      sparkPoints.visible = false;
    }
  }

  function updateHeavyAimArcVfx(): void {
    if (!gfxSettings.aimArcEnabled || mode !== 'playing') {
      aimArcGroup.visible = false;
      return;
    }
    if (cat.targetLedge && (cat.grounded || cat.swimming)) {
      aimArcGroup.visible = true;
      const sx = cat.x;
      const sy = cat.y + 0.36;
      const sz = cat.z;
      const tx = cat.targetLedge.x;
      const ty = cat.targetLedge.y + 0.08;
      const tz = cat.targetLedge.z;
      const peakBoost = Math.max(0.75, Math.abs(ty - sy) * 0.55 + 0.65);
      for (let i = 0; i < AIM_DOT_COUNT; i++) {
        const t = (i + 1) / (AIM_DOT_COUNT + 1);
        const px = sx + (tx - sx) * t;
        const pz = sz + (tz - sz) * t;
        const py = sy + (ty - sy) * t + Math.sin(t * Math.PI) * peakBoost;
        aimDots[i].position.set(px, py, pz);
      }
      aimDotMat.color.set(PALETTE.amberChime);
      aimDotMat.opacity = 0.72 + Math.sin(elapsed * 7.5) * 0.16;
      return;
    }
    if (activeTool === 'fish_sling' && cat.grounded) {
      aimArcGroup.visible = true;
      const sx = cat.x;
      const sy = cat.y + 0.42;
      const sz = cat.z;
      const tx = sx + Math.sin(cat.yaw) * 4.4;
      const tz = sz + Math.cos(cat.yaw) * 4.4;
      const ty = Math.max(0.15, cat.y - 0.1);
      for (let i = 0; i < AIM_DOT_COUNT; i++) {
        const t = (i + 1) / (AIM_DOT_COUNT + 1);
        const px = sx + (tx - sx) * t;
        const pz = sz + (tz - sz) * t;
        const py = sy + (ty - sy) * t + Math.sin(t * Math.PI) * 1.15;
        aimDots[i].position.set(px, py, pz);
      }
      aimDotMat.color.set('#7CE2C4');
      aimDotMat.opacity = 0.65;
      return;
    }
    aimArcGroup.visible = false;
  }

  function updateHeavyGlintsAndRipplesVfx(dt: number): void {
    // Expanding sound rings update
    for (const r of ripples) {
      if (!r.active) continue;
      r.age += dt;
      const p = r.age / r.maxAge;
      if (p >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const radius = 0.35 + p * r.maxRadius;
      r.mesh.scale.setScalar(radius);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
    }

    // Expanding landing dust puff rings (High/Ultra)
    for (let i = 0; i < landDustPool.length; i++) {
      const d = landDustPool[i];
      if (!d.active) continue;
      d.age += dt;
      const p = d.age / d.maxAge;
      if (p >= 1) {
        d.active = false;
        d.mesh.visible = false;
        continue;
      }
      d.mesh.scale.setScalar(0.55 + p * d.maxScale);
      d.mat.opacity = (1 - p) * 0.48;
    }

    // Air-step / Wall-Kick crescent rings
    for (let i = 0; i < airStepPool.length; i++) {
      const a = airStepPool[i];
      if (!a.active) continue;
      a.age += dt;
      const p = a.age / a.maxAge;
      if (p >= 1) {
        a.active = false;
        a.mesh.visible = false;
        continue;
      }
      a.mesh.scale.setScalar(0.75 + p * 1.85);
      a.mat.opacity = (1 - p) * (1 - p) * 0.78;
    }

    // Golden sun shaft glints
    for (let s = 0; s < sunShafts.length; s++) {
      (sunShafts[s].mesh.material as THREE.MeshBasicMaterial).opacity =
        sunShafts[s].baseOpacity + Math.sin(elapsed * 0.7 + s * 1.4) * 0.015;
    }

    // Sonic Claw expanding slash arc VFX
    if (clawVfxActive) {
      clawVfxAge += dt;
      const cp = clawVfxAge / 0.34;
      if (cp >= 1) {
        clawVfxActive = false;
        clawArcMesh.visible = false;
      } else {
        clawArcMesh.scale.setScalar(0.8 + cp * 1.9);
        clawArcMat.opacity = (1 - cp) * 0.85;
      }
    }

    // Dawn Flare additive halo glints
    for (let i = 0; i < flareVisuals.length; i++) {
      const fl = activeWorld.mechanics.flareSpots[i];
      const fv = flareVisuals[i];
      if (fl) {
        fv.halo.visible = true;
        const pulse = 1.0 + Math.sin(elapsed * 7.0 + i) * 0.14;
        fv.halo.scale.setScalar(pulse);
      }
    }
  }

  function updateAmbientParticlesVfx(dt: number): void {
    // Chimney rising steam wisps (distance-culled beyond 58m of Pip to save CPU & fill-rate)
    const steamStride = graphicsLevel === 'ultra' ? 1 : 2;
    for (let i = 0; i < steamSprites.length; i++) {
      const w = steamSprites[i];
      if (i % steamStride !== 0) {
        w.sprite.visible = false;
        continue;
      }
      const dx = w.baseX - cat.x;
      const dz = w.baseZ - cat.z;
      if (dx * dx + dz * dz > 3364) {
        w.sprite.visible = false;
        continue;
      }
      w.sprite.visible = true;
      const life = (w.phase + elapsed * w.speed) % 1;
      w.sprite.position.set(
        w.baseX + Math.sin(elapsed * 0.9 + w.phase * 6.0) * (0.25 + life * 0.55),
        w.baseY + life * 2.2,
        w.baseZ - life * 0.45
      );
      const scale = 0.45 + life * 1.35;
      w.sprite.scale.set(scale, scale, 1);
      (w.sprite.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.24;
    }

    // Slow lateral canal mist drift
    for (let i = 0; i < canalMists.length; i++) {
      canalMists[i].position.x = canalMistCoords[i][0] + Math.sin(elapsed * 0.18 + i) * 1.4;
    }

    // Drifting dawn mist motes (scaled count on High vs full on Ultra)
    const activeMotes = Math.floor(MOTE_COUNT * gfxSettings.moteVisibilityRatio);
    if (activeMotes > 0) {
      const posAttr = moteGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < activeMotes; i++) {
        const ph = motePhase[i];
        posAttr.setX(i, moteBaseX[i] + Math.sin(elapsed * 0.35 + ph) * 0.45);
        posAttr.setY(i, moteBaseY[i] + Math.cos(elapsed * 0.42 + ph * 1.3) * 0.28);
      }
      for (let i = activeMotes; i < MOTE_COUNT; i++) {
        posAttr.setY(i, -999);
      }
      posAttr.needsUpdate = true;
    }

    // Feather puff burst physics update
    if (featherBurst.active) {
      featherBurst.age += dt;
      if (featherBurst.age >= 1.45) {
        featherBurst.active = false;
        featherBurst.group.visible = false;
      } else {
        const fMat = featherBurst.feathers[0].material as THREE.MeshBasicMaterial;
        fMat.opacity = Math.max(0, 1 - featherBurst.age / 1.45);
        for (let i = 0; i < featherBurst.feathers.length; i++) {
          const fm = featherBurst.feathers[i];
          featherBurst.velY[i] -= 1.6 * dt;
          fm.position.x += featherBurst.velX[i] * dt;
          fm.position.y += featherBurst.velY[i] * dt;
          fm.position.z += featherBurst.velZ[i] * dt;
          fm.rotation.x += dt * 4.2;
          fm.rotation.z += dt * 3.1;
        }
      }
    }
  }

  function emitBellRipple(x: number, y: number, z: number): void {
    if (isHighOrUltra()) {
      const slot = ripples.find((r) => !r.active) ?? ripples[0];
      slot.active = true;
      slot.age = 0;
      slot.maxAge = 0.95;
      slot.maxRadius = tuning.bell.chimeRadius;
      (slot.mesh.material as THREE.MeshBasicMaterial).color.set(PALETTE.amberChime);
      slot.mesh.position.set(x, y + 0.08, z);
      slot.mesh.scale.setScalar(0.3);
      slot.mesh.visible = true;
      emitHeavySparks(x, y + 0.25, z, 12, 2.8);
      triggerScreenShake(0.24);
    }
    chimesCount++;
    chimePulse = 1.0;
    lanternShimmerTimer = 1.1;
    soundEngine.unlock();
    playSound('chime', 1.0);
    events.emit('bell_chimed', { x, y, z, radius: tuning.bell.chimeRadius, harmonic: 1 });
    pushHudAndMetrics(true);
  }

  function spawnLandingDust(x: number, y: number, z: number, impactScale = 1): void {
    if (!isHighOrUltra()) return;
    const slot = landDustPool[landDustCursor % landDustPool.length];
    landDustCursor++;
    slot.active = true;
    slot.age = 0;
    slot.maxAge = 0.34 + impactScale * 0.14;
    slot.maxScale = 0.95 + impactScale * 0.85;
    slot.mesh.position.set(x, y + 0.035, z);
    slot.mesh.scale.setScalar(0.55);
    slot.mat.opacity = 0.48;
    slot.mesh.visible = true;
  }

  function spawnAirStepRing(
    x: number,
    y: number,
    z: number,
    colorHex: string,
    wallNormalX = 0,
    wallNormalZ = 0
  ): void {
    if (graphicsLevel === 'low') return;
    const slot = airStepPool[airStepCursor % airStepPool.length];
    airStepCursor++;
    slot.active = true;
    slot.age = 0;
    slot.maxAge = 0.34;
    slot.mat.color.set(colorHex);
    slot.mat.opacity = 0.78;
    slot.mesh.position.set(x, y + 0.14, z);
    if (Math.hypot(wallNormalX, wallNormalZ) > 0.2) {
      slot.mesh.rotation.set(0, Math.atan2(wallNormalX, wallNormalZ), 0);
    } else {
      slot.mesh.rotation.set(-Math.PI * 0.5, 0, 0);
    }
    slot.mesh.scale.setScalar(0.75);
    slot.mesh.visible = true;
  }

  function emitSplashRipple(x: number, z: number): void {
    spawnWaterWake(x, z, 0.45, 2.6, 1.15, 0.42);
    if (!isHighOrUltra()) return;
    const slot = ripples.find((r) => !r.active) ?? ripples[0];
    slot.active = true;
    slot.age = 0;
    slot.maxAge = 0.7;
    slot.maxRadius = 1.9;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.set('#A8C8BE');
    slot.mesh.position.set(x, 0.04, z);
    slot.mesh.scale.setScalar(0.32);
    slot.mesh.visible = true;
    emitHeavySparks(x, 0.14, z, 8, 1.9);
  }

  function syncRunScoreAndSave(actClearedNow: boolean): void {
    const lettersRead = activeWorld.mechanics.letters.filter((l) => l.collected).length;
    const stats = {
      actId: activeActId,
      rubCount: storyState.rubCount,
      stolenFishCount: storyState.stolenFishCount,
      escapedChaseCount: storyState.escapedChaseCount,
      distractedDogsCount: storyState.distractedDogsCount,
      stealthAvoidedCount: storyState.stealthAvoidedCount,
      lettersFound: lettersRead,
      doubleJumpsUsed,
      raceWon: questState.race.completed,
      bossDefeated: bossState.phase === 'defeated',
      chimesCount,
      secretQuestsCompleted: [...secretState.rewardedIds],
    };
    lastRunScore = computeActRunScore(stats);
    const evalRes = evaluateAchievements(saveData, stats);
    saveData = evalRes.updatedSave;
    if (actClearedNow) {
      saveData = {
        ...saveData,
        fishBank: saveData.fishBank + 5,
        highestReachedAct: Math.max(saveData.highestReachedAct, Math.min(2, activeActSpec.index + 1)),
      };
    }
    writeSave(saveData);
  }

  function resetRun(): void {
    cat.x = activeActSpec.spawn.x;
    cat.y = activeActSpec.spawn.y;
    cat.z = activeActSpec.spawn.z;
    cat.vx = 0;
    cat.vy = 0;
    cat.vz = 0;
    cat.yaw = activeActSpec.spawn.yaw;
    cat.grounded = true;
    cat.swimming = false;
    cat.hopActive = false;
    cat.purrTimer = 0;
    cat.rubTimer = 0;
    cat.frightTimer = 0;
    cat.carryingFish = false;
    cat.sleeping = false;
    cat.warmthTimer = 0;
    cat.maxAirJumps = playerBonuses.maxAirJumps;
    cat.airJumpsRemaining = playerBonuses.maxAirJumps;
    cat.dashTimer = 0;
    cat.dashCooldown = 0;
    cat.gliding = false;
    cat.surfaceId = activeActSpec.spawn.surfaceId;
    cat.checkpointX = activeActSpec.spawn.x;
    cat.checkpointY = activeActSpec.spawn.y;
    cat.checkpointZ = activeActSpec.spawn.z;
    cat.airTime = 0;
    cat.jumpAnimTimer = 0;
    cat.landTimer = 0;
    cat.landImpact = 0;
    cat.airSpinTimer = 0;
    cat.wallContactTimer = 0;
    cat.parkourChain = 0;
    cat.parkourFlowTimer = 0;
    swimWakeMesh.visible = false;
    clawArcMesh.visible = false;
    clawVfxActive = false;
    glideHaloMesh.visible = false;
    senseTimer = 0;
    senseCooldown = 0;
    senseWaveAge = -1;
    senseWaveMesh.visible = false;
    for (const sb of senseBeams) sb.mesh.visible = false;
    for (const dg of dashGhosts) {
      dg.active = false;
      dg.group.visible = false;
    }
    for (const asr of airStepPool) {
      asr.active = false;
      asr.mesh.visible = false;
    }
    dashTrailAccum = 0;
    glideSparkAccum = 0;
    windLines.visible = false;
    lanternShimmerTimer = 0;
    landingDipOffset = 0;
    lastStrideIndex = 0;
    prevDayPhaseName = currentDayPhaseName;
    wetPawTimer = 0;
    activeWetPawsCount = 0;
    lastPawX = cat.x;
    lastPawZ = cat.z;
    for (const wp of wetPawPool) {
      wp.active = false;
      wp.mesh.visible = false;
    }
    for (const wk of waterWakePool) {
      wk.active = false;
      wk.mesh.visible = false;
    }
    for (const fv of flareVisuals) fv.group.visible = false;
    camYaw = 0.08;
    camPitch = 0.32;
    if (camera.fov !== 52) {
      camera.fov = 52;
      camera.updateProjectionMatrix();
    }
    for (const id of TOOL_ORDER) toolCooldowns[id] = 0;
    chimesCount = 0;
    jumpsCount = 0;
    doubleJumpsUsed = 0;
    wallKicksUsed = 0;
    lastFlowChimeChain = 0;
    hitstopTimer = 0;
    victoryDelayTimer = 0;
    bossVictoryHandled = false;
    runOutcome = null;
    lastRunScore = 0;
    checkpointReached = false;
    chasingDogsCount = 0;
    fishStolenLastFrame = false;
    pouncedBirdNextFrame = null;
    lastOwlInBeam = false;
    lastOwlSuspicion = 0;
    lastOwlStealthSynced = false;
    effectiveNearbyKind = null;
    effectiveNearbyPrompt = null;
    featherBurst.active = false;
    featherBurst.group.visible = false;

    storyState = createInitialStoryState();
    if (activeActId !== 'harbor') {
      storyState.dialogue = null;
    }
    vitality = createVitalityState(difficultyLevel);
    bossState = createBossState(activeActSpec);
    questState = createQuestSystemState(activeActSpec);
    secretState = createSecretQuestState(activeActId);

    // Reset Harbor Secret Quest visuals
    const vaultSurf = harborBundle.surfaces.find((s) => s.id === SECRET_VAULT_SURFACE_SPEC.surfaceId);
    if (vaultSurf) vaultSurf.visible = false;
    secretVaultVisual.group.visible = false;
    for (const fv of forkVisuals) {
      fv.coreMat.color.set('#4CE0B3');
      fv.coreMat.emissive.set('#163D34');
      fv.coreMat.emissiveIntensity = 0.45;
      fv.core.rotation.set(0, 0, 0);
    }
    mackerelVisual.visible = false;
    mackerelCarrierMesh.visible = false;

    applyActAtmosphere(activeActSpec, questState.weather.kind);

    if (camTarget && camera) {
      camTarget.set(cat.x, cat.y + 0.72, cat.z);
      const dist = 3.85;
      const horiz = Math.cos(camPitch) * dist;
      camera.position.set(
        camTarget.x + Math.sin(camYaw) * horiz,
        camTarget.y + Math.sin(camPitch) * dist + 0.42,
        camTarget.z + Math.cos(camYaw) * horiz
      );
      camera.lookAt(camTarget.x, camTarget.y + 0.18, camTarget.z - 0.65 * Math.cos(camYaw));
    }

    const w = activeWorld;
    w.mechanics.stealthGraceTimer = 0;
    w.mechanics.nextDecoySeq = 1;
    w.mechanics.decoyFish.length = 0;
    w.mechanics.flareSpots.length = 0;

    if (activeActId === 'harbor') {
      const freshMech = createHarborMechanicsState();
      for (let i = 0; i < w.mechanics.waterwheels.length; i++) {
        w.mechanics.waterwheels[i].angle = freshMech.waterwheels[i].angle;
        w.mechanics.waterwheels[i].dir = -1;
        w.mechanics.waterwheels[i].reverseTimer = 0;
      }
      for (let i = 0; i < w.mechanics.owls.length; i++) {
        w.mechanics.owls[i].phase = freshMech.owls[i].phase;
      }
    }

    for (let i = 0; i < w.mechanics.echoLedges.length; i++) {
      w.mechanics.echoLedges[i].revealTimer = 0;
      if (w.echoVisuals[i]) w.echoVisuals[i].group.visible = false;
      const surf = w.surfaces.find((s) => s.id === w.mechanics.echoLedges[i].surfaceId);
      if (surf) surf.visible = false;
    }
    for (let i = 0; i < w.mechanics.owls.length; i++) {
      w.mechanics.owls[i].suspicion = 0;
      w.mechanics.owls[i].catInBeam = false;
      w.mechanics.owls[i].stealthSynced = false;
    }
    for (let i = 0; i < w.mechanics.baitPails.length; i++) {
      w.mechanics.baitPails[i].tipped = false;
      w.mechanics.baitPails[i].respawnTimer = 0;
      if (w.pailVisuals[i]) {
        w.pailVisuals[i].bucketGroup.rotation.z = 0;
        w.pailVisuals[i].bucketGroup.position.set(0, 0, 0);
        w.pailVisuals[i].spilledGroup.visible = false;
      }
    }
    for (let i = 0; i < w.mechanics.letters.length; i++) {
      w.mechanics.letters[i].collected = false;
      if (w.letterVisuals[i]) w.letterVisuals[i].visible = true;
    }
    for (const dMesh of decoyFishMeshes) dMesh.visible = false;
    for (const rr of raceRingVisuals) rr.group.visible = false;

    for (const d of w.npcState.dogs) {
      d.behavior = 'patrol';
      d.chaseTimer = 0;
      d.chaseElapsed = 0;
      d.chaseCooldown = 0;
      d.distractedTimer = 0;
      d.caughtCooldown = 0;
      d.pauseTimer = 0;
      if (d.waypoints.length > 0) {
        d.x = d.waypoints[0].x;
        d.y = d.waypoints[0].y;
        d.z = d.waypoints[0].z;
        d.wpIndex = d.waypoints.length > 1 ? 1 : 0;
      }
    }
    for (const spot of w.fishSpots) {
      spot.remainingFish = spot.maxFish;
      const list = w.fishMeshMap.get(spot.id);
      if (list) {
        for (const m of list) m.visible = true;
      }
    }
    if (bossRig) {
      bossRig.root.visible = true;
      bossRig.root.position.set(bossState.x, bossState.y, bossState.z);
      bossRig.telegraphMat.opacity = 0;
      bossRig.vulnMat.opacity = 0;
    }
    updateCatVisual(catRig, cat, elapsed, 1 / 60);
    pushHudAndMetrics(true);
  }

  function loadAct(actId: ActId, startPlaying = false): void {
    activeActId = actId;
    activeActSpec = ACT_SPECS[actId];

    if (actId === 'harbor') {
      clearSecondaryWorld();
      harborGroup.visible = true;
      activeWorld = harborBundle;
      activeBatchedChunks = harborBatch.chunkCount;
      activeMergedMeshes = harborBatch.mergedCount;
    } else {
      harborGroup.visible = false;
      clearSecondaryWorld();
      const built = buildSecondaryActWorld(actId, activeActSpec, mats, harborPropAssets);
      secondaryWorld = built;
      scene.add(built.root);

      secondaryPersonRigs = built.npcState.people.map((p) => {
        const rig = createPersonRig(p, mats);
        rig.root.userData.noBatch = true;
        built.root.add(rig.root);
        return rig;
      });
      secondaryDogRigs = built.npcState.dogs.map((d) => {
        const rig = createDogRig(d, mats);
        rig.root.userData.noBatch = true;
        built.root.add(rig.root);
        return rig;
      });
      secondaryBirdRigs = built.npcState.birds.map((b) => {
        const rig = createBirdRig(b, mats);
        rig.root.userData.noBatch = true;
        built.root.add(rig.root);
        return rig;
      });

      for (const rg of built.rotatingGears) rg.mesh.userData.noBatch = true;
      for (const ev of built.echoVisuals) ev.group.userData.noBatch = true;
      for (const ov of built.owlVisuals) ov.root.userData.noBatch = true;
      for (const pv of built.pailVisuals) pv.root.userData.noBatch = true;
      for (const lv of built.letterVisuals) lv.userData.noBatch = true;

      const secBatch = batchStaticGroupByMaterial(built.root, 64);
      built.disposableGeos.push(...secBatch.disposableGeos);
      activeBatchedChunks = secBatch.chunkCount;
      activeMergedMeshes = secBatch.mergedCount;

      activeWorld = {
        surfaces: built.surfaces,
        colliders: built.colliders,
        fishSpots: built.fishSpots,
        fishMeshMap: built.fishMeshMap,
        npcState: built.npcState,
        personRigs: secondaryPersonRigs,
        dogRigs: secondaryDogRigs,
        birdRigs: secondaryBirdRigs,
        mechanics: built.mechanics,
        echoVisuals: built.echoVisuals,
        wheelVisuals: [],
        owlVisuals: built.owlVisuals,
        pailVisuals: built.pailVisuals,
        letterVisuals: built.letterVisuals,
      };
    }

    setupActEntitiesForSpec(activeActSpec);
    resetRun();
    if (startPlaying) {
      setMode('playing');
    } else {
      renderNow();
    }
  }

  function advanceToNextAct(): void {
    const nextId = getNextActId(activeActId);
    if (nextId) {
      loadAct(nextId, true);
    } else {
      runOutcome = null;
      setMode('title');
    }
  }

  function continueAfterVictory(): void {
    runOutcome = null;
    victoryDelayTimer = 0;
    setMode('playing');
  }

  function buySkill(skillId: SkillId): SaveData {
    const next = purchaseSkill(saveData, skillId);
    if (next) {
      saveData = next;
      playerBonuses = computePlayerBonuses(saveData.unlockedSkills, saveData.equippedCollar);
      cat.maxAirJumps = playerBonuses.maxAirJumps;
      cat.airJumpsRemaining = playerBonuses.maxAirJumps;
      if (skillId === 'double_jump') {
        syncRunScoreAndSave(false);
      } else {
        writeSave(saveData);
      }
      playSound('unlock', 1.1);
      pushHudAndMetrics(true);
    }
    return saveData;
  }

  function collarAction(collarId: CollarId): SaveData {
    const next = purchaseOrEquipCollar(saveData, collarId);
    if (next) {
      saveData = next;
      playerBonuses = computePlayerBonuses(saveData.unlockedSkills, saveData.equippedCollar);
      cat.maxAirJumps = playerBonuses.maxAirJumps;
      cat.airJumpsRemaining = playerBonuses.maxAirJumps;
      catRig.setCollarAccent(getEquippedCollarHex(saveData.equippedCollar));
      writeSave(saveData);
      playSound('ui', 1.15);
      pushHudAndMetrics(true);
    }
    return saveData;
  }

  function setMode(nextMode: GameModeState): void {
    mode = nextMode;
    document.body.dataset.state = nextMode;
    if (nextMode === 'playing') {
      soundEngine.unlock();
      input.clearAll();
    }
    onModeChange(nextMode);
    pushHudAndMetrics(true);
  }

  function setDifficulty(level: DifficultyLevel): void {
    difficultyLevel = level;
    difficultyMods = getDifficultyModifiers(level);
    const updated = createDefaultTuning(level);
    tuning.parkour = updated.parkour;
    tuning.stealth = updated.stealth;
    tuning.difficulty = updated.difficulty;
    const prevHpRatio = vitality.hp / Math.max(1, vitality.maxHp);
    const freshV = createVitalityState(level);
    freshV.hp = Math.max(1, Math.min(freshV.maxHp, Math.round(prevHpRatio * freshV.maxHp)));
    vitality = freshV;
    pushHudAndMetrics(true);
  }

  function applyGraphicsQuality(level: GraphicsLevel): void {
    graphicsLevel = level;
    document.body.dataset.graphicsLevel = level;
    saveGraphicsLevel(level);
    gfxSettings = getGraphicsSettings(level, isSoftwareGl);
    adaptivePixelScale = 1.0;
    perfDtAccum = 0;
    perfFrames = 0;

    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, gfxSettings.pixelRatioCap)
    );
    renderer.toneMapping = level === 'low' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = gfxSettings.toneMappingExposure;
    renderer.shadowMap.enabled = gfxSettings.shadowsEnabled;
    waterMesh.receiveShadow = gfxSettings.shadowsEnabled;
    if (!isSoftwareGl) {
      keyLight.castShadow = gfxSettings.shadowsEnabled;
      const targetSize = Math.max(512, gfxSettings.shadowMapSize);
      if (
        keyLight.shadow.mapSize.x !== targetSize ||
        keyLight.shadow.mapSize.y !== targetSize
      ) {
        keyLight.shadow.mapSize.set(targetSize, targetSize);
        if (keyLight.shadow.map) {
          keyLight.shadow.map.dispose();
          keyLight.shadow.map = null;
        }
      }
      renderer.shadowMap.needsUpdate = true;
    }

    applyActAtmosphere(activeActSpec, questState.weather.kind);
    skyDome.setEcoMode(level === 'low');
    scene.environmentIntensity =
      level === 'low' ? 0 : level === 'medium' ? 0.65 : level === 'high' ? 0.95 : 1.25;
    mats.waterSurface.envMapIntensity = gfxSettings.waterEnvIntensity;
    mats.waterUniforms.uWaterQuality.value = gfxSettings.waterQualityTier;
    mats.waterUniforms.uEnableGlints.value = isHighOrUltra() ? 1 : 0;

    if (camera.far !== gfxSettings.cameraFar) {
      camera.far = gfxSettings.cameraFar;
      camera.updateProjectionMatrix();
    }
    if (bloomPass) {
      bloomPass.strength = gfxSettings.bloomStrength;
    }
    for (const s of sunShafts) {
      s.mesh.visible = gfxSettings.shaftsEnabled && isHighOrUltra();
    }

    motePoints.visible = gfxSettings.particlesEnabled;
    moteMat.opacity = 0.65 * gfxSettings.moteVisibilityRatio;
    fireflyPoints.visible = gfxSettings.particlesEnabled;
    petalPoints.visible = isHighOrUltra() && activeActId !== 'cistern';
    for (const sp of steamSprites) {
      if (!gfxSettings.particlesEnabled) sp.sprite.visible = false;
    }
    for (const mSp of canalMists) {
      // Medium keeps simple static sprites without glow; Low Eco turns off mist sprites completely
      mSp.visible = graphicsLevel !== 'low';
    }
    if (graphicsLevel === 'low') {
      wetPawTimer = 0;
      activeWetPawsCount = 0;
      for (const wp of wetPawPool) {
        wp.active = false;
        wp.mesh.visible = false;
      }
      for (const wk of waterWakePool) {
        wk.active = false;
        wk.mesh.visible = false;
      }
    }
    catRig.contactShadow.visible = gfxSettings.contactShadowsEnabled;

    if (!isHighOrUltra()) {
      for (let i = 0; i < SPARK_COUNT; i++) sparkLife[i] = 0;
      sparkPoints.visible = false;
      aimArcGroup.visible = false;
      clawVfxActive = false;
      clawArcMesh.visible = false;
      for (const r of ripples) {
        r.active = false;
        r.mesh.visible = false;
      }
      for (const d of landDustPool) {
        d.active = false;
        d.mesh.visible = false;
      }
      for (const fv of flareVisuals) {
        fv.halo.visible = false;
      }
    }
    if (!gfxSettings.particlesEnabled) {
      featherBurst.active = false;
      featherBurst.group.visible = false;
    }
    if (!gfxSettings.screenShakeEnabled) {
      shakeTrauma = 0;
    }
    if (!gfxSettings.tilt3DEnabled) {
      camTiltRoll = 0;
    }

    renderNow();
    pushHudAndMetrics(true);
  }

  function setCatBreed(breed: CatBreedId): void {
    if (catBreed === breed) return;
    catBreed = breed;
    saveCatBreed(breed);
    scene.remove(catRig.root);
    for (const g of catRig.geometries) g.dispose();
    for (const m of catRig.materials) m.dispose();
    for (const t of catRig.textures) t.dispose();
    catRig = createCatRig(mats.contactShadow, catBreed, getEquippedCollarHex(saveData.equippedCollar));
    catRig.contactShadow.visible = gfxSettings.contactShadowsEnabled;
    scene.add(catRig.root);
    updateCatVisual(catRig, cat, elapsed, 1 / 60, chimePulse);
    playSound('ui', 1.1);
    renderNow();
    pushHudAndMetrics(true);
  }

  function setRightClickMode(nextRcMode: RightClickMode): void {
    rightClickMode = nextRcMode;
    pushHudAndMetrics(true);
  }

  function selectTool(tool: ToolId): void {
    if (activeTool !== tool) {
      activeTool = tool;
      playSound('ui');
      pushHudAndMetrics(true);
    }
  }

  function pushHudAndMetrics(force = false): void {
    if (!force && hudPushTimer < 0.1) return;
    hudPushTimer = 0;

    const info = getStoryChapterInfo(storyState);
    const rank = computeTricksterRank(storyState);
    const rankKey = computeTricksterRankKey(storyState);
    const w = activeWorld;
    const radarBlips: RadarBlip[] = [];
    for (const d of w.npcState.dogs) {
      radarBlips.push({ x: d.x, z: d.z, kind: 'dog' });
    }
    for (const o of w.mechanics.owls) {
      radarBlips.push({ x: o.spotX, z: o.spotZ, kind: 'owl' });
    }
    for (const l of w.mechanics.letters) {
      if (!l.collected) radarBlips.push({ x: l.x, z: l.z, kind: 'letter' });
    }
    if (bossState.phase !== 'defeated') {
      radarBlips.push({ x: bossState.x, z: bossState.z, kind: 'boss' });
    }
    radarBlips.push({ x: activeActSpec.ferry.x, z: activeActSpec.ferry.z, kind: 'ferry' });
    if (questState.race.active) {
      const nextRing = activeActSpec.rivalCat.rings[questState.race.nextRingIndex];
      if (nextRing) {
        radarBlips.push({ x: nextRing.x, z: nextRing.z, kind: 'ring' });
      }
    }
    if (activeActId === 'harbor') {
      for (const b of secretState.beacons) {
        if (!b.activated) radarBlips.push({ x: b.x, z: b.z, kind: 'secret' });
      }
      if (secretState.salvatoreStage === 'active') {
        radarBlips.push({ x: secretState.mackerelPos.x, z: secretState.mackerelPos.z, kind: 'secret' });
      } else if (secretState.salvatoreStage === 'carrying') {
        radarBlips.push({ x: secretState.salvatorePos.x, z: secretState.salvatorePos.z, kind: 'secret' });
      }
    }

    const activeStats = {
      actId: activeActId,
      rubCount: storyState.rubCount,
      stolenFishCount: storyState.stolenFishCount,
      escapedChaseCount: storyState.escapedChaseCount,
      distractedDogsCount: storyState.distractedDogsCount,
      stealthAvoidedCount: storyState.stealthAvoidedCount,
      lettersFound: w.mechanics.letters.filter((l) => l.collected).length,
      doubleJumpsUsed,
      raceWon: questState.race.completed,
      bossDefeated: bossState.phase === 'defeated',
      chimesCount,
      secretQuestsCompleted: [...secretState.rewardedIds],
    };
    const liveRunScore = Math.max(lastRunScore, computeActRunScore(activeStats));

    onTelemetry({
      actId: activeActId,
      districtLabel: info.chapterTitle,
      objectiveText: cat.swimming
        ? cat.targetLedge
          ? 'Нажми [Space], чтобы запрыгнуть на сухой причал'
          : 'Плыви к каменной набережной, пирсу или лодке [WASD + Space]'
        : info.objectiveText,
      chapter: storyState.chapter,
      rank,
      rankKey,
      chimesCount,
      jumpsCount,
      rubCount: storyState.rubCount,
      stolenFishCount: storyState.stolenFishCount,
      purrCount: storyState.purrCount,
      escapedChaseCount: storyState.escapedChaseCount,
      distractedDogsCount: storyState.distractedDogsCount,
      wheelsReversedCount: storyState.wheelsReversedCount,
      lettersFound: w.mechanics.letters.filter((l) => l.collected).length,
      lettersTotal: w.mechanics.letters.length,
      gullsStalkedCount: storyState.gullsStalkedCount,
      nestsSleptCount: storyState.nestsSleptCount,
      chasedByDog: chasingDogsCount > 0,
      carryingFish: cat.carryingFish,
      owlInBeam: lastOwlInBeam,
      owlSuspicion: lastOwlSuspicion,
      owlStealthSynced: lastOwlStealthSynced,
      warmthTimer: cat.warmthTimer,
      sleeping: cat.sleeping,
      nearbyPrompt: effectiveNearbyPrompt ?? (storyState.nearby ? storyState.nearby.promptLabel : null),
      nearbyKind: effectiveNearbyKind ?? (storyState.nearby ? storyState.nearby.kind : null),
      dialogue: storyState.dialogue
        ? { id: storyState.dialogue.id, speaker: storyState.dialogue.speaker, text: storyState.dialogue.text }
        : null,
      storyComplete: storyState.epilogueReady,
      targetLedgeReady: Boolean(cat.targetLedge),
      swimming: cat.swimming,
      crouching: cat.crouching,
      purring: cat.purring,
      bellCooldownPct: Math.min(1, toolCooldowns.bell / (TOOL_SPECS.bell.cooldownSec * playerBonuses.toolCooldownMult)),
      checkpointReached,
      activeTool,
      toolCooldowns: {
        bell: Math.min(1, toolCooldowns.bell / (TOOL_SPECS.bell.cooldownSec * playerBonuses.toolCooldownMult)),
        fish_sling: Math.min(1, toolCooldowns.fish_sling / (TOOL_SPECS.fish_sling.cooldownSec * playerBonuses.toolCooldownMult)),
        sonic_claw: Math.min(1, toolCooldowns.sonic_claw / (TOOL_SPECS.sonic_claw.cooldownSec * playerBonuses.toolCooldownMult)),
        lantern_flare: Math.min(1, toolCooldowns.lantern_flare / (TOOL_SPECS.lantern_flare.cooldownSec * playerBonuses.toolCooldownMult)),
      },
      musicZone: currentMusicZone,
      difficulty: difficultyLevel,
      graphicsLevel,
      catBreed,
      rightClickMode,
      hp: vitality.hp,
      maxHp: vitality.maxHp,
      boss: {
        id: bossState.id,
        active: bossState.active,
        phase: bossState.phase,
        hp: bossState.hp,
        maxHp: bossState.maxHp,
      },
      quests: questState.quests.map((q) => ({ ...q })),
      secretQuests: getSecretQuestHudList(secretState),
      carryingGoldenMackerel: secretState.salvatoreStage === 'carrying',
      race: {
        active: questState.race.active,
        completed: questState.race.completed,
        nextRingIndex: questState.race.nextRingIndex,
        totalRings: questState.race.totalRings,
        timeRemaining: questState.race.timeRemaining,
      },
      weather: questState.weather.kind,
      catX: cat.x,
      catZ: cat.z,
      camYaw,
      radarBlips,
      save: saveData,
      outcome: runOutcome,
      runScore: liveRunScore,
      hasDoubleJump: playerBonuses.maxAirJumps > 0,
      airJumpsRemaining: cat.airJumpsRemaining,
      dashCooldownPct: Math.min(1, cat.dashCooldown / 1.5),
      dashActive: cat.dashTimer > 0,
      gliding: cat.gliding,
      senseCooldownPct: Math.min(1, senseCooldown / SENSE_COOLDOWN_SEC),
      senseActive: senseTimer > 0,
      dayPhase: currentDayPhaseName,
      dayCyclePhase,
      speed: Number(Math.hypot(cat.vx, cat.vz).toFixed(1)),
      parkourChain: cat.parkourChain,
      wallKicksUsed,
    });

    window.__metrics = {
      seed,
      mode,
      actId: activeActId,
      difficulty: difficultyLevel,
      graphicsLevel,
      catBreed,
      rightClickMode,
      activeTool,
      musicZone: currentMusicZone,
      x: Number(cat.x.toFixed(2)),
      y: Number(cat.y.toFixed(2)),
      z: Number(cat.z.toFixed(2)),
      grounded: cat.grounded,
      swimming: cat.swimming,
      sleeping: cat.sleeping,
      warmthTimer: Number(cat.warmthTimer.toFixed(2)),
      surfaceId: cat.surfaceId,
      jumps: jumpsCount,
      doubleJumpsUsed,
      chimes: chimesCount,
      dashActive: cat.dashTimer > 0,
      dashCooldown: Number(cat.dashCooldown.toFixed(2)),
      gliding: cat.gliding,
      senseActive: senseTimer > 0,
      senseCooldown: Number(senseCooldown.toFixed(2)),
      hp: vitality.hp,
      maxHp: vitality.maxHp,
      boss: {
        id: bossState.id,
        phase: bossState.phase,
        hp: bossState.hp,
        maxHp: bossState.maxHp,
      },
      weather: questState.weather.kind,
      raceActive: questState.race.active,
      raceCompleted: questState.race.completed,
      outcome: runOutcome,
      runScore: liveRunScore,
      fishBank: saveData.fishBank,
      highestReachedAct: saveData.highestReachedAct,
      chapter: storyState.chapter,
      rank,
      rankKey,
      rubCount: storyState.rubCount,
      stolenFishCount: storyState.stolenFishCount,
      purrCount: storyState.purrCount,
      escapedChaseCount: storyState.escapedChaseCount,
      distractedDogsCount: storyState.distractedDogsCount,
      wheelsReversedCount: storyState.wheelsReversedCount,
      lettersFound: w.mechanics.letters.filter((l) => l.collected).length,
      gullsStalkedCount: storyState.gullsStalkedCount,
      nestsSleptCount: storyState.nestsSleptCount,
      chasedByDog: chasingDogsCount > 0,
      owlInBeam: lastOwlInBeam,
      owlSuspicion: Number(lastOwlSuspicion.toFixed(2)),
      checkpointReached,
      npcs: {
        people: w.npcState.people.length,
        dogs: w.npcState.dogs.length,
        birds: w.npcState.birds.length,
      },
      worldBounds: activeActSpec.bounds,
      renderDrawCalls: renderer.info.render.calls,
      renderTriangles: renderer.info.render.triangles,
      batchedChunks: activeBatchedChunks,
      mergedMeshes: activeMergedMeshes,
      rainIntensity: Number(mats.waterUniforms.uRainIntensity.value.toFixed(2)),
      dayPhase: currentDayPhaseName,
      dayCyclePhase: Number(dayCyclePhase.toFixed(3)),
      speed: Number(Math.hypot(cat.vx, cat.vz).toFixed(1)),
      parkourChain: cat.parkourChain,
      wallKicksUsed,
      adaptivePixelScale: Number(adaptivePixelScale.toFixed(2)),
      duskFactor: Number(currentDuskFactor.toFixed(2)),
      wetPawsActive: activeWetPawsCount,
      firefliesOpacity: Number(fireflyMat.opacity.toFixed(2)),
      causticsStrength: mats.causticsUniforms.uCausticsStrength.value,
      graphicsProfile: {
        level: graphicsLevel,
        rank: GRAPHICS_LEVEL_RANK[graphicsLevel],
        bloom: gfxSettings.glowEffectsEnabled,
        shadows: gfxSettings.shadowsEnabled,
        particles: gfxSettings.particlesEnabled,
        tilt3D: gfxSettings.tilt3DEnabled,
        screenShake: gfxSettings.screenShakeEnabled,
        aimArc: gfxSettings.aimArcEnabled,
        heavyVfx: isHighOrUltra(),
        uiAnimations: gfxSettings.uiAnimationsEnabled,
        complexGradients: gfxSettings.complexGradientsEnabled,
        ecoMode: graphicsLevel === 'low',
      },
      isSoftwareGl,
    };
  }

  window.__GAME__ = {
    ready: true,
    seed,
    isSoftwareGl,
    start: () => setMode('playing'),
    restart: () => resetRun(),
    setAct: (actId: ActId) => loadAct(actId, false),
    advanceToNextAct: () => advanceToNextAct(),
    continueAfterVictory: () => continueAfterVictory(),
    setDayPhase: (phase: number) => {
      dayCyclePhase = ((phase % 1) + 1) % 1;
      applyActAtmosphere(activeActSpec, questState.weather.kind);
      renderNow();
      pushHudAndMetrics(true);
    },
    setWeather: (weather: WeatherKind) => {
      questState.weather.kind = weather;
      mats.waterUniforms.uRainIntensity.value =
        weather === 'rain' && activeActId !== 'cistern' && graphicsLevel !== 'low' ? 1.0 : 0.0;
      applyActAtmosphere(activeActSpec, weather);
      renderNow();
      pushHudAndMetrics(true);
    },
    teleportCat: (x: number, y: number, z: number) => {
      cat.x = x;
      cat.y = y;
      cat.z = z;
      cat.vx = 0;
      cat.vy = 0;
      cat.vz = 0;
      cat.grounded = true;
      camTarget.set(cat.x, cat.y + 0.72, cat.z);
      const horiz = Math.cos(camPitch) * 3.85;
      camera.position.set(
        camTarget.x + Math.sin(camYaw) * horiz,
        camTarget.y + Math.sin(camPitch) * 3.85 + 0.42,
        camTarget.z + Math.cos(camYaw) * horiz
      );
      camera.lookAt(camTarget.x, camTarget.y + 0.18, camTarget.z - 0.65 * Math.cos(camYaw));
      updateCatVisual(catRig, cat, elapsed, 1 / 60);
      renderNow();
      pushHudAndMetrics(true);
    },
    buySkill: (id: SkillId) => buySkill(id),
    collarAction: (id: CollarId) => collarAction(id),
    setDifficulty: (lvl: DifficultyLevel) => setDifficulty(lvl),
    setGraphicsQuality: (lvl: GraphicsLevel) => applyGraphicsQuality(lvl),
    setCatBreed: (breed: CatBreedId) => setCatBreed(breed),
    setRightClickMode: (rc: RightClickMode) => setRightClickMode(rc),
    selectTool: (t: ToolId) => selectTool(t),
    getState: () => ({
      mode,
      actId: activeActId,
      difficulty: difficultyLevel,
      graphicsLevel,
      graphicsProfile: {
        rank: GRAPHICS_LEVEL_RANK[graphicsLevel],
        bloom: gfxSettings.glowEffectsEnabled,
        shadows: gfxSettings.shadowsEnabled,
        particles: gfxSettings.particlesEnabled,
        tilt3D: gfxSettings.tilt3DEnabled,
        screenShake: gfxSettings.screenShakeEnabled,
        aimArc: gfxSettings.aimArcEnabled,
        heavyVfx: isHighOrUltra(),
        uiAnimations: gfxSettings.uiAnimationsEnabled,
        complexGradients: gfxSettings.complexGradientsEnabled,
        ecoMode: graphicsLevel === 'low',
      },
      catBreed,
      rightClickMode,
      activeTool,
      musicZone: currentMusicZone,
      vitality: { hp: vitality.hp, maxHp: vitality.maxHp, defeated: vitality.defeated },
      boss: {
        id: bossState.id,
        active: bossState.active,
        phase: bossState.phase,
        hp: bossState.hp,
        maxHp: bossState.maxHp,
      },
      weather: questState.weather.kind,
      quests: questState.quests,
      secretQuests: getSecretQuestHudList(secretState),
      carryingGoldenMackerel: secretState.salvatoreStage === 'carrying',
      race: questState.race,
      save: saveData,
      outcome: runOutcome,
      runScore: lastRunScore,
      cat: {
        x: cat.x,
        y: cat.y,
        z: cat.z,
        grounded: cat.grounded,
        swimming: cat.swimming,
        purring: cat.purrTimer > 0,
        crouching: cat.crouching,
        sleeping: cat.sleeping,
        warmthTimer: cat.warmthTimer,
        carryingFish: cat.carryingFish,
        surfaceId: cat.surfaceId,
        airJumpsRemaining: cat.airJumpsRemaining,
        dashActive: cat.dashTimer > 0,
        dashCooldown: cat.dashCooldown,
        gliding: cat.gliding,
        senseActive: senseTimer > 0,
        senseCooldown: senseCooldown,
      },
      story: {
        chapter: storyState.chapter,
        rank: computeTricksterRank(storyState),
        rankKey: computeTricksterRankKey(storyState),
        rubCount: storyState.rubCount,
        stolenFishCount: storyState.stolenFishCount,
        purrCount: storyState.purrCount,
        escapedChaseCount: storyState.escapedChaseCount,
        distractedDogsCount: storyState.distractedDogsCount,
        wheelsReversedCount: storyState.wheelsReversedCount,
        lettersFound: activeWorld.mechanics.letters.filter((l) => l.collected).length,
        gullsStalkedCount: storyState.gullsStalkedCount,
        nestsSleptCount: storyState.nestsSleptCount,
        chasedByDog: chasingDogsCount > 0,
        nearby: effectiveNearbyKind ?? (storyState.nearby?.kind ?? null),
        epilogueReady: storyState.epilogueReady,
      },
      mechanics: {
        owlInBeam: lastOwlInBeam,
        owlSuspicion: lastOwlSuspicion,
        owlStealthSynced: lastOwlStealthSynced,
        activeDecoyFish: activeWorld.mechanics.decoyFish.length,
        activeFlares: activeWorld.mechanics.flareSpots.length,
        wheels: activeWorld.mechanics.waterwheels.map((w) => ({ id: w.id, dir: w.dir, reverseTimer: w.reverseTimer })),
      },
      npcs: {
        people: activeWorld.npcState.people.length,
        dogs: activeWorld.npcState.dogs.length,
        birds: activeWorld.npcState.birds.length,
      },
      worldBounds: activeActSpec.bounds,
      jumpsCount,
      doubleJumpsUsed,
      chimesCount,
      checkpointReached,
    }),
  };

  const detachInput = input.attach(renderer.domElement);

  function renderNow(): void {
    if (!isSoftwareGl && gfxSettings.postProcessing && composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth || 1280;
    const h = container.clientHeight || window.innerHeight || 720;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, gfxSettings.pixelRatioCap)
    );
    renderer.setSize(w, h);
    if (composer) {
      composer.setSize(w, h);
    }
    renderNow();
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  function stepSimulation(dt: number): void {
    elapsed += dt;
    hudPushTimer += dt;

    // Track directional key-light shadow frustum cleanly around Pip (snapped to 0.5m grid to stop shadow edge shimmer)
    const snapX = Math.round(cat.x * 2) * 0.5;
    const snapZ = Math.round(cat.z * 2) * 0.5;
    const sunDir = mats.waterUniforms.uSunDir.value;
    if (activeActId === 'harbor') {
      keyLight.target.position.set(snapX, 0, snapZ);
      keyLight.position.set(snapX + sunDir.x * 32, Math.max(8, sunDir.y * 34), snapZ + sunDir.z * 32);
    } else if (gfxSettings.shadowsEnabled && !isSoftwareGl) {
      keyLight.target.position.set(snapX, 0, snapZ);
      keyLight.position.set(snapX + 22, 16, snapZ + 18);
    }

    // Smooth Time-of-Day Cycle (Dawn -> Noon -> Starry Dusk) + Caustics + Raindrop Splash Ripples
    if (lanternShimmerTimer > 0) lanternShimmerTimer = Math.max(0, lanternShimmerTimer - dt);
    prevDayPhaseName = currentDayPhaseName;
    dayCyclePhase = (dayCyclePhase + dt / DAY_CYCLE_DURATION_SEC) % 1;
    updateDaylightAtmosphere(activeActSpec, questState.weather.kind);
    if (
      mode === 'playing' &&
      activeActId === 'harbor' &&
      prevDayPhaseName !== currentDayPhaseName &&
      (currentDayPhaseName === 'dawn' || currentDayPhaseName === 'dusk')
    ) {
      playSound('bell_toll', 0.92);
    }
    mats.waterUniforms.uTime.value = elapsed;
    mats.causticsUniforms.uTime.value = elapsed;
    const targetRainWater =
      questState.weather.kind === 'rain' && activeActId !== 'cistern' && graphicsLevel !== 'low'
        ? 1.0
        : 0.0;
    mats.waterUniforms.uRainIntensity.value +=
      (targetRainWater - mats.waterUniforms.uRainIntensity.value) * Math.min(1, dt * 1.8);

    if (gradePass) {
      gradePass.uniforms.uTime.value = elapsed;
    }

    // Clockwork gear rotation (Harbor Dam gears + Secondary Act gears)
    if (activeActId === 'harbor') {
      const gearBoost = storyState.chapter === 4 ? 2.4 : 1.0;
      gearMain.rotation.z = elapsed * 0.14 * gearBoost;
      gearSmall.rotation.z = -elapsed * 0.25 * gearBoost;

      for (const sk of skiffs) {
        sk.mesh.position.y = 0.02 + Math.sin(elapsed * 1.1 + sk.phase) * 0.035;
        sk.mesh.rotation.z = Math.sin(elapsed * 1.1 + sk.phase + 0.6) * 0.035;
        sk.mesh.rotation.x = Math.cos(elapsed * 0.92 + sk.phase) * 0.02;
      }

      // Staggered canal wakes beneath bobbing moored skiffs & ferry gondola
      if (graphicsLevel !== 'low' && skiffs.length > 0) {
        skiffWakeAccum += dt;
        if (skiffWakeAccum >= 1.15) {
          skiffWakeAccum = 0;
          const idx = skiffWakeIndex++ % (skiffs.length + 1);
          if (idx < skiffs.length) {
            const skPos = skiffs[idx].mesh.position;
            spawnWaterWake(skPos.x, skPos.z, 1.35, 3.6, 2.2, 0.24);
          } else if (ferryVisual) {
            spawnWaterWake(
              ferryVisual.root.position.x,
              ferryVisual.root.position.z,
              1.6,
              4.2,
              2.4,
              0.28
            );
          }
        }
      }

      if (graphicsLevel !== 'low') {
        const windGust = questState.weather.kind === 'rain' ? 1.7 : 1.0;
        const amp = 0.24 * Math.min(1.5, windGust);
        for (const bf of buntingFlags) {
          bf.mesh.rotation.x = Math.sin(elapsed * 2.8 * windGust + bf.phase) * amp;
        }
      }
    } else if (secondaryWorld) {
      for (const rg of secondaryWorld.rotatingGears) {
        rg.mesh.rotation.z += rg.speed * dt;
      }
    }

    // Animate Clockwork Fireflies + expanding boat/boss water wakes
    if (gfxSettings.particlesEnabled) {
      fireflyPoints.visible = true;
      const fAttr = fireflyGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < FIREFLY_COUNT; i++) {
        const ph = fireflyPhase[i];
        fAttr.setXYZ(
          i,
          fireflyBaseX[i] + Math.sin(elapsed * 0.72 + ph) * 1.45,
          fireflyBaseY[i] + Math.sin(elapsed * 1.35 + ph * 1.7) * 0.45,
          fireflyBaseZ[i] + Math.cos(elapsed * 0.68 + ph * 1.3) * 1.45
        );
      }
      fAttr.needsUpdate = true;
    } else {
      fireflyPoints.visible = false;
    }

    // Drifting Harbor Courtyard Sunbeam Petals (High/Ultra only, non-cistern)
    if (isHighOrUltra() && activeActId !== 'cistern') {
      petalPoints.visible = true;
      const pAttr = petalGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PETAL_COUNT; i++) {
        const ph = petalPhase[i];
        const drift = (elapsed * 0.24 + ph) % 6.0;
        pAttr.setXYZ(
          i,
          petalBaseX[i] + Math.sin(elapsed * 0.55 + ph) * 2.4,
          petalBaseY[i] + 2.8 - drift,
          petalBaseZ[i] + Math.cos(elapsed * 0.48 + ph * 1.4) * 2.4
        );
      }
      pAttr.needsUpdate = true;
    } else {
      petalPoints.visible = false;
    }

    for (let i = 0; i < waterWakePool.length; i++) {
      const wk = waterWakePool[i];
      if (!wk.active) continue;
      wk.age += dt;
      const wp = wk.age / wk.maxAge;
      if (wp >= 1) {
        wk.active = false;
        wk.mesh.visible = false;
      } else {
        wk.mesh.scale.setScalar(wk.startScale + (wk.endScale - wk.startScale) * wp);
        wk.mat.opacity = wk.maxOpacity * (1 - wp) * (1 - wp);
      }
    }

    // Chimney steam, mist banks, dust motes & feathers (never invoked when particles disabled on Medium / Low Eco)
    if (gfxSettings.particlesEnabled) {
      updateAmbientParticlesVfx(dt);
    }

    // Dynamic Rain particles around Pip (strictly gated behind isHighOrUltra())
    if (isHighOrUltra() && questState.weather.kind === 'rain' && activeActId !== 'cistern') {
      rainPoints.visible = true;
      const rAttr = rainGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < RAIN_COUNT; i++) {
        let rx = rAttr.getX(i);
        let ry = rAttr.getY(i) - dt * 15.0;
        let rz = rAttr.getZ(i);
        if (ry < 0) {
          ry = cat.y + 10.5;
          rx = cat.x + (((i * 73) % 100) * 0.24 - 12);
          rz = cat.z + (((i * 47) % 100) * 0.24 - 12);
        }
        rAttr.setXYZ(i, rx, ry, rz);
      }
      rAttr.needsUpdate = true;
    } else {
      rainPoints.visible = false;
    }

    if (chimePulse > 0) {
      chimePulse = Math.max(0, chimePulse - dt * 1.8);
    }

    // Heavy drawing & visual effects (Sparks, Aiming Arcs, Glints, Ripples) — NEVER executed below High
    if (isHighOrUltra()) {
      updateHeavySparkEffects(dt);
      updateHeavyGlintsAndRipplesVfx(dt);
    }

    // Adaptive Music Zone calculation & sequencer pulse
    currentMusicZone = determineMusicZone({
      mode,
      chasingDogs: chasingDogsCount,
      owlInBeam: lastOwlInBeam,
      swimming: cat.swimming,
      catY: cat.y,
      catZ: cat.z,
    });
    if (bossState.active && bossState.phase !== 'defeated') {
      currentMusicZone = 'chase';
    } else if (activeActId !== 'harbor' && currentMusicZone === 'rooftops' && mode === 'playing') {
      currentMusicZone = activeActSpec.atmosphere.defaultMusicZone;
    }
    soundEngine.setMusicZone(currentMusicZone);
    soundEngine.stepMusic(dt);
    soundEngine.updateAmbient(dt, {
      active: mode === 'playing',
      weather: questState.weather.kind,
      swimming: cat.swimming,
      altitude: cat.y,
    });

    input.consume(inputSnap);

    if (inputSnap.pausePressed && (mode === 'playing' || mode === 'paused')) {
      setMode(mode === 'playing' ? 'paused' : 'playing');
      return;
    }

    const w = activeWorld;

    if (mode !== 'playing') {
      // Diegetic In-World Awakening camera on Title / Pause / Outcome (NPCs still live & breathe in backdrop)
      stepNpcs(w.npcState, cat, false, dt, false, [], null, { difficulty: difficultyMods });
      for (let i = 0; i < w.npcState.people.length; i++) updatePersonVisual(w.personRigs[i], w.npcState.people[i], elapsed);
      for (let i = 0; i < w.npcState.dogs.length; i++) updateDogVisual(w.dogRigs[i], w.npcState.dogs[i], elapsed);
      for (let i = 0; i < w.npcState.birds.length; i++) updateBirdVisual(w.birdRigs[i], w.npcState.birds[i]);
      const sway = Math.sin(elapsed * 0.35 + titleOffsetAngle) * 0.08;
      const desiredX = cat.x - 1.55 + sway;
      const desiredY = cat.y + 1.18;
      const desiredZ = cat.z + 3.35;
      camera.position.set(desiredX, desiredY, desiredZ);
      camera.lookAt(cat.x - 1.95, cat.y + 0.88, cat.z - 5.2);
      updateCatVisual(catRig, cat, elapsed, dt, chimePulse);
      updateCatVisual(rivalCatRig, rivalCatState, elapsed, dt, 0);
      return;
    }

    if (inputSnap.resetPressed) {
      resetRun();
      return;
    }

    // Impact Hitstop freeze for heavy combat strikes
    if (hitstopTimer > 0) {
      hitstopTimer = Math.max(0, hitstopTimer - dt);
      return;
    }

    camYaw += inputSnap.cameraYawDelta;
    camPitch = THREE.MathUtils.clamp(camPitch + inputSnap.cameraPitchDelta, 0.08, 0.92);

    // Weapon / tool selection via mouse wheel or digits [1-4]
    if (inputSnap.wheelDelta !== 0) {
      activeTool = cycleToolId(activeTool, inputSnap.wheelDelta);
      soundEngine.unlock();
      playSound('ui', 1.15);
      pushHudAndMetrics(true);
    } else if (inputSnap.toolSlotPressed !== null) {
      const picked = TOOL_ORDER[inputSnap.toolSlotPressed - 1];
      if (picked && picked !== activeTool) {
        activeTool = picked;
        soundEngine.unlock();
        playSound('ui', 1.15);
        pushHudAndMetrics(true);
      }
    }

    // Right-click action routing (Jump OR Use Active Tool)
    const effectiveJumpPressed =
      inputSnap.jumpPressed || (inputSnap.rightClickPressed && rightClickMode === 'jump');
    const effectiveToolFire =
      inputSnap.chimePressed || (inputSnap.rightClickPressed && rightClickMode === 'use_tool');

    for (const id of TOOL_ORDER) {
      if (toolCooldowns[id] > 0) {
        toolCooldowns[id] = Math.max(0, toolCooldowns[id] - dt);
      }
    }

    let chimedThisStep = false;
    let activeToolFired: ToolId | null = null;
    if (effectiveToolFire && toolCooldowns[activeTool] <= 0) {
      toolCooldowns[activeTool] = TOOL_SPECS[activeTool].cooldownSec * playerBonuses.toolCooldownMult;
      activeToolFired = activeTool;
      soundEngine.unlock();
      if (activeTool === 'bell') {
        emitBellRipple(cat.x, cat.y, cat.z);
        chimedThisStep = true;
      } else if (activeTool === 'fish_sling') {
        playSound('steal', 1.1);
        emitHeavySparks(cat.x + Math.sin(cat.yaw) * 0.6, cat.y + 0.4, cat.z + Math.cos(cat.yaw) * 0.6, 8, 2.0);
      } else if (activeTool === 'sonic_claw') {
        playSound('claw');
        if (isHighOrUltra()) {
          clawVfxActive = true;
          clawVfxAge = 0;
          clawArcMesh.position.set(cat.x + Math.sin(cat.yaw) * 0.7, cat.y + 0.35, cat.z + Math.cos(cat.yaw) * 0.7);
          clawArcMesh.rotation.z = cat.yaw - Math.PI * 0.5;
          clawArcMesh.visible = true;
          emitHeavySparks(cat.x + Math.sin(cat.yaw) * 0.9, cat.y + 0.38, cat.z + Math.cos(cat.yaw) * 0.9, 16, 3.6);
          triggerScreenShake(0.42);
        }
      } else if (activeTool === 'lantern_flare') {
        playSound('flare');
        if (isHighOrUltra()) {
          emitHeavySparks(cat.x, cat.y + 0.5, cat.z, 18, 3.8);
          triggerScreenShake(0.32);
        }
      }
      pushHudAndMetrics(true);
    }

    const effectiveDifficulty = {
      ...difficultyMods,
      owlSuspicionFillMult:
        difficultyMods.owlSuspicionFillMult *
        playerBonuses.owlSuspicionMult *
        questState.weather.owlDetectionMult,
      dogChaseSpeedMult: difficultyMods.dogChaseSpeedMult * questState.weather.dogScentMult,
    };

    // Step Harbor / Act Mechanics (Waterwheels, Echo Sky-Bridges, Owls, Pails, Decoy Fish, Flares, Letters)
    const mechEvents = stepHarborMechanics(
      w.mechanics,
      cat,
      w.surfaces,
      {
        chimedThisStep,
        dropBaitPressed: inputSnap.dropBaitPressed,
        activeToolFired,
        difficulty: effectiveDifficulty,
      },
      dt
    );
    lastOwlInBeam = mechEvents.owlInBeam;
    lastOwlSuspicion = mechEvents.owlSuspicionMax;
    lastOwlStealthSynced = mechEvents.owlStealthSynced;

    if (mechEvents.echoRevealedCount > 0) playSound('echo');
    if (mechEvents.reversedWheelId) playSound('wheel');
    if (mechEvents.collectedLetter) {
      playSound('letter');
      saveData.fishBank += 1;
      writeSave(saveData);
    }
    if (mechEvents.owlAlarmFired) playSound('alert');

    // Sync Echo Sky-Bridge visuals
    for (let i = 0; i < w.mechanics.echoLedges.length; i++) {
      const echo = w.mechanics.echoLedges[i];
      const vis = w.echoVisuals[i];
      if (!vis) continue;
      if (echo.revealTimer > 0) {
        vis.group.visible = true;
        const fade = Math.min(1, echo.revealTimer / 1.5);
        vis.surfaceMat.opacity = (0.64 + Math.sin(elapsed * 5.0 + i) * 0.08) * fade;
        vis.trimMat.opacity = 0.85 * fade;
      } else {
        vis.group.visible = false;
      }
    }

    // Sync Waterwheel rotors & horizontal paddle decks
    for (let i = 0; i < w.mechanics.waterwheels.length; i++) {
      const wheel = w.mechanics.waterwheels[i];
      const vis = w.wheelVisuals[i];
      if (!vis) continue;
      vis.wheelRotor.rotation.x = -wheel.angle;
      vis.rimMat.emissive.set(wheel.dir === 1 ? '#8F5818' : '#241509');
      vis.rimMat.emissiveIntensity = wheel.dir === 1 ? 0.42 : 0.12;
      for (let p = 0; p < wheel.paddles.length; p++) {
        const a = wheel.angle + wheel.paddles[p].angleOffset;
        vis.paddles[p].position.set(0, Math.sin(a) * wheel.radius, Math.cos(a) * wheel.radius);
      }
    }

    // Sync Owl Searchlights
    for (let i = 0; i < w.mechanics.owls.length; i++) {
      const owl = w.mechanics.owls[i];
      const vis = w.owlVisuals[i];
      if (!vis) continue;
      vis.pivot.lookAt(owl.spotX, owl.groundY, owl.spotZ);
      const beamLen = Math.hypot(owl.spotX - owl.pivotX, owl.groundY - owl.pivotY, owl.spotZ - owl.pivotZ);
      vis.beamCone.scale.set(1, 1, beamLen);
      vis.spotRing.position.set(owl.spotX, owl.groundY + 0.04, owl.spotZ);

      const colHex = owl.stealthSynced
        ? '#4CE0B3'
        : owl.suspicion > 0.2
          ? '#FF3B1F'
          : PALETTE.dangerBeam;
      vis.eyeMat.color.set(colHex);
      vis.beamMat.uniforms.uColor.value.set(colHex);
      vis.beamMat.uniforms.uOpacity.value = owl.stealthSynced ? 0.12 : 0.17 + owl.suspicion * 0.14;
      vis.spotMat.color.set(colHex);
      vis.spotMat.opacity = owl.stealthSynced ? 0.34 : 0.42 + owl.suspicion * 0.32;
    }

    // Sync Bait Pails
    for (let i = 0; i < w.mechanics.baitPails.length; i++) {
      const pail = w.mechanics.baitPails[i];
      const vis = w.pailVisuals[i];
      if (!vis) continue;
      if (pail.tipped) {
        vis.bucketGroup.rotation.z = -Math.PI * 0.48;
        vis.bucketGroup.position.set(-0.14, 0.16, 0);
        vis.spilledGroup.visible = true;
      } else {
        vis.bucketGroup.rotation.z = 0;
        vis.bucketGroup.position.set(0, 0, 0);
        vis.spilledGroup.visible = false;
      }
    }

    // Sync Decoy Fish pool
    for (let i = 0; i < decoyFishMeshes.length; i++) {
      const df = w.mechanics.decoyFish[i];
      if (df) {
        decoyFishMeshes[i].visible = true;
        decoyFishMeshes[i].position.set(df.x, df.y + 0.02, df.z);
        decoyFishMeshes[i].rotation.y = elapsed * 1.4 + i;
      } else {
        decoyFishMeshes[i].visible = false;
      }
    }

    // Sync Dawn Flare orbs
    for (let i = 0; i < flareVisuals.length; i++) {
      const fl = w.mechanics.flareSpots[i];
      const fv = flareVisuals[i];
      if (fl) {
        fv.group.visible = true;
        fv.group.position.set(fl.x, fl.y + Math.sin(elapsed * 3.5 + i) * 0.08, fl.z);
        const pulse = 1.0 + Math.sin(elapsed * 7.0 + i) * 0.14;
        fv.halo.scale.setScalar(pulse);
      } else {
        fv.group.visible = false;
      }
    }

    // Sync Marco Parchment Letters
    for (let i = 0; i < w.mechanics.letters.length; i++) {
      const l = w.mechanics.letters[i];
      const lVis = w.letterVisuals[i];
      if (!lVis) continue;
      if (l.collected) {
        lVis.visible = false;
      } else {
        lVis.visible = true;
        lVis.position.y = l.y + Math.sin(elapsed * 2.2 + i) * 0.07;
        lVis.rotation.y = elapsed * 0.8 + i;
      }
    }

    const npcEvents = stepNpcs(
      w.npcState,
      cat,
      chimedThisStep,
      dt,
      fishStolenLastFrame,
      w.mechanics.decoyFish,
      pouncedBirdNextFrame,
      {
        difficulty: effectiveDifficulty,
        sonicClawImpact: mechEvents.sonicClawImpact,
        flareSpots: w.mechanics.flareSpots,
      }
    );
    fishStolenLastFrame = false;
    pouncedBirdNextFrame = null;
    chasingDogsCount = npcEvents.chasingDogs;
    if (npcEvents.barked) playSound('bark');
    if (npcEvents.chirped) playSound('chirp');
    if (npcEvents.caughtCat) {
      playSound('meow', 1.28);
      triggerScreenShake(0.55);
      if (applyDamageToPlayer(vitality, 1)) {
        if (vitality.defeated) {
          runOutcome = 'defeat';
          syncRunScoreAndSave(false);
          setMode('gameover');
          return;
        }
        pushHudAndMetrics(true);
      }
    }
    if (npcEvents.stalkedGullPos) {
      playSound('feather');
      if (gfxSettings.particlesEnabled) {
        featherBurst.active = true;
        featherBurst.age = 0;
        featherBurst.group.visible = true;
        featherBurst.group.position.set(
          npcEvents.stalkedGullPos.x,
          npcEvents.stalkedGullPos.y + 0.16,
          npcEvents.stalkedGullPos.z
        );
        for (let i = 0; i < featherBurst.feathers.length; i++) {
          const ang = (i / featherBurst.feathers.length) * Math.PI * 2 + 0.25;
          featherBurst.feathers[i].position.set(0, 0, 0);
          featherBurst.velX[i] = Math.cos(ang) * (1.2 + (i % 3) * 0.45);
          featherBurst.velY[i] = 1.45 + (i % 2) * 0.55;
          featherBurst.velZ[i] = Math.sin(ang) * (1.2 + (i % 3) * 0.45);
        }
      }
      emitHeavySparks(npcEvents.stalkedGullPos.x, npcEvents.stalkedGullPos.y + 0.2, npcEvents.stalkedGullPos.z, 10, 2.2);
    }
    for (let i = 0; i < w.npcState.people.length; i++) updatePersonVisual(w.personRigs[i], w.npcState.people[i], elapsed);
    for (let i = 0; i < w.npcState.dogs.length; i++) updateDogVisual(w.dogRigs[i], w.npcState.dogs[i], elapsed);
    for (let i = 0; i < w.npcState.birds.length; i++) updateBirdVisual(w.birdRigs[i], w.npcState.birds[i]);

    const stepRes = stepCatParkour(
      cat,
      {
        forward: inputSnap.forward,
        right: inputSnap.right,
        cameraYaw: camYaw,
        sprint: inputSnap.sprint,
        crouch: inputSnap.crouch,
        purr: inputSnap.purr,
        jumpPressed: effectiveJumpPressed,
        jumpHeld: inputSnap.jumpHeld,
        dashPressed: inputSnap.dashPressed,
      },
      w.surfaces,
      tuning.parkour,
      dt,
      w.colliders,
      {
        maxAirJumps: playerBonuses.maxAirJumps,
        sprintMult: playerBonuses.sprintMult,
        swimMult: playerBonuses.swimMult,
        ledgeSnapBonus: playerBonuses.ledgeSnapBonus,
        bounds: activeActSpec.bounds,
      }
    );

    if (stepRes.dashedNow) {
      soundEngine.unlock();
      playSound('dash');
      emitHeavySparks(cat.x, cat.y + 0.35, cat.z, 12, 2.8);
      triggerScreenShake(0.18);
      dashTrailAccum = 0.04; // spawn first ghost immediately
      pushHudAndMetrics(true);
    }
    if (stepRes.glideStarted) {
      soundEngine.unlock();
      playSound('glide');
      pushHudAndMetrics(true);
    }
    if (stepRes.doubleJumped) {
      doubleJumpsUsed++;
      spawnAirStepRing(cat.x, cat.y, cat.z, '#FFD57E');
      emitHeavySparks(cat.x, cat.y + 0.12, cat.z, 10, 2.2);
    }
    if (stepRes.wallKicked) {
      wallKicksUsed++;
      soundEngine.unlock();
      playSound('wall_kick', 0.96 + Math.min(0.24, cat.parkourChain * 0.04));
      spawnAirStepRing(
        cat.x,
        cat.y + 0.15,
        cat.z,
        '#6FE6D6',
        cat.lastWallNormalX,
        cat.lastWallNormalZ
      );
      emitHeavySparks(cat.x, cat.y + 0.2, cat.z, 9, 2.1);
      pushHudAndMetrics(true);
    }

    // Ability 3: Whisker Sense [KeyV] cooldown & sonar trigger
    if (senseCooldown > 0) senseCooldown = Math.max(0, senseCooldown - dt);
    if (senseTimer > 0) senseTimer = Math.max(0, senseTimer - dt);
    if (inputSnap.sensePressed && senseCooldown <= 0) {
      senseCooldown = SENSE_COOLDOWN_SEC;
      senseTimer = SENSE_DURATION_SEC;
      senseWaveAge = 0;
      senseWaveMesh.position.set(cat.x, cat.y + 0.16, cat.z);
      senseWaveMesh.scale.setScalar(0.5);
      senseWaveMesh.visible = true;
      soundEngine.unlock();
      playSound('sense');
      emitHeavySparks(cat.x, cat.y + 0.45, cat.z, 14, 2.5);
      pushHudAndMetrics(true);
    }

    // Check Ferry / Rival Cat proximity interactions before standard Story interactions
    const nearFerry = isNearFerryGondola(cat, activeActSpec);
    const nearRival = !nearFerry && isNearRivalCat(cat, activeActSpec) && !questState.race.active;
    let startRacePressed = false;
    effectiveNearbyKind = null;
    effectiveNearbyPrompt = null;

    if (nearFerry) {
      if (bossState.phase === 'defeated') {
        effectiveNearbyKind = 'board_ferry';
        effectiveNearbyPrompt = '[Q] Gondola';
        if (inputSnap.interactPressed) {
          runOutcome = 'victory';
          syncRunScoreAndSave(false);
          setMode('gameover');
          return;
        }
      } else {
        effectiveNearbyKind = 'ferry_locked';
        effectiveNearbyPrompt = 'Guardian';
      }
    } else if (nearRival) {
      effectiveNearbyKind = 'rival_race';
      effectiveNearbyPrompt = '[Q] Race';
      if (inputSnap.interactPressed) {
        startRacePressed = true;
      }
    }

    const onPerchSurface =
      cat.surfaceId === 'roof_perch' ||
      cat.surfaceId === 'clockwork_dam' ||
      (checkpointReached && Math.hypot(cat.x, cat.z + 16.5) < 4.5);
    const storyEvents = stepStorySystem(
      storyState,
      cat,
      w.fishSpots,
      w.npcState.people,
      {
        interactPressed: !nearFerry && !nearRival && inputSnap.interactPressed,
        purrActive: inputSnap.purr,
        chimedThisStep,
        chasingDogs: npcEvents.chasingDogs,
        escapedChase: npcEvents.escapedChase,
        dogGaveUp: npcEvents.dogGaveUp,
        distractedDog: npcEvents.distractedDog,
        caughtByDog: npcEvents.caughtCat,
        onCheckpointPerch: onPerchSurface,
        baitPails: w.mechanics.baitPails,
        nests: w.mechanics.nests,
        birds: w.npcState.birds,
        stalkedGullNow: Boolean(npcEvents.stalkedGullPos),
        mechEvents,
      },
      dt
    );

    if (storyEvents.tippedPailId) {
      const bait = tipBaitPail(w.mechanics, storyEvents.tippedPailId);
      if (bait) {
        soundEngine.unlock();
        playSound('pail');
      }
      pushHudAndMetrics(true);
    }
    if (storyEvents.sleptNestId) {
      soundEngine.unlock();
      playSound('sleep');
      healPlayer(vitality, 1);
      pushHudAndMetrics(true);
    }
    if (storyEvents.pouncedBirdId) {
      pouncedBirdNextFrame = storyEvents.pouncedBirdId;
      soundEngine.unlock();
      playSound('feather');
      pushHudAndMetrics(true);
    }

    if (storyEvents.stoleFishSpotId) {
      fishStolenLastFrame = true;
      soundEngine.unlock();
      playSound('steal');
      healPlayer(vitality, 1);
      const meshes = w.fishMeshMap.get(storyEvents.stoleFishSpotId);
      if (meshes) {
        const visibleMesh = meshes.find((m) => m.visible);
        if (visibleMesh) visibleMesh.visible = false;
      }
      pushHudAndMetrics(true);
    }
    if (storyEvents.rubbedPersonId) {
      soundEngine.unlock();
      playSound('meow', 0.95);
      playSound('purr');
      pushHudAndMetrics(true);
    }
    if (storyEvents.purredNow) {
      soundEngine.unlock();
      playSound('purr');
      pushHudAndMetrics(true);
    }
    if (storyEvents.chapterAdvancedTo) {
      soundEngine.unlock();
      playSound(storyEvents.chapterAdvancedTo === 4 ? 'unlock' : 'story');
      pushHudAndMetrics(true);
    }

    // Step Act Boss Encounter & Player Vitality
    const bossEvents = stepBossSystem(
      bossState,
      vitality,
      cat,
      {
        activeToolFired,
        chimeRadius: tuning.bell.chimeRadius * playerBonuses.chimeRadiusMult,
        difficulty: difficultyLevel,
      },
      dt
    );
    if (bossEvents.hitstopSec > 0) hitstopTimer = bossEvents.hitstopSec;
    if (bossEvents.engagedNow) {
      playSound('alert', 0.78);
      pushHudAndMetrics(true);
    }
    if (bossEvents.telegraphStarted) playSound('alert', 0.95);
    if (bossEvents.staggeredNow) {
      playSound('unlock', 0.9);
      triggerScreenShake(0.36);
      emitHeavySparks(bossState.x, bossState.y + 1.2, bossState.z, 18, 3.2);
      pushHudAndMetrics(true);
    }
    if (bossEvents.damagedBossNow) {
      playSound('claw', 1.12);
      triggerScreenShake(0.48);
      emitHeavySparks(bossState.x, bossState.y + 1.3, bossState.z, 22, 3.8);
      pushHudAndMetrics(true);
    }
    if (bossEvents.damagedPlayerNow) {
      playSound('meow', 1.32);
      triggerScreenShake(0.5);
      pushHudAndMetrics(true);
    }
    if (bossEvents.bossDefeatedNow && !bossVictoryHandled) {
      bossVictoryHandled = true;
      playSound('unlock', 1.22);
      emitHeavySparks(bossState.x, bossState.y + 1.5, bossState.z, 32, 4.5);
      triggerScreenShake(0.6);
      syncRunScoreAndSave(true);
      victoryDelayTimer = 1.4;
      pushHudAndMetrics(true);
    }
    if (bossEvents.playerDefeatedNow) {
      runOutcome = 'defeat';
      syncRunScoreAndSave(false);
      setMode('gameover');
      return;
    }

    // Sync Boss Rig, Arena Anchors, Ferry & Rival Race Rings visuals
    if (bossRig) {
      if (bossState.phase === 'defeated') {
        bossRig.root.visible = false;
      } else {
        bossRig.root.visible = true;
        const flyBob = bossState.id === 'gufo_oro' ? 1.15 + Math.sin(elapsed * 3.2) * 0.24 : 0;
        bossRig.root.position.set(bossState.x, bossState.y + flyBob, bossState.z);
        bossRig.body.rotation.y = bossState.yaw;

        if (bossState.phase === 'attack' && lastBossWakePhase !== 'attack' && bossState.y < 1.8) {
          spawnWaterWake(bossState.x, bossState.z, 1.5, 6.2, 1.5, 0.52);
        }
        lastBossWakePhase = bossState.phase;

        if (bossRig.wingL && bossRig.wingR) {
          const flap = Math.sin(elapsed * 8.5) * 0.38;
          bossRig.wingL.rotation.z = flap;
          bossRig.wingR.rotation.z = -flap;
        }

        if (bossState.hitFlashTimer > 0) {
          bossRig.coreMat.emissive.set('#FFD580');
          bossRig.coreMat.emissiveIntensity = 1.6;
        } else if (bossState.phase === 'vulnerable') {
          bossRig.coreMat.emissive.set('#806614');
          bossRig.coreMat.emissiveIntensity = 0.65;
        } else {
          bossRig.coreMat.emissive.set('#281408');
          bossRig.coreMat.emissiveIntensity = 0.25;
        }

        if (bossState.phase === 'telegraph' || bossState.phase === 'attack') {
          bossRig.telegraphMat.opacity = bossState.phase === 'telegraph' ? 0.52 + Math.sin(elapsed * 18) * 0.22 : 0.35;
          bossRig.telegraphRing.position.set(
            bossState.targetX - bossState.x,
            0.06 - flyBob,
            bossState.targetZ - bossState.z
          );
        } else {
          bossRig.telegraphMat.opacity = 0;
        }

        if (bossState.phase === 'vulnerable') {
          bossRig.vulnMat.opacity = 0.6 + Math.sin(elapsed * 9) * 0.2;
          bossRig.vulnAura.scale.setScalar(1.0 + Math.sin(elapsed * 7) * 0.12);
        } else {
          bossRig.vulnMat.opacity = 0;
        }
      }
    }

    for (let i = 0; i < bossState.anchors.length; i++) {
      const a = bossState.anchors[i];
      const av = anchorVisuals[i];
      if (!av) continue;
      const ready = a.cooldown <= 0;
      av.ring.rotation.z = elapsed * (ready ? 2.4 : 0.4);
      av.mat.emissiveIntensity = ready ? 1.05 + Math.sin(elapsed * 4.5 + i) * 0.2 : 0.15;
    }

    if (ferryVisual) {
      ferryVisual.root.position.y = Math.max(0.04, activeActSpec.ferry.y - 0.35) + Math.sin(elapsed * 1.4) * 0.04;
      const ready = bossState.phase === 'defeated';
      ferryVisual.beaconMat.color.set(ready ? '#4CE0B3' : '#F4A949');
      ferryVisual.beaconMat.opacity = ready ? 0.52 + Math.sin(elapsed * 5.0) * 0.18 : 0.2;
    }

    updateCatVisual(rivalCatRig, rivalCatState, elapsed, dt, 0);

    // Step Side Quests, Rival Cat Ring Race & Dynamic Weather
    const questEvents = stepQuestAndWeatherSystem(
      questState,
      activeActSpec,
      cat,
      {
        stolenFishCount: storyState.stolenFishCount,
        lettersFound: w.mechanics.letters.filter((l) => l.collected).length,
        bossDefeated: bossState.phase === 'defeated',
        startRacePressed,
      },
      dt
    );

    if (questEvents.bonusFishEarned > 0) {
      saveData = { ...saveData, fishBank: saveData.fishBank + questEvents.bonusFishEarned };
      writeSave(saveData);
      playSound('unlock', 1.15);
    }
    if (questEvents.ringPassedIndex !== null) {
      playSound('chime', 1.18 + questEvents.ringPassedIndex * 0.04);
      emitHeavySparks(cat.x, cat.y + 0.5, cat.z, 12, 2.4);
    }
    if (questEvents.raceWonNow) {
      playSound('unlock', 1.25);
      syncRunScoreAndSave(false);
    }
    if (questEvents.weatherChangedTo) {
      applyActAtmosphere(activeActSpec, questEvents.weatherChangedTo);
    }

    for (let i = 0; i < raceRingVisuals.length; i++) {
      const rr = raceRingVisuals[i];
      if (!questState.race.active) {
        rr.group.visible = false;
      } else {
        rr.group.visible = i >= questState.race.nextRingIndex;
        const isNext = i === questState.race.nextRingIndex;
        rr.group.rotation.y = elapsed * (isNext ? 2.8 : 0.9);
        rr.mat.emissive.set(isNext ? '#4CE0B3' : '#D97E1E');
        rr.mat.emissiveIntensity = isNext ? 1.5 : 0.4;
        rr.group.scale.setScalar(isNext ? 1.18 + Math.sin(elapsed * 6) * 0.08 : 0.85);
      }
    }

    // Step 3 Harbor Secret Quests (Four-Winds Forks, Silent Paw, Clockwork Mackerel)
    const secretEvents = stepSecretQuests(secretState, cat, {
      bellChimedNow: chimedThisStep,
      chimeRadius: tuning.bell.chimeRadius * playerBonuses.chimeRadiusMult,
      owlStealthSynced: lastOwlStealthSynced,
      owlAlarmFired: mechEvents.owlAlarmFired,
      stalkedGullNow: Boolean(storyEvents.pouncedBirdId || npcEvents.stalkedGullPos),
      sleptNestNow: Boolean(storyEvents.sleptNestId),
      rubbedPersonId: storyEvents.rubbedPersonId,
      interactPressed:
        !nearFerry &&
        !nearRival &&
        !storyEvents.stoleFishSpotId &&
        !storyEvents.tippedPailId &&
        !storyEvents.sleptNestId &&
        inputSnap.interactPressed,
      caughtOrHitNow: Boolean(npcEvents.caughtCat || bossEvents.damagedPlayerNow),
    });

    if (secretEvents.nearbyKind && !effectiveNearbyKind) {
      effectiveNearbyKind = secretEvents.nearbyKind;
      effectiveNearbyPrompt = '[Q]';
    }

    if (secretEvents.beaconActivatedId) {
      playSound('echo', 1.25);
      emitHeavySparks(cat.x, cat.y + 0.8, cat.z, 18, 3.0);
      storyState.dialogue = {
        id: 'secret_fork',
        speaker: 'Резонанс четырёх ветров',
        text: 'Древний камертон отозвался! Пробудите остальные маяки колокольчиком.',
        timer: 4.5,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.vaultRevealedNow) {
      const vaultSurf = harborBundle.surfaces.find((s) => s.id === SECRET_VAULT_SURFACE_SPEC.surfaceId);
      if (vaultSurf) vaultSurf.visible = true;
      secretVaultVisual.group.visible = true;
      playSound('unlock', 1.18);
      emitHeavySparks(SECRET_VAULT_SURFACE_SPEC.x, SECRET_VAULT_SURFACE_SPEC.y + 0.4, SECRET_VAULT_SURFACE_SPEC.z, 24, 4.0);
      storyState.dialogue = {
        id: 'secret_vault',
        speaker: 'Тайный свод Эха',
        text: 'Все три ветровых камертона запели! Над дамбой открылся золотой мостик (+6 рыбок).',
        timer: 5.2,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.silentFeatNow && !secretEvents.completedSecretIds.includes('silent_paw_order')) {
      playSound('unlock', 1.05);
      storyState.dialogue = {
        id: 'secret_silent_feat',
        speaker: 'Орден Тихой Лапы',
        text: 'Бесшумный подвиг зачтён. Не попадайтесь совам до конца испытания!',
        timer: 4.0,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.silentResetByAlarm) {
      playSound('alert', 0.9);
      storyState.dialogue = {
        id: 'secret_silent_reset',
        speaker: 'Орден Тихой Лапы',
        text: 'Тревога совы сорвала обет тишины! Прогресс ордена сброшен.',
        timer: 4.0,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.completedSecretIds.includes('silent_paw_order')) {
      playSound('unlock', 1.25);
      emitHeavySparks(cat.x, cat.y + 0.6, cat.z, 22, 3.2);
      storyState.dialogue = {
        id: 'secret_silent_done',
        speaker: 'Орден Тихой Лапы',
        text: 'Мастер теней! Вы выполнили три тихих обряда без единой тревоги (+5 рыбок).',
        timer: 5.0,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.salvatoreStartedNow) {
      playSound('story', 1.1);
      storyState.dialogue = {
        id: 'secret_salvatore_start',
        speaker: 'Старик Сальваторе',
        text: 'Мяу, отыщи мою Заводную Макрель на Восточном Арсенале и принеси не уронив!',
        timer: 5.2,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.mackerelPickedUpNow) {
      playSound('steal', 1.22);
      emitHeavySparks(secretState.mackerelPos.x, secretState.mackerelPos.y + 0.5, secretState.mackerelPos.z, 16, 2.5);
      storyState.dialogue = {
        id: 'secret_mackerel_take',
        speaker: 'Заводная Макрель',
        text: 'Золотая рыбка тикает в зубах! Верни её Сальваторе, избегая собак и босса.',
        timer: 4.8,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.mackerelDroppedNow) {
      playSound('alert', 1.0);
      storyState.dialogue = {
        id: 'secret_mackerel_drop',
        speaker: 'Заводная Макрель',
        text: 'Удар сбил заводную рыбку! Она вернулась на набережную Арсенала.',
        timer: 4.2,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.mackerelDeliveredNow) {
      playSound('unlock', 1.3);
      emitHeavySparks(secretState.salvatorePos.x, secretState.salvatorePos.y + 1.0, secretState.salvatorePos.z, 28, 4.2);
      storyState.dialogue = {
        id: 'secret_mackerel_done',
        speaker: 'Старик Сальваторе',
        text: 'Вот это котик-почтальон! Держи целый садок угощений (+10 рыбок).',
        timer: 5.2,
      };
      pushHudAndMetrics(true);
    }
    if (secretEvents.bonusFishEarned > 0) {
      saveData = { ...saveData, fishBank: saveData.fishBank + secretEvents.bonusFishEarned };
      syncRunScoreAndSave(false);
      pushHudAndMetrics(true);
    }

    // Update Harbor Secret Quest visual props
    if (activeActId === 'harbor') {
      for (let i = 0; i < secretState.beacons.length; i++) {
        const b = secretState.beacons[i];
        const fv = forkVisuals[i];
        if (!fv) continue;
        if (b.activated) {
          fv.coreMat.color.set('#FFD57E');
          fv.coreMat.emissive.set('#F4A949');
          fv.coreMat.emissiveIntensity = 1.2 + Math.sin(elapsed * 5.0 + i) * 0.25;
          fv.core.rotation.y = elapsed * 2.2;
          fv.core.position.y = 1.85 + Math.sin(elapsed * 3.5 + i) * 0.06;
        } else {
          fv.coreMat.color.set('#4CE0B3');
          fv.coreMat.emissive.set('#163D34');
          fv.coreMat.emissiveIntensity = 0.45 + Math.sin(elapsed * 2.2 + i) * 0.1;
          fv.core.rotation.y = elapsed * 0.6;
        }
      }
      if (secretState.salvatoreStage === 'active') {
        mackerelVisual.visible = true;
        mackerelVisual.position.set(
          secretState.mackerelPos.x,
          secretState.mackerelPos.y + 0.42 + Math.sin(elapsed * 3.2) * 0.08,
          secretState.mackerelPos.z
        );
        mackerelVisual.rotation.y = elapsed * 1.8;
      } else {
        mackerelVisual.visible = false;
      }
      if (secretState.salvatoreStage === 'carrying') {
        mackerelCarrierMesh.visible = true;
        mackerelCarrierMesh.position.set(cat.x, cat.y + 0.72 + Math.sin(elapsed * 5.0) * 0.05, cat.z);
        mackerelCarrierMesh.rotation.y = cat.yaw;
      } else {
        mackerelCarrierMesh.visible = false;
      }
    } else {
      mackerelCarrierMesh.visible = false;
    }

    if (victoryDelayTimer > 0) {
      victoryDelayTimer -= dt;
      if (victoryDelayTimer <= 0 && runOutcome !== 'victory') {
        runOutcome = 'victory';
        syncRunScoreAndSave(false);
        setMode('gameover');
        return;
      }
    }

    if (stepRes.jumped) {
      jumpsCount++;
      soundEngine.unlock();
      if (!stepRes.wallKicked) {
        playSound('jump', stepRes.isLedgeHop ? 1.12 : stepRes.doubleJumped ? 1.22 : 1.0);
      }
      if (cat.parkourChain !== lastFlowChimeChain && (cat.parkourChain === 3 || cat.parkourChain === 6)) {
        lastFlowChimeChain = cat.parkourChain;
        playSound('flow_chime');
      } else if (cat.parkourChain < 2) {
        lastFlowChimeChain = 0;
      }
      pushHudAndMetrics(true);
    }
    if (stepRes.landedSurfaceId) {
      const impactFactor = Math.min(1, Math.max(0.2, Math.abs(cat.lastAirVy) / 9.5));
      landingDipOffset = -0.095 * impactFactor;
      playSound('land', 0.94 + impactFactor * 0.14);
      triggerScreenShake(0.11 + impactFactor * 0.14);
      if (isHighOrUltra()) {
        spawnLandingDust(cat.x, cat.y, cat.z, impactFactor);
        emitHeavySparks(cat.x, cat.y + 0.08, cat.z, Math.round(4 + impactFactor * 5), 1.3 + impactFactor * 0.6);
      }
      if ((stepRes.landedSurfaceId === 'roof_perch' || stepRes.landedSurfaceId === 'clockwork_dam') && !checkpointReached) {
        checkpointReached = true;
        cat.checkpointX = stepRes.landedSurfaceId === 'clockwork_dam' ? -1.0 : 0;
        cat.checkpointY = stepRes.landedSurfaceId === 'clockwork_dam' ? 9.5 : 4.8;
        cat.checkpointZ = stepRes.landedSurfaceId === 'clockwork_dam' ? -26.2 : -16.5;
        playSound('checkpoint');
        emitHeavySparks(cat.checkpointX, cat.checkpointY + 0.4, cat.checkpointZ, 18, 3.2);
        pushHudAndMetrics(true);
      }
    }
    if (stepRes.enteredWater) {
      soundEngine.unlock();
      playSound('splash');
      emitSplashRipple(cat.x, cat.z);
      triggerScreenShake(0.2);
      pushHudAndMetrics(true);
    }

    updateCatVisual(catRig, cat, elapsed, dt, chimePulse);

    // Update Shadow Dash Ghost Afterimages
    if (cat.dashTimer > 0) {
      dashTrailAccum += dt;
      if (dashTrailAccum >= 0.036) {
        dashTrailAccum = 0;
        const ghost = dashGhosts[dashGhostCursor % dashGhosts.length];
        dashGhostCursor++;
        ghost.active = true;
        ghost.age = 0;
        ghost.group.position.set(cat.x, cat.y, cat.z);
        ghost.group.rotation.y = cat.yaw;
        ghost.group.scale.set(1, 0.92, 1.18);
        ghost.mat.opacity = 0.65;
        ghost.group.visible = true;
      }
    }
    for (let i = 0; i < dashGhosts.length; i++) {
      const dg = dashGhosts[i];
      if (!dg.active) continue;
      dg.age += dt;
      if (dg.age >= dg.maxAge) {
        dg.active = false;
        dg.group.visible = false;
      } else {
        const k = 1 - dg.age / dg.maxAge;
        dg.mat.opacity = 0.62 * k * k;
        dg.group.scale.setScalar(0.82 + k * 0.24);
      }
    }

    // Update Moonlight Coat-Glide wind halo & sparkles
    if (cat.gliding) {
      glideHaloMesh.visible = true;
      glideHaloMesh.position.set(cat.x, cat.y + 0.16, cat.z);
      glideHaloMesh.rotation.z = elapsed * 2.4;
      glideHaloMesh.scale.setScalar(1.0 + Math.sin(elapsed * 9.0) * 0.08);
      glideHaloMat.opacity = 0.44 + Math.sin(elapsed * 7.0) * 0.12;
      glideSparkAccum += dt;
      if (glideSparkAccum >= 0.12) {
        glideSparkAccum = 0;
        emitHeavySparks(cat.x, cat.y + 0.22, cat.z, 2, 1.1);
      }
    } else {
      glideHaloMesh.visible = false;
      glideSparkAccum = 0;
    }

    // Update Whisker Sense Sonar Wave + Vertical Target Beacons
    if (senseWaveAge >= 0) {
      senseWaveAge += dt;
      const wNorm = senseWaveAge / 0.78;
      if (wNorm >= 1) {
        senseWaveAge = -1;
        senseWaveMesh.visible = false;
      } else {
        senseWaveMesh.visible = true;
        senseWaveMesh.position.set(cat.x, cat.y + 0.18, cat.z);
        senseWaveMesh.scale.setScalar(0.5 + wNorm * 32.0);
        senseWaveMat.opacity = (1 - wNorm) * 0.68;
      }
    }
    if (senseTimer > 0) {
      const fadeInOut = Math.min(1, senseTimer / 0.9);
      const breath = 0.78 + Math.sin(elapsed * 6.0) * 0.22;
      senseBeamGoldMat.opacity = 0.34 * fadeInOut * breath;
      senseBeamAquaMat.opacity = 0.30 * fadeInOut * breath;
      let beamIdx = 0;
      const placeBeam = (tx: number, ty: number, tz: number, gold: boolean) => {
        if (beamIdx >= senseBeams.length) return;
        const dx = tx - cat.x;
        const dz = tz - cat.z;
        if (dx * dx + dz * dz > 6400) return; // within 80m
        const b = senseBeams[beamIdx++];
        b.mesh.material = gold ? senseBeamGoldMat : senseBeamAquaMat;
        b.mesh.position.set(tx, ty, tz);
        b.mesh.rotation.y = elapsed * 1.4 + beamIdx;
        b.mesh.scale.set(1, 0.95 + Math.sin(elapsed * 4 + beamIdx) * 0.08, 1);
        b.mesh.visible = true;
      };
      for (const l of w.mechanics.letters) {
        if (!l.collected) placeBeam(l.x, l.y, l.z, true);
      }
      if (activeActId === 'harbor') {
        for (const fb of secretState.beacons) {
          if (!fb.activated) placeBeam(fb.x, fb.y, fb.z, true);
        }
        if (secretState.salvatoreStage === 'active') {
          placeBeam(secretState.mackerelPos.x, secretState.mackerelPos.y, secretState.mackerelPos.z, true);
        }
      }
      for (const spot of w.fishSpots) {
        if (spot.remainingFish > 0) placeBeam(spot.x, spot.y, spot.z, false);
      }
      for (const anchor of bossState.anchors) {
        if (bossState.phase !== 'defeated') placeBeam(anchor.x, anchor.y, anchor.z, false);
      }
      while (beamIdx < senseBeams.length) {
        senseBeams[beamIdx++].mesh.visible = false;
      }
    } else {
      for (let i = 0; i < senseBeams.length; i++) {
        senseBeams[i].mesh.visible = false;
      }
    }

    if (cat.swimming) {
      swimWakeMesh.visible = true;
      swimWakeMesh.position.set(cat.x, 0.032, cat.z);
      const speed = Math.hypot(cat.vx, cat.vz);
      const wakePulse = 1.0 + Math.sin(elapsed * 6.0) * 0.14 + Math.min(0.35, speed * 0.08);
      swimWakeMesh.scale.setScalar(wakePulse);
      swimWakeMat.opacity = 0.34 + Math.sin(elapsed * 6.0) * 0.08;
      wetPawTimer = 6.5;
      lastPawX = cat.x;
      lastPawZ = cat.z;
    } else {
      swimWakeMesh.visible = false;
      if (wetPawTimer > 0 && graphicsLevel !== 'low') {
        wetPawTimer = Math.max(0, wetPawTimer - dt);
        if (cat.grounded && !cat.sleeping) {
          const dx = cat.x - lastPawX;
          const dz = cat.z - lastPawZ;
          if (dx * dx + dz * dz >= 0.16) {
            const slot = wetPawPool[wetPawCursor % wetPawPool.length];
            wetPawCursor++;
            pawSide = -pawSide;
            const sideOff = pawSide * 0.075;
            const wx = cat.x + Math.cos(cat.yaw) * sideOff;
            const wz = cat.z - Math.sin(cat.yaw) * sideOff;
            slot.active = true;
            slot.age = 0;
            slot.maxAge = 4.2;
            slot.mesh.position.set(wx, cat.y + 0.025, wz);
            slot.mesh.rotation.z = cat.yaw;
            slot.mesh.scale.setScalar(1.0);
            slot.mat.opacity = 0.72 * Math.min(1, wetPawTimer / 1.5);
            slot.mesh.visible = true;
            lastPawX = cat.x;
            lastPawZ = cat.z;
          }
        }
      }
    }

    let wetActiveNow = 0;
    for (let i = 0; i < wetPawPool.length; i++) {
      const wp = wetPawPool[i];
      if (!wp.active) continue;
      wp.age += dt;
      const p = wp.age / wp.maxAge;
      if (p >= 1) {
        wp.active = false;
        wp.mesh.visible = false;
      } else {
        wetActiveNow++;
        wp.mat.opacity = 0.72 * (1 - p);
        wp.mesh.scale.setScalar(1.0 - p * 0.18);
      }
    }
    activeWetPawsCount = wetActiveNow;

    if (cat.targetLedge && (cat.grounded || cat.swimming)) {
      targetMarkerGroup.visible = true;
      targetMarkerGroup.position.set(cat.targetLedge.x, cat.targetLedge.y + 0.05, cat.targetLedge.z);
      const tSurf = w.surfaces.find((s) => s.id === cat.targetLedge?.surfaceId);
      if (tSurf?.gable && tSurf.gable.axis === 'z') {
        const dx = cat.targetLedge.x - tSurf.gable.center;
        const slopeAngle = Math.atan2(tSurf.gable.ridgeY - tSurf.gable.eaveY, tSurf.gable.halfSpan);
        targetMarkerGroup.rotation.set(0, 0, Math.abs(dx) < 0.05 ? 0 : dx > 0 ? -slopeAngle : slopeAngle);
      } else {
        targetMarkerGroup.rotation.set(0, 0, 0);
      }
      const pulse = graphicsLevel === 'low' ? 0.92 : 0.85 + Math.sin(elapsed * 6.5) * 0.12;
      targetMarkerGroup.scale.setScalar(pulse);
      targetMarkerInner.rotation.z = elapsed * 2.2;
    } else {
      targetMarkerGroup.visible = false;
    }

    // Surface-aware gait footsteps & water paddle acoustics
    const horizSpeed = Math.hypot(cat.vx, cat.vz);
    if ((cat.grounded || cat.swimming) && horizSpeed > 0.45 && !cat.sleeping) {
      const strideIdx = Math.floor(cat.gaitPhase / Math.PI);
      if (strideIdx !== lastStrideIndex) {
        lastStrideIndex = strideIdx;
        const standSurf = cat.surfaceId ? w.surfaces.find((s) => s.id === cat.surfaceId) : undefined;
        const pawSurf = resolvePawSurfaceType(cat.surfaceId, cat.swimming, standSurf?.kind ?? null);
        const stepVol = Math.min(1.1, Math.max(0.42, (horizSpeed / 6.0) * (cat.crouching ? 0.52 : 1.0)));
        soundEngine.playPawStep(pawSurf, stepVol);
      }
    } else {
      lastStrideIndex = Math.floor(cat.gaitPhase / Math.PI);
    }

    // 3D Parabolic Aiming Trajectory Arc — ONLY executed when graphicsLevel >= High
    if (isHighOrUltra()) {
      updateHeavyAimArcVfx();
    }

    landingDipOffset *= Math.exp(-10.5 * dt);
    const camDyn = computeCameraDynamics({
      horizSpeed,
      gliding: cat.gliding,
      dashing: cat.dashTimer > 0,
      swimming: cat.swimming,
      sprinting: inputSnap.sprint,
    });

    // Wind / Speed Streak Lines (zero allocation; disabled in Low Eco)
    if (graphicsLevel !== 'low' && camDyn.speedLineIntensity > 0.05) {
      windLines.visible = true;
      windLinesMat.opacity = Math.min(0.62, camDyn.speedLineIntensity * 0.56);
      windLinesMat.color.set(cat.dashTimer > 0 ? '#6FE6D6' : '#E8F7F4');
      const mvLen = horizSpeed > 0.1 ? horizSpeed : 1;
      const dirX = horizSpeed > 0.1 ? cat.vx / mvLen : Math.sin(cat.yaw);
      const dirZ = horizSpeed > 0.1 ? cat.vz / mvLen : Math.cos(cat.yaw);
      const perpX = -dirZ;
      const perpZ = dirX;
      const wAttr = windLinesGeo.attributes.position as THREE.BufferAttribute;
      const streakLen = 0.65 + camDyn.speedLineIntensity * 1.15;
      for (let i = 0; i < WIND_STREAK_COUNT; i++) {
        const t = (elapsed * (1.8 + camDyn.speedLineIntensity * 2.2) + windSeedPhase[i]) % 1;
        const rad = windSeedRadius[i];
        const ang = windSeedAngle[i];
        const lat = Math.cos(ang) * rad;
        const vert = 0.25 + (Math.sin(ang) * 0.5 + 0.5) * 0.95;
        const backDist = -0.6 + t * 2.4;
        const sx = cat.x + perpX * lat - dirX * backDist;
        const sy = cat.y + vert;
        const sz = cat.z + perpZ * lat - dirZ * backDist;
        wAttr.setXYZ(i * 2, sx, sy, sz);
        wAttr.setXYZ(i * 2 + 1, sx - dirX * streakLen, sy - (cat.gliding ? 0.12 : 0), sz - dirZ * streakLen);
      }
      wAttr.needsUpdate = true;
    } else {
      windLines.visible = false;
    }

    const lookAheadX = cat.vx * camDyn.lookAheadFactor;
    const lookAheadZ = cat.vz * camDyn.lookAheadFactor;
    const damp = 1 - Math.exp(-9.5 * dt);
    const dampY = 1 - Math.exp(-6.2 * dt);
    camTarget.x += (cat.x + lookAheadX - camTarget.x) * damp;
    camTarget.y += (cat.y + 0.72 + landingDipOffset - camTarget.y) * dampY;
    camTarget.z += (cat.z + lookAheadZ - camTarget.z) * damp;

    // Dynamic FOV kick for Shadow Dash, Moonlight Coat-Glide & High-speed sprint
    const targetFov = camDyn.targetFov;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-12 * dt));
      camera.updateProjectionMatrix();
    }

    const dist = 3.85 + camDyn.distOffset;
    const horiz = Math.cos(camPitch) * dist;
    camDesiredPos.set(
      camTarget.x + Math.sin(camYaw) * horiz,
      camTarget.y + Math.sin(camPitch) * dist + 0.42,
      camTarget.z + Math.cos(camYaw) * horiz
    );
    pullInCameraFromColliders(camTarget, camDesiredPos, activeWorld.colliders, camAdjustedPos, 0.32);
    camLerpTarget.set(camAdjustedPos.x, camAdjustedPos.y, camAdjustedPos.z);
    camera.position.lerp(camLerpTarget, 1 - Math.exp(-10 * dt));

    // Decaying trauma screen shake (Ultra/High) + dynamic 3D horizon banking tilt (Ultra only)
    let shakeOffX = 0;
    let shakeOffY = 0;
    let shakeRoll = 0;
    if (gfxSettings.screenShakeEnabled && shakeTrauma > 0.001) {
      const mag = shakeTrauma * shakeTrauma;
      shakeOffX = Math.sin(elapsed * 47.0) * 0.16 * mag;
      shakeOffY = Math.cos(elapsed * 53.0) * 0.14 * mag;
      shakeRoll = Math.sin(elapsed * 39.0) * 0.032 * mag;
      shakeTrauma = Math.max(0, shakeTrauma - dt * 2.4);
    }
    camera.position.x += shakeOffX;
    camera.position.y += shakeOffY;
    camera.lookAt(camTarget.x, camTarget.y + 0.18, camTarget.z - 0.65 * Math.cos(camYaw));

    if (gfxSettings.tilt3DEnabled) {
      const targetRoll = THREE.MathUtils.clamp(-inputSnap.right * 0.042 - inputSnap.cameraYawDelta * 0.35, -0.055, 0.055);
      camTiltRoll += (targetRoll - camTiltRoll) * (1 - Math.exp(-8 * dt));
      camera.rotation.z += camTiltRoll + shakeRoll;
    } else if (shakeRoll !== 0) {
      camera.rotation.z += shakeRoll;
    }

    pushHudAndMetrics(false);
  }

  let lastTime = performance.now();
  let accumulator = 0;
  const FIXED_DT = 1 / 60;

  const scheduleNext = () => {
    if (disposed) return;
    if (isSoftwareGl) {
      timerHandle = afterDraw(renderer, tick);
    } else {
      rafHandle = window.requestAnimationFrame(tick);
    }
  };

  function tick(): void {
    if (disposed) return;
    const now = performance.now();
    const rawDt = Math.min((now - lastTime) / 1000, isSoftwareGl ? 0.18 : 0.05);
    lastTime = now;
    accumulator += rawDt;

    if (isSoftwareGl) {
      const subSteps = Math.max(1, Math.min(11, Math.round(Math.max(FIXED_DT, rawDt) / FIXED_DT)));
      for (let i = 0; i < subSteps; i++) {
        stepSimulation(FIXED_DT);
      }
      accumulator = 0;
    } else {
      while (accumulator >= FIXED_DT) {
        stepSimulation(FIXED_DT);
        accumulator -= FIXED_DT;
      }
      // Smart GPU Frame-Budget Guard: softly dial down pixel ratio if sustained <32 FPS
      if (mode === 'playing') {
        perfDtAccum += rawDt;
        perfFrames++;
        if (perfFrames >= 45) {
          const avgDt = perfDtAccum / perfFrames;
          perfDtAccum = 0;
          perfFrames = 0;
          if (avgDt > 0.031 && adaptivePixelScale > 0.65) {
            adaptivePixelScale = Math.max(0.65, adaptivePixelScale - 0.12);
            const targetDpr = Math.max(
              0.85,
              Math.min(window.devicePixelRatio || 1, gfxSettings.pixelRatioCap) * adaptivePixelScale
            );
            renderer.setPixelRatio(targetDpr);
            composer?.setPixelRatio(targetDpr);
          }
        }
      }
    }

    renderNow();
    scheduleNext();
  }

  stepSimulation(FIXED_DT);
  renderNow();
  pushHudAndMetrics(true);
  scheduleNext();

  return {
    setMode,
    resetRun,
    setAct: (actId: ActId) => loadAct(actId, false),
    advanceToNextAct,
    continueAfterVictory,
    buySkill,
    collarAction,
    getSaveData: () => saveData,
    toggleMute: () => soundEngine.toggleMute(),
    toggleMusic: () => soundEngine.toggleMusic(),
    toggleSfx: () => soundEngine.toggleSfx(),
    selectTool,
    setDifficulty,
    setGraphicsQuality: applyGraphicsQuality,
    setCatBreed,
    setRightClickMode,
    setVirtualAxis: (fwd, rgt) => input.setVirtualAxis(fwd, rgt),
    setVirtualHeld: (action, active) => input.setVirtualHeld(action, active),
    pressVirtualAction: (action) => input.pressVirtualAction(action),
    dispose: () => {
      disposed = true;
      window.cancelAnimationFrame(rafHandle);
      window.clearTimeout(timerHandle);
      detachInput();
      resizeObserver.disconnect();
      clearSecondaryWorld();
      clearActEntitiesVisuals();
      skyDome.dispose();
      mats.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      fireflyGeo.dispose();
      fireflyMat.dispose();
      petalGeo.dispose();
      petalMat.dispose();
      wetPawTex.dispose();
      wetPawGeo.dispose();
      for (const wp of wetPawPool) wp.mat.dispose();
      wakeRingGeo.dispose();
      for (const wk of waterWakePool) wk.mat.dispose();
      rainGeo.dispose();
      rainMat.dispose();
      canalMistMat.dispose();
      for (const w of steamSprites) w.sprite.material.dispose();
      for (const g of catRig.geometries) g.dispose();
      for (const m of catRig.materials) m.dispose();
      for (const t of catRig.textures) t.dispose();
      for (const g of rivalCatRig.geometries) g.dispose();
      for (const m of rivalCatRig.materials) m.dispose();
      for (const t of rivalCatRig.textures) t.dispose();
      for (const pr of personRigs) {
        for (const g of pr.geometries) g.dispose();
        for (const m of pr.materials) m.dispose();
      }
      for (const dr of dogRigs) {
        for (const g of dr.geometries) g.dispose();
        for (const m of dr.materials) m.dispose();
      }
      for (const br of birdRigs) {
        for (const g of br.geometries) g.dispose();
        for (const m of br.materials) m.dispose();
      }
      for (const g of harborPropAssets.geometries) g.dispose();
      for (const m of harborPropAssets.materials) m.dispose();
      for (const g of extraDisposableGeos) g.dispose();
      for (const m of extraDisposableMats) m.dispose();
      clawArcGeo.dispose();
      clawArcMat.dispose();
      flareOrbGeo.dispose();
      flareOrbMat.dispose();
      flareHaloGeo.dispose();
      flareHaloMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      aimDotGeo.dispose();
      aimDotMat.dispose();
      waterGeo.dispose();
      targetMarkerGeo.dispose();
      targetMarkerInnerGeo.dispose();
      targetMarkerMat.dispose();
      swimWakeGeo.dispose();
      swimWakeMat.dispose();
      rippleGeo.dispose();
      for (const r of ripples) (r.mesh.material as THREE.Material).dispose();
      landDustGeo.dispose();
      for (const d of landDustPool) d.mat.dispose();
      airStepGeo.dispose();
      for (const a of airStepPool) a.mat.dispose();
      dashGhostBodyGeo.dispose();
      dashGhostHeadGeo.dispose();
      for (const dg of dashGhosts) dg.mat.dispose();
      glideHaloGeo.dispose();
      glideHaloMat.dispose();
      senseWaveGeo.dispose();
      senseWaveMat.dispose();
      senseBeamGeo.dispose();
      senseBeamGoldMat.dispose();
      senseBeamAquaMat.dispose();
      windLinesGeo.dispose();
      windLinesMat.dispose();
      envTarget.dispose();
      composer?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
