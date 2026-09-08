/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export type AcknowledgeLevelResultsData = AcknowledgeLevelResultsResponse;

export type AcknowledgeLevelResultsError = ValidationProblem | ProcessProblem;

export interface AcknowledgeLevelResultsParams {
  /**
   * Идентификатор уровня (50 уровней, BRD GAME-*), UUID v4.
   * @example "4f8fad5b-d9cb-469f-a165-808677289512"
   */
  levelId: Uuid;
}

/**
 * Подтверждение просмотра итогов уровня (API-017). pendingReward обязателен при nextAction=claim_reward,
 * включая Golden-награду; иначе опускается.
 * @example {"levelId":"4f8fad5b-d9cb-469f-a165-808677289512","resultsAcknowledgedAt":"2026-08-06T10:21:00.000Z","resultsState":"acknowledged","nextAction":"start_level"}
 */
export interface AcknowledgeLevelResultsResponse {
  /** Идентификатор уровня, итоги которого подтверждены. */
  levelId: Uuid;
  /** Единственное следующее действие после подтверждения итогов. */
  nextAction: NextAction;
  /**
   * Указатель на доступную награду. Обязателен, если nextAction=claim_reward, включая Golden-награду;
   * тогда rewards[] текущего клиентского состояния содержит ровно одну запись с тем же rewardId и
   * status=available. При любом ином nextAction опускается.
   */
  pendingReward?: PendingReward;
  /** Момент подтверждения итогов (write-once). */
  resultsAcknowledgedAt: DateTime;
  /** Подтверждённое состояние результатов после API-017. */
  resultsState: AcknowledgeLevelResultsResponseResultsStateEnum;
}

/** Подтверждённое состояние результатов после API-017. */
export enum AcknowledgeLevelResultsResponseResultsStateEnum {
  Acknowledged = "acknowledged",
}

/**
 * Публичная проекция DECORATION.
 * @example {"appearanceId":"6f8fad5b-d9cb-469f-a165-80867728951e","type":"character","rarity":"base","title":"Классический","description":"Базовый персонаж","imageUrl":"https://cdn.example.com/appearances/classic.png","isOwned":true,"isSelected":true,"unlockedAt":"2026-08-01T09:00:00.000Z"}
 */
export interface Appearance {
  /** Публичный идентификатор облика (маппинг: DECORATION.id). */
  appearanceId: Uuid;
  /** Пояснение (DECORATION.description); опускается, если отсутствует. */
  description?: string;
  /**
   * Ссылка на опубликованный ресурс (DECORATION.image_url).
   * @format uri
   */
  imageUrl: string;
  /** Получена ли декорация (запись CLIENT_DECORATION). Покупка за валюту отсутствует (BUS-006). */
  isOwned: boolean;
  /** Выбрана ли в своём типе (CLIENT.selected_character_decoration_id / selected_background_decoration_id). */
  isSelected: boolean;
  /** Редкость (DECORATION.rarity). */
  rarity: AppearanceRarityEnum;
  /** Название карточки (DECORATION.title). Поля name/slot не используются — канонические title и type. */
  title: string;
  /** Тип облика (DECORATION.type). */
  type: AppearanceTypeEnum;
  /** Время получения (CLIENT_DECORATION.unlocked_at); опускается, если не получена. */
  unlockedAt?: DateTime;
}

/**
 * Каталог внешних видов (API-011 / INF.11); каталог фиксированный и небольшой (14 обликов), пагинация не применяется.
 * @example {"items":[{"appearanceId":"6f8fad5b-d9cb-469f-a165-80867728951e","type":"character","rarity":"base","title":"Классический","description":"Базовый персонаж","imageUrl":"https://cdn.example.com/appearances/classic.png","isOwned":true,"isSelected":true,"unlockedAt":"2026-08-01T09:00:00.000Z"},{"appearanceId":"9f8fad5b-d9cb-469f-a165-808677289517","type":"background","rarity":"regular","title":"Рассвет","description":"Тёплый фон для игры","imageUrl":"https://cdn.example.com/appearances/dawn.png","isOwned":false,"isSelected":false}],"selectedCharacterId":"6f8fad5b-d9cb-469f-a165-80867728951e","selectedBackgroundId":"9f8fad5b-d9cb-469f-a165-808677289517"}
 */
export interface AppearanceCatalogResponse {
  /** Каталог обликов (14 записей, без пагинации); массив не null. */
  items: Appearance[];
  /** Выбранный фон (CLIENT.selected_background_decoration_id). */
  selectedBackgroundId: Uuid;
  /** Выбранный персонаж (CLIENT.selected_character_decoration_id). */
  selectedCharacterId: Uuid;
}

/** Редкость (DECORATION.rarity). */
export enum AppearanceRarityEnum {
  Base = "base",
  Regular = "regular",
  Special = "special",
}

/** Тип облика (DECORATION.type). */
export enum AppearanceTypeEnum {
  Character = "character",
  Background = "background",
}

/**
 * Игровые балансы клиента.
 * @example {"knowledgePoints":1200,"hintBalance":5}
 */
export interface Balance {
  /**
   * Баланс подсказок (CLIENT.hint_balance); целое неотрицательное число.
   * @format int32
   * @min 0
   */
  hintBalance: number;
  /**
   * Баллы знаний (CLIENT.knowledge_points); целое неотрицательное число. Денежных балансов нет (BUS-006).
   * @format int32
   * @min 0
   */
  knowledgePoints: number;
}

/**
 * Сетка уровня; безопасная проекция — без раскрытия нерешённых целей.
 * @example {"size":3,"cells":[{"row":0,"col":0,"letter":"К","state":"letter","belongsToFoundWord":false},{"row":0,"col":1,"letter":"О","state":"letter","belongsToFoundWord":false},{"row":0,"col":2,"letter":"Т","state":"letter","belongsToFoundWord":false},{"row":1,"col":0,"letter":"Р","state":"letter","belongsToFoundWord":false},{"row":1,"col":1,"letter":"А","state":"letter","belongsToFoundWord":false},{"row":1,"col":2,"letter":"К","state":"letter","belongsToFoundWord":false},{"row":2,"col":0,"letter":"М","state":"letter","belongsToFoundWord":false},{"row":2,"col":1,"letter":"А","state":"letter","belongsToFoundWord":false},{"row":2,"col":2,"letter":"К","state":"letter","belongsToFoundWord":false}]}
 */
export interface BoardView {
  /**
   * Клетки сетки (size^2 клеток); массив не null.
   * @maxItems 36
   * @minItems 9
   */
  cells: CellView[];
  /**
   * Размер сетки (3..6, GAME-001).
   * @format int32
   * @min 3
   * @max 6
   */
  size: number;
}

/**
 * Бонусное слово; cells не передаются — координаты бонусных слов клиенту не раскрываются.
 * @example {"word":"ТОК","foundAt":"2026-08-06T10:23:00.000Z"}
 */
export interface BonusWord {
  /** Время нахождения. */
  foundAt: DateTime;
  /** Бонусное слово. */
  word: string;
}

export type BootstrapData = ClientStateResponse;

/**
 * Производный прогресс кампании.
 * @example {"isCompleted":false,"isCompletionShown":false}
 */
export interface CampaignProgress {
  /**
   * Кампания завершена. Вычисляется из CLIENT_CHAPTER_PROGRESS / CLIENT_LEVEL_PROGRESS —
   * кампания не хранится отдельной сущностью (campaign_progress отсутствует в модели v0.4).
   */
  isCompleted: boolean;
  /** Экран завершения показан (CLIENT.campaign_completion_shown_at). */
  isCompletionShown: boolean;
}

/**
 * Координаты клетки сетки; обе координаты обязательны.
 * @example {"row":0,"col":1}
 */
export interface CellRef {
  /**
   * Колонка (0..size-1, сетка 3x3..6x6, GAME-001).
   * @format int32
   * @min 0
   * @max 5
   */
  col: number;
  /**
   * Строка (0..size-1, сетка 3x3..6x6, GAME-001).
   * @format int32
   * @min 0
   * @max 5
   */
  row: number;
}

/**
 * Клетка сетки. Оверлей подсказки строится клиентом из отдельного hintState.
 * @example {"row":0,"col":0,"letter":"К","state":"letter","belongsToFoundWord":false}
 */
export interface CellView {
  /** Принадлежит найденному слову. */
  belongsToFoundWord: boolean;
  /**
   * Колонка.
   * @format int32
   * @min 0
   * @max 5
   */
  col: number;
  /**
   * Буква клетки.
   * @minLength 1
   * @maxLength 1
   */
  letter: string;
  /**
   * Строка.
   * @format int32
   * @min 0
   * @max 5
   */
  row: number;
  /**
   * Серверный статус клетки: letter | found. selected и empty — клиентские локальные состояния
   * отрисовки, вне wire-контракта.
   */
  state: CellViewStateEnum;
}

/**
 * Серверный статус клетки: letter | found. selected и empty — клиентские локальные состояния
 * отрисовки, вне wire-контракта.
 */
export enum CellViewStateEnum {
  Letter = "letter",
  Found = "found",
}

/**
 * Прогресс главы в составе клиентского состояния.
 * @example {"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289540","number":1,"title":"Азбука финансов","imageUrl":"https://cdn.example.com/chapters/1.png","status":"in_progress","completedLevels":3,"totalLevels":7,"isNarrativeShown":true,"feedbackPromptShownAt":"2026-08-06T10:16:00.000Z"}
 */
export interface ChapterProgress {
  /** Идентификатор главы. */
  chapterId: Uuid;
  /**
   * Количество завершённых уровней главы.
   * @format int32
   * @min 0
   */
  completedLevels: number;
  /**
   * Момент показа промпта фидбека после главы (CLIENT_CHAPTER_PROGRESS.feedback_prompt_shown_at);
   * опускается, если промпт не показывался.
   */
  feedbackPromptShownAt?: DateTime;
  /**
   * Ссылка на иллюстрацию главы (CHAPTER.image_url).
   * @format uri
   */
  imageUrl: string;
  /** Показывался ли нарратив главы (CLIENT_CHAPTER_PROGRESS.narrative_shown_at). */
  isNarrativeShown: boolean;
  /**
   * Текст нарратива (CHAPTER.narrative_text); присутствует только для available/текущей главы,
   * у которой нарратив ещё не показан (narrative_shown_at IS NULL). Опускается в остальных случаях.
   */
  narrativeText?: string;
  /**
   * Глобальный порядковый номер главы (CHAPTER.number).
   * @format int32
   */
  number: number;
  /** Статус главы (переходы: locked -> available -> in_progress -> completed). */
  status: ChapterProgressStatusEnum;
  /** Название главы (CHAPTER.title). */
  title: string;
  /**
   * Всего уровней в главе.
   * @format int32
   * @min 0
   */
  totalLevels: number;
}

/** Статус главы (переходы: locked -> available -> in_progress -> completed). */
export enum ChapterProgressStatusEnum {
  Locked = "locked",
  Available = "available",
  InProgress = "in_progress",
  Completed = "completed",
}

/** @example {"rewardType":"decoration","selectedOptionId":"6f8fad5b-d9cb-469f-a165-80867728951e"} */
export interface ClaimDecorationRewardRequest {
  /**
   * Получить карточку декорации.
   * @pattern ^decoration$
   */
  rewardType: string;
  /** Идентификатор выбранной доступной декорации. */
  selectedOptionId: Uuid;
}

/** @example {"rewardType":"hint"} */
export interface ClaimHintRewardRequest {
  /**
   * Получить карточку подсказок; selectedOptionId не передаётся.
   * @pattern ^hint$
   */
  rewardType: string;
}

/**
 * Результат начисления награды.
 * @example {"balance":{"knowledgePoints":1200,"hintBalance":5},"decoration":{"appearanceId":"6f8fad5b-d9cb-469f-a165-80867728951e","type":"character"}}
 */
export interface ClaimResult {
  /** Актуальные балансы после начисления. */
  balance: Balance;
  /** Присутствует при варианте decoration; claim варианта decoration не изменяет hintBalance (подсказки начисляются только вариантом hint). */
  decoration?: {
    /** Идентификатор облика (DECORATION.id) — тот же id, что в каталоге Appearance. */
    appearanceId: Uuid;
    /** Тип облика. */
    type: ClaimResultTypeEnum;
  };
}

/** Тип облика. */
export enum ClaimResultTypeEnum {
  Character = "character",
  Background = "background",
}

export type ClaimRewardData = ClaimRewardResponse;

export type ClaimRewardError = ValidationProblem | ProcessProblem;

export interface ClaimRewardParams {
  /**
   * Идентификатор награды, UUID v4.
   * @example "6f8fad5b-d9cb-469f-a165-808677289514"
   */
  rewardId: Uuid;
}

/**
 * Запрос получения награды (API-009 / INF.09). Дискриминатор rewardType обязателен:
 * hint не содержит selectedOptionId; decoration требует selectedOptionId.
 * @example {"rewardType":"decoration","selectedOptionId":"6f8fad5b-d9cb-469f-a165-80867728951e"}
 */
export type ClaimRewardRequest =
  | ({
      rewardType: "hint";
    } & ClaimHintRewardRequest)
  | ({
      rewardType: "decoration";
    } & ClaimDecorationRewardRequest);

/**
 * Подтверждённый результат claim (API-009 / INF.09). После успеха сервер очищает pendingReward
 * только если его rewardId совпадает с rewardId этого ответа.
 * @example {"rewardId":"6f8fad5b-d9cb-469f-a165-808677289514","rewardType":"regular","state":"claimed","selectedOption":{"selectedOptionType":"hint"},"claimResult":{"balance":{"knowledgePoints":1200,"hintBalance":5},"decoration":{"appearanceId":"6f8fad5b-d9cb-469f-a165-80867728951e","type":"character"}},"nextAction":"start_level"}
 */
export interface ClaimRewardResponse {
  /** Результат начисления награды. */
  claimResult: ClaimResult;
  /**
   * Единственное следующее действие. Claim regular-награды может вернуть play для возобновления
   * уровня в прогрессе; claim Golden-награды сохраняет collecting regular-прогресс, который
   * возобновляется после снятия Golden-приоритета.
   */
  nextAction: NextAction;
  /** Идентификатор награды. */
  rewardId: Uuid;
  /** Нормализованный тип полученной награды. */
  rewardType: ClaimRewardResponseRewardTypeEnum;
  /** Нормализованная подтверждённая опция, выбранная для claim. */
  selectedOption: SelectedOption;
  /**
   * Состояние награды после claim.
   * @deprecated
   */
  state: ClaimRewardResponseStateEnum;
}

/** Нормализованный тип полученной награды. */
export enum ClaimRewardResponseRewardTypeEnum {
  Regular = "regular",
  ChapterGolden = "chapter_golden",
}

/**
 * Состояние награды после claim.
 * @deprecated
 */
export enum ClaimRewardResponseStateEnum {
  Claimed = "claimed",
}

/**
 * Полная проекция состояния клиента (API-001 / API-002).
 * ETag в теле отсутствует — передаётся только в заголовке ответа.
 * @example {"clientState":{"clientView":{"balance":{"knowledgePoints":1200,"hintBalance":5},"settings":{"musicEnabled":true,"soundEnabled":true,"tutorialCompleted":false},"selectedCharacterId":"6f8fad5b-d9cb-469f-a165-80867728951e","selectedBackgroundId":"9f8fad5b-d9cb-469f-a165-808677289517","campaignProgress":{"isCompleted":false,"isCompletionShown":false}},"chapters":[{"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289540","number":1,"title":"Азбука финансов","imageUrl":"https://cdn.example.com/chapters/1.png","status":"in_progress","completedLevels":3,"totalLevels":7,"isNarrativeShown":true,"feedbackPromptShownAt":"2026-08-06T10:16:00.000Z"},{"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289541","number":2,"title":"Личный бюджет","imageUrl":"https://cdn.example.com/chapters/2.png","status":"available","completedLevels":0,"totalLevels":7,"isNarrativeShown":false,"narrativeText":"Познакомьтесь с семейным бюджетом и научитесь планировать траты."},{"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289542","number":3,"title":"Банковские карты","imageUrl":"https://cdn.example.com/chapters/3.png","status":"locked","completedLevels":0,"totalLevels":7,"isNarrativeShown":false},{"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289543","number":4,"title":"Кредиты","imageUrl":"https://cdn.example.com/chapters/4.png","status":"locked","completedLevels":0,"totalLevels":7,"isNarrativeShown":false},{"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289544","number":5,"title":"Инвестиции","imageUrl":"https://cdn.example.com/chapters/5.png","status":"locked","completedLevels":0,"totalLevels":7,"isNarrativeShown":false},{"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289545","number":6,"title":"Страхование","imageUrl":"https://cdn.example.com/chapters/6.png","status":"locked","completedLevels":0,"totalLevels":7,"isNarrativeShown":false},{"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289546","number":7,"title":"Пенсии","imageUrl":"https://cdn.example.com/chapters/7.png","status":"locked","completedLevels":0,"totalLevels":7,"isNarrativeShown":false}],"levels":[{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289500","status":"completed","completedAt":"2026-08-06T09:00:00.000Z"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289501","status":"completed","completedAt":"2026-08-06T09:10:00.000Z"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289502","status":"completed","completedAt":"2026-08-06T09:20:00.000Z"},{"levelId":"4f8fad5b-d9cb-469f-a165-808677289512","status":"in_progress"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289503","status":"available"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289504","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289505","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289506","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289507","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289508","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289509","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728950a","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728950b","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728950c","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728950d","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728950e","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728950f","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289510","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289511","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289512","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289513","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289514","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289515","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289516","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289517","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289518","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289519","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728951a","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728951b","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728951c","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728951d","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728951e","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728951f","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289520","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289521","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289522","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289523","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289524","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289525","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289526","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289527","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289528","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289529","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728952a","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728952b","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728952c","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728952d","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728952e","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-80867728952f","status":"locked"},{"levelId":"c3f8ad5b-d9cb-469f-a165-808677289530","status":"locked"}],"inProgressLevel":{"levelId":"4f8fad5b-d9cb-469f-a165-808677289512","levelVersionId":"5f8fad5b-d9cb-469f-a165-808677289513","startedAt":"2026-08-06T10:15:00.000Z"},"rewards":[{"rewardId":"6f8fad5b-d9cb-469f-a165-808677289514","status":"available","availableAt":"2026-08-06T10:16:00.000Z","hintOptionAmount":1,"decorationOptionId":"6f8fad5b-d9cb-469f-a165-80867728951e"}],"nextAction":"claim_reward"}}
 */
export interface ClientStateResponse {
  clientState: {
    /**
     * Ровно 7 глав (7 глав, BRD CONT-*); массив не null, пустым не бывает.
     * @maxItems 7
     * @minItems 7
     */
    chapters: ChapterProgress[];
    /** Клиентская проекция. */
    clientView: ClientView;
    /** 0..1; опускается, если ни один уровень не в прогрессе. */
    inProgressLevel?: InProgressLevel;
    /**
     * Ровно 50 уровней (50 уровней, BRD GAME-*); массив не null, пустым не бывает.
     * @maxItems 50
     * @minItems 50
     */
    levels: LevelProgressSummary[];
    /**
     * Единственное следующее действие, доступное клиенту после ответа.
     * Приоритет FLOW-010: claim_reward -> open_feedback -> next_chapter / campaign_complete -> none;
     * open_feedback и next_chapter вычисляются только после claim награды. Полный состав значений — Q-003.
     */
    nextAction: NextAction;
    /**
     * Результаты завершённого уровня, ожидающие пользовательского действия; опускаются, если таких
     * результатов нет. Взаимоисключается с pendingReward.
     */
    pendingResults?: PendingResults;
    /**
     * Награда, доступная для API-009; опускается, если claim сейчас не ожидается.
     * Взаимоисключается с pendingResults. При наличии совпадающая запись rewards[] с тем же rewardId
     * имеет status=available; другие available-записи не являются заменой указателя.
     */
    pendingReward?: PendingReward;
    /**
     * Текущий collecting regular-конверт + все available незабранные награды; claimed-история
     * в состояние не включается. Массив не null; при отсутствии элементов — []. При наличии
     * pendingReward массив содержит ровно одну запись с тем же rewardId и status=available.
     */
    rewards: RewardSummary[];
  };
}

/** Клиентская проекция. */
export interface ClientView {
  /** Игровые балансы клиента. */
  balance: Balance;
  /** Производный прогресс кампании. */
  campaignProgress: CampaignProgress;
  /** Выбранная декорация фона (CLIENT.selected_background_decoration_id). */
  selectedBackgroundId: Uuid;
  /** Выбранная декорация персонажа (CLIENT.selected_character_decoration_id). */
  selectedCharacterId: Uuid;
  /** Настройки в составе состояния клиента. */
  settings: SettingsView;
}

export type ConfirmCampaignCompleteShownData =
  ConfirmCampaignCompleteShownResponse;

export type ConfirmCampaignCompleteShownError = ProcessProblem;

/**
 * Подтверждение показа завершения кампании (API-015 / INF.15).
 * @example {"isCompletionShown":true,"nextAction":"none"}
 */
export interface ConfirmCampaignCompleteShownResponse {
  /** Экран завершения подтверждён (CLIENT.campaign_completion_shown_at, write-once). */
  isCompletionShown: boolean;
  /** Единственное следующее действие (после Campaign Complete — none). */
  nextAction: NextAction;
}

export type ConfirmNarrativeShownData = ConfirmNarrativeShownResponse;

export type ConfirmNarrativeShownError = ValidationProblem | ProcessProblem;

export interface ConfirmNarrativeShownParams {
  /**
   * Идентификатор главы (7 глав, BRD CONT-*), UUID v4.
   * @example "2f8fad5b-d9cb-469f-a165-808677289510"
   */
  chapterId: Uuid;
}

/**
 * Подтверждение показа нарратива главы (API-003 / INF.03).
 * @example {"chapterId":"2f8fad5b-d9cb-469f-a165-808677289510","isNarrativeShown":true,"nextAction":"start_level"}
 */
export interface ConfirmNarrativeShownResponse {
  /** Идентификатор главы. */
  chapterId: Uuid;
  /** Нарратив подтверждён (write-once; повторный вызов — no-op 200 с текущим значением независимо от статуса главы). */
  isNarrativeShown: boolean;
  /** Единственное следующее действие (после нарратива — start_level; при уровне в прогрессе — play). */
  nextAction: NextAction;
}

/**
 * Локализованное персональное предложение учебного курса.
 * @example {"courseId":"8f8fad5b-d9cb-469f-a165-808677289599","locale":"ru-RU","badgeLabel":"Рекомендуем","title":"Основы личных финансов"}
 */
export interface CourseOffer {
  /**
   * Короткая метка рекомендации.
   * @minLength 1
   * @maxLength 40
   */
  badgeLabel: string;
  /** Идентификатор рекомендованного курса. */
  courseId: Uuid;
  /**
   * Локаль контента курса.
   * @minLength 2
   * @maxLength 35
   * @example "ru-RU"
   */
  locale: string;
  /**
   * Заголовок рекомендованного курса.
   * @minLength 1
   * @maxLength 160
   */
  title: string;
}

/**
 * Время по RFC 3339, UTC, точность миллисекунды, формат YYYY-MM-DDTHH:MM:SS.sssZ.
 * @format date-time
 * @example "2026-08-06T10:16:00.000Z"
 */
export type DateTime = string;

/**
 * Запись личного словаря; возвращаются только строки с word_type=bonus.
 * @example {"word":"ТОК","foundAt":"2026-08-06T10:18:00.000Z","levelId":"4f8fad5b-d9cb-469f-a165-808677289512"}
 */
export interface DictionaryEntry {
  /** Время нахождения (CLIENT_FOUND_WORD.found_at). */
  foundAt: DateTime;
  /**
   * Уровень, где найдено: резолвится CLIENT_FOUND_WORD.level_progress_id ->
   * CLIENT_LEVEL_PROGRESS.level_id -> LEVEL.id.
   */
  levelId: Uuid;
  /** Бонусное слово (CLIENT_FOUND_WORD.normalized_word); target-слова и определения не передаются (INF.16). */
  word: string;
}

/**
 * Страница личного словаря (API-016 / INF.16). Сортировка фиксированная:
 * foundAt desc, затем word asc (клиент не управляет). Полный bonus dictionary в WebView не передаётся.
 * @example {"dictionaryEntries":[{"word":"ТОК","foundAt":"2026-08-06T10:18:00.000Z","levelId":"4f8fad5b-d9cb-469f-a165-808677289512"}],"part":{"offset":0,"limit":50,"total":1}}
 */
export interface DictionaryPage {
  /**
   * Записи страницы (resource-named корневое поле, не общий items); массив не null.
   * Пустая страница — [] с total=0 (200).
   */
  dictionaryEntries: DictionaryEntry[];
  /** Корпоративный конверт пагинации part. */
  part: DictionaryPagePart;
}

/**
 * Корпоративный конверт пагинации part.
 * @example {"offset":0,"limit":50,"total":1}
 */
export interface DictionaryPagePart {
  /**
   * Лимит страницы.
   * @format int32
   * @min 1
   * @max 100
   */
  limit: number;
  /**
   * Смещение страницы.
   * @format int32
   * @min 0
   */
  offset: number;
  /**
   * Всего записей.
   * @format int32
   * @min 0
   */
  total: number;
}

export type DismissFeedbackData = DismissFeedbackResponse;

export type DismissFeedbackError = ValidationProblem | ProcessProblem;

export interface DismissFeedbackParams {
  /**
   * Идентификатор главы (7 глав, BRD CONT-*), UUID v4.
   * @example "2f8fad5b-d9cb-469f-a165-808677289510"
   */
  chapterId: Uuid;
}

/**
 * Подтверждение закрытия промпта фидбека (API-014 / INF.14).
 * @example {"chapterId":"2f8fad5b-d9cb-469f-a165-808677289510","feedbackPromptShownAt":"2026-08-06T10:21:00.000Z","nextAction":"next_chapter"}
 */
export interface DismissFeedbackResponse {
  /** Идентификатор главы. */
  chapterId: Uuid;
  /**
   * Момент отклонения промпта (CLIENT_CHAPTER_PROGRESS.feedback_prompt_shown_at, write-once);
   * повторный вызов — no-op 200 с текущим значением.
   */
  feedbackPromptShownAt: DateTime;
  /** Единственное следующее действие (после dismiss — next_chapter/campaign_complete/none). */
  nextAction: NextAction;
}

/**
 * Опциональный объект параметров отображения ошибки для клиента.
 * Применяется в корне ошибки (ProcessProblem, только при type != VALIDATION_ERROR) и в элементах
 * ValidationErrorItem; не является доменным UI-блоком отображения. Дополнительные поля допустимы
 * только при веских причинах; тексты согласуются с продуктом и копирайтером.
 * @example {"title":"Конфликт версии состояния","text":"Состояние клиента изменилось, повторите запрос с актуальным ETag"}
 */
export interface ErrorDisplayOptions {
  /** Детальное описание ошибки на русском языке. */
  text?: string;
  /** Краткое описание типа ошибки на русском языке. */
  title?: string;
}

/**
 * Сильный непрозрачный quoted-ETag текущего состояния клиента, формат "<opaque>"; формируется сервером
 * из вектора версий row_version строк модели, затронутых состоянием клиента. Слабые ETag (W/...)
 * не используются. Формат и содержимое токена — внутренняя деталь сервера (MUST NOT документировать).
 * @pattern ^"[^"]*"$
 * @example ""a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6""
 */
export type Etag = string;

/**
 * Найденное целевое слово. Для перекрывающихся путей целей актуальным считается состояние
 * записи с наибольшим foundSequence.
 * @example {"targetId":"7f8fad5b-d9cb-469f-a165-808677289598","word":"КОТ","definition":"Домашнее животное","cells":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}],"foundAt":"2026-08-06T10:17:00.000Z","foundSequence":1,"courseOffer":{"courseId":"8f8fad5b-d9cb-469f-a165-808677289599","locale":"ru-RU","badgeLabel":"Рекомендуем","title":"Основы личных финансов"}}
 */
export interface FoundTarget {
  /** Клетки решения. */
  cells: CellRef[];
  /** Персональное предложение курса по теме найденного слова; опускается, если предложение отсутствует. */
  courseOffer?: CourseOffer;
  /** Определение (раскрывается только после решения; обязательно — все цели имеют определение после решения). */
  definition: string;
  /** Время нахождения. */
  foundAt: DateTime;
  /**
   * Порядок нахождения цели на уровне, начиная с 1. Если пути целей перекрываются, клиент
   * применяет состояние цели с наибольшим foundSequence.
   * @format int32
   * @min 1
   */
  foundSequence: number;
  /** Стабильный идентификатор цели закреплённой версии уровня. */
  targetId: Uuid;
  /** Целевое слово (раскрывается только после решения). */
  word: string;
}

export type GetAppearanceCatalogData = AppearanceCatalogResponse;

export type GetAppearanceCatalogError = ProcessProblem;

export type GetCurrentStateData = ClientStateResponse;

export type GetCurrentStateError = ProcessProblem;

export type GetLevelResultsData = LevelResultsResponse;

export type GetLevelResultsError = ValidationProblem | ProcessProblem;

export interface GetLevelResultsParams {
  /**
   * Идентификатор уровня (50 уровней, BRD GAME-*), UUID v4.
   * @example "4f8fad5b-d9cb-469f-a165-808677289512"
   */
  levelId: Uuid;
}

export type GetPersonalDictionaryData = DictionaryPage;

export type GetPersonalDictionaryError = ValidationProblem | ProcessProblem;

export interface GetPersonalDictionaryParams {
  /**
   * Размер страницы (1..100, default 50). Применяется к API-016.
   * @format int32
   * @min 1
   * @max 100
   * @default 50
   * @example 50
   */
  limit?: number;
  /**
   * Смещение страницы (offset/limit пагинация, стандарт БКС). Применяется к API-016.
   * @format int32
   * @min 0
   * @default 0
   * @example 0
   */
  offset?: number;
}

/**
 * Активная серия подсказок уровня, вычисленная сервером из
 * CLIENT_LEVEL_PROGRESS.hint_target_word_id + hint_revealed_count — без раскрытия нерешённой цели
 * и canonical-пути. Опциональное поле ответов уровня (API-004/API-005): присутствует только при
 * активной серии с >= 1 раскрытой буквой.
 * @example {"targetId":"7f8fad5b-d9cb-469f-a165-808677289598","revealedCells":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}]}
 */
export interface HintState {
  /**
   * Клетки уже раскрытых букв текущей серии (префикс canonical-пути цели); массив обязателен,
   * minItems=1 — серия с нулём раскрытых букв в hintState не представима.
   * @minItems 1
   */
  revealedCells: CellRef[];
  /** Стабильный идентификатор текущей цели серии подсказок. */
  targetId: Uuid;
}

/**
 * Результат применения подсказки (API-007 / INF.07). Подсказка списывает 1 балл
 * из глобального CLIENT.hint_balance; раскрытие финальной буквы завершает целевое слово (+1 knowledgePoints).
 * Ответ самодостаточен — повторный refetch уровня (API-005) не требуется.
 * @example {"hintBalance":4,"knowledgePoints":1201,"revealedCells":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}],"hintTarget":{"targetId":"7f8fad5b-d9cb-469f-a165-808677289598","revealedCells":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}]},"completedTarget":{"targetId":"7f8fad5b-d9cb-469f-a165-808677289598","word":"КОТ","definition":"Домашнее животное","cells":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}],"foundAt":"2026-08-06T10:22:00.000Z","foundSequence":1},"foundTargets":[{"targetId":"7f8fad5b-d9cb-469f-a165-808677289598","word":"КОТ","definition":"Домашнее животное","cells":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}],"foundAt":"2026-08-06T10:22:00.000Z","foundSequence":1}],"targetsRemaining":2,"levelCompleted":false,"nextAction":"play"}
 */
export interface HintUseResponse {
  /** Целевое слово, завершённое этой подсказкой (финальная буква); опускается, если цель не завершена. */
  completedTarget?: FoundTarget;
  /** Все найденные целевые слова уровня после применения подсказки; пустой массив — []. */
  foundTargets: FoundTarget[];
  /**
   * Баланс подсказок после списания (CLIENT.hint_balance).
   * @format int32
   * @min 0
   */
  hintBalance: number;
  /**
   * Текущая цель серии подсказок: стабильный targetId и раскрытые клетки. Сохраняет
   * ту же информацию, что top-level revealedCells, для адресации конкретной цели.
   */
  hintTarget: HintState;
  /**
   * Баланс знаний (CLIENT.knowledge_points); завершение цели подсказкой добавляет +1.
   * @format int32
   * @min 0
   */
  knowledgePoints: number;
  /** Завершён ли уровень этой подсказкой (последняя цель). */
  levelCompleted: boolean;
  /** Единственное следующее действие (при доступной награде — claim_reward, FLOW-010). */
  nextAction: NextAction;
  /**
   * Раскрытые клетки текущей серии после применения подсказки (префикс canonical-пути; >= 1 клетка).
   * @minItems 1
   */
  revealedCells: CellRef[];
  /**
   * Награда, ставшая available этим ходом (regular — достигнут порог, golden — завершена глава);
   * опускается, если награда не открылась.
   */
  rewardOpened?: RewardSummary;
  /**
   * Совместимый текущий count bonus-слов collecting regular-конверта; опускается, если regular-конверта нет.
   * Порогом владеет rewardOpened.progress или состояние награды из API-002.
   * @format int32
   * @min 0
   */
  rewardProgress?: number;
  /**
   * Остаток целей.
   * @format int32
   * @min 0
   */
  targetsRemaining: number;
}

/**
 * Незавершённый уровень клиента; 0..1 в состоянии клиента.
 * @example {"levelId":"4f8fad5b-d9cb-469f-a165-808677289512","levelVersionId":"5f8fad5b-d9cb-469f-a165-808677289513","startedAt":"2026-08-06T10:15:00.000Z"}
 */
export interface InProgressLevel {
  /** Идентификатор уровня. */
  levelId: Uuid;
  /** Версия контента уровня (закреплённая опубликованная версия). */
  levelVersionId: Uuid;
  /** Время старта. */
  startedAt: DateTime;
}

/**
 * Игровое состояние уровня (API-004 / API-005).
 * @example {"levelId":"4f8fad5b-d9cb-469f-a165-808677289512","levelVersionId":"5f8fad5b-d9cb-469f-a165-808677289513","levelNumber":1,"microtheme":"Личные финансы","status":"in_progress","board":{"size":3,"cells":[{"row":0,"col":0,"letter":"К","state":"letter","belongsToFoundWord":false},{"row":0,"col":1,"letter":"О","state":"letter","belongsToFoundWord":false},{"row":0,"col":2,"letter":"Т","state":"letter","belongsToFoundWord":false},{"row":1,"col":0,"letter":"Р","state":"letter","belongsToFoundWord":false},{"row":1,"col":1,"letter":"А","state":"letter","belongsToFoundWord":false},{"row":1,"col":2,"letter":"К","state":"letter","belongsToFoundWord":false},{"row":2,"col":0,"letter":"М","state":"letter","belongsToFoundWord":false},{"row":2,"col":1,"letter":"А","state":"letter","belongsToFoundWord":false},{"row":2,"col":2,"letter":"К","state":"letter","belongsToFoundWord":false}]},"targetsRemaining":3,"foundTargets":[],"bonusWords":[],"startedAt":"2026-08-06T10:15:00.000Z","nextAction":"play"}
 */
export interface LevelPlayResponse {
  /** Сетка уровня; безопасная проекция — без раскрытия нерешённых целей. */
  board: BoardView;
  /** Бонусные слова (без клеток); пустой массив — []. */
  bonusWords: BonusWord[];
  /** Найденные целевые слова (после решения, с определениями); пустой массив — []. */
  foundTargets: FoundTarget[];
  /** Активная серия подсказок (>= 1 раскрытой буквы); опускается, если серии нет. */
  hintState?: HintState;
  /** Идентификатор уровня. */
  levelId: Uuid;
  /**
   * Порядковый номер уровня внутри главы (LEVEL.number_in_chapter).
   * @format int32
   */
  levelNumber: number;
  /** Версия контента уровня (закреплённая). */
  levelVersionId: Uuid;
  /** Микротема уровня (LEVEL_VERSION.content.microtheme). title не используется — у LEVEL нет поля title (модель v0.4). */
  microtheme: string;
  /** Единственное следующее действие (для уровня в прогрессе — play). */
  nextAction: NextAction;
  /** Время старта. */
  startedAt: DateTime;
  /** Ответ отдаётся только для уровня в прогрессе; иные статусы недостижимы (API-005 — 409 LEVEL_NOT_IN_PROGRESS). */
  status: LevelPlayResponseStatusEnum;
  /**
   * Осталось целей.
   * @format int32
   * @min 0
   */
  targetsRemaining: number;
}

/** Ответ отдаётся только для уровня в прогрессе; иные статусы недостижимы (API-005 — 409 LEVEL_NOT_IN_PROGRESS). */
export enum LevelPlayResponseStatusEnum {
  InProgress = "in_progress",
}

/**
 * Сводка прогресса уровня.
 * @example {"levelId":"c3f8ad5b-d9cb-469f-a165-808677289500","status":"completed","completedAt":"2026-08-06T09:00:00.000Z"}
 */
export interface LevelProgressSummary {
  /** Время завершения; опускается, если уровень не завершён. */
  completedAt?: DateTime;
  /** Идентификатор уровня. */
  levelId: Uuid;
  /** Статус уровня (переходы: locked -> available -> in_progress -> completed). */
  status: LevelProgressSummaryStatusEnum;
}

/** Статус уровня (переходы: locked -> available -> in_progress -> completed). */
export enum LevelProgressSummaryStatusEnum {
  Locked = "locked",
  Available = "available",
  InProgress = "in_progress",
  Completed = "completed",
}

/**
 * Итоги завершённого уровня (API-008 / INF.08). Завершённый уровень полностью
 * замощён целевыми словами (GAME-002), поэтому все клетки имеют state=found и belongsToFoundWord=true.
 * @example {"levelId":"4f8fad5b-d9cb-469f-a165-808677289512","status":"completed","resultsState":"pending_acknowledgement","completionKind":"level","board":{"size":3,"cells":[{"row":0,"col":0,"letter":"К","state":"found","belongsToFoundWord":true},{"row":0,"col":1,"letter":"О","state":"found","belongsToFoundWord":true},{"row":0,"col":2,"letter":"Т","state":"found","belongsToFoundWord":true},{"row":1,"col":0,"letter":"Р","state":"found","belongsToFoundWord":true},{"row":1,"col":1,"letter":"А","state":"found","belongsToFoundWord":true},{"row":1,"col":2,"letter":"К","state":"found","belongsToFoundWord":true},{"row":2,"col":0,"letter":"М","state":"found","belongsToFoundWord":true},{"row":2,"col":1,"letter":"А","state":"found","belongsToFoundWord":true},{"row":2,"col":2,"letter":"К","state":"found","belongsToFoundWord":true}]},"foundTargets":[{"targetId":"7f8fad5b-d9cb-469f-a165-808677289598","word":"КОТ","definition":"Домашнее животное","cells":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}],"foundAt":"2026-08-06T10:17:00.000Z","foundSequence":1},{"targetId":"7f8fad5b-d9cb-469f-a165-808677289597","word":"РАК","definition":"Речное животное с клешнями","cells":[{"row":1,"col":0},{"row":1,"col":1},{"row":1,"col":2}],"foundAt":"2026-08-06T10:18:00.000Z","foundSequence":2},{"targetId":"7f8fad5b-d9cb-469f-a165-808677289596","word":"МАК","definition":"Садовый цветок","cells":[{"row":2,"col":0},{"row":2,"col":1},{"row":2,"col":2}],"foundAt":"2026-08-06T10:19:00.000Z","foundSequence":3}],"bonusWords":[],"completedAt":"2026-08-06T10:20:00.000Z","summary":{"earnedKnowledgePoints":3,"knowledgePointsTotal":1200,"targets":{"foundCount":3,"totalCount":3},"bonuses":{"foundCount":0}},"chapter":{"chapterId":"d2f8ad5b-d9cb-469f-a165-808677289540","number":1,"title":"Азбука финансов","completedLevels":3,"totalLevels":7,"status":"in_progress"},"nextAction":"start_level"}
 */
export interface LevelResultsResponse {
  /** Read-only снапшот сетки уровня (safe view, без раскрытых слов-подсказок). */
  board: BoardView;
  /** Все бонусные слова (без клеток); пустой массив — []. */
  bonusWords: BonusWord[];
  /** Авторитетный прогресс главы после завершения уровня. */
  chapter: {
    /**
     * UUID v4, строка 36 символов с дефисами; регистр не значим (принимаются и upper, и lower case,
     * RFC 4122). Идентификаторы: главы, уровни, награды, внешние виды, версии контента и др.
     */
    chapterId: Uuid;
    /**
     * @format int32
     * @min 0
     */
    completedLevels: number;
    /**
     * @format int32
     * @min 1
     */
    number: number;
    status: LevelResultsResponseStatusEnum1;
    /** @minLength 1 */
    title: string;
    /**
     * @format int32
     * @min 1
     */
    totalLevels: number;
  };
  /** Время завершения. */
  completedAt: DateTime;
  /** Уровень завершил только себя или всю главу. */
  completionKind: LevelResultsResponseCompletionKindEnum;
  /** Все найденные целевые слова (с определениями); пустой массив — []. */
  foundTargets: FoundTarget[];
  /** Идентификатор уровня. */
  levelId: Uuid;
  /** Авторитетное следующее действие после просмотра результатов. */
  nextAction: NextAction;
  /**
   * Состояние пользовательского подтверждения экрана результатов. При pending_acknowledgement
   * для перехода к получению награды требуется API-017; acknowledged подтверждает завершение этого шага.
   */
  resultsState: LevelResultsResponseResultsStateEnum;
  /** Нормализованная награда, открытая результатом; опускается, если награда не открыта. */
  reward?: RewardSummary;
  /** Результаты отдаются только для завершённого уровня; иной статус недостижим (API-008 — 409 LEVEL_NOT_COMPLETED). */
  status: LevelResultsResponseStatusEnum;
  /** Итоги уровня; порог награды в этот конверт не переносится. */
  summary: {
    bonuses: {
      /**
       * @format int32
       * @min 0
       */
      foundCount: number;
    };
    /**
     * Баллы знаний, начисленные за завершённый уровень.
     * @format int32
     * @min 0
     */
    earnedKnowledgePoints: number;
    /**
     * Авторитетный итоговый баланс баллов знаний клиента.
     * @format int32
     * @min 0
     */
    knowledgePointsTotal: number;
    targets: {
      /**
       * @format int32
       * @min 0
       */
      foundCount: number;
      /**
       * @format int32
       * @min 0
       */
      totalCount: number;
    };
  };
}

/** Уровень завершил только себя или всю главу. */
export enum LevelResultsResponseCompletionKindEnum {
  Level = "level",
  Chapter = "chapter",
}

/**
 * Состояние пользовательского подтверждения экрана результатов. При pending_acknowledgement
 * для перехода к получению награды требуется API-017; acknowledged подтверждает завершение этого шага.
 */
export enum LevelResultsResponseResultsStateEnum {
  PendingAcknowledgement = "pending_acknowledgement",
  Acknowledged = "acknowledged",
}

/** Результаты отдаются только для завершённого уровня; иной статус недостижим (API-008 — 409 LEVEL_NOT_COMPLETED). */
export enum LevelResultsResponseStatusEnum {
  Completed = "completed",
}

export enum LevelResultsResponseStatusEnum1 {
  InProgress = "in_progress",
  Completed = "completed",
}

/**
 * Единственное следующее действие, доступное клиенту после ответа.
 * Приоритет FLOW-010: claim_reward -> open_feedback -> next_chapter / campaign_complete -> none;
 * open_feedback и next_chapter вычисляются только после claim награды. Полный состав значений — Q-003.
 */
export enum NextAction {
  StartLevel = "start_level",
  Play = "play",
  ClaimReward = "claim_reward",
  OpenFeedback = "open_feedback",
  NextChapter = "next_chapter",
  CampaignComplete = "campaign_complete",
  None = "none",
}

/**
 * Авторитетный указатель на ожидающие результаты в проекциях API-001/API-002.
 * pendingResults и pendingReward взаимоисключающие: при наличии одного указателя другой опускается.
 * Этот указатель не используется для повторения API-009 после STATE_VERSION_CONFLICT.
 */
export interface PendingResults {
  /** Идентификатор завершённого уровня, для которого открыт экран результатов. */
  levelId: Uuid;
  /** Идентификатор ожидающей claim награды; опускается, если награда за результат не открыта. */
  rewardId?: Uuid;
}

/**
 * Авторитетный указатель на награду, которую можно получить через API-009. pendingReward и
 * pendingResults взаимоисключающие. При наличии pendingReward rewards[] содержит ровно одну запись
 * с тем же rewardId и status=available; наличие другой available-награды не заменяет этот указатель.
 * @example {"rewardId":"6f8fad5b-d9cb-469f-a165-808677289514"}
 */
export interface PendingReward {
  /** Идентификатор единственной награды, ожидающей claim. */
  rewardId: Uuid;
}

/**
 * Общая обёртка ошибки 4xx/5xx по корпоративной схеме BCS.
 * Корневой text не используется (MUST NOT); поля RFC 9457 (title/status/detail/instance) и traceId
 * не используются. 4xx/5xx никогда не содержат бизнес-данных состояния в корне ответа.
 * @example {"type":"STATE_VERSION_CONFLICT","payload":{"currentEtag":"\"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6\""}}
 */
export interface ProcessProblem {
  /** Параметры отображения ошибки; возможны только при type != VALIDATION_ERROR. */
  displayOptions?: ErrorDisplayOptions;
  /** Путь к полю, к которому относится ошибка; возможен только при type != VALIDATION_ERROR. */
  field?: string;
  /**
   * Данные, документированные для конкретного type (например, payload.currentEtag для
   * STATE_VERSION_CONFLICT, payload.reason для 401/403, payload.retryable для 500);
   * при отсутствии опускается; не используется для VALIDATION_ERROR.
   */
  payload?: object;
  /**
   * Простой стабильный код типа проблемы (например UNAUTHORIZED,
   * GAME_UNAVAILABLE, CLIENT_NOT_FOUND, STATE_VERSION_CONFLICT, INTERNAL_ERROR); URI-значения
   * не используются (MUST NOT).
   */
  type: string;
}

export type ResumeLevelData = LevelPlayResponse;

export type ResumeLevelError = ValidationProblem | ProcessProblem;

export interface ResumeLevelParams {
  /**
   * Идентификатор уровня (50 уровней, BRD GAME-*), UUID v4.
   * @example "4f8fad5b-d9cb-469f-a165-808677289512"
   */
  levelId: Uuid;
}

/** Нормализованная доступная опция награды. */
export interface RewardOption {
  /**
   * Количество начисляемых подсказок для optionType=hint; иначе опускается.
   * @format int32
   * @min 0
   */
  amount?: number;
  /** Тип внешнего вида для optionType=decoration; иначе опускается. */
  decorationType?: RewardOptionDecorationTypeEnum;
  /** URL изображения карточки; опускается при отсутствии изображения. */
  imageUrl?: string;
  /** Идентификатор карточки. Для decoration обязателен runtime-контрактом; для hint опускается. */
  optionId?: Uuid;
  /** Тип доступной карточки награды. */
  optionType: RewardOptionOptionTypeEnum;
  /**
   * Отображаемое название карточки.
   * @minLength 1
   */
  title: string;
}

/** Тип внешнего вида для optionType=decoration; иначе опускается. */
export enum RewardOptionDecorationTypeEnum {
  Character = "character",
  Background = "background",
}

/** Тип доступной карточки награды. */
export enum RewardOptionOptionTypeEnum {
  Hint = "hint",
  Decoration = "decoration",
}

/**
 * Каноническое отображение CLIENT_REWARD. Нормализованные rewardType/progress/options являются
 * контрактом P4. progress — единственный источник порога regular-награды; скалярный rewardProgress
 * в ответах игрового действия сохраняется только как совместимый текущий count. Доступная
 * chapter_golden-награда имеет приоритет, не сбрасывая collecting regular-прогресс, который
 * возобновляется после Golden claim. status=available требует непустой нормализованный options; устаревшие плоские поля
 * сохраняются только для обратной совместимости и не удовлетворяют этому требованию.
 * Optional-поля опускаются при отсутствии значения (null не используется).
 * @example {"rewardId":"6f8fad5b-d9cb-469f-a165-808677289514","rewardType":"regular","status":"available","progress":{"current":3,"threshold":3},"options":[{"optionType":"hint","amount":1,"title":"Подсказка"},{"optionType":"decoration","optionId":"6f8fad5b-d9cb-469f-a165-80867728951e","title":"Классический аналитик","decorationType":"character"}]}
 */
export type RewardSummary = (
  | {
      /** @minItems 1 */
      options: RewardOption[];
      /** Доступная награда; нормализованный options обязателен и непустой. */
      status: RewardSummaryStatusEnum;
    }
  | {
      /** Награда не доступна для claim; options может опускаться. */
      status: RewardSummaryStatusEnum1;
    }
) & {
  /**
   * Когда награда стала доступна (CLIENT_REWARD.available_at); опускается для collecting.
   * @deprecated
   */
  availableAt?: DateTime;
  /**
   * Когда награда получена (CLIENT_REWARD.claimed_at); опускается до claim.
   * @deprecated
   */
  claimedAt?: DateTime;
  /**
   * Карточка декорации, зафиксированная при переходе в available (CLIENT_REWARD.decoration_option_id);
   * опускается, если косметическая карточка отсутствует. Значение отображается на DECORATION.id —
   * тот же id, что appearanceId в каталоге Appearance. Legacy response-поле не заменяет
   * нормализованный options и не используется для выбора в API-009.
   * @deprecated
   */
  decorationOptionId?: Uuid;
  /**
   * Карточка подсказок, зафиксированная при переходе в available (CLIENT_REWARD.hint_option_amount);
   * опускается для collecting. Legacy response-поле сохраняется для обратной совместимости, но не
   * заменяет нормализованный options и не используется для выбора в API-009.
   * @deprecated
   * @format int32
   * @min 0
   */
  hintOptionAmount?: number;
  /**
   * Нормализованные доступные карточки. Для status=available обязательны и содержат хотя бы одну
   * карточку; для collecting/claimed могут опускаться.
   * @minItems 1
   */
  options?: RewardOption[];
  /** Нормализованный прогресс получения награды; опускается, если неприменим. */
  progress?: {
    /**
     * @format int32
     * @min 0
     */
    current: number;
    /**
     * @format int32
     * @min 0
     */
    threshold: number;
  };
  /** Идентификатор награды (CLIENT_REWARD.id). */
  rewardId: Uuid;
  /** Нормализованный тип награды. */
  rewardType: RewardSummaryRewardTypeEnum;
  /**
   * Выбор клиента (CLIENT_REWARD.selected_option_type); опускается до claim.
   * Legacy response-поле сохраняется для обратной совместимости; оно не является claim-опцией и
   * не заменяет нормализованный options.
   * @deprecated
   */
  selectedOptionType?: RewardSummarySelectedOptionTypeEnum;
};

/** Нормализованный тип награды. */
export enum RewardSummaryRewardTypeEnum {
  Regular = "regular",
  ChapterGolden = "chapter_golden",
}

/**
 * Выбор клиента (CLIENT_REWARD.selected_option_type); опускается до claim.
 * Legacy response-поле сохраняется для обратной совместимости; оно не является claim-опцией и
 * не заменяет нормализованный options.
 * @deprecated
 */
export enum RewardSummarySelectedOptionTypeEnum {
  Hint = "hint",
  Decoration = "decoration",
}

/** Доступная награда; нормализованный options обязателен и непустой. */
export enum RewardSummaryStatusEnum {
  Available = "available",
}

/** Награда не доступна для claim; options может опускаться. */
export enum RewardSummaryStatusEnum1 {
  Collecting = "collecting",
  Claimed = "claimed",
}

/**
 * Запрос отправки маршрута (API-006 / INF.06).
 * @example {"route":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}]}
 */
export interface RouteSubmissionRequest {
  /**
   * Последовательность клеток маршрута (2..36 клеток). Только ортогональное соседство —
   * горизонталь/вертикаль; диагональ запрещена (GAME-003); повтор клеток запрещён (GAME-004).
   * @maxItems 36
   * @minItems 2
   * @uniqueItems true
   */
  route: CellRef[];
}

/**
 * Результат проверки маршрута (API-006 / INF.06). Варианты oneOf:
 * (1) found + isTarget=true; (2) found + isTarget=false (bonus); (3) invalid | repeated —
 * без полей слова/балансов. Полный словарь клиенту никогда не раскрывается (INF.21).
 * @example {"result":"found","word":"КОТ","isTarget":true,"targetsRemaining":2,"levelCompleted":false,"newFoundTargets":[{"targetId":"7f8fad5b-d9cb-469f-a165-808677289598","word":"КОТ","definition":"Домашнее животное","cells":[{"row":0,"col":0},{"row":0,"col":1},{"row":0,"col":2}],"foundAt":"2026-08-06T10:17:00.000Z","foundSequence":1}],"newBonusWords":[],"knowledgePoints":1201,"hintBalance":5,"nextAction":"play"}
 */
export type RouteSubmissionResponse = (
  | {
      isTarget: RouteSubmissionResponseIsTargetEnum;
      result: RouteSubmissionResponseResultEnum;
    }
  | {
      isTarget: RouteSubmissionResponseIsTargetEnum1;
      result: RouteSubmissionResponseResultEnum1;
      /**
       * Каноническое отображение CLIENT_REWARD. Нормализованные rewardType/progress/options являются
       * контрактом P4. progress — единственный источник порога regular-награды; скалярный rewardProgress
       * в ответах игрового действия сохраняется только как совместимый текущий count. Доступная
       * chapter_golden-награда имеет приоритет, не сбрасывая collecting regular-прогресс, который
       * возобновляется после Golden claim. status=available требует непустой нормализованный options; устаревшие плоские поля
       * сохраняются только для обратной совместимости и не удовлетворяют этому требованию.
       * Optional-поля опускаются при отсутствии значения (null не используется).
       */
      rewardOpened?: RewardSummary;
    }
  | (any & {
      result: RouteSubmissionResponseResultEnum2;
    })
) & {
  /**
   * Текущий баланс подсказок (CLIENT.hint_balance); присутствует для found.
   * @format int32
   * @min 0
   */
  hintBalance?: number;
  /** Целевое ли слово (для found; для bonus — false). */
  isTarget?: boolean;
  /**
   * Текущий баланс знаний (CLIENT.knowledge_points); присутствует для found.
   * @format int32
   * @min 0
   */
  knowledgePoints?: number;
  /** Завершён ли уровень этим ходом (финальный маршрут фиксирует write-once completed_at). */
  levelCompleted: boolean;
  /** Новые бонусные слова (без клеток); пустой массив — []. */
  newBonusWords: BonusWord[];
  /** Новые найденные целевые слова (после решения, с определениями); пустой массив — []. */
  newFoundTargets: FoundTarget[];
  /** Единственное следующее действие (при завершении уровня/главы — claim_reward приоритетно, FLOW-010). */
  nextAction: NextAction;
  /**
   * Дополнительный код invalid-результата: маршрут соответствует целевому слову, но не его
   * canonical-пути. Опускается для остальных invalid/repeated/found результатов.
   */
  outcomeCode?: RouteSubmissionResponseOutcomeCodeEnum;
  /**
   * Результат проверки маршрута: found (target или bonus), invalid (слова нет в закреплённом словаре /
   * маршрут не соответствует доске), repeated (слово уже найдено на уровне, без повторного начисления).
   */
  result: RouteSubmissionResponseResultEnum3;
  /**
   * Нормализованная available regular-награда, открытая найденным bonus-словом; опускается,
   * если порог не достигнут. При наличии nextAction=claim_reward, а в актуальном API-002
   * pendingReward.rewardId совпадает с rewardOpened.rewardId.
   */
  rewardOpened?: RewardSummary;
  /**
   * Число bonus-слов, внесённых в текущий collecting regular-конверт (count CLIENT_FOUND_WORD
   * по client_reward_id); присутствует для found со isTarget=false. Это совместимый текущий count;
   * порогом владеет rewardOpened.progress или состояние награды из API-002.
   * @format int32
   * @min 0
   */
  rewardProgress?: number;
  /**
   * Остаток целей (для found).
   * @format int32
   * @min 0
   */
  targetsRemaining?: number;
  /** Найденное слово (для found). */
  word?: string;
};

export enum RouteSubmissionResponseIsTargetEnum {
  True = true,
}

export enum RouteSubmissionResponseIsTargetEnum1 {
  False = false,
}

/**
 * Дополнительный код invalid-результата: маршрут соответствует целевому слову, но не его
 * canonical-пути. Опускается для остальных invalid/repeated/found результатов.
 */
export enum RouteSubmissionResponseOutcomeCodeEnum {
  TARGET_NONCANONICAL_PATH = "TARGET_NONCANONICAL_PATH",
}

export enum RouteSubmissionResponseResultEnum {
  Found = "found",
}

export enum RouteSubmissionResponseResultEnum1 {
  Found = "found",
}

export enum RouteSubmissionResponseResultEnum2 {
  Invalid = "invalid",
  Repeated = "repeated",
}

/**
 * Результат проверки маршрута: found (target или bonus), invalid (слова нет в закреплённом словаре /
 * маршрут не соответствует доске), repeated (слово уже найдено на уровне, без повторного начисления).
 */
export enum RouteSubmissionResponseResultEnum3 {
  Found = "found",
  Invalid = "invalid",
  Repeated = "repeated",
}

export type SelectAppearanceData = SelectAppearanceResponse;

export type SelectAppearanceError = ValidationProblem | ProcessProblem;

export interface SelectAppearanceParams {
  /**
   * Идентификатор внешнего вида (публичный id облика, DECORATION.id), UUID v4.
   * @example "6f8fad5b-d9cb-469f-a165-80867728951e"
   */
  appearanceId: Uuid;
}

/**
 * Подтверждённый выбор облика (API-012 / INF.12). Поля selectedOptionType/selectedOptionId в ответе не используются (дублирование appearanceId/type).
 * @example {"appearanceId":"6f8fad5b-d9cb-469f-a165-80867728951e","type":"character","selectedCharacterId":"6f8fad5b-d9cb-469f-a165-80867728951e","selectedBackgroundId":"9f8fad5b-d9cb-469f-a165-808677289517"}
 */
export interface SelectAppearanceResponse {
  /** Выбранный облик (DECORATION.id). */
  appearanceId: Uuid;
  /** Актуальный выбранный фон. */
  selectedBackgroundId: Uuid;
  /** Актуальный выбранный персонаж. */
  selectedCharacterId: Uuid;
  /** Тип выбранного облика (DECORATION.type). */
  type: SelectAppearanceResponseTypeEnum;
}

/** Тип выбранного облика (DECORATION.type). */
export enum SelectAppearanceResponseTypeEnum {
  Character = "character",
  Background = "background",
}

/**
 * Выбранная опция награды.
 * @example {"selectedOptionType":"decoration","selectedOptionId":"6f8fad5b-d9cb-469f-a165-80867728951e"}
 */
export interface SelectedOption {
  /**
   * Идентификатор опции: для decoration — обязателен (значение CLIENT_REWARD.decoration_option_id);
   * для hint — опускается.
   */
  selectedOptionId?: Uuid;
  /**
   * Выбор клиента: hint | decoration; обязателен всегда. Если доступна только карточка подсказок —
   * значение обязано быть hint; отсутствие значения -> 409 REWARD_OPTION_REQUIRED.
   */
  selectedOptionType: SelectedOptionSelectedOptionTypeEnum;
}

/**
 * Выбор клиента: hint | decoration; обязателен всегда. Если доступна только карточка подсказок —
 * значение обязано быть hint; отсутствие значения -> 409 REWARD_OPTION_REQUIRED.
 */
export enum SelectedOptionSelectedOptionTypeEnum {
  Hint = "hint",
  Decoration = "decoration",
}

/**
 * Серверно подтверждённое состояние настроек (API-010 / INF.10).
 * @example {"musicEnabled":false,"soundEnabled":true,"tutorialCompleted":true}
 */
export interface SettingsResponse {
  /** Музыка. */
  musicEnabled: boolean;
  /** Звук. */
  soundEnabled: boolean;
  /**
   * Пройден ли туториал; обязательное read-only поле из CLIENT.settings, только server-controlled.
   * Клиент не передаёт его в запросах (MUST NOT, иначе 400 READ_ONLY_FIELD).
   */
  tutorialCompleted: boolean;
}

/**
 * Настройки в составе состояния клиента.
 * @example {"musicEnabled":true,"soundEnabled":true,"tutorialCompleted":false}
 */
export interface SettingsView {
  /** Музыка (CLIENT.settings.music_enabled). */
  musicEnabled: boolean;
  /** Звук (CLIENT.settings.sound_enabled). */
  soundEnabled: boolean;
  /**
   * Пройден ли туториал (CLIENT.settings.tutorial_completed); read-only, server-controlled
   * (DATA-023). Первое серверно-наблюдаемое подтверждение — первый успешный startLevel уровня 1
   * (решение Contract First).
   */
  tutorialCompleted: boolean;
}

export type StartLevelData = LevelPlayResponse;

export type StartLevelError = ValidationProblem | ProcessProblem;

export interface StartLevelParams {
  /**
   * Идентификатор уровня (50 уровней, BRD GAME-*), UUID v4.
   * @example "4f8fad5b-d9cb-469f-a165-808677289512"
   */
  levelId: Uuid;
}

export type SubmitFeedbackData = SubmitFeedbackResponse;

export type SubmitFeedbackError = ValidationProblem | ProcessProblem;

/**
 * Запрос отправки фидбека (API-013 / INF.13). Условные варианты oneOf:
 * source=chapter_completion требует chapterId; source=settings запрещает chapterId.
 * Поле levelId в запросе не используется.
 * @example {"source":"settings","rating":5,"comment":"Отличная игра!"}
 */
export type SubmitFeedbackRequest = (
  | (any & {
      source: SubmitFeedbackRequestSourceEnum;
    })
  | {
      source: SubmitFeedbackRequestSourceEnum1;
    }
) & {
  /**
   * Глава, после которой оставлен фидбек: обязателен для source=chapter_completion, отсутствует
   * для source=settings (передача chapterId при source=settings -> 400 FORBIDDEN_FIELD).
   */
  chapterId?: Uuid;
  /**
   * Комментарий (optional, <= 500 символов); опускается при отсутствии.
   * @maxLength 500
   */
  comment?: string;
  /**
   * Оценка (обязательна), целое 1..5.
   * @format int32
   * @min 1
   * @max 5
   */
  rating: number;
  /** Источник фидбека: settings (повторяемый, UX-015) | chapter_completion (автоматический, DATA-020). */
  source: SubmitFeedbackRequestSourceEnum2;
};

export enum SubmitFeedbackRequestSourceEnum {
  Settings = "settings",
}

export enum SubmitFeedbackRequestSourceEnum1 {
  ChapterCompletion = "chapter_completion",
}

/** Источник фидбека: settings (повторяемый, UX-015) | chapter_completion (автоматический, DATA-020). */
export enum SubmitFeedbackRequestSourceEnum2 {
  Settings = "settings",
  ChapterCompletion = "chapter_completion",
}

/**
 * Подтверждение сохранения фидбека (API-013 / INF.13).
 * @example {"feedbackId":"7f8fad5b-d9cb-469f-a165-808677289515","status":"submitted","nextAction":"next_chapter"}
 */
export interface SubmitFeedbackResponse {
  /** Идентификатор фидбека. */
  feedbackId: Uuid;
  /** Единственное следующее действие (после фидбека — next_chapter/campaign_complete/none). */
  nextAction: NextAction;
  /** Статус фидбека. */
  status: SubmitFeedbackResponseStatusEnum;
}

/** Статус фидбека. */
export enum SubmitFeedbackResponseStatusEnum {
  Submitted = "submitted",
}

export type SubmitRouteData = RouteSubmissionResponse;

export type SubmitRouteError = ValidationProblem | ProcessProblem;

export interface SubmitRouteParams {
  /**
   * Идентификатор уровня (50 уровней, BRD GAME-*), UUID v4.
   * @example "4f8fad5b-d9cb-469f-a165-808677289512"
   */
  levelId: Uuid;
}

export type UpdateSettingsData = SettingsResponse;

export type UpdateSettingsError = ValidationProblem | ProcessProblem;

/**
 * Запрос обновления настроек (API-010 / INF.10). Пустой объект {} недопустим
 * (400 REQUIRED_FIELD, это не no-op). Поле tutorialCompleted клиент не передаёт (MUST NOT, иначе
 * 400 READ_ONLY_FIELD) — только server-controlled. Неизвестное поле — 400 UNKNOWN_FIELD (строгая схема).
 * @example {"musicEnabled":false,"soundEnabled":true}
 */
export interface UpdateSettingsRequest {
  /** Музыка (optional; хотя бы одно из musicEnabled/soundEnabled обязательно). */
  musicEnabled?: boolean;
  /** Звук (optional; хотя бы одно из musicEnabled/soundEnabled обязательно). */
  soundEnabled?: boolean;
}

export type UseHintData = HintUseResponse;

export type UseHintError = ValidationProblem | ProcessProblem;

export interface UseHintParams {
  /**
   * Идентификатор уровня (50 уровней, BRD GAME-*), UUID v4.
   * @example "4f8fad5b-d9cb-469f-a165-808677289512"
   */
  levelId: Uuid;
}

/**
 * UUID v4, строка 36 символов с дефисами; регистр не значим (принимаются и upper, и lower case,
 * RFC 4122). Идентификаторы: главы, уровни, награды, внешние виды, версии контента и др.
 * @format uuid
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$
 * @example "6f8fad5b-d9cb-469f-a165-80867728951e"
 */
export type Uuid = string;

/**
 * Элемент корневого errors[] ошибки валидации.
 * @example {"type":"OUT_OF_RANGE","field":"body.route","text":"Длина маршрута должна быть от 2 до 36 клеток"}
 */
export interface ValidationErrorItem {
  /**
   * Опциональный объект параметров отображения ошибки для клиента.
   * Применяется в корне ошибки (ProcessProblem, только при type != VALIDATION_ERROR) и в элементах
   * ValidationErrorItem; не является доменным UI-блоком отображения. Дополнительные поля допустимы
   * только при веских причинах; тексты согласуются с продуктом и копирайтером.
   */
  displayOptions?: ErrorDisplayOptions;
  /** Путь к полю (dot-notation, body. для тела, query. для query); опционален. */
  field?: string;
  /** Дополнительные данные (например, допустимые значения); при отсутствии опускается. */
  payload?: object;
  /** Человекочитаемое описание на русском языке (обязательно). */
  text: string;
  /** Стабильный код ошибки поля (11 кодов; каталог расширяем). */
  type: ValidationErrorItemTypeEnum;
}

/** Стабильный код ошибки поля (11 кодов; каталог расширяем). */
export enum ValidationErrorItemTypeEnum {
  REQUIRED_FIELD = "REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_VALUE = "INVALID_VALUE",
  OUT_OF_RANGE = "OUT_OF_RANGE",
  UNKNOWN_FIELD = "UNKNOWN_FIELD",
  READ_ONLY_FIELD = "READ_ONLY_FIELD",
  FORBIDDEN_FIELD = "FORBIDDEN_FIELD",
  TOO_LONG = "TOO_LONG",
  TOO_LARGE_PAYLOAD = "TOO_LARGE_PAYLOAD",
  DUPLICATE_CELL = "DUPLICATE_CELL",
  NON_ADJACENT_CELL = "NON_ADJACENT_CELL",
}

/**
 * Ошибка валидации 400 по корпоративной схеме BCS. Корневой text
 * не используется; поля RFC 9457 и traceId не используются.
 * @example {"type":"VALIDATION_ERROR","errors":[{"type":"REQUIRED_FIELD","field":"body.route","text":"Поле route обязательно"},{"type":"NON_ADJACENT_CELL","field":"body.route[1]","text":"Клетки маршрута должны быть ортогональными соседями"}]}
 */
export interface ValidationProblem {
  /**
   * Корневой массив деталей по полям (обёртка payload для VALIDATION_ERROR не используется;
   * корневые field/payload/displayOptions отсутствуют — возможны только при type != VALIDATION_ERROR).
   * @minItems 1
   */
  errors: ValidationErrorItem[];
  /** Простой стабильный код типа проблемы; для валидации — всегда VALIDATION_ERROR. */
  type: ValidationProblemTypeEnum;
}

/** Простой стабильный код типа проблемы; для валидации — всегда VALIDATION_ERROR. */
export enum ValidationProblemTypeEnum {
  VALIDATION_ERROR = "VALIDATION_ERROR",
}
