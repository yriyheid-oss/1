import type { ActId, BossId, WeatherKind } from './acts';
import type { LanguageCode } from './i18n';
import type { CollarId, SkillId } from '../core/save';
import type { AchievementId } from '../systems/progression';
import type { QuestProgressItem } from '../systems/questSystem';
import type { SecretQuestId } from '../systems/secretQuests';

export interface CampaignLocale {
  acts: Record<ActId, { short: string; title: string; subtitle: string; goalHint: string }>;
  bosses: Record<BossId, { name: string; tacticHint: string }>;
  skills: Record<SkillId, { name: string; desc: string }>;
  collars: Record<CollarId, { name: string; desc: string }>;
  quests: Record<QuestProgressItem['id'], string>;
  secretQuests: Record<SecretQuestId, string>;
  achievements: Record<AchievementId, { name: string; desc: string }>;
  weather: Record<WeatherKind, string>;
  dayPhases: Record<'dawn' | 'noon' | 'dusk', string>;
  hud: {
    hpLabel: string;
    fishBankLabel: string;
    denBtn: string;
    questsTitle: string;
    secretQuestsTitle: string;
    raceTimerLabel: string;
    racePrompt: string;
    ferryLockedPrompt: string;
    ferryReadyPrompt: string;
    actSelectorLabel: string;
    lockedAct: string;
    weatherLabel: string;
    bossStaggered: string;
    bossTelegraph: string;
    bossDefeatedToast: string;
    salvatoreStartPrompt: string;
    salvatoreDeliverPrompt: string;
    mackerelPickupPrompt: string;
    carryingMackerelBanner: string;
    secretVaultBanner: string;
    hideHudBtn: string;
    showHudBtn: string;
    hudHiddenHint: string;
    toggleQuestsBtn: string;
    speedUnit: string;
    flowLabel: string;
    wallKickHint: string;
  };
  den: {
    title: string;
    fishBalance: string;
    tabSkills: string;
    tabCollars: string;
    tabAchievements: string;
    buyBtn: string;
    owned: string;
    equipBtn: string;
    equipped: string;
    closeBtn: string;
    needFish: string;
  };
  outcomes: {
    victoryKicker: string;
    victoryTitle: string;
    victoryBody: string;
    nextActBtn: string;
    campaignDoneBody: string;
    defeatKicker: string;
    defeatTitle: string;
    defeatBody: string;
    tryAgainBtn: string;
    scoreLabel: string;
    bestLabel: string;
    bossHpLeft: string;
  };
}

const EN_CAMPAIGN: CampaignLocale = {
  acts: {
    harbor: {
      short: 'Act I',
      title: 'Sunken Dawn Harbor',
      subtitle: 'Grand Venetian canals, rooftops & harbor tug',
      goalHint: 'Explore docks, defeat Bosun Bulldog & sail from South Pier',
    },
    cistern: {
      short: 'Act II',
      title: 'Vaulted Mill Cistern',
      subtitle: 'Subterranean glowing arches & bronze sluice locks',
      goalHint: 'Traverse echo bridges, defeat Captain Ironsnout & ride the lift',
    },
    spire: {
      short: 'Act III',
      title: 'Clockwork Belfry',
      subtitle: 'Twilight floating barges & Il Gufo d’Oro summit',
      goalHint: 'Climb the sky gears & shatter Il Gufo d’Oro at the summit',
    },
  },
  bosses: {
    bosun_bulldog: {
      name: 'Bosun Bulldog · Dock Enforcer',
      tacticHint: 'Stagger at Resonance Anchors [E] or Gale Claw [3], then strike while dizzy!',
    },
    captain_ironsnout: {
      name: 'Captain Ironsnout · Sluice Warden',
      tacticHint: 'Ring Sluice Anchors [E] or blast Gale Claw [3] to break his iron guard!',
    },
    gufo_oro: {
      name: "Il Gufo d'Oro · Clockwork Grand Owl",
      tacticHint: 'Blind with Dawn Flare [4] or strike Sky Anchors [E] to crack its core!',
    },
  },
  skills: {
    double_jump: { name: 'Air Whisker', desc: 'Gain a crisp mid-air Double Jump' },
    velvet_paws: { name: 'Velvet Paws', desc: '+18% Sprint speed & -20% Owl suspicion' },
    brass_harmonic: { name: 'Brass Harmonic', desc: '+28% Chime radius & -25% tool cooldowns' },
    tide_swimmer: { name: 'Tide Swimmer', desc: '+32% Swim speed & longer ledge snap' },
  },
  collars: {
    brass_bell: { name: 'Brass Bell Collar', desc: 'Classic artisan brass harbor chime' },
    sea_silk: { name: 'Sea-Silk Scarf', desc: '+16% Swim speed & +5% land agility' },
    shadow_velvet: { name: 'Shadow Velvet Collar', desc: '-32% Watch-Owl beam suspicion rate' },
    sun_medallion: { name: 'Sun-Chime Medallion', desc: '-22% Tool cooldowns & bonus Air Jump' },
  },
  quests: {
    feast: 'Steal Market Fish',
    letters: 'Recover Marco Letters',
    rival_race: 'Rival Cat Rooftop Race',
    boss_trial: 'Defeat Act Guardian',
  },
  secretQuests: {
    four_winds_resonance: 'Secret · Four-Winds Forks',
    silent_paw_order: 'Secret · Order of Silent Paw',
    clockwork_mackerel: 'Secret · Golden Mackerel',
  },
  achievements: {
    first_rub: { name: 'Warm Whiskers', desc: 'Befriend a harbor resident' },
    fish_thief: { name: 'Mackerel Phantom', desc: 'Steal 5 fish in a single run' },
    double_jumper: { name: 'Sky Pounce', desc: 'Unlock or perform an Air Double Jump' },
    dog_evader: { name: 'Alley Acrobat', desc: 'Evade or distract 3 dogs in one run' },
    owl_whisperer: { name: 'Phase Purrer', desc: 'Hide in owl beams with Phase Purr 3 times' },
    race_champion: { name: 'Rooftop Comet', desc: 'Win a Rival Cat ring race' },
    letter_collector: { name: 'Bell Historian', desc: 'Collect 5 letters in an Act' },
    harbor_clear: { name: 'Master of the Quays', desc: 'Defeat Bosun Bulldog in Act I' },
    cistern_clear: { name: 'Cistern Breaker', desc: 'Defeat Captain Ironsnout in Act II' },
    spire_clear: { name: 'Dawn Carillonneur', desc: "Shatter Il Gufo d'Oro in Act III" },
    secret_four_winds: { name: 'Four-Winds Resonance', desc: 'Awaken all 3 secret tuning forks with Bell [E]' },
    secret_silent_paw: { name: 'Ghost of Dawn', desc: 'Purr-sync beam, stalk gull & nap with 0 owl alarms' },
    secret_clockwork_fish: { name: 'Clockwork Angler', desc: "Return Salvatore's Clockwork Mackerel intact" },
  },
  weather: {
    clear: 'Clear Sky',
    mist: 'Lagoon Mist',
    rain: 'Harbor Rain (-Stealth)',
  },
  dayPhases: {
    dawn: 'Dawn',
    noon: 'Noon',
    dusk: 'Dusk',
  },
  hud: {
    hpLabel: 'Lives',
    fishBankLabel: 'Tokens',
    denBtn: 'Cat Den',
    questsTitle: 'Quests',
    secretQuestsTitle: 'Secrets',
    raceTimerLabel: 'Race',
    racePrompt: '[Q] Challenge Rival Cat (Ring Dash)',
    ferryLockedPrompt: 'Defeat the Act Guardian to unlock the Ferry!',
    ferryReadyPrompt: '[Q] Board Lantern Ferry to Next Act',
    actSelectorLabel: 'Campaign Act',
    lockedAct: 'Locked',
    weatherLabel: 'Sky',
    bossStaggered: 'STAGGERED — Strike with Bell [1], Claw [3], Flare [4] or stomp!',
    bossTelegraph: 'INCOMING STRIKE — Dodge out of the red zone!',
    bossDefeatedToast: 'Guardian defeated! Board the Ferry [Q] or continue exploring!',
    salvatoreStartPrompt: "[Q] Talk to Salvatore (Secret Quest: Clockwork Mackerel)",
    salvatoreDeliverPrompt: '[Q] Deliver Golden Clockwork Mackerel to Salvatore!',
    mackerelPickupPrompt: '[Q] Claim Golden Clockwork Mackerel',
    carryingMackerelBanner: 'Carrying Golden Mackerel · Deliver to Salvatore (South Bastion) without taking a hit!',
    secretVaultBanner: 'Echo Vault unlocked above the Dam Crest!',
    hideHudBtn: 'Photo [H]',
    showHudBtn: 'Show HUD [H]',
    hudHiddenHint: 'Photo Mode',
    toggleQuestsBtn: 'Tasks',
    speedUnit: 'm/s',
    flowLabel: 'Flow',
    wallKickHint: '[Space] Wall Rebound',
  },
  den: {
    title: 'Cat Den · Skills & Collars',
    fishBalance: 'Golden Fish',
    tabSkills: 'Skills',
    tabCollars: 'Collars',
    tabAchievements: 'Trophies',
    buyBtn: 'Unlock',
    owned: 'Unlocked',
    equipBtn: 'Equip',
    equipped: 'Equipped',
    closeBtn: 'Close',
    needFish: 'Need',
  },
  outcomes: {
    victoryKicker: 'Act Complete',
    victoryTitle: 'Harbor Way Cleared!',
    victoryBody: 'The guardian retreats and the lantern path opens ahead.',
    nextActBtn: 'Sail to Next Act',
    campaignDoneBody: "All three Venetian realms ring with Pip's dawn carillon!",
    defeatKicker: 'Out of Lives',
    defeatTitle: 'Retreated to the Roofs',
    defeatBody: 'Catch your breath, upgrade skills in the Cat Den, and strike again.',
    tryAgainBtn: 'Try Again',
    scoreLabel: 'Run Score',
    bestLabel: 'Best',
    bossHpLeft: 'Guardian HP Left',
  },
};

const RU_CAMPAIGN: CampaignLocale = {
  acts: {
    harbor: {
      short: 'Акт I',
      title: 'Затопленная Гавань',
      subtitle: 'Венецианские каналы, крыши и буксир боцмана',
      goalHint: 'Одолей Боцмана Бульдога на верфи и садись на паром на Южном причале',
    },
    cistern: {
      short: 'Акт II',
      title: 'Подземная Цистерна',
      subtitle: 'Светящиеся своды и бронзовые шлюзы под городом',
      goalHint: 'Пройди по эхо-мостам, одолей Капитана Железнорыла и поднимись на лифте',
    },
    spire: {
      short: 'Акт III',
      title: 'Часовая Колокольня',
      subtitle: 'Ночные баржи в облаках и великий Филин на шпиле',
      goalHint: 'Покори небесные шестерни и одолей Механического Филина на вершине',
    },
  },
  bosses: {
    bosun_bulldog: {
      name: 'Боцман Бульдог · Хозяин доков',
      tacticHint: 'Оглуши у Якоря Резонанса [E] или Когтем [3], затем бей по оглушённому!',
    },
    captain_ironsnout: {
      name: 'Капитан Железнорыл · Страж шлюзов',
      tacticHint: 'Пробей броню звоном у Якоря [E] или Когтем бури [3], затем атакуй!',
    },
    gufo_oro: {
      name: 'Великий Золотой Филин · Часовой шпиля',
      tacticHint: 'Ослепи Вспышкой Зари [4] или задень Небесные Якоря [E], чтобы расколоть броню!',
    },
  },
  skills: {
    double_jump: { name: 'Воздушный усач', desc: 'Открывает двойной прыжок в воздухе' },
    velvet_paws: { name: 'Бархатные лапки', desc: '+18% к скорости спринта и -20% к тревоге сов' },
    brass_harmonic: { name: 'Медный резонанс', desc: '+28% радиуса звона и -25% перезарядки' },
    tide_swimmer: { name: 'Морской кот', desc: '+32% скорости плавания и дальний зацеп за уступы' },
  },
  collars: {
    brass_bell: { name: 'Латунный ошейник', desc: 'Классический звонкий ошейник часовщика' },
    sea_silk: { name: 'Морской шёлк', desc: '+16% к скорости плавания и +5% к ловкости' },
    shadow_velvet: { name: 'Ночной бархат', desc: '-32% скорости обнаружения лучами сов' },
    sun_medallion: { name: 'Солнечный медальон', desc: '-22% перезарядки оружия и воздушный прыжок' },
  },
  quests: {
    feast: 'Украсть рыбу на рынке',
    letters: 'Собрать письма Марко',
    rival_race: 'Гонка с котом-соперником',
    boss_trial: 'Победить стража акта',
  },
  secretQuests: {
    four_winds_resonance: 'Секрет · Камертоны 4 ветров',
    silent_paw_order: 'Секрет · Орден Тихой Лапы',
    clockwork_mackerel: 'Секрет · Заводная макрель',
  },
  achievements: {
    first_rub: { name: 'Тёплые усы', desc: 'Подружиться с жителем гавани' },
    fish_thief: { name: 'Призрак скумбрии', desc: 'Украсть 5 рыб за один забег' },
    double_jumper: { name: 'Небесный прыжок', desc: 'Открыть или выполнить двойной прыжок' },
    dog_evader: { name: 'Акробат причалов', desc: 'Сбежать или отвлечь 3 псов за забег' },
    owl_whisperer: { name: 'Мастер мурлыканья', desc: 'Спрятаться под лучом совы 3 раза' },
    race_champion: { name: 'Комета крыш', desc: 'Победить в гонке через кольца с соперником' },
    letter_collector: { name: 'Летописец звона', desc: 'Собрать 5 писем в одном акте' },
    harbor_clear: { name: 'Хозяин причалов', desc: 'Победить Боцмана Бульдога в Акте I' },
    cistern_clear: { name: 'Взломщик шлюзов', desc: 'Победить Капитана Железнорыла в Акте II' },
    spire_clear: { name: 'Звонарь рассвета', desc: 'Победить Великого Филина в Акте III' },
    secret_four_winds: { name: 'Резонанс четырёх ветров', desc: 'Разбудить звоном [E] все 3 тайных камертона гавани' },
    secret_silent_paw: { name: 'Призрак рассвета', desc: 'Скрыться в луче [F], подкрасться к чайке и уснуть без тревоги сов' },
    secret_clockwork_fish: { name: 'Ювелир причала', desc: 'Донести заводную золотую макрель Сальваторе без ударов' },
  },
  weather: {
    clear: 'Ясное небо',
    mist: 'Туман лагуны',
    rain: 'Ливень (-Заметность)',
  },
  dayPhases: {
    dawn: 'Рассвет',
    noon: 'Полдень',
    dusk: 'Закат',
  },
  hud: {
    hpLabel: 'Жизни',
    fishBankLabel: 'Рыбки',
    denBtn: 'Берлога',
    questsTitle: 'Задания',
    secretQuestsTitle: 'Секреты',
    raceTimerLabel: 'Гонка',
    racePrompt: '[Q] Вызвать кота-соперника (гонка по кольцам)',
    ferryLockedPrompt: 'Победи стража акта, чтобы открыть паром!',
    ferryReadyPrompt: '[Q] Сесть на фонарный паром в следующий акт',
    actSelectorLabel: 'Акт кампании',
    lockedAct: 'Закрыт',
    weatherLabel: 'Небо',
    bossStaggered: 'ОГЛУШЁН — Бей Звоном [1], Когтем [3], Вспышкой [4] или сверху!',
    bossTelegraph: 'ОПАСНАЯ АТАКА — Уйди из красной зоны!',
    bossDefeatedToast: 'Страж повержен! Плыви на пароме [Q] или исследуй мир!',
    salvatoreStartPrompt: '[Q] Поговорить с Сальваторе (Секрет: Заводная макрель)',
    salvatoreDeliverPrompt: '[Q] Отдать Золотую макрель Сальваторе!',
    mackerelPickupPrompt: '[Q] Подобрать Золотую заводную макрель',
    carryingMackerelBanner: 'Золотая макрель в лапах · Отнеси Сальваторе на Южный бастион, избегая псов!',
    secretVaultBanner: 'Тайный Эхо-тайник открыт над гребнем плотины!',
    hideHudBtn: 'Фото [H]',
    showHudBtn: 'HUD [H]',
    hudHiddenHint: 'Фоторежим',
    toggleQuestsBtn: 'Список',
    speedUnit: 'м/с',
    flowLabel: 'Поток',
    wallKickHint: '[Space] Отскок от стены',
  },
  den: {
    title: 'Кошачья Берлога · Навыки и Ошейники',
    fishBalance: 'Золотые рыбки',
    tabSkills: 'Навыки',
    tabCollars: 'Ошейники',
    tabAchievements: 'Трофеи',
    buyBtn: 'Открыть',
    owned: 'Открыто',
    equipBtn: 'Надеть',
    equipped: 'Надето',
    closeBtn: 'Закрыть',
    needFish: 'Нужно',
  },
  outcomes: {
    victoryKicker: 'Акт пройден',
    victoryTitle: 'Путь через гавань открыт!',
    victoryBody: 'Страж отступил, а фонарный паром готов вести дальше.',
    nextActBtn: 'Отплыть в следующий акт',
    campaignDoneBody: 'Все три мира Венеции звенят в такт рассветным курантам Пипа!',
    defeatKicker: 'Жизни кончились',
    defeatTitle: 'Отступление на крыши',
    defeatBody: 'Переведи дух, улучши навыки в Берлоге и возвращайся в бой!',
    tryAgainBtn: 'Попробовать снова',
    scoreLabel: 'Очки',
    bestLabel: 'Рекорд',
    bossHpLeft: 'HP стража осталось',
  },
};

const UK_CAMPAIGN: CampaignLocale = {
  ...RU_CAMPAIGN,
  acts: {
    harbor: {
      short: 'Акт I',
      title: 'Затоплена Гавань',
      subtitle: 'Венеційські канали, дахи та буксир боцмана',
      goalHint: 'Здолай Боцмана Бульдога та вирушай на поромі з Південного причалу',
    },
    cistern: {
      short: 'Акт II',
      title: 'Підземна Цистерна',
      subtitle: 'Світлі склепіння та бронзові шлюзи під містом',
      goalHint: 'Пройди ехо-мости, здолай Капітана Залізнорила та піднімись ліфтом',
    },
    spire: {
      short: 'Акт III',
      title: 'Годинникова Дзвіниця',
      subtitle: 'Нічні баржі в хмарах і Великий Пугач на шпилі',
      goalHint: 'Підкори небесні шестерні та розбий Великого Пугача на вершині',
    },
  },
  dayPhases: {
    dawn: 'Світанок',
    noon: 'Полудень',
    dusk: 'Захід',
  },
  hud: {
    ...RU_CAMPAIGN.hud,
    hpLabel: 'Життя',
    fishBankLabel: 'Рибки',
    denBtn: 'Лігво',
    questsTitle: 'Завдання',
    raceTimerLabel: 'Гонка',
    actSelectorLabel: 'Акт кампанії',
    lockedAct: 'Закрито',
    hideHudBtn: 'Фото [H]',
    showHudBtn: 'HUD [H]',
    hudHiddenHint: 'Фоторежим',
    toggleQuestsBtn: 'Список',
    speedUnit: 'м/с',
    flowLabel: 'Потік',
    wallKickHint: '[Space] Відскік від стіни',
  },
  den: {
    ...RU_CAMPAIGN.den,
    title: 'Котяче Лігво · Навички й Нашийники',
    fishBalance: 'Золоті рибки',
    tabSkills: 'Навички',
    tabCollars: 'Нашийники',
    tabAchievements: 'Трофеї',
    buyBtn: 'Відкрити',
    owned: 'Відкрито',
    equipBtn: 'Одягти',
    equipped: 'Одягнено',
    closeBtn: 'Закрити',
  },
};

const QUICK_PATCHES: Partial<Record<LanguageCode, Partial<CampaignLocale>>> = {
  fr: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Vies', fishBankLabel: 'Jetons', denBtn: 'Repaire', questsTitle: 'Quêtes', raceTimerLabel: 'Course', actSelectorLabel: 'Acte', lockedAct: 'Verrouillé', weatherLabel: 'Ciel' },
    den: { ...EN_CAMPAIGN.den, title: 'Repaire du Chat', tabSkills: 'Talents', tabCollars: 'Colliers', tabAchievements: 'Succès', buyBtn: 'Débloquer', owned: 'Acquis', equipBtn: 'Équiper', equipped: 'Équipé', closeBtn: 'Fermer' },
  },
  de: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Leben', fishBankLabel: 'Marken', denBtn: 'Katzenbau', questsTitle: 'Aufträge', raceTimerLabel: 'Rennen', actSelectorLabel: 'Akt', lockedAct: 'Gesperrt', weatherLabel: 'Himmel' },
    den: { ...EN_CAMPAIGN.den, title: 'Katzenbau · Talente & Halsbänder', tabSkills: 'Talente', tabCollars: 'Halsbänder', tabAchievements: 'Erfolge', buyBtn: 'Freischalten', owned: 'Besitz', equipBtn: 'Anlegen', equipped: 'Angelegt', closeBtn: 'Schließen' },
  },
  es: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Vidas', fishBankLabel: 'Fichas', denBtn: 'Guarida', questsTitle: 'Misiones', raceTimerLabel: 'Carrera', actSelectorLabel: 'Acto', lockedAct: 'Bloqueado', weatherLabel: 'Cielo' },
    den: { ...EN_CAMPAIGN.den, title: 'Guarida Felina', tabSkills: 'Habilidades', tabCollars: 'Collares', tabAchievements: 'Logros', buyBtn: 'Desbloquear', owned: 'Obtenido', equipBtn: 'Equipar', equipped: 'Equipado', closeBtn: 'Cerrar' },
  },
  pt: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Vidas', fishBankLabel: 'Fichas', denBtn: 'Toca', questsTitle: 'Missões', raceTimerLabel: 'Corrida', actSelectorLabel: 'Ato', lockedAct: 'Bloqueado', weatherLabel: 'Céu' },
  },
  it: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Vite', fishBankLabel: 'Gettoni', denBtn: 'Tana', questsTitle: 'Missioni', raceTimerLabel: 'Corsa', actSelectorLabel: 'Atto', lockedAct: 'Bloccato', weatherLabel: 'Cielo' },
  },
  pl: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Życia', fishBankLabel: 'Rybki', denBtn: 'Kryjówka', questsTitle: 'Zadania', raceTimerLabel: 'Wyścig', actSelectorLabel: 'Akt', lockedAct: 'Zablok.', weatherLabel: 'Niebo' },
  },
  zh: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: '生命', fishBankLabel: '金鱼', denBtn: '猫窝升级', questsTitle: '任务', raceTimerLabel: '竞速', actSelectorLabel: '战役章节', lockedAct: '未解锁', weatherLabel: '天色' },
    den: { ...EN_CAMPAIGN.den, title: '猫窝 · 技能与项圈', tabSkills: '技能', tabCollars: '项圈', tabAchievements: '成就', buyBtn: '解锁', owned: '已拥有', equipBtn: '装备', equipped: '已装备', closeBtn: '关闭' },
  },
  ja: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'ライフ', fishBankLabel: '金魚', denBtn: '猫の巣', questsTitle: 'クエスト', raceTimerLabel: 'レース', actSelectorLabel: '幕選択', lockedAct: '未開放', weatherLabel: '空' },
    den: { ...EN_CAMPAIGN.den, title: '猫の巣・スキルと首輪', tabSkills: 'スキル', tabCollars: '首輪', tabAchievements: '実績', buyBtn: '解放', owned: '所持済', equipBtn: '装備', equipped: '装備中', closeBtn: '閉じる' },
  },
  ar: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'الأرواح', fishBankLabel: 'أسماك', denBtn: 'وكر القط', questsTitle: 'المهام', raceTimerLabel: 'سباق', actSelectorLabel: 'الفصل', lockedAct: 'مغلق', weatherLabel: 'السماء' },
  },
  fa: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'جان', fishBankLabel: 'ماهی', denBtn: 'لانه گربه', questsTitle: 'ماموریت‌ها', raceTimerLabel: 'مسابقه', actSelectorLabel: 'پرده', lockedAct: 'قفل', weatherLabel: 'آسمان' },
  },
  vi: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Máu', fishBankLabel: 'Cá vàng', denBtn: 'Hang Mèo', questsTitle: 'Nhiệm vụ', raceTimerLabel: 'Đua', actSelectorLabel: 'Chương', lockedAct: 'Khóa', weatherLabel: 'Trời' },
  },
  qya: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Cuilë', fishBankLabel: 'Lingwi', denBtn: 'Mar Míro', questsTitle: 'Martar', raceTimerLabel: 'Nóre', actSelectorLabel: 'Penda', lockedAct: 'Panta', weatherLabel: 'Menel' },
  },
  ork: {
    hud: { ...EN_CAMPAIGN.hud, hpLabel: 'Krumps', fishBankLabel: 'Teef', denBtn: 'Boss Den', questsTitle: 'Jobs', raceTimerLabel: 'Dash', actSelectorLabel: 'Waaagh Act', lockedAct: 'Locked', weatherLabel: 'Sky' },
  },
};

export function getCampaignLocale(lang: LanguageCode): CampaignLocale {
  if (lang === 'ru') return RU_CAMPAIGN;
  if (lang === 'uk') return UK_CAMPAIGN;
  const patch = QUICK_PATCHES[lang];
  if (!patch) return EN_CAMPAIGN;
  return {
    ...EN_CAMPAIGN,
    ...patch,
    hud: patch.hud ?? EN_CAMPAIGN.hud,
    den: patch.den ?? EN_CAMPAIGN.den,
  };
}
