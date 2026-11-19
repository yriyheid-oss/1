import type { CatState } from './parkour';
import type { BirdNpcState, PersonNpcState } from './npcSystem';
import type { BaitPailState, CozyNestState, HarborMechanicsEvents } from './harborMechanics';

export type StoryChapter = 1 | 2 | 3 | 4;

export interface FishSpot {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  remainingFish: number;
  maxFish: number;
}

export interface DialogueMessage {
  id?: string;
  speaker: string;
  text: string;
  timer: number;
}

export interface NearbyInteraction {
  kind: 'steal_fish' | 'rub_person' | 'tip_pail' | 'cozy_nest' | 'stalk_gull';
  targetId: string;
  promptLabel: string;
  x: number;
  z: number;
}

export interface StoryState {
  chapter: StoryChapter;
  rubCount: number;
  rubbedPeopleIds: string[];
  stolenFishCount: number;
  purrCount: number;
  escapedChaseCount: number;
  distractedDogsCount: number;
  wheelsReversedCount: number;
  echoLedgesCount: number;
  stealthAvoidedCount: number;
  lettersFound: number;
  nestsSleptCount: number;
  gullsStalkedCount: number;
  carryingFishTimer: number;
  purrAwardCooldown: number;
  dialogue: DialogueMessage | null;
  nearby: NearbyInteraction | null;
  epilogueReady: boolean;
}

export interface StoryStepEvents {
  chapterAdvancedTo: StoryChapter | null;
  stoleFishSpotId: string | null;
  rubbedPersonId: string | null;
  tippedPailId: string | null;
  sleptNestId: string | null;
  pouncedBirdId: string | null;
  purredNow: boolean;
}

const PERSON_DIALOGUES: Record<string, { speaker: string; lines: string[] }> = {
  fisher_quay_r: {
    speaker: 'Старый рыбак Лука',
    lines: [
      'Эй, рыжий колокольчик! Вот это ласка… Замёрз на крышах? Добудь свежей рыбы на пирсе, да берегись злых псов!',
      'Псы долго бегать не любят — брось им рыбу на [G] или опрокинь ведро с мальком [Q], и они отстанут!',
      'Колокольчик у тебя от часовщика Марко… Разбуди водяную мельницу звоном [E] и поднимись к Затопленным Курантам!',
    ],
  },
  fisher_quay_l: {
    speaker: 'Рыбачка Клара',
    lines: [
      'Ох, какой тёплый комок шерсти! Вода поднялась, куранты замолчали… Только твой звон ещё отзывается в башне.',
      'На западном причале полно скумбрии, а если проголодался по уюту — у дымоходов лежат тёплые подушки для сна!',
    ],
  },
  fisher_pier_e: {
    speaker: 'Матрос Пьетро',
    lines: [
      'Мурлычешь прямо как наш судовой кот! Псы здесь шумные, зато быстро выдыхаются — или запрыгивай на крыши!',
      'Слыхал? Часовые совы-фонари не замечают кота, если вовремя замурлыкать [F] в такт шестерням.',
    ],
  },
  vendor_market_e: {
    speaker: 'Торговец рыбой Джулио',
    lines: [
      'Хороший котик, ласковый… Эй, только на разделочные доски за моей спиной глаз не клади!',
      'Ох уж эти бродячие коты! Даже ведра с мальком переворачивают, лишь бы отвлечь сторожевых псов!',
    ],
  },
  stroller_quay_r: {
    speaker: 'Горожанка Беатриче',
    lines: [
      'Милый рыжий бродяга! С тех пор как куранты остановились, только твоё мурлыканье оживляет эту набережную.',
      'Вдоль крыш ветер носит письма мастера Марко — собери их все и позвони на верхней башне!',
    ],
  },
  stroller_south_w: {
    speaker: 'Мастер Марко',
    lines: [
      'Я узнаю этот латунный звон! Позвони [E] возле большой водяной мельницы за башней — шестерни пойдут вспять и поднимут тебя на плотину!',
    ],
  },
  shipwright_arsenal: {
    speaker: 'Корабел Антонио',
    lines: [
      'Добро пожаловать в Восточный Арсенал, рыжий! Здесь лодки чинят на рассвете — да берегись докового пса у причала.',
      'Вон там за кранами лежит забытое письмо мастера Марко. Попробуй допрыгнуть по крышам или переплыть канал!',
    ],
  },
  baker_lagoon: {
    speaker: 'Пекарь София',
    lines: [
      'Западная Лагуна пахнет хлебом и морским бризом! Отдохни на тёплой подушке на крыше [Q] — прибавит прыти!',
    ],
  },
  keeper_lighthouse: {
    speaker: 'Смотритель маяка Эмилио',
    lines: [
      'С Южного маяка видно всю затопленную Венецию! Коты редко заплывают так далеко — мурлыкай на здоровье, герой гавани!',
    ],
  },
  foundry_master: {
    speaker: 'Литейщик Бернардо',
    lines: [
      'Ты доплыл и до дальней Восточной Литейной! Здесь отливали колокола для самих Затопленных Курантов.',
      'На крыше кузницы лежит мягкий войлок — вздремни [Q], чтобы бегать ещё быстрее!',
    ],
  },
  cloister_weaver: {
    speaker: 'Ткачиха Орнелла',
    lines: [
      'Западный Клуатр базилики хранит тишину старых фресок… Но тёплому котику здесь всегда рады!',
    ],
  },
  bastion_angler: {
    speaker: 'Рыбак Сальваторе (Южный Бастион)',
    lines: [
      'Вот это путешественник! Дальше к югу лишь открытое море, а у нас на пирсе свежайший улов.',
    ],
  },
  viaduct_tinker: {
    speaker: 'Механик Лукреция (Северный Виадук)',
    lines: [
      'Северный шлюз питает главную плотину. Осторожнее у воды и загляни на крышу Большого Водовода!',
    ],
  },
};

export type TricksterRankKey =
  | 'guardian'
  | 'kitten'
  | 'thief'
  | 'shadow'
  | 'sweetheart'
  | 'bellmaster';

export function computeTricksterRankKey(state: StoryState): TricksterRankKey {
  const stealthScore = state.gullsStalkedCount * 2 + state.stealthAvoidedCount;
  const thiefScore = state.stolenFishCount * 2 + state.distractedDogsCount * 2;
  const bellScore = state.lettersFound * 2 + state.wheelsReversedCount * 3 + state.echoLedgesCount;
  const cozyScore = state.rubCount * 2 + state.nestsSleptCount * 2 + Math.floor(state.purrCount * 0.5);

  if (state.lettersFound >= 5 && state.chapter === 4) {
    return 'guardian';
  }
  const max = Math.max(stealthScore, thiefScore, bellScore, cozyScore);
  if (max <= 1) return 'kitten';
  if (thiefScore === max) return 'thief';
  if (stealthScore === max) return 'shadow';
  if (cozyScore === max) return 'sweetheart';
  return 'bellmaster';
}

const RU_RANK_FALLBACK: Record<TricksterRankKey, string> = {
  guardian: 'Хранитель Затопленных Курантов',
  kitten: 'Проснувшийся котёнок',
  thief: 'Гроза рыбных лавок',
  shadow: 'Тень в свете совы',
  sweetheart: 'Любимец набережной',
  bellmaster: 'Мастер медного звона',
};

export function computeTricksterRank(state: StoryState): string {
  return RU_RANK_FALLBACK[computeTricksterRankKey(state)];
}

export function createInitialStoryState(): StoryState {
  return {
    chapter: 1,
    rubCount: 0,
    rubbedPeopleIds: [],
    stolenFishCount: 0,
    purrCount: 0,
    escapedChaseCount: 0,
    distractedDogsCount: 0,
    wheelsReversedCount: 0,
    echoLedgesCount: 0,
    stealthAvoidedCount: 0,
    lettersFound: 0,
    nestsSleptCount: 0,
    gullsStalkedCount: 0,
    carryingFishTimer: 0,
    purrAwardCooldown: 0,
    dialogue: {
      id: 'intro_thought',
      speaker: 'Пип (мысли кота)',
      text: 'Рассвет над затопленной гаванью. Спустись к людям на набережную — потрись о ноги [Q] или помурлычь [F].',
      timer: 6.5,
    },
    nearby: null,
    epilogueReady: false,
  };
}

export function getStoryChapterInfo(state: StoryState): {
  chapterTitle: string;
  objectiveText: string;
} {
  switch (state.chapter) {
    case 1:
      return {
        chapterTitle: 'Глава I · Голос гавани',
        objectiveText: 'Спустись к набережной и потрись о ноги жителя [Q] (или помурлычь [F])',
      };
    case 2:
      return {
        chapterTitle: `Глава II · Рыбный воришка (${Math.min(3, state.stolenFishCount)}/3)`,
        objectiveText:
          'Укради 3 рыбы [Q], отвлекай псов приманкой [G]/ведром [Q] и прячься от прожекторов на [F]!',
      };
    case 3:
      return {
        chapterTitle: 'Глава III · Зов Затопленных Курантов',
        objectiveText:
          'Пробуди мельницу/мосты звоном [E], заберись на верхнюю башню или плотину и позвони [E]!',
      };
    case 4:
      return {
        chapterTitle: 'Глава IV · Рассветный перезвон',
        objectiveText:
          'Куранты вновь бьют! Собирай записки Марко, гоняй чаек [C]+[Q] и дремли у дымоходов.',
      };
  }
}

export function findNearbyInteraction(
  cat: CatState,
  fishSpots: FishSpot[],
  people: PersonNpcState[],
  baitPails: BaitPailState[] = [],
  nests: CozyNestState[] = [],
  birds: BirdNpcState[] = []
): NearbyInteraction | null {
  if (cat.swimming || cat.hopActive || cat.sleeping) return null;

  let bestFish: { spot: FishSpot; dist: number } | null = null;
  for (const spot of fishSpots) {
    if (spot.remainingFish <= 0) continue;
    const d = Math.hypot(cat.x - spot.x, cat.z - spot.z);
    const dy = Math.abs(cat.y - spot.y);
    if (d < 1.55 && dy < 1.15 && (!bestFish || d < bestFish.dist)) {
      bestFish = { spot, dist: d };
    }
  }

  let bestPerson: { person: PersonNpcState; dist: number } | null = null;
  for (const p of people) {
    const d = Math.hypot(cat.x - p.x, cat.z - p.z);
    const dy = Math.abs(cat.y - p.y);
    if (d < 1.5 && dy < 1.1 && (!bestPerson || d < bestPerson.dist)) {
      bestPerson = { person: p, dist: d };
    }
  }

  let bestPail: { pail: BaitPailState; dist: number } | null = null;
  for (const pail of baitPails) {
    if (pail.tipped) continue;
    const d = Math.hypot(cat.x - pail.x, cat.z - pail.z);
    const dy = Math.abs(cat.y - pail.y);
    if (d < 1.45 && dy < 1.1 && (!bestPail || d < bestPail.dist)) {
      bestPail = { pail, dist: d };
    }
  }

  let bestNest: { nest: CozyNestState; dist: number } | null = null;
  for (const nest of nests) {
    const d = Math.hypot(cat.x - nest.x, cat.z - nest.z);
    const dy = Math.abs(cat.y - nest.y);
    if (d < 1.35 && dy < 1.0 && (!bestNest || d < bestNest.dist)) {
      bestNest = { nest, dist: d };
    }
  }

  let bestBird: { bird: BirdNpcState; dist: number } | null = null;
  for (const b of birds) {
    if (b.mode !== 'perched') continue;
    const d = Math.hypot(cat.x - b.x, cat.z - b.z);
    const dy = Math.abs(cat.y - b.y);
    if (d < 1.55 && dy < 1.0 && (!bestBird || d < bestBird.dist)) {
      bestBird = { bird: b, dist: d };
    }
  }

  // Pick closest interactive entity cleanly
  const candidates: Array<{ dist: number; item: NearbyInteraction }> = [];
  if (bestFish) {
    candidates.push({
      dist: bestFish.dist,
      item: {
        kind: 'steal_fish',
        targetId: bestFish.spot.id,
        promptLabel: `[Q] Украсть рыбу (${bestFish.spot.remainingFish})`,
        x: bestFish.spot.x,
        z: bestFish.spot.z,
      },
    });
  }
  if (bestPerson) {
    candidates.push({
      dist: bestPerson.dist,
      item: {
        kind: 'rub_person',
        targetId: bestPerson.person.id,
        promptLabel: '[Q] Потереться о ноги и мурлыкать',
        x: bestPerson.person.x,
        z: bestPerson.person.z,
      },
    });
  }
  if (bestPail) {
    candidates.push({
      dist: bestPail.dist,
      item: {
        kind: 'tip_pail',
        targetId: bestPail.pail.id,
        promptLabel: '[Q] Опрокинуть ведро (отвлечь пса)',
        x: bestPail.pail.x,
        z: bestPail.pail.z,
      },
    });
  }
  if (bestNest) {
    candidates.push({
      dist: bestNest.dist,
      item: {
        kind: 'cozy_nest',
        targetId: bestNest.nest.id,
        promptLabel: '[Q] Свернуться клубком и вздремнуть',
        x: bestNest.nest.x,
        z: bestNest.nest.z,
      },
    });
  }
  if (bestBird) {
    candidates.push({
      dist: bestBird.dist + 0.08,
      item: {
        kind: 'stalk_gull',
        targetId: bestBird.bird.id,
        promptLabel: cat.crouching ? '[Q] Подкрасться и прыгнуть на птицу!' : '[Q] Спугнуть птицу',
        x: bestBird.bird.x,
        z: bestBird.bird.z,
      },
    });
  }

  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0]?.item ?? null;
}

export function stepStorySystem(
  state: StoryState,
  cat: CatState,
  fishSpots: FishSpot[],
  people: PersonNpcState[],
  options: {
    interactPressed: boolean;
    purrActive: boolean;
    chimedThisStep: boolean;
    chasingDogs: number;
    escapedChase: boolean;
    dogGaveUp?: boolean;
    distractedDog?: boolean;
    caughtByDog: boolean;
    onCheckpointPerch: boolean;
    baitPails?: BaitPailState[];
    nests?: CozyNestState[];
    birds?: BirdNpcState[];
    stalkedGullNow?: boolean;
    mechEvents?: HarborMechanicsEvents;
  },
  dt: number
): StoryStepEvents {
  const events: StoryStepEvents = {
    chapterAdvancedTo: null,
    stoleFishSpotId: null,
    rubbedPersonId: null,
    tippedPailId: null,
    sleptNestId: null,
    pouncedBirdId: null,
    purredNow: false,
  };

  if (state.dialogue) {
    state.dialogue.timer -= dt;
    if (state.dialogue.timer <= 0) {
      state.dialogue = null;
    }
  }

  if (state.carryingFishTimer > 0) {
    state.carryingFishTimer = Math.max(0, state.carryingFishTimer - dt);
    cat.carryingFish = state.carryingFishTimer > 0;
  } else {
    cat.carryingFish = false;
  }

  if (state.purrAwardCooldown > 0) {
    state.purrAwardCooldown = Math.max(0, state.purrAwardCooldown - dt);
  }

  if (options.purrActive && !cat.swimming) {
    cat.purrTimer = Math.max(cat.purrTimer, 0.95);
    if (state.purrAwardCooldown <= 0) {
      state.purrCount++;
      state.purrAwardCooldown = 1.4;
      events.purredNow = true;
    }
  }

  // Harbor mechanics feedback
  const me = options.mechEvents;
  if (me) {
    if (me.droppedDecoyBait) {
      state.carryingFishTimer = 0;
      cat.carryingFish = false;
      state.dialogue = {
        id: 'drop_bait',
        speaker: 'Пип',
        text: 'Шмяк! Пип бросил рыбу на доски — портовые псы сразу побегут лакомиться!',
        timer: 3.4,
      };
    }
    if (me.echoRevealedCount > 0) {
      state.echoLedgesCount += me.echoRevealedCount;
      if (!state.dialogue) {
        state.dialogue = {
          id: 'echo_bridge',
          speaker: 'Резонанс колокольчика',
          text: 'От звона в тумане проявились призрачные стеклянные мостки! Успей пробежать по ним.',
          timer: 4.0,
        };
      }
    }
    if (me.reversedWheelId) {
      state.wheelsReversedCount++;
      state.dialogue = {
        id: 'mill_reversed',
        speaker: 'Водяная мельница',
        text: 'Звон колокольчика развернул шестерни мельницы вспять! Запрыгивай на лопасти и поднимайся на плотину.',
        timer: 4.8,
      };
    }
    if (me.stealthAvoidedTick) {
      state.stealthAvoidedCount++;
    }
    if (me.owlAlarmFired) {
      state.dialogue = {
        id: 'owl_alarm',
        speaker: 'Фонарь-сова',
        text: 'Угу-угу! Прожектор совы заметил кота! Держи [F], чтобы мурлыкать в такт шестерням и прятаться.',
        timer: 4.2,
      };
    }
    if (me.collectedLetter) {
      state.lettersFound++;
      state.dialogue = {
        id: `letter_${state.lettersFound}`,
        speaker: `${me.collectedLetter.title} (${state.lettersFound}/5)`,
        text: me.collectedLetter.text,
        timer: 6.8,
      };
    }
  }

  if (options.distractedDog) {
    state.distractedDogsCount++;
    state.dialogue = {
      id: 'dog_distracted',
      speaker: 'Портовый пёс',
      text: 'Ням-ням! Пёс учуял дармовую рыбу, бросил погоню и увлёкся угощением!',
      timer: 3.6,
    };
  } else if (options.dogGaveUp) {
    state.escapedChaseCount++;
    if (!state.dialogue) {
      state.dialogue = {
        id: 'dog_tired',
        speaker: 'Портовый пёс',
        text: 'Уф-ф… Пёс выдохся гнаться за шустрым котом и побрёл обратно на пост!',
        timer: 3.6,
      };
    }
  } else if (options.escapedChase) {
    state.escapedChaseCount++;
    if (!state.dialogue) {
      state.dialogue = {
        id: 'dog_escaped',
        speaker: 'Пип',
        text: 'Пёс остался лаять внизу! От погони всегда спасает высокий прыжок или вода.',
        timer: 3.4,
      };
    }
  }

  if (options.stalkedGullNow) {
    state.gullsStalkedCount++;
    if (!state.dialogue) {
      state.dialogue = {
        id: 'gull_pounced',
        speaker: 'Чайка-воровка',
        text: 'Кья-кья! Перья во все стороны! Пип мастерски подкрался к зазевавшейся птице.',
        timer: 3.2,
      };
    }
  }

  if (options.caughtByDog) {
    if (state.carryingFishTimer > 0) {
      state.carryingFishTimer = 0;
      cat.carryingFish = false;
      state.dialogue = {
        id: 'caught_fish',
        speaker: 'Портовый пёс',
        text: 'Гав! Пёс напугал Пипа и выбил рыбку из зубов! Убегай на крыши [Space] или бросай приманку [G]!',
        timer: 4.0,
      };
    } else {
      state.dialogue = {
        id: 'caught_empty',
        speaker: 'Портовый пёс',
        text: 'Гав-гав! Убегай спринтом [Shift] или запрыгивай на крышу/лодку [Space] — пёс скоро выдохнется!',
        timer: 3.6,
      };
    }
  }

  state.nearby = findNearbyInteraction(
    cat,
    fishSpots,
    people,
    options.baitPails ?? [],
    options.nests ?? [],
    options.birds ?? []
  );

  if (options.interactPressed && state.nearby) {
    if (state.nearby.kind === 'steal_fish') {
      const spot = fishSpots.find((s) => s.id === state.nearby!.targetId);
      if (spot && spot.remainingFish > 0) {
        spot.remainingFish--;
        state.stolenFishCount++;
        state.carryingFishTimer = 8.0;
        cat.carryingFish = true;
        cat.yaw = Math.atan2(spot.x - cat.x, spot.z - cat.z);
        events.stoleFishSpotId = spot.id;

        if (state.stolenFishCount < 3) {
          state.dialogue = {
            id: 'stole_fish',
            speaker: 'Пип (с рыбой в зубах!)',
            text: `Ловко стащил ${spot.label}! Беги [Shift], прыгай наверх [Space] или брось рыбу псу [G]!`,
            timer: 4.2,
          };
        } else {
          state.dialogue = {
            id: 'stole_enough',
            speaker: 'Пип (сытый и довольный)',
            text: 'Отличный улов! Теперь разбуди мельницу звоном [E] и взбирайся на башню-фонарь к Затопленным Курантам [E]!',
            timer: 5.2,
          };
        }
      }
    } else if (state.nearby.kind === 'rub_person') {
      const person = people.find((p) => p.id === state.nearby!.targetId);
      if (person) {
        state.rubCount++;
        if (!state.rubbedPeopleIds.includes(person.id)) {
          state.rubbedPeopleIds.push(person.id);
        }
        cat.rubTimer = 1.65;
        cat.purrTimer = 1.9;
        cat.yaw = Math.atan2(person.x - cat.x, person.z - cat.z);
        state.purrCount++;
        state.purrAwardCooldown = 1.4;
        events.rubbedPersonId = person.id;

        const info = PERSON_DIALOGUES[person.id];
        const linePool = info?.lines ?? ['Тёплый какой котик… Мурлычь ещё!'];
        const lineIdx = Math.min(linePool.length - 1, state.chapter - 1);
        state.dialogue = {
          id: `npc_${person.id}_${lineIdx}`,
          speaker: info?.speaker ?? 'Житель гавани',
          text: linePool[lineIdx],
          timer: 5.8,
        };
      }
    } else if (state.nearby.kind === 'tip_pail') {
      events.tippedPailId = state.nearby.targetId;
      state.dialogue = {
        id: 'tip_pail',
        speaker: 'Ведро с мальком',
        text: 'Бряк! По деревянному настилу рассыпалась мелкая рыбка — отличный отвлекающий манёвр для псов!',
        timer: 3.6,
      };
    } else if (state.nearby.kind === 'cozy_nest') {
      events.sleptNestId = state.nearby.targetId;
      cat.sleeping = true;
      cat.warmthTimer = 25.0;
      cat.purrTimer = 2.0;
      state.nestsSleptCount++;
      state.dialogue = {
        id: 'cozy_sleep',
        speaker: 'Уютный сон',
        text: 'Пип свернулся тёплым клубком у дымохода… (+16% к скорости бега на 25 секунд! Пошевелись [WASD], чтобы проснуться)',
        timer: 4.5,
      };
    } else if (state.nearby.kind === 'stalk_gull') {
      events.pouncedBirdId = state.nearby.targetId;
      state.gullsStalkedCount++;
      state.dialogue = {
        id: 'gull_pounced',
        speaker: 'Пип-охотник',
        text: 'Прыг! Чайка с криком взмыла в рассветное небо, оставив облачко белых перьев!',
        timer: 3.2,
      };
    }
  }

  // Chapter progression checks
  if (state.chapter === 1 && (state.rubCount >= 1 || state.stolenFishCount >= 1)) {
    state.chapter = 2;
    events.chapterAdvancedTo = 2;
  }

  if (state.chapter === 2 && state.stolenFishCount >= 3) {
    state.chapter = 3;
    events.chapterAdvancedTo = 3;
  }

  if (state.chapter === 3 && options.chimedThisStep && options.onCheckpointPerch) {
    state.chapter = 4;
    state.epilogueReady = true;
    events.chapterAdvancedTo = 4;
    state.dialogue = {
      id: 'epilogue_chimes',
      speaker: 'Затопленные Куранты',
      text: 'Бронзовый перезвон разливается над водой — шестерни плотины оживают, а весь порт просыпается на рассвете!',
      timer: 7.5,
    };
  }

  return events;
}
