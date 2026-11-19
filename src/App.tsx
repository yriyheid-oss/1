import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mountHelloGameScene,
  type GameModeState,
  type HudTelemetry,
  type SceneController,
} from './view/helloScene';
import {
  getLocale,
  getLocalizedDialogue,
  getSavedLanguage,
  isRtlLanguage,
  saveLanguage,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  type RightClickMode,
} from './data/i18n';
import { cycleToolId, TOOL_ORDER, TOOL_SPECS, type ToolId } from './data/tools';
import {
  CAT_BREED_ORDER,
  CAT_BREED_SPECS,
  getSavedCatBreed,
  getSavedGraphicsLevel,
  isGraphicsAtLeast,
  type CatBreedId,
  type DifficultyLevel,
  type GraphicsLevel,
} from './data/tuning';
import { TouchControls } from './components/TouchControls';
import { CatDenModal } from './components/CatDenModal';
import { TacticalRadar } from './components/TacticalRadar';
import { DaylightAstrolabe } from './components/DaylightAstrolabe';
import { AmbientGoldDust, emitUiGoldBurst } from './components/AmbientGoldDust';
import { CornerFiligree } from './components/CornerFiligree';
import { ACT_ORDER, ACT_SPECS, getNextActId, type ActId } from './data/acts';
import { getCampaignLocale } from './data/campaignI18n';
import { loadSave, type CollarId, type SkillId } from './core/save';
import { createQuestSystemState } from './systems/questSystem';
import { DEFAULT_HARBOR_START_PHASE } from './systems/atmosphere';
import type { AchievementId } from './systems/progression';

function readInitialMode(): GameModeState {
  if (typeof window === 'undefined') return 'title';
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1' ? 'playing' : 'title';
}

function detectTouchViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(pointer: coarse)').matches ||
    window.innerWidth <= 900
  );
}

function ToolSvgIcon({ toolId, color }: { toolId: ToolId; color: string }) {
  switch (toolId) {
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
          <path
            d="M12 3a1.5 1.5 0 0 1 1.5 1.5v.6A5.5 5.5 0 0 1 17.5 10.5v4.3l1.6 2.1a.6.6 0 0 1-.48.96H5.38a.6.6 0 0 1-.48-.96l1.6-2.1v-4.3A5.5 5.5 0 0 1 10.5 5.1v-.6A1.5 1.5 0 0 1 12 3Z"
            fill={color}
            fillOpacity="0.22"
            stroke="#0F181B"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M12 3a1.5 1.5 0 0 1 1.5 1.5v.6A5.5 5.5 0 0 1 17.5 10.5v4.3l1.6 2.1H4.9l1.6-2.1v-4.3A5.5 5.5 0 0 1 10.5 5.1v-.6A1.5 1.5 0 0 1 12 3Z"
            fill="none"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <path d="M9.6 18.2a2.4 2.4 0 0 0 4.8 0" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'fish_sling':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
          <path
            d="M4.5 12c2.8-3.6 7.4-4.2 11.4-1.7l3.6-2.5v8.4l-3.6-2.5C11.9 16.2 7.3 15.6 4.5 12Z"
            fill={color}
            fillOpacity="0.24"
            stroke="#0F181B"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 12c2.8-3.6 7.4-4.2 11.4-1.7l3.6-2.5v8.4l-3.6-2.5C11.9 16.2 7.3 15.6 4.5 12Z"
            fill="none"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <circle cx="8.6" cy="11.4" r="1.05" fill="#F7EEDC" />
        </svg>
      );
    case 'sonic_claw':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
          <path
            d="M5 17C6.8 10.4 10.8 6.4 17.5 4.8M9 19c1.6-4.8 4.8-7.8 9.8-9.2M13.5 19.5c1-2.6 2.8-4.4 5.8-5.3"
            fill="none"
            stroke="#0F181B"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M5 17C6.8 10.4 10.8 6.4 17.5 4.8M9 19c1.6-4.8 4.8-7.8 9.8-9.2M13.5 19.5c1-2.6 2.8-4.4 5.8-5.3"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'lantern_flare':
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill={color} fillOpacity="0.28" stroke="#0F181B" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke={color} strokeWidth="1.45" />
          <path
            d="M12 2.5v2.7M12 18.8v2.7M2.5 12h2.7M18.8 12h2.7M5.4 5.4l1.9 1.9M16.7 16.7l1.9 1.9M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SceneController | null>(null);

  const [mode, setMode] = useState<GameModeState>(() => readInitialMode());
  const [lang, setLang] = useState<LanguageCode>(() => getSavedLanguage());
  const [musicMuted, setMusicMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchPadEnabled, setTouchPadEnabled] = useState<boolean>(() => detectTouchViewport());
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('standard');
  const [graphicsLevel, setGraphicsLevel] = useState<GraphicsLevel>(() => getSavedGraphicsLevel());
  const [catBreed, setCatBreed] = useState<CatBreedId>(() => getSavedCatBreed());
  const [rightClickMode, setRightClickMode] = useState<RightClickMode>('jump');
  const [epilogueDismissed, setEpilogueDismissed] = useState(false);
  const [denOpen, setDenOpen] = useState(false);
  const [denResumePlaying, setDenResumePlaying] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [questsExpanded, setQuestsExpanded] = useState(true);

  const [hud, setHud] = useState<HudTelemetry>(() => {
    const initialSave = loadSave();
    const initialAct = ACT_SPECS[initialSave.currentAct] ?? ACT_SPECS.harbor;
    const initialQuest = createQuestSystemState(initialAct);
    const hasDouble =
      initialSave.unlockedSkills.includes('double_jump') ||
      initialSave.equippedCollar === 'sun_medallion';

    return {
      actId: initialAct.id,
      districtLabel: '',
      objectiveText: '',
      chapter: 1,
      rank: '',
      rankKey: 'kitten',
      chimesCount: 0,
      jumpsCount: 0,
      rubCount: 0,
      stolenFishCount: 0,
      purrCount: 0,
      escapedChaseCount: 0,
      distractedDogsCount: 0,
      wheelsReversedCount: 0,
      lettersFound: 0,
      lettersTotal: initialAct.id === 'harbor' ? 5 : 3,
      gullsStalkedCount: 0,
      nestsSleptCount: 0,
      chasedByDog: false,
      carryingFish: false,
      owlInBeam: false,
      owlSuspicion: 0,
      owlStealthSynced: false,
      warmthTimer: 0,
      sleeping: false,
      nearbyPrompt: null,
      nearbyKind: null,
      dialogue: null,
      storyComplete: false,
      targetLedgeReady: false,
      swimming: false,
      crouching: false,
      purring: false,
      bellCooldownPct: 0,
      checkpointReached: false,
      activeTool: 'bell',
      toolCooldowns: {
        bell: 0,
        fish_sling: 0,
        sonic_claw: 0,
        lantern_flare: 0,
      },
      musicZone: 'title',
      difficulty: 'standard',
      graphicsLevel: getSavedGraphicsLevel(),
      catBreed: getSavedCatBreed(),
      rightClickMode: 'jump',
      hp: 4,
      maxHp: 4,
      boss: {
        id: initialAct.boss.id,
        active: false,
        phase: 'dormant',
        hp: initialAct.boss.maxHp,
        maxHp: initialAct.boss.maxHp,
      },
      quests: initialQuest.quests,
      secretQuests: [],
      carryingGoldenMackerel: false,
      race: {
        active: false,
        completed: false,
        nextRingIndex: 0,
        totalRings: initialAct.rivalCat.rings.length,
        timeRemaining: 0,
      },
      weather: initialQuest.weather.kind,
      catX: initialAct.spawn.x,
      catZ: initialAct.spawn.z,
      camYaw: 0.08,
      radarBlips: [],
      save: initialSave,
      outcome: null,
      runScore: 0,
      hasDoubleJump: hasDouble,
      airJumpsRemaining: hasDouble ? 1 : 0,
      dashCooldownPct: 0,
      dashActive: false,
      gliding: false,
      senseCooldownPct: 0,
      senseActive: false,
      dayPhase: 'dawn',
      dayCyclePhase: DEFAULT_HARBOR_START_PHASE,
      speed: 0,
      parkourChain: 0,
      wallKicksUsed: 0,
    };
  });

  const locale = getLocale(lang);
  const campaignLocale = getCampaignLocale(lang);
  const isRtl = isRtlLanguage(lang);

  useEffect(() => {
    document.body.dataset.state = mode;
  }, [mode]);

  useEffect(() => {
    document.body.dataset.graphicsLevel = graphicsLevel;
  }, [graphicsLevel]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const startMode = readInitialMode();
    document.body.dataset.state = startMode;

    const controller = mountHelloGameScene(
      el,
      startMode,
      (nextMode) => setMode(nextMode),
      (telemetry) => setHud(telemetry)
    );
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const handleLanguageChange = useCallback((next: LanguageCode) => {
    setLang(next);
    saveLanguage(next);
  }, []);

  const handleDifficultyChange = useCallback((next: DifficultyLevel) => {
    setDifficulty(next);
    controllerRef.current?.setDifficulty(next);
  }, []);

  const handleGraphicsChange = useCallback((next: GraphicsLevel) => {
    setGraphicsLevel(next);
    controllerRef.current?.setGraphicsQuality(next);
  }, []);

  const handleCatBreedChange = useCallback((next: CatBreedId) => {
    setCatBreed(next);
    controllerRef.current?.setCatBreed(next);
    emitUiGoldBurst(0.28, 0.56, true);
  }, []);

  const handleRightClickChange = useCallback((next: RightClickMode) => {
    setRightClickMode(next);
    controllerRef.current?.setRightClickMode(next);
  }, []);

  const handleSelectAct = useCallback((actId: ActId) => {
    controllerRef.current?.setAct(actId);
    emitUiGoldBurst(0.28, 0.36, false);
  }, []);

  const handleBuySkill = useCallback((id: SkillId) => {
    const nextSave = controllerRef.current?.buySkill(id);
    if (nextSave) {
      emitUiGoldBurst(0.5, 0.44, true);
      setHud((prev) => ({
        ...prev,
        save: nextSave,
        hasDoubleJump:
          nextSave.unlockedSkills.includes('double_jump') ||
          nextSave.equippedCollar === 'sun_medallion',
      }));
    }
  }, []);

  const handleCollarAction = useCallback((id: CollarId) => {
    const nextSave = controllerRef.current?.collarAction(id);
    if (nextSave) {
      emitUiGoldBurst(0.5, 0.48, true);
      setHud((prev) => ({
        ...prev,
        save: nextSave,
        hasDoubleJump:
          nextSave.unlockedSkills.includes('double_jump') ||
          nextSave.equippedCollar === 'sun_medallion',
      }));
    }
  }, []);

  const handleOpenDen = useCallback(() => {
    if (mode === 'playing') {
      setDenResumePlaying(true);
      controllerRef.current?.setMode('paused');
    } else {
      setDenResumePlaying(false);
    }
    setDenOpen(true);
  }, [mode]);

  const handleCloseDen = useCallback(() => {
    setDenOpen(false);
    if (denResumePlaying) {
      setDenResumePlaying(false);
      document.body.dataset.state = 'playing';
      setMode('playing');
      controllerRef.current?.setMode('playing');
    }
  }, [denResumePlaying]);

  const handleStart = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    setHudHidden(false);
    document.body.dataset.state = 'playing';
    setMode('playing');
    controllerRef.current?.setMode('playing');
  }, []);

  const handleRestart = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    setEpilogueDismissed(false);
    setDenOpen(false);
    setDenResumePlaying(false);
    setHudHidden(false);
    controllerRef.current?.resetRun();
    document.body.dataset.state = 'playing';
    setMode('playing');
    controllerRef.current?.setMode('playing');
  }, []);

  const handleAdvanceAct = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    setEpilogueDismissed(false);
    setDenOpen(false);
    setDenResumePlaying(false);
    controllerRef.current?.advanceToNextAct();
  }, []);

  const handleContinueAfterVictory = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    controllerRef.current?.continueAfterVictory();
  }, []);

  const handleResume = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    document.body.dataset.state = 'playing';
    setMode('playing');
    controllerRef.current?.setMode('playing');
  }, []);

  const handleReturnTitle = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    setEpilogueDismissed(false);
    setDenOpen(false);
    setDenResumePlaying(false);
    setHudHidden(false);
    controllerRef.current?.resetRun();
    document.body.dataset.state = 'title';
    setMode('title');
    controllerRef.current?.setMode('title');
  }, []);

  const handleToggleMusic = useCallback(() => {
    if (!controllerRef.current) return;
    const nextMuted = controllerRef.current.toggleMusic();
    setMusicMuted(nextMuted);
  }, []);

  const handleToggleSfx = useCallback(() => {
    if (!controllerRef.current) return;
    const nextMuted = controllerRef.current.toggleSfx();
    setSfxMuted(nextMuted);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        const target = containerRef.current ?? document.documentElement;
        void target.requestFullscreen?.().catch(() => {});
      } else {
        void document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      // ignore if unsupported in sandboxed iframe
    }
  }, []);

  // Title Enter/Space start, Escape closes Cat Den, & KeyM mutes audio
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLInputElement
      ) {
        return;
      }
      if (denOpen && e.code === 'Escape') {
        e.preventDefault();
        handleCloseDen();
        return;
      }
      if (mode === 'title' && !denOpen && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStart();
      } else if (e.code === 'KeyM' && !e.repeat) {
        if (controllerRef.current) {
          const m = controllerRef.current.toggleMute();
          setMusicMuted(m);
          setSfxMuted(m);
        }
      } else if (e.code === 'KeyH' && mode === 'playing' && !denOpen && !e.repeat) {
        setHudHidden((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, denOpen, handleStart, handleCloseDen]);

  const chapterInfo = locale.chapters[hud.chapter];
  const actLocale = campaignLocale.acts[hud.actId];
  const localizedRank = locale.ranks[hud.rankKey];
  const localizedDialogue = getLocalizedDialogue(lang, hud.dialogue);

  const localizedNearbyPrompt =
    hud.nearbyKind === 'rival_race'
      ? campaignLocale.hud.racePrompt
      : hud.nearbyKind === 'board_ferry'
        ? campaignLocale.hud.ferryReadyPrompt
        : hud.nearbyKind === 'ferry_locked'
          ? campaignLocale.hud.ferryLockedPrompt
          : hud.nearbyKind === 'salvatore_start'
            ? campaignLocale.hud.salvatoreStartPrompt
            : hud.nearbyKind === 'salvatore_deliver'
              ? campaignLocale.hud.salvatoreDeliverPrompt
              : hud.nearbyKind === 'pickup_mackerel'
                ? campaignLocale.hud.mackerelPickupPrompt
                : hud.nearbyKind === 'steal_fish'
                  ? locale.prompts.stealFish
                  : hud.nearbyKind === 'rub_person'
                    ? locale.prompts.rubPerson
                    : hud.nearbyKind === 'tip_pail'
                      ? locale.prompts.tipPail
                      : hud.nearbyKind === 'cozy_nest'
                        ? locale.prompts.cozyNest
                        : hud.nearbyKind === 'stalk_gull'
                          ? hud.crouching
                            ? locale.prompts.stalkGull
                            : locale.prompts.scareBird
                          : null;

  const localizedObjective = hud.swimming
    ? hud.targetLedgeReady
      ? locale.prompts.swimLedge
      : locale.prompts.swimWater
    : hud.actId === 'harbor'
      ? chapterInfo.objective
      : actLocale.goalHint;

  const renderBottomHint = () => {
    if (hud.purring) return locale.prompts.purringHint;
    if (hud.crouching) return locale.prompts.crouchingHint;
    if (hud.targetLedgeReady) return locale.prompts.ledgeReady;
    if (hud.swimming) return locale.prompts.swimHint;
    return locale.prompts.defaultHint;
  };

  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const isUltraTilt = graphicsLevel === 'ultra';
  const isLowEco = graphicsLevel === 'low';
  const isHighOrUltra = isGraphicsAtLeast(graphicsLevel, 'high');

  const [rewardToast, setRewardToast] = useState<{
    id: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [fishPop, setFishPop] = useState(false);
  const [fishGainPop, setFishGainPop] = useState<{ delta: number; seq: number } | null>(null);
  const [hpFlash, setHpFlash] = useState<'hit' | 'heal' | null>(null);
  const [bossTrailPct, setBossTrailPct] = useState(100);

  const prevAchRef = useRef<Set<string> | null>(null);
  const prevCompletedQuestsRef = useRef<Set<string> | null>(null);
  const prevCompletedSecretsRef = useRef<Set<string> | null>(null);
  const prevFishRef = useRef<number | null>(null);
  const prevHpRef = useRef<number | null>(null);
  const prevBossKeyRef = useRef<string>('');

  useEffect(() => {
    const currentAch = new Set<string>(hud.save.unlockedAchievements);
    const currentQuests = new Set<string>(
      hud.quests.filter((q) => q.completed).map((q) => q.id)
    );
    const currentSecrets = new Set<string>(
      hud.secretQuests.filter((sq) => sq.completed).map((sq) => sq.id)
    );

    if (
      prevAchRef.current === null ||
      prevCompletedQuestsRef.current === null ||
      prevCompletedSecretsRef.current === null
    ) {
      prevAchRef.current = currentAch;
      prevCompletedQuestsRef.current = currentQuests;
      prevCompletedSecretsRef.current = currentSecrets;
      return;
    }

    let nextToast: { id: string; title: string; subtitle: string } | null = null;
    for (const achId of hud.save.unlockedAchievements) {
      if (!prevAchRef.current.has(achId)) {
        const achInfo = campaignLocale.achievements[achId as AchievementId];
        if (achInfo) {
          nextToast = {
            id: `ach-${achId}`,
            title: `★ ${achInfo.name}`,
            subtitle: achInfo.desc,
          };
          break;
        }
      }
    }

    if (!nextToast) {
      for (const sq of hud.secretQuests) {
        if (sq.completed && !prevCompletedSecretsRef.current.has(sq.id)) {
          const sqTitle = campaignLocale.secretQuests[sq.id];
          nextToast = {
            id: `secret-${sq.id}`,
            title: `✦ ${sqTitle}`,
            subtitle: `+${sq.rewardFish} 🐟`,
          };
          break;
        }
      }
    }

    if (!nextToast) {
      for (const q of hud.quests) {
        if (q.completed && !prevCompletedQuestsRef.current.has(q.id)) {
          nextToast = {
            id: `quest-${q.id}`,
            title: `✓ ${campaignLocale.quests[q.id]}`,
            subtitle: `${q.current}/${q.target}`,
          };
          break;
        }
      }
    }

    prevAchRef.current = currentAch;
    prevCompletedQuestsRef.current = currentQuests;
    prevCompletedSecretsRef.current = currentSecrets;

    if (nextToast) {
      setRewardToast(nextToast);
      if (isHighOrUltra) {
        emitUiGoldBurst(0.5, 0.14, true);
      }
    }
  }, [hud.save.unlockedAchievements, hud.quests, hud.secretQuests, campaignLocale, isHighOrUltra]);

  useEffect(() => {
    if (!rewardToast) return;
    const timer = window.setTimeout(() => setRewardToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [rewardToast]);

  useEffect(() => {
    if (prevFishRef.current === null) {
      prevFishRef.current = hud.save.fishBank;
      return;
    }
    const delta = hud.save.fishBank - prevFishRef.current;
    prevFishRef.current = hud.save.fishBank;
    if (delta <= 0) return;
    if (mode === 'playing') {
      setFishGainPop((prev) => ({ delta, seq: (prev?.seq ?? 0) + 1 }));
    }
    if (isLowEco) return;
    setFishPop(true);
    const timer = window.setTimeout(() => setFishPop(false), 420);
    return () => window.clearTimeout(timer);
  }, [hud.save.fishBank, isLowEco, mode]);

  useEffect(() => {
    if (!fishGainPop) return;
    const timer = window.setTimeout(() => setFishGainPop(null), 1100);
    return () => window.clearTimeout(timer);
  }, [fishGainPop]);

  useEffect(() => {
    if (prevHpRef.current === null) {
      prevHpRef.current = hud.hp;
      return;
    }
    const diff = hud.hp - prevHpRef.current;
    prevHpRef.current = hud.hp;
    if (diff === 0 || isLowEco) return;
    setHpFlash(diff < 0 ? 'hit' : 'heal');
    const timer = window.setTimeout(() => setHpFlash(null), 480);
    return () => window.clearTimeout(timer);
  }, [hud.hp, isLowEco]);

  const bossHpPct =
    hud.boss.maxHp > 0
      ? Math.max(0, Math.min(100, (hud.boss.hp / hud.boss.maxHp) * 100))
      : 0;

  useEffect(() => {
    const key = `${hud.actId}:${hud.boss.id}`;
    if (prevBossKeyRef.current !== key || isLowEco || bossHpPct >= bossTrailPct) {
      prevBossKeyRef.current = key;
      setBossTrailPct(bossHpPct);
      return;
    }
    const timer = window.setTimeout(() => setBossTrailPct(bossHpPct), 180);
    return () => window.clearTimeout(timer);
  }, [hud.actId, hud.boss.id, bossHpPct, bossTrailPct, isLowEco]);

  const vignetteStyle = (() => {
    if (isLowEco || mode !== 'playing') return null;
    if (hpFlash === 'hit' || hud.chasedByDog || (hud.owlInBeam && !hud.owlStealthSynced)) {
      return 'radial-gradient(ellipse at center, rgba(16,28,32,0) 56%, rgba(195,58,42,0.34) 100%)';
    }
    if (hud.warmthTimer > 0.2 || hud.sleeping || hud.purring) {
      return 'radial-gradient(ellipse at center, rgba(16,28,32,0) 60%, rgba(244,169,73,0.24) 100%)';
    }
    if (hud.weather === 'rain' || hud.weather === 'mist') {
      return 'radial-gradient(ellipse at center, rgba(16,28,32,0) 64%, rgba(63,125,112,0.18) 100%)';
    }
    return null;
  })();

  const handleCardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isUltraTilt) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ rx: Number((-ny * 5.2).toFixed(2)), ry: Number((nx * 5.2).toFixed(2)) });
    },
    [isUltraTilt]
  );

  const resetCardTilt = useCallback(() => {
    setTilt({ rx: 0, ry: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-graphics-level={graphicsLevel}
      className="relative w-screen h-screen overflow-hidden bg-[#1A2E33] text-[#EFE6D5] select-none"
    >
      {/* Isolated WebGL canvas container */}
      <div
        ref={mountRef}
        data-testid="game-canvas-mount"
        className="absolute inset-0 w-full h-full"
      />

      {/* Ambient Golden Dawn Dust & Celebration Sparks (High & Ultra only; zero CPU on Medium/Low) */}
      {isHighOrUltra && (mode !== 'playing' || denOpen || Boolean(rewardToast)) && (
        <AmbientGoldDust graphicsLevel={graphicsLevel} />
      )}

      {/* Atmospheric Edge Vignette (disabled in Low Eco & non-playing states) */}
      {vignetteStyle && (
        <div
          data-testid="atmospheric-vignette"
          aria-hidden="true"
          className="fixed inset-0 z-[9] pointer-events-none transition-opacity duration-300"
          style={{ background: vignetteStyle }}
        />
      )}

      {/* Achievement / Quest Completion Brass Reward Banner */}
      {rewardToast && (
        <div
          data-testid="reward-toast"
          role="status"
          aria-live="polite"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-[35] pointer-events-none max-w-xs w-[88vw] sm:w-auto"
        >
          <div className="luxury-panel-sheen relative reward-scroll-toast bg-[#121C20]/96 border border-[#F4A949] px-4 py-2 shadow-xl text-center">
            {!isLowEco && <CornerFiligree />}
            <div className="text-xs font-mono font-semibold text-[#F4A949] tracking-wide">
              {rewardToast.title}
            </div>
            <div className="text-[11px] font-mono text-[#DCE5E2] mt-0.5">
              {rewardToast.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* TITLE SCREEN OVERLAY */}
      {mode === 'title' && (
        <div
          className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 md:p-12 overflow-y-auto pointer-events-none"
          style={{
            background: isLowEco
              ? 'rgba(16, 28, 32, 0.72)'
              : isRtl
                ? 'linear-gradient(255deg, rgba(16, 28, 32, 0.90) 0%, rgba(16, 28, 32, 0.58) 46%, rgba(16, 28, 32, 0.0) 80%)'
                : 'linear-gradient(105deg, rgba(16, 28, 32, 0.90) 0%, rgba(16, 28, 32, 0.58) 46%, rgba(16, 28, 32, 0.0) 80%)',
          }}
        >
          {/* Top bar with quick Language + Audio + Fullscreen on Title */}
          <div className="flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 bg-[#121C20]/90 border border-[#8F5E46]/70 px-3 py-1.5">
              <label htmlFor="title-lang-select" className="text-[11px] uppercase tracking-wider text-[#9EB4AD] font-mono">
                {locale.languageLabel}
              </label>
              <select
                id="title-lang-select"
                data-testid="language-select"
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                className="bg-[#1A282D] text-[#F7EEDC] text-xs font-mono px-2 py-1 border border-[#8F5E46]/60 focus:outline-none focus:border-[#F4A949] cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.nativeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="btn-cat-den"
                onClick={handleOpenDen}
                className="h-9 px-2.5 flex items-center gap-1.5 bg-[#1D2C31]/95 border border-[#F4A949]/80 hover:bg-[#283B40] text-[#F7EEDC] text-xs font-mono cursor-pointer"
              >
                <span>🐟</span>
                <span>{hud.save.fishBank}</span>
                <span className="text-[#F4A949] font-semibold">· {campaignLocale.hud.denBtn}</span>
              </button>
              <button
                type="button"
                aria-label={locale.actions.musicToggle}
                onClick={handleToggleMusic}
                data-testid="btn-music-toggle"
                className={`h-9 px-2.5 flex items-center gap-1.5 bg-[#121C20]/90 border text-xs font-mono cursor-pointer ${
                  musicMuted ? 'border-[#8F5E46]/40 text-[#7A8F89]' : 'border-[#F4A949]/75 text-[#F4A949]'
                }`}
              >
                <span>♪</span>
                <span className="hidden sm:inline">{musicMuted ? 'OFF' : 'ON'}</span>
              </button>
              <button
                type="button"
                aria-label={locale.actions.sfxToggle}
                onClick={handleToggleSfx}
                data-testid="btn-sfx-toggle"
                className={`h-9 px-2.5 flex items-center gap-1.5 bg-[#121C20]/90 border text-xs font-mono cursor-pointer ${
                  sfxMuted ? 'border-[#8F5E46]/40 text-[#7A8F89]' : 'border-[#6EA89C]/75 text-[#EFE6D5]'
                }`}
              >
                <span>🔊</span>
                <span className="hidden sm:inline">{sfxMuted ? 'OFF' : 'ON'}</span>
              </button>
              <button
                type="button"
                aria-label={isFullscreen ? locale.actions.fullscreenExit : locale.actions.fullscreenEnter}
                onClick={handleToggleFullscreen}
                data-testid="btn-fullscreen-toggle"
                className="h-9 px-2.5 flex items-center gap-1 bg-[#121C20]/90 border border-[#8F5E46]/70 hover:border-[#F4A949] text-[#EFE6D5] text-xs font-mono cursor-pointer"
              >
                <span>{isFullscreen ? '⤢' : '⛶'}</span>
              </button>
            </div>
          </div>

          <div className="max-w-xl my-auto py-3 space-y-4 pointer-events-auto">
            {/* Horological brass crest & title lockup */}
            <div className="flex items-center gap-3.5 sm:gap-4">
              <svg viewBox="0 0 64 64" className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" aria-hidden="true">
                <g className="clockwork-counter-spin">
                  <circle
                    cx="32"
                    cy="32"
                    r="30"
                    fill="none"
                    stroke="#F4A949"
                    strokeWidth="0.9"
                    strokeDasharray="2 4"
                    opacity="0.72"
                  />
                </g>
                <g className="clockwork-spin">
                  <circle cx="32" cy="32" r="26.5" fill="none" stroke="#8F5E46" strokeWidth="2.1" />
                  <circle
                    cx="32"
                    cy="32"
                    r="21"
                    fill="none"
                    stroke="#3F7D70"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                  />
                  <path
                    d="M32 2v6M32 56v6M2 32h6M56 32h6M11 11l4 4M49 49l4 4M53 11l-4 4M15 49l-4 4"
                    stroke="#F4A949"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </g>
                <path
                  d="M32 18c-5.5 0-9.5 4.2-9.5 10.5 0 4.8-2.2 7.5-4.5 9.5h28c-2.3-2-4.5-4.7-4.5-9.5C41.5 22.2 37.5 18 32 18z"
                  fill="#F4A949"
                  stroke="#1D2C31"
                  strokeWidth="1.8"
                />
                <circle cx="32" cy="42.5" r="3.4" fill="#FFD5A5" />
              </svg>
              <div>
                <h1
                  className="text-3xl sm:text-5xl tracking-[0.06em] font-semibold text-[#F7EEDC]"
                  style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif" }}
                >
                  SUNKEN CHIME
                </h1>
                <p className="text-xs sm:text-sm text-[#9EB4AD] tracking-wide mt-0.5">
                  {locale.subtitle}
                </p>
              </div>
            </div>

            {/* Campaign Act, Difficulty, Graphics & Cat Configuration Box */}
            <div
              onPointerMove={handleCardPointerMove}
              onPointerLeave={resetCardTilt}
              style={
                isUltraTilt
                  ? {
                      transform: `perspective(950px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                      transition: 'transform 140ms ease-out',
                    }
                  : undefined
              }
              className={`luxury-panel-sheen modal-panel-enter relative bg-[#121C20]/88 border border-[#8F5E46]/70 p-3.5 sm:p-4 space-y-3 shadow-lg ${
                isUltraTilt ? 'card-3d-tilt' : ''
              }`}
            >
              {!isLowEco && <CornerFiligree />}
              {/* Campaign Act Selector */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#9EB4AD] font-mono mb-1.5">
                  {campaignLocale.hud.actSelectorLabel}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {ACT_ORDER.map((id) => {
                    const spec = ACT_SPECS[id];
                    const info = campaignLocale.acts[id];
                    const unlocked =
                      spec.index <= hud.save.highestReachedAct ||
                      hud.save.completedActs.includes(id);
                    const selected = hud.actId === id;
                    const best = hud.save.bestActScores[id] ?? 0;
                    return (
                      <button
                        key={id}
                        type="button"
                        data-testid={`act-select-${id}`}
                        disabled={!unlocked}
                        onClick={() => handleSelectAct(id)}
                        className={`py-1.5 px-2 text-left font-mono border transition-colors ${
                          !unlocked
                            ? 'bg-[#121B1F] border-[#8F5E46]/30 text-[#60736F] cursor-not-allowed'
                            : selected
                              ? 'brass-shimmer bg-[#2B3D38] border-[#F4A949] text-[#F7EEDC] cursor-pointer'
                              : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#DCE5E2] hover:border-[#F4A949]/70 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span className={selected ? 'text-[#F4A949] font-semibold' : 'text-[#9EB4AD]'}>
                            {info.short}
                          </span>
                          <span>{unlocked ? (best > 0 ? `★${best}` : '✓') : '🔒'}</span>
                        </div>
                        <div className="text-[11px] font-semibold truncate mt-0.5">
                          {unlocked ? info.title : campaignLocale.hud.lockedAct}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#9EB4AD] font-mono mb-1.5">
                  {locale.difficultyLabel}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['relaxed', 'standard', 'challenger'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      data-testid={`diff-${lvl}`}
                      onClick={() => handleDifficultyChange(lvl)}
                      className={`py-1.5 px-2 text-xs font-mono border cursor-pointer transition-colors ${
                        difficulty === lvl
                          ? 'bg-[#F4A949] border-[#FFD5A5] text-[#142024] font-semibold'
                          : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#DCE5E2] hover:border-[#F4A949]/70'
                      }`}
                    >
                      {locale.difficultyNames[lvl]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#9EB4AD] font-mono mb-1.5">
                  {locale.graphicsLabel}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'medium', 'high', 'ultra'] as const).map((gfx) => (
                    <button
                      key={gfx}
                      type="button"
                      data-testid={`gfx-${gfx}`}
                      onClick={() => handleGraphicsChange(gfx)}
                      className={`py-1.5 px-1 text-[10px] sm:text-xs font-mono border cursor-pointer transition-colors truncate ${
                        graphicsLevel === gfx
                          ? 'bg-[#3F7D70] border-[#8FE8CF] text-[#F7EEDC] font-semibold'
                          : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#DCE5E2] hover:border-[#8FE8CF]/70'
                      }`}
                    >
                      {locale.graphicsNames[gfx]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#9EB4AD] font-mono mb-1.5">
                  {locale.catLabel}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {CAT_BREED_ORDER.map((breedId) => {
                    const spec = CAT_BREED_SPECS[breedId];
                    const isSelected = catBreed === breedId;
                    return (
                      <button
                        key={breedId}
                        type="button"
                        data-testid={`cat-${breedId}`}
                        onClick={() => handleCatBreedChange(breedId)}
                        className={`py-1.5 px-2 flex flex-col items-start gap-0.5 text-left font-mono border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#2B3D38] border-[#F4A949] text-[#F7EEDC] font-semibold'
                            : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#DCE5E2] hover:border-[#F4A949]/65'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <span
                            className="w-2.5 h-2.5 shrink-0 border border-[#F7EEDC]/40"
                            style={{
                              background: isLowEco
                                ? spec.swatchPrimary
                                : `linear-gradient(135deg, ${spec.swatchPrimary} 55%, ${spec.swatchSecondary} 55%)`,
                            }}
                          />
                          <span className="text-[11px] sm:text-xs truncate">{locale.catNames[breedId]}</span>
                        </div>
                        <span className="text-[9px] leading-tight text-[#9EB4AD] truncate w-full">
                          {locale.catBreedTraits[breedId]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#8F5E46]/35">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-[#9EB4AD] font-mono">
                    {locale.rightClickLabel}:
                  </span>
                  {(['jump', 'use_tool'] as const).map((rc) => (
                    <button
                      key={rc}
                      type="button"
                      onClick={() => handleRightClickChange(rc)}
                      className={`px-2 py-1 text-[11px] font-mono border cursor-pointer ${
                        rightClickMode === rc
                          ? 'bg-[#3F7D70] border-[#8FE8CF] text-[#F7EEDC]'
                          : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#9EB4AD]'
                      }`}
                    >
                      {rc === 'jump' ? locale.rcJump : locale.rcTool}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setTouchPadEnabled((v) => !v)}
                  className={`px-2 py-1 text-[11px] font-mono border cursor-pointer ${
                    touchPadEnabled
                      ? 'bg-[#3F7D70] border-[#8FE8CF] text-[#F7EEDC]'
                      : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#9EB4AD]'
                  }`}
                >
                  {locale.touchControlsToggle}: {touchPadEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-start="true"
                data-testid="btn-start-game"
                onClick={handleStart}
                className="brass-shimmer px-7 py-3 bg-[#F4A949] hover:bg-[#FFD5A5] text-[#142024] font-semibold tracking-[0.08em] uppercase text-sm border border-[#FFD5A5] shadow-lg transition-colors cursor-pointer"
              >
                {locale.startBtn}
              </button>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs tracking-[0.08em] uppercase text-[#9EB4AD] font-mono">
            {locale.controlsLine}
          </p>
        </div>
      )}

      {/* PLAYING PHOTO MODE RESTORE BUTTON */}
      {mode === 'playing' && hudHidden && (
        <div className="fixed top-3 right-3 z-20 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-photo-restore"
            onClick={(e) => {
              e.currentTarget.blur();
              setHudHidden(false);
            }}
            className="h-8 px-2.5 flex items-center gap-1.5 bg-[#121C20]/82 border border-[#F4A949]/75 hover:border-[#FFD5A5] text-[#F7EEDC] text-[11px] font-mono whitespace-nowrap cursor-pointer shadow-md"
          >
            <span>📷</span>
            <span>{campaignLocale.hud.showHudBtn}</span>
          </button>
        </div>
      )}

      {/* PLAYING HUD */}
      {mode === 'playing' && !hudHidden && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
          {/* Top Bar */}
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            {/* Top-left story chapter, astrolabe dial, vitality pips & collapsible quest checklist */}
            <div className="space-y-1.5 max-w-[60vw] sm:max-w-[440px]">
              <div className="bg-[#121C20]/90 border border-[#8F5E46]/70 px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-md">
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 basis-[150px]">
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-[#F4A949] font-mono truncate">
                      {actLocale.short} · {hud.actId === 'harbor' ? chapterInfo.title : actLocale.title}
                      {hud.actId === 'harbor' && hud.chapter === 2 ? ` (${Math.min(3, hud.stolenFishCount)}/3)` : ''}
                    </div>
                    <div className="text-[10px] text-[#9EB4AD] font-mono truncate mt-0.5">
                      {campaignLocale.weather[hud.weather]} · ♪ {locale.musicZones[hud.musicZone]}
                    </div>
                  </div>
                  <DaylightAstrolabe
                    cyclePhase={hud.dayCyclePhase}
                    actId={hud.actId}
                    phaseLabels={campaignLocale.dayPhases}
                    speed={hud.speed}
                    speedUnit={campaignLocale.hud.speedUnit}
                    isLowEco={isLowEco}
                  />
                </div>

                {/* Player Vitality Jewel Pips + Double Jump, Run Score & Fish Bank */}
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono">
                  <div
                    className={`flex items-center gap-1.5 transition-colors duration-200 ${
                      hpFlash === 'hit'
                        ? 'bg-[#4D1F1A]/60 px-1 -mx-1'
                        : hpFlash === 'heal'
                          ? 'bg-[#18382F]/60 px-1 -mx-1'
                          : ''
                    }`}
                    data-testid="vitality-pips"
                  >
                    <span className="text-[#9EB4AD] uppercase mr-0.5">{campaignLocale.hud.hpLabel}:</span>
                    {Array.from({ length: hud.maxHp }).map((_, idx) => {
                      const alive = idx < hud.hp;
                      return (
                        <span
                          key={idx}
                          className={`relative inline-flex items-center justify-center w-2.5 h-2.5 sm:w-3 sm:h-3 rotate-45 border transition-colors duration-200 ${
                            alive
                              ? hpFlash === 'heal'
                                ? 'bg-[#4CE0B3] border-[#BDF9E5]'
                                : 'bg-[#F4A949] border-[#FFE4B8]'
                              : hpFlash === 'hit'
                                ? 'bg-[#5A2018] border-[#FF5733]'
                                : 'bg-[#152024] border-[#8F5E46]/50'
                          }`}
                        >
                          {alive && <span className="w-1 h-1 bg-[#FFF6E0]/90" />}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-[#DCE5E2] tabular-nums">
                    {hud.hasDoubleJump && (
                      <span
                        data-testid="double-jump-badge"
                        className={hud.airJumpsRemaining > 0 ? 'text-[#8FE8CF]' : 'text-[#6D817C]'}
                      >
                        🐾×{hud.airJumpsRemaining}
                      </span>
                    )}
                    <span className="text-[#DCE5E2]/85 border border-[#8F5E46]/45 bg-[#162226]/90 px-1.5 py-0.5 text-[10px]">
                      ★ {hud.runScore}
                    </span>
                    <span className="relative inline-flex items-center">
                      <span className={`inline-block text-[#F4A949] ${fishPop ? 'fish-pop text-[#FFE8C2]' : ''}`}>
                        🐟 {hud.save.fishBank}
                      </span>
                      {fishGainPop && (
                        <span
                          key={fishGainPop.seq}
                          data-testid="fish-gain-pop"
                          className="fish-gain-float pointer-events-none absolute -top-4 right-0 whitespace-nowrap text-[11px] font-bold text-[#4CE0B3]"
                        >
                          +{fishGainPop.delta} 🐟
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-[#EFE6D5] mt-1 leading-snug">
                  {localizedObjective}
                </p>

                <div className="mt-1.5 pt-1 border-t border-[#8F5E46]/35 flex flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5 text-[10px] font-mono text-[#9EB4AD]">
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                    <span>
                      {locale.stats.fish}: <strong className="text-[#F7EEDC]">{hud.stolenFishCount}</strong>
                    </span>
                    <span>
                      {locale.stats.affection}: <strong className="text-[#F7EEDC]">{hud.rubCount}</strong>
                    </span>
                    <span>
                      {locale.stats.evaded}:{' '}
                      <strong className="text-[#F7EEDC]">
                        {hud.escapedChaseCount + hud.distractedDogsCount}
                      </strong>
                    </span>
                    <span>
                      {locale.stats.letters}:{' '}
                      <strong className="text-[#F4A949]">
                        {hud.lettersFound}/{hud.lettersTotal}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-quests-toggle"
                    aria-expanded={questsExpanded}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setQuestsExpanded((v) => !v);
                    }}
                    className="pointer-events-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-[#8F5E46]/50 bg-[#172327] hover:border-[#F4A949] text-[#CFE0DC] whitespace-nowrap cursor-pointer"
                  >
                    {campaignLocale.hud.toggleQuestsBtn} {questsExpanded ? '▴' : '▾'}
                  </button>
                </div>

                {/* Compact Quest Tracker */}
                {questsExpanded && (
                  <>
                    <div
                      data-testid="quest-checklist"
                      className="mt-1.5 pt-1 border-t border-[#8F5E46]/30 grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono"
                    >
                      {hud.quests.map((q) => (
                        <div
                          key={q.id}
                          className={`flex items-center justify-between gap-1 truncate ${
                            q.completed ? 'text-[#4CE0B3]' : 'text-[#DCE5E2]'
                          }`}
                        >
                          <span className="truncate">
                            {q.completed ? '✓ ' : '· '}
                            {campaignLocale.quests[q.id]}
                          </span>
                          <span className="shrink-0 opacity-85">
                            {q.current}/{q.target}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Harbor 3 Secret Mysteries Tracker */}
                    {hud.actId === 'harbor' && hud.secretQuests.length > 0 && (
                      <div
                        data-testid="secret-quest-checklist"
                        className="mt-1.5 pt-1 border-t border-[#4CE0B3]/25 space-y-0.5 text-[10px] font-mono"
                      >
                        <div className="uppercase tracking-[0.12em] text-[#8FE8CF]/90 text-[9px]">
                          ✦ {campaignLocale.hud.secretQuestsTitle}
                        </div>
                        {hud.secretQuests.map((sq) => {
                          const sqTitle = campaignLocale.secretQuests[sq.id];
                          return (
                            <div
                              key={sq.id}
                              className={`flex items-center justify-between gap-2 min-w-0 ${
                                sq.completed
                                  ? 'text-[#4CE0B3]'
                                  : sq.active
                                    ? 'text-[#FFE8C2]'
                                    : 'text-[#9EB4AD]'
                              }`}
                            >
                              <span className="min-w-0 truncate">
                                {sq.completed ? '✦ ' : '✧ '}
                                {sqTitle}
                              </span>
                              <span className="shrink-0 opacity-90 tabular-nums">
                                {sq.current}/{sq.target} · +{sq.rewardFish}🐟
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {hud.chasedByDog && (
                <div className="bg-[#4D1F1A]/94 border border-[#F4A949] px-3 py-1.5 text-[11px] sm:text-xs font-mono text-[#FFE6C7] shadow-md">
                  {locale.prompts.chasedAlert}
                </div>
              )}

              {hud.carryingGoldenMackerel && (
                <div
                  data-testid="carrying-mackerel-banner"
                  className="bg-[#382714]/94 border border-[#FFD57E] px-3 py-1 text-[11px] sm:text-xs font-mono text-[#FFE8C2] shadow-md"
                >
                  {campaignLocale.hud.carryingMackerelBanner}
                </div>
              )}

              {hud.carryingFish && !hud.chasedByDog && (
                <div className="bg-[#18332E]/92 border border-[#6EA89C] px-3 py-1 text-[11px] sm:text-xs font-mono text-[#DDF3ED] shadow-md">
                  {locale.prompts.carryingFishHint}
                </div>
              )}

              {hud.owlInBeam && (
                <div
                  className={`px-3 py-1.5 text-[11px] sm:text-xs font-mono shadow-md border ${
                    hud.owlStealthSynced
                      ? 'bg-[#12332D]/92 border-[#4CE0B3] text-[#BDF9E5]'
                      : 'bg-[#461F18]/92 border-[#FF5733] text-[#FFD9CE]'
                  }`}
                >
                  {hud.owlStealthSynced ? (
                    <span>{locale.prompts.owlStealthOk}</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span>{locale.prompts.owlAlert}</span>
                        <span>{Math.round(hud.owlSuspicion * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1C1210] overflow-hidden">
                        <div
                          className="h-full bg-[#FF5733]"
                          style={{ width: `${Math.min(100, Math.round(hud.owlSuspicion * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hud.sleeping ? (
                <div className="bg-[#2B2016]/90 border border-[#F4A949]/75 px-3 py-1 text-[11px] sm:text-xs font-mono text-[#FFE6C2] shadow-md">
                  {locale.prompts.sleepingHint}
                </div>
              ) : (
                hud.warmthTimer > 0.2 && (
                  <div className="bg-[#292218]/88 border border-[#D4974C]/70 px-3 py-1 text-[11px] sm:text-xs font-mono text-[#FFDFA8] shadow-md">
                    {locale.prompts.warmthBuff} ({Math.ceil(hud.warmthTimer)}s)
                  </div>
                )
              )}
            </div>

            {/* Top-center Boss Health Bar & Rival Race Timer (visible only when engaged/active) */}
            <div className="hidden md:flex flex-col items-center gap-1.5 max-w-md w-full mx-2">
              {hud.boss.active && hud.boss.phase !== 'defeated' && (
                <div
                  data-testid="boss-hud"
                  className={`relative w-full bg-[#121C20]/94 border px-3.5 py-2 shadow-lg ${
                    hud.boss.phase === 'vulnerable'
                      ? 'border-[#4CE0B3]'
                      : hud.boss.phase === 'telegraph' || hud.boss.phase === 'attack'
                        ? 'border-[#FF5733]'
                        : 'border-[#F4A949]'
                  }`}
                >
                  {!isLowEco && <CornerFiligree accent={hud.boss.phase === 'vulnerable' ? '#4CE0B3' : '#F4A949'} />}
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="font-semibold text-[#F7EEDC] truncate">
                      {campaignLocale.bosses[hud.boss.id].name}
                    </span>
                    <span className="text-[#F4A949] shrink-0">
                      {hud.boss.hp} / {hud.boss.maxHp} HP
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2.5 bg-[#1D1719] border border-[#8F5E46]/50 overflow-hidden">
                    <div
                      data-testid="boss-trail-bar"
                      className={`absolute inset-y-0 left-0 bg-[#FFE8C2]/80 ${
                        isLowEco ? '' : 'transition-[width] duration-500 ease-out'
                      }`}
                      style={{ width: `${bossTrailPct}%` }}
                    />
                    <div
                      className={`absolute inset-y-0 left-0 ${
                        hud.boss.phase === 'vulnerable' ? 'bg-[#4CE0B3]' : 'bg-[#FF5733]'
                      } ${isLowEco ? '' : 'transition-[width] duration-150'}`}
                      style={{ width: `${bossHpPct}%` }}
                    />
                    <div
                      className="absolute inset-0 grid pointer-events-none"
                      style={{ gridTemplateColumns: `repeat(${hud.boss.maxHp}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: hud.boss.maxHp }).map((_, idx) => (
                        <div key={idx} className="border-r border-[#121C20]/80 last:border-r-0" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] font-mono mt-1 text-[#FFE6C7] truncate">
                    {hud.boss.phase === 'vulnerable'
                      ? campaignLocale.hud.bossStaggered
                      : hud.boss.phase === 'telegraph'
                        ? campaignLocale.hud.bossTelegraph
                        : campaignLocale.bosses[hud.boss.id].tacticHint}
                  </p>
                </div>
              )}

              {hud.race.active && (
                <div
                  data-testid="race-hud"
                  className="bg-[#121C20]/94 border border-[#F4A949] px-3.5 py-1.5 text-xs font-mono text-[#F7EEDC] flex items-center gap-3 shadow-md"
                >
                  <span className="text-[#F4A949] font-semibold">
                    {campaignLocale.hud.raceTimerLabel}: {hud.race.timeRemaining.toFixed(1)}s
                  </span>
                  <span>
                    {hud.race.nextRingIndex}/{hud.race.totalRings}
                  </span>
                </div>
              )}
            </div>

            {/* Top-right compact toolbar: Cat Den, Music, SFX, Touch Pad, Fullscreen, Main Menu, Reset, Pause */}
            <div className="flex flex-wrap justify-end items-center gap-1.5 pointer-events-auto max-w-[36vw] sm:max-w-none">
              <button
                type="button"
                tabIndex={-1}
                title={campaignLocale.hud.denBtn}
                aria-label={campaignLocale.hud.denBtn}
                data-testid="hud-den-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleOpenDen();
                }}
                className="h-8 sm:h-9 px-2 flex items-center gap-1 bg-[#1D2C31]/90 border border-[#F4A949]/75 hover:border-[#FFD5A5] text-[#F7EEDC] text-[10px] sm:text-[11px] font-mono cursor-pointer"
              >
                <span>🐟</span>
                <span>{hud.save.fishBank}</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                title={locale.actions.musicToggle}
                aria-label={locale.actions.musicToggle}
                data-testid="hud-music-toggle"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleMusic();
                }}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121C20]/88 border text-sm cursor-pointer ${
                  musicMuted
                    ? 'border-[#8F5E46]/45 text-[#6D817C]'
                    : 'border-[#F4A949]/75 text-[#F4A949]'
                }`}
              >
                {musicMuted ? '♪̸' : '♪'}
              </button>

              <button
                type="button"
                tabIndex={-1}
                title={locale.actions.sfxToggle}
                aria-label={locale.actions.sfxToggle}
                data-testid="hud-sfx-toggle"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleSfx();
                }}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121C20]/88 border text-xs cursor-pointer ${
                  sfxMuted
                    ? 'border-[#8F5E46]/45 text-[#6D817C]'
                    : 'border-[#6EA89C]/75 text-[#EFE6D5]'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="1.9">
                  <path d="M11 5L6 9H3v6h3l5 4V5z" />
                  {sfxMuted ? (
                    <path d="M16 9l5 6M21 9l-5 6" />
                  ) : (
                    <path d="M15.5 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" />
                  )}
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                title={locale.touchControlsToggle}
                aria-label={locale.touchControlsToggle}
                data-testid="hud-touch-toggle"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setTouchPadEnabled((v) => !v);
                }}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121C20]/88 border text-xs font-mono cursor-pointer ${
                  touchPadEnabled
                    ? 'border-[#8FE8CF] text-[#8FE8CF]'
                    : 'border-[#8F5E46]/70 text-[#9EB4AD]'
                }`}
              >
                ⌖
              </button>

              <button
                type="button"
                tabIndex={-1}
                title={campaignLocale.hud.hideHudBtn}
                aria-label={campaignLocale.hud.hideHudBtn}
                data-testid="hud-photo-toggle"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setHudHidden(true);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121C20]/88 border border-[#8F5E46]/70 hover:border-[#F4A949] text-[#EFE6D5] text-xs cursor-pointer"
              >
                📷
              </button>

              <button
                type="button"
                tabIndex={-1}
                title={isFullscreen ? locale.actions.fullscreenExit : locale.actions.fullscreenEnter}
                aria-label={isFullscreen ? locale.actions.fullscreenExit : locale.actions.fullscreenEnter}
                data-testid="hud-fullscreen-toggle"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleToggleFullscreen();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121C20]/88 border border-[#8F5E46]/70 hover:border-[#F4A949] text-[#EFE6D5] text-sm cursor-pointer"
              >
                {isFullscreen ? '⤢' : '⛶'}
              </button>

              <button
                type="button"
                tabIndex={-1}
                title={locale.actions.restart}
                aria-label={locale.actions.restart}
                data-testid="hud-restart-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleRestart();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121C20]/88 border border-[#8F5E46]/70 hover:border-[#F4A949] text-[#EFE6D5] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="1.9">
                  <path d="M3 12a9 9 0 103-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                title={locale.actions.exitMenu}
                aria-label={locale.actions.exitMenu}
                data-testid="hud-menu-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleReturnTitle();
                }}
                className="h-8 sm:h-9 px-2 sm:px-2.5 flex items-center justify-center bg-[#121C20]/88 border border-[#8F5E46]/70 hover:border-[#F4A949] text-[#EFE6D5] text-[10px] sm:text-[11px] font-mono uppercase cursor-pointer"
              >
                {locale.actions.exitMenu}
              </button>

              <button
                type="button"
                tabIndex={-1}
                title={locale.actions.pause}
                aria-label={locale.actions.pause}
                data-testid="hud-pause-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  controllerRef.current?.setMode('paused');
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-[#121C20]/88 border border-[#8F5E46]/70 hover:border-[#F4A949] text-[#EFE6D5] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile compact Boss / Race bar */}
          <div className="md:hidden flex flex-col items-center gap-1">
            {hud.boss.active && hud.boss.phase !== 'defeated' && (
              <div className="w-full max-w-sm bg-[#121C20]/94 border border-[#F4A949] px-2.5 py-1.5 text-[10px] font-mono">
                <div className="flex justify-between gap-2 text-[#F7EEDC]">
                  <span className="truncate">{campaignLocale.bosses[hud.boss.id].name}</span>
                  <span className="text-[#F4A949]">
                    {hud.boss.hp}/{hud.boss.maxHp} HP
                  </span>
                </div>
                <div className="relative mt-1 h-1.5 bg-[#1D1719] border border-[#8F5E46]/40 overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 bg-[#FFE8C2]/80 ${
                      isLowEco ? '' : 'transition-[width] duration-500 ease-out'
                    }`}
                    style={{ width: `${bossTrailPct}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 left-0 ${
                      hud.boss.phase === 'vulnerable' ? 'bg-[#4CE0B3]' : 'bg-[#FF5733]'
                    }`}
                    style={{ width: `${bossHpPct}%` }}
                  />
                </div>
              </div>
            )}
            {hud.race.active && (
              <div className="bg-[#121C20]/94 border border-[#F4A949] px-3 py-1 text-[10px] font-mono text-[#F4A949]">
                {campaignLocale.hud.raceTimerLabel}: {hud.race.timeRemaining.toFixed(1)}s ({hud.race.nextRingIndex}/{hud.race.totalRings})
              </div>
            )}
          </div>

          {/* Bottom Stack: Floating Contextual Action Badge + Dialogue toast + TouchControls cleanly above 4-Slot Weapon Hotbar + Radar & Hint */}
          <div className="space-y-2">
            {localizedNearbyPrompt && (
              <div
                data-testid="contextual-action-badge"
                className="hud-badge-enter mx-auto w-fit max-w-[90vw] bg-[#121C20]/94 border border-[#F4A949] px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs font-mono text-[#FFE8C2]"
              >
                {localizedNearbyPrompt.includes('[Q]') ? (
                  <>
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-[#F4A949] text-[#121C20] font-bold text-[11px] shrink-0">
                      Q
                    </span>
                    <span>{localizedNearbyPrompt.replace(/\[Q\]\s*/g, '')}</span>
                  </>
                ) : (
                  <span>{localizedNearbyPrompt}</span>
                )}
              </div>
            )}
            {localizedDialogue && (
              <div className="luxury-panel-sheen modal-panel-enter mx-auto max-w-xl bg-[#121C20]/94 border border-[#F4A949]/75 px-3.5 py-2 sm:px-5 sm:py-2.5 shadow-lg">
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-[#F4A949] font-mono">
                  {localizedDialogue.speaker}
                </div>
                <p className="text-xs sm:text-sm text-[#F7EEDC] mt-0.5 leading-snug">
                  {localizedDialogue.text}
                </p>
              </div>
            )}
            {touchPadEnabled && (
              <TouchControls
                locale={locale}
                crouching={hud.crouching}
                purring={hud.purring}
                onAxisChange={(fwd, rgt) => controllerRef.current?.setVirtualAxis(fwd, rgt)}
                onHeldChange={(action, active) => controllerRef.current?.setVirtualHeld(action, active)}
                onPulseAction={(action) => controllerRef.current?.pressVirtualAction(action)}
                onCycleTool={() =>
                  controllerRef.current?.selectTool(cycleToolId(hud.activeTool, 1))
                }
              />
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                {hud.parkourChain >= 2 && (
                  <div
                    data-testid="hud-parkour-flow"
                    className="hud-badge-enter w-fit bg-[#121C20]/90 border border-[#F4A949]/75 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.12em] text-[#FFD57E]"
                  >
                    {campaignLocale.hud.flowLabel} ×{hud.parkourChain}
                  </div>
                )}
                {/* 3 Special Abilities Strip: Shadow Dash [X], Moon Glide [Space Hold], Whisker Sense [V] */}
                <div
                  data-testid="ability-hotbar"
                  className="pointer-events-auto grid grid-cols-3 sm:flex items-center gap-1 sm:gap-1.5 bg-[#121C20]/88 border border-[#8F5E46]/65 p-1 shadow-md"
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="ability-slot-dash"
                    title={locale.abilities.dash.hint}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      controllerRef.current?.pressVirtualAction('dash');
                    }}
                    className={`relative px-2 py-1 text-left border cursor-pointer transition-colors sm:min-w-[118px] ${
                      hud.dashActive
                        ? 'bg-[#1C3B3E] border-[#6FE6D6] text-[#E6FFFA]'
                        : 'bg-[#172226]/90 border-[#8F5E46]/45 text-[#CFE9E4] hover:border-[#6FE6D6]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                      <span className="font-bold text-[#6FE6D6]">[X]</span>
                      <span className="text-[9px] uppercase tracking-wider text-[#9EB4AD]">
                        {hud.dashCooldownPct > 0.02 ? `${(hud.dashCooldownPct * 1.5).toFixed(1)}s` : 'RDY'}
                      </span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-medium truncate mt-0.5">
                      {locale.abilities.dash.name}
                    </div>
                    {hud.dashCooldownPct > 0.02 && (
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0F171A]">
                        <div
                          className="h-full bg-[#6FE6D6]"
                          style={{ width: `${Math.round(hud.dashCooldownPct * 100)}%` }}
                        />
                      </div>
                    )}
                  </button>

                  <div
                    data-testid="ability-slot-glide"
                    title={locale.abilities.glide.hint}
                    className={`relative px-2 py-1 text-left border transition-colors sm:min-w-[118px] ${
                      hud.gliding
                        ? 'bg-[#1C323B] border-[#A5F3FC] text-[#ECFEFF]'
                        : 'bg-[#172226]/90 border-[#8F5E46]/45 text-[#CFE9E4]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                      <span className="font-bold text-[#A5F3FC]">[Space]</span>
                      <span className="text-[9px] uppercase tracking-wider text-[#9EB4AD]">
                        {hud.gliding ? 'AIR' : 'PASS'}
                      </span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-medium truncate mt-0.5">
                      {locale.abilities.glide.name}
                    </div>
                  </div>

                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="ability-slot-sense"
                    title={locale.abilities.sense.hint}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      controllerRef.current?.pressVirtualAction('sense');
                    }}
                    className={`relative px-2 py-1 text-left border cursor-pointer transition-colors sm:min-w-[118px] ${
                      hud.senseActive
                        ? 'bg-[#362C17] border-[#FFD57E] text-[#FFF4DC]'
                        : 'bg-[#172226]/90 border-[#8F5E46]/45 text-[#EEDFC2] hover:border-[#FFD57E]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                      <span className="font-bold text-[#FFD57E]">[V]</span>
                      <span className="text-[9px] uppercase tracking-wider text-[#9EB4AD]">
                        {hud.senseActive
                          ? 'ON'
                          : hud.senseCooldownPct > 0.02
                            ? `${(hud.senseCooldownPct * 7.0).toFixed(1)}s`
                            : 'RDY'}
                      </span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-medium truncate mt-0.5">
                      {locale.abilities.sense.name}
                    </div>
                    {hud.senseCooldownPct > 0.02 && (
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0F171A]">
                        <div
                          className="h-full bg-[#FFD57E]"
                          style={{ width: `${Math.round(hud.senseCooldownPct * 100)}%` }}
                        />
                      </div>
                    )}
                  </button>
                </div>

                {/* 4-Slot Weapon / Tool Bar (selected via Mouse Wheel, [1-4], or Tap) */}
                <div
                  data-testid="weapon-hotbar"
                  className="pointer-events-auto grid grid-cols-4 sm:flex items-center gap-1 sm:gap-1.5 bg-[#121C20]/90 border border-[#8F5E46]/75 p-1 sm:p-1.5 shadow-md"
                >
                  {TOOL_ORDER.map((toolId, idx) => {
                    const isActive = hud.activeTool === toolId;
                    const cdPct = hud.toolCooldowns[toolId] ?? 0;
                    const spec = TOOL_SPECS[toolId];
                    const tLocale = locale.tools[toolId];
                    return (
                      <button
                        key={toolId}
                        type="button"
                        tabIndex={-1}
                        data-testid={`tool-slot-${toolId}`}
                        title={`${tLocale.name}: ${tLocale.effect}`}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          controllerRef.current?.selectTool(toolId);
                        }}
                        className={`relative px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-left border cursor-pointer transition-colors sm:min-w-[116px] ${
                          isActive
                            ? 'brass-shimmer bg-[#25322F] border-[#F4A949] text-[#F7EEDC]'
                            : 'bg-[#172226] border-[#8F5E46]/45 text-[#9EB4AD] hover:border-[#F4A949]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                          <span className="font-bold text-[#F4A949]">[{idx + 1}]</span>
                          <ToolSvgIcon toolId={toolId} color={isActive ? spec.accentHex : '#9EB4AD'} />
                        </div>
                        <div className="text-[9px] sm:text-[11px] font-medium truncate mt-0.5">
                          {tLocale.name}
                        </div>
                        {cdPct > 0.02 && (
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-[#0F171A]">
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.round(cdPct * 100)}%`,
                                backgroundColor: spec.accentHex,
                              }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-end justify-end gap-2">
                <div
                  className={`flex-1 sm:flex-initial text-[10px] sm:text-xs font-mono tracking-[0.04em] px-2.5 sm:px-3 py-1.5 border ${
                    hud.purring
                      ? 'bg-[#2B241A]/90 border-[#F4A949]/80 text-[#FFD5A5]'
                      : 'bg-[#121C20]/86 border-[#8F5E46]/55 text-[#EFE6D5]'
                  }`}
                >
                  {renderBottomHint()}
                </div>

                <TacticalRadar
                  catX={hud.catX}
                  catZ={hud.catZ}
                  camYaw={hud.camYaw}
                  blips={hud.radarBlips}
                  isLowEco={isLowEco}
                  showSweep={isHighOrUltra}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER IV DAWN EPILOGUE MODAL */}
      {mode === 'playing' && hud.storyComplete && !epilogueDismissed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={locale.modals.epilogueTitle}
          className="fixed inset-0 z-25 flex items-center justify-center bg-[#0D1619]/75 p-4 sm:p-6"
        >
          <div className="luxury-panel-sheen modal-panel-enter relative w-full max-w-md bg-[#121C20] border border-[#F4A949] p-6 sm:p-7 space-y-5 shadow-2xl">
            {!isLowEco && <CornerFiligree />}
            <div className="space-y-1 border-b border-[#8F5E46]/40 pb-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#F4A949] font-mono">
                {locale.modals.epilogueKicker}
              </p>
              <h2
                className="text-2xl font-semibold text-[#F7EEDC]"
                style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif" }}
              >
                {locale.modals.epilogueTitle}
              </h2>
            </div>

            <p className="text-sm text-[#DCE5E2] leading-relaxed">
              {locale.modals.epilogueBody}{' '}
              <strong className="text-[#F4A949]">{localizedRank}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-2.5 text-center font-mono">
              <div className="bg-[#1A282D] border border-[#8F5E46]/40 py-2">
                <div className="text-[10px] uppercase text-[#9EB4AD]">
                  {locale.stats.fish} / {locale.stats.evaded}
                </div>
                <div className="text-lg text-[#F4A949]">
                  {hud.stolenFishCount} / {hud.distractedDogsCount + hud.escapedChaseCount}
                </div>
              </div>
              <div className="bg-[#1A282D] border border-[#8F5E46]/40 py-2">
                <div className="text-[10px] uppercase text-[#9EB4AD]">{locale.stats.letters}</div>
                <div className="text-lg text-[#F7EEDC]">{hud.lettersFound}/{hud.lettersTotal}</div>
              </div>
              <div className="bg-[#1A282D] border border-[#8F5E46]/40 py-2">
                <div className="text-[10px] uppercase text-[#9EB4AD]">{locale.stats.wheelsGulls}</div>
                <div className="text-lg text-[#F7EEDC]">
                  {hud.wheelsReversedCount} / {hud.gullsStalkedCount}
                </div>
              </div>
              <div className="bg-[#1A282D] border border-[#8F5E46]/40 py-2">
                <div className="text-[10px] uppercase text-[#9EB4AD]">{locale.stats.chimes}</div>
                <div className="text-lg text-[#F4A949]">{hud.chimesCount}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setEpilogueDismissed(true)}
                className="flex-1 py-2.5 bg-[#F4A949] hover:bg-[#FFD5A5] text-[#142024] font-semibold uppercase tracking-[0.08em] text-xs cursor-pointer"
              >
                {locale.actions.continueWalk}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 py-2.5 bg-[#1D2C31] hover:bg-[#26353B] text-[#EFE6D5] border border-[#8F5E46]/70 uppercase tracking-[0.08em] text-xs cursor-pointer"
              >
                {locale.actions.restart}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE & SETTINGS MODAL */}
      {mode === 'paused' && !denOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={locale.modals.pauseTitle}
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#0D1619]/78 p-4 sm:p-6 overflow-y-auto"
        >
          <div
            onPointerMove={handleCardPointerMove}
            onPointerLeave={resetCardTilt}
            style={
              isUltraTilt
                ? {
                    transform: `perspective(950px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                    transition: 'transform 140ms ease-out',
                  }
                : undefined
            }
            className={`luxury-panel-sheen modal-panel-enter relative w-full max-w-md bg-[#121C20] border border-[#8F5E46] p-5 sm:p-7 space-y-5 shadow-2xl ${
              isUltraTilt ? 'card-3d-tilt' : ''
            }`}
          >
            {!isLowEco && <CornerFiligree />}
            <div className="space-y-1 border-b border-[#8F5E46]/40 pb-3.5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#F4A949] font-mono">
                {locale.modals.pauseTitle} · {actLocale.short} · {localizedRank}
              </p>
              <h2
                className="text-xl sm:text-2xl font-semibold text-[#F7EEDC]"
                style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif" }}
              >
                {hud.actId === 'harbor' ? chapterInfo.title : actLocale.title}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-[#1A282D] border border-[#8F5E46]/40 py-2">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#9EB4AD] font-mono">
                  {locale.stats.fish} / {locale.stats.letters}
                </div>
                <div className="text-lg font-mono tabular-nums text-[#F7EEDC] mt-0.5">
                  {hud.stolenFishCount} / {hud.lettersFound}/{hud.lettersTotal}
                </div>
              </div>
              <div className="bg-[#1A282D] border border-[#8F5E46]/40 py-2">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#9EB4AD] font-mono">
                  {locale.stats.evaded} / {locale.stats.chimes}
                </div>
                <div className="text-lg font-mono tabular-nums text-[#F4A949] mt-0.5">
                  {hud.distractedDogsCount + hud.escapedChaseCount} / {hud.chimesCount}
                </div>
              </div>
            </div>

            {/* Live In-Game Settings: Language, Difficulty, Right-Click, Audio, Fullscreen */}
            <div className="space-y-3 border-t border-b border-[#8F5E46]/35 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="pause-lang-select" className="text-xs font-mono text-[#9EB4AD]">
                  {locale.languageLabel}
                </label>
                <select
                  id="pause-lang-select"
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                  className="bg-[#1A282D] text-[#F7EEDC] text-xs font-mono px-2.5 py-1 border border-[#8F5E46]/60 cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.nativeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] font-mono text-[#9EB4AD] mb-1">
                  {locale.difficultyLabel}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['relaxed', 'standard', 'challenger'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleDifficultyChange(lvl)}
                      className={`py-1.5 text-[11px] font-mono border cursor-pointer ${
                        difficulty === lvl
                          ? 'bg-[#F4A949] border-[#FFD5A5] text-[#142024] font-semibold'
                          : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#DCE5E2]'
                      }`}
                    >
                      {locale.difficultyNames[lvl]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-[#9EB4AD] mb-1">
                  {locale.graphicsLabel}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'medium', 'high', 'ultra'] as const).map((gfx) => (
                    <button
                      key={gfx}
                      type="button"
                      data-testid={`pause-gfx-${gfx}`}
                      onClick={() => handleGraphicsChange(gfx)}
                      className={`py-1.5 px-1 text-[10px] sm:text-[11px] font-mono border cursor-pointer truncate ${
                        graphicsLevel === gfx
                          ? 'bg-[#3F7D70] border-[#8FE8CF] text-[#F7EEDC] font-semibold'
                          : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#DCE5E2]'
                      }`}
                    >
                      {locale.graphicsNames[gfx]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-[#9EB4AD] mb-1">
                  {locale.catLabel}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {CAT_BREED_ORDER.map((breedId) => {
                    const spec = CAT_BREED_SPECS[breedId];
                    const isSelected = catBreed === breedId;
                    return (
                      <button
                        key={breedId}
                        type="button"
                        data-testid={`pause-cat-${breedId}`}
                        onClick={() => handleCatBreedChange(breedId)}
                        className={`py-1 px-1.5 flex flex-col items-start gap-0.5 text-left text-[11px] font-mono border cursor-pointer ${
                          isSelected
                            ? 'bg-[#2B3D38] border-[#F4A949] text-[#F7EEDC] font-semibold'
                            : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#DCE5E2]'
                        }`}
                      >
                        <div className="flex items-center gap-1 w-full">
                          <span
                            className="w-2.5 h-2.5 shrink-0 border border-[#F7EEDC]/40"
                            style={{
                              background: isLowEco
                                ? spec.swatchPrimary
                                : `linear-gradient(135deg, ${spec.swatchPrimary} 55%, ${spec.swatchSecondary} 55%)`,
                            }}
                          />
                          <span className="truncate">{locale.catNames[breedId]}</span>
                        </div>
                        <span className="text-[9px] leading-tight text-[#9EB4AD] truncate w-full">
                          {locale.catBreedTraits[breedId]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9EB4AD]">{locale.rightClickLabel}:</span>
                  {(['jump', 'use_tool'] as const).map((rc) => (
                    <button
                      key={rc}
                      type="button"
                      onClick={() => handleRightClickChange(rc)}
                      className={`px-2 py-1 border cursor-pointer ${
                        rightClickMode === rc
                          ? 'bg-[#3F7D70] border-[#8FE8CF] text-[#F7EEDC]'
                          : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#9EB4AD]'
                      }`}
                    >
                      {rc === 'jump' ? locale.rcJump : locale.rcTool}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleMusic}
                    className={`px-2 py-1 border cursor-pointer ${
                      musicMuted ? 'border-[#8F5E46]/40 text-[#7A8F89]' : 'border-[#F4A949] text-[#F4A949]'
                    }`}
                  >
                    ♪ {musicMuted ? 'OFF' : 'ON'}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleSfx}
                    className={`px-2 py-1 border cursor-pointer ${
                      sfxMuted ? 'border-[#8F5E46]/40 text-[#7A8F89]' : 'border-[#6EA89C] text-[#EFE6D5]'
                    }`}
                  >
                    🔊 {sfxMuted ? 'OFF' : 'ON'}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="px-2 py-1 border border-[#8F5E46]/60 text-[#EFE6D5] cursor-pointer"
                  >
                    {isFullscreen ? '⤢' : '⛶'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleResume}
                className="w-full py-2.5 bg-[#F4A949] hover:bg-[#FFD5A5] text-[#142024] font-semibold uppercase tracking-[0.1em] text-xs cursor-pointer"
              >
                {locale.actions.resume}
              </button>
              <button
                type="button"
                data-testid="pause-den-btn"
                onClick={() => setDenOpen(true)}
                className="w-full py-2.5 bg-[#1D322D] hover:bg-[#27443D] text-[#8FE8CF] border border-[#4CE0B3]/60 uppercase tracking-[0.1em] text-xs font-mono cursor-pointer"
              >
                🐟 {hud.save.fishBank} · {campaignLocale.hud.denBtn}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-2.5 bg-[#1D2C31] hover:bg-[#26353B] text-[#EFE6D5] border border-[#8F5E46]/70 uppercase tracking-[0.1em] text-xs cursor-pointer"
              >
                {locale.actions.restart}
              </button>
              <button
                type="button"
                data-testid="pause-exit-menu"
                onClick={handleReturnTitle}
                className="w-full py-2.5 bg-transparent hover:bg-[#1D2C31] text-[#9EB4AD] border border-[#8F5E46]/40 uppercase tracking-[0.1em] text-xs cursor-pointer"
              >
                {locale.actions.exitMenu}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / GAME OVER OUTCOME MODAL */}
      {mode === 'gameover' && !denOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="outcome-modal"
          aria-label={
            hud.outcome === 'victory'
              ? campaignLocale.outcomes.victoryTitle
              : campaignLocale.outcomes.defeatTitle
          }
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#0D1619]/82 p-4 sm:p-6 overflow-y-auto"
        >
          <div className="luxury-panel-sheen modal-panel-enter relative w-full max-w-md bg-[#121C20] border border-[#F4A949] p-6 sm:p-7 space-y-5 shadow-2xl">
            {!isLowEco && <CornerFiligree />}
            <div className="space-y-1 border-b border-[#8F5E46]/45 pb-3">
              <p
                className={`text-[11px] uppercase tracking-[0.2em] font-mono ${
                  hud.outcome === 'victory' ? 'text-[#4CE0B3]' : 'text-[#FF6B4A]'
                }`}
              >
                {hud.outcome === 'victory'
                  ? campaignLocale.outcomes.victoryKicker
                  : campaignLocale.outcomes.defeatKicker}
                {' · '}
                {actLocale.title}
              </p>
              <h2
                className="text-2xl font-semibold text-[#F7EEDC]"
                style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif" }}
              >
                {hud.outcome === 'victory'
                  ? campaignLocale.outcomes.victoryTitle
                  : campaignLocale.outcomes.defeatTitle}
              </h2>
            </div>

            <p className="text-sm text-[#DCE5E2] leading-relaxed">
              {hud.outcome === 'victory'
                ? getNextActId(hud.actId)
                  ? campaignLocale.outcomes.victoryBody
                  : campaignLocale.outcomes.campaignDoneBody
                : campaignLocale.outcomes.defeatBody}
            </p>

            <div className="grid grid-cols-2 gap-2.5 text-center font-mono">
              <div className="bg-[#1A282D] border border-[#8F5E46]/40 py-2">
                <div className="text-[10px] uppercase text-[#9EB4AD]">
                  {campaignLocale.outcomes.scoreLabel}
                </div>
                <div className="text-lg text-[#F4A949]">{hud.runScore}</div>
              </div>
              <div className="bg-[#1A282D] border border-[#8F5E46]/40 py-2">
                <div className="text-[10px] uppercase text-[#9EB4AD]">
                  {campaignLocale.outcomes.bestLabel}
                </div>
                <div className="text-lg text-[#F7EEDC]">
                  {hud.save.bestActScores[hud.actId] ?? 0}
                </div>
              </div>
              {hud.outcome === 'defeat' && (
                <div className="col-span-2 bg-[#2B1817] border border-[#FF5733]/55 py-2">
                  <div className="text-[10px] uppercase text-[#FFB8A6]">
                    {campaignLocale.outcomes.bossHpLeft}
                  </div>
                  <div className="text-base text-[#FFD5A5]">
                    {hud.boss.hp} / {hud.boss.maxHp}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {hud.outcome === 'victory' && getNextActId(hud.actId) ? (
                <>
                  <button
                    type="button"
                    data-start="true"
                    data-testid="outcome-next-act"
                    onClick={handleAdvanceAct}
                    className="w-full py-2.5 bg-[#F4A949] hover:bg-[#FFD5A5] text-[#142024] font-semibold uppercase tracking-[0.08em] text-xs cursor-pointer"
                  >
                    {campaignLocale.outcomes.nextActBtn}
                  </button>
                  <button
                    type="button"
                    data-testid="outcome-continue"
                    onClick={handleContinueAfterVictory}
                    className="w-full py-2.5 bg-[#1D322D] hover:bg-[#27443D] text-[#8FE8CF] border border-[#4CE0B3]/60 uppercase tracking-[0.08em] text-xs cursor-pointer"
                  >
                    {locale.actions.continueWalk}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  data-testid="outcome-retry"
                  onClick={handleRestart}
                  className="w-full py-2.5 bg-[#F4A949] hover:bg-[#FFD5A5] text-[#142024] font-semibold uppercase tracking-[0.08em] text-xs cursor-pointer"
                >
                  {campaignLocale.outcomes.tryAgainBtn}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="outcome-den-btn"
                  onClick={() => setDenOpen(true)}
                  className="py-2 bg-[#1D2C31] hover:bg-[#26353B] text-[#F4A949] border border-[#8F5E46]/70 uppercase tracking-[0.08em] text-xs font-mono cursor-pointer"
                >
                  🐟 {campaignLocale.hud.denBtn}
                </button>
                <button
                  type="button"
                  data-testid="outcome-menu-btn"
                  onClick={handleReturnTitle}
                  className="py-2 bg-transparent hover:bg-[#1D2C31] text-[#9EB4AD] border border-[#8F5E46]/50 uppercase tracking-[0.08em] text-xs font-mono cursor-pointer"
                >
                  {locale.actions.exitMenu}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAT DEN MODAL (Skills, Collars & Trophies) */}
      {denOpen && (
        <CatDenModal
          save={hud.save}
          campaignLocale={campaignLocale}
          onBuySkill={handleBuySkill}
          onCollarAction={handleCollarAction}
          onClose={handleCloseDen}
        />
      )}
    </div>
  );
}
