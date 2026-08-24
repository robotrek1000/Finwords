// Standalone demo model used by the game and its local mock backend.
export interface AcknowledgeLevelResultsResponse {
    levelId: Uuid;
    nextAction: NextAction;
    pendingReward?: PendingReward;
    resultsAcknowledgedAt: DateTime;
    resultsState: AcknowledgeLevelResultsResponseResultsStateEnum;
}

export enum AcknowledgeLevelResultsResponseResultsStateEnum {
    Acknowledged = "acknowledged"
}

export interface Appearance {
    appearanceId: Uuid;
    description?: string;
    imageUrl: string;
    isOwned: boolean;
    isSelected: boolean;
    rarity: AppearanceRarityEnum;
    title: string;
    type: AppearanceTypeEnum;
    unlockedAt?: DateTime;
}

export interface AppearanceCatalogResponse {
    items: Appearance[];
    selectedBackgroundId: Uuid;
    selectedCharacterId: Uuid;
}

export enum AppearanceRarityEnum {
    Base = "base",
    Regular = "regular",
    Special = "special"
}

export enum AppearanceTypeEnum {
    Character = "character",
    Background = "background"
}

export interface Balance {
    hintBalance: number;
    knowledgePoints: number;
}

export interface BoardView {
    cells: CellView[];
    size: number;
}

export interface BonusWord {
    foundAt: DateTime;
    word: string;
}

export interface CampaignProgress {
    isCompleted: boolean;
    isCompletionShown: boolean;
}

export interface CellRef {
    col: number;
    row: number;
}

export interface CellView {
    belongsToFoundWord: boolean;
    col: number;
    letter: string;
    row: number;
    state: CellViewStateEnum;
}

export enum CellViewStateEnum {
    Letter = "letter",
    Found = "found"
}

export interface ChapterProgress {
    chapterId: Uuid;
    completedLevels: number;
    feedbackPromptShownAt?: DateTime;
    imageUrl: string;
    isNarrativeShown: boolean;
    narrativeText?: string;
    number: number;
    status: ChapterProgressStatusEnum;
    title: string;
    totalLevels: number;
}

export enum ChapterProgressStatusEnum {
    Locked = "locked",
    Available = "available",
    InProgress = "in_progress",
    Completed = "completed"
}

export interface ClaimDecorationRewardRequest {
    rewardType: string;
    selectedOptionId: Uuid;
}

export interface ClaimHintRewardRequest {
    rewardType: string;
}

export interface ClaimResult {
    balance: Balance;
    decoration?: {
        appearanceId: Uuid;
        type: ClaimResultTypeEnum;
    };
}

export enum ClaimResultTypeEnum {
    Character = "character",
    Background = "background"
}

export type ClaimRewardRequest = ({
    rewardType: "hint";
} & ClaimHintRewardRequest) | ({
    rewardType: "decoration";
} & ClaimDecorationRewardRequest);

export interface ClaimRewardResponse {
    claimResult: ClaimResult;
    nextAction: NextAction;
    rewardId: Uuid;
    rewardType: ClaimRewardResponseRewardTypeEnum;
    selectedOption: SelectedOption;
    state: ClaimRewardResponseStateEnum;
}

export enum ClaimRewardResponseRewardTypeEnum {
    Regular = "regular",
    ChapterGolden = "chapter_golden"
}

export enum ClaimRewardResponseStateEnum {
    Claimed = "claimed"
}

export interface ClientStateResponse {
    clientState: {
        chapters: ChapterProgress[];
        clientView: ClientView;
        inProgressLevel?: InProgressLevel;
        levels: LevelProgressSummary[];
        nextAction: NextAction;
        pendingResults?: PendingResults;
        pendingReward?: PendingReward;
        rewards: RewardSummary[];
    };
}

export interface ClientView {
    balance: Balance;
    campaignProgress: CampaignProgress;
    selectedBackgroundId: Uuid;
    selectedCharacterId: Uuid;
    settings: SettingsView;
}

export interface CourseOffer {
    badgeLabel: string;
    courseId: Uuid;
    locale: string;
    title: string;
}

export type DateTime = string;

export interface ErrorDisplayOptions {
    text?: string;
    title?: string;
}

export interface FoundTarget {
    cells: CellRef[];
    courseOffer?: CourseOffer;
    definition: string;
    foundAt: DateTime;
    foundSequence: number;
    targetId: Uuid;
    word: string;
}

export interface HintState {
    revealedCells: CellRef[];
    targetId: Uuid;
}

export interface HintUseResponse {
    completedTarget?: FoundTarget;
    foundTargets: FoundTarget[];
    hintBalance: number;
    hintTarget: HintState;
    knowledgePoints: number;
    levelCompleted: boolean;
    nextAction: NextAction;
    revealedCells: CellRef[];
    rewardOpened?: RewardSummary;
    rewardProgress?: number;
    targetsRemaining: number;
}

export interface InProgressLevel {
    levelId: Uuid;
    levelVersionId: Uuid;
    startedAt: DateTime;
}

export interface LevelPlayResponse {
    board: BoardView;
    bonusWords: BonusWord[];
    foundTargets: FoundTarget[];
    hintState?: HintState;
    levelId: Uuid;
    levelNumber: number;
    levelVersionId: Uuid;
    microtheme: string;
    nextAction: NextAction;
    startedAt: DateTime;
    status: LevelPlayResponseStatusEnum;
    targetsRemaining: number;
}

export enum LevelPlayResponseStatusEnum {
    InProgress = "in_progress"
}

export interface LevelProgressSummary {
    completedAt?: DateTime;
    levelId: Uuid;
    status: LevelProgressSummaryStatusEnum;
}

export enum LevelProgressSummaryStatusEnum {
    Locked = "locked",
    Available = "available",
    InProgress = "in_progress",
    Completed = "completed"
}

export interface LevelResultsResponse {
    board: BoardView;
    bonusWords: BonusWord[];
    chapter: {
        chapterId: Uuid;
        completedLevels: number;
        number: number;
        status: LevelResultsResponseStatusEnum1;
        title: string;
        totalLevels: number;
    };
    completedAt: DateTime;
    completionKind: LevelResultsResponseCompletionKindEnum;
    foundTargets: FoundTarget[];
    levelId: Uuid;
    nextAction: NextAction;
    resultsState: LevelResultsResponseResultsStateEnum;
    reward?: RewardSummary;
    status: LevelResultsResponseStatusEnum;
    summary: {
        bonuses: {
            foundCount: number;
        };
        earnedKnowledgePoints: number;
        knowledgePointsTotal: number;
        targets: {
            foundCount: number;
            totalCount: number;
        };
    };
}

export enum LevelResultsResponseCompletionKindEnum {
    Level = "level",
    Chapter = "chapter"
}

export enum LevelResultsResponseResultsStateEnum {
    PendingAcknowledgement = "pending_acknowledgement",
    Acknowledged = "acknowledged"
}

export enum LevelResultsResponseStatusEnum {
    Completed = "completed"
}

export enum LevelResultsResponseStatusEnum1 {
    InProgress = "in_progress",
    Completed = "completed"
}

export enum NextAction {
    StartLevel = "start_level",
    Play = "play",
    ClaimReward = "claim_reward",
    OpenFeedback = "open_feedback",
    NextChapter = "next_chapter",
    CampaignComplete = "campaign_complete",
    None = "none"
}

export interface PendingResults {
    levelId: Uuid;
    rewardId?: Uuid;
}

export interface PendingReward {
    rewardId: Uuid;
}

export interface RewardOption {
    amount?: number;
    decorationType?: RewardOptionDecorationTypeEnum;
    imageUrl?: string;
    optionId?: Uuid;
    optionType: RewardOptionOptionTypeEnum;
    title: string;
}

export enum RewardOptionDecorationTypeEnum {
    Character = "character",
    Background = "background"
}

export enum RewardOptionOptionTypeEnum {
    Hint = "hint",
    Decoration = "decoration"
}

export interface RewardSummary {
    availableAt?: DateTime;
    claimedAt?: DateTime;
    decorationOptionId?: Uuid;
    hintOptionAmount?: number;
    options?: RewardOption[];
    progress?: {
        current: number;
        threshold: number;
    };
    rewardId: Uuid;
    rewardType: RewardSummaryRewardTypeEnum | "regular" | "chapter_golden";
    status: RewardSummaryStatusEnum | RewardSummaryStatusEnum1 | "available" | "collecting" | "claimed";
    selectedOptionType?: RewardSummarySelectedOptionTypeEnum;
}

export enum RewardSummaryRewardTypeEnum {
    Regular = "regular",
    ChapterGolden = "chapter_golden"
}

export enum RewardSummarySelectedOptionTypeEnum {
    Hint = "hint",
    Decoration = "decoration"
}

export enum RewardSummaryStatusEnum {
    Available = "available"
}

export enum RewardSummaryStatusEnum1 {
    Collecting = "collecting",
    Claimed = "claimed"
}

export interface RouteSubmissionRequest {
    route: CellRef[];
}

export interface RouteSubmissionResponse {
    hintBalance?: number;
    isTarget?: boolean;
    knowledgePoints?: number;
    levelCompleted: boolean;
    newBonusWords: BonusWord[];
    newFoundTargets: FoundTarget[];
    nextAction: NextAction;
    outcomeCode?: RouteSubmissionResponseOutcomeCodeEnum;
    result: RouteSubmissionResponseResultEnum3;
    rewardOpened?: RewardSummary;
    rewardProgress?: number;
    targetsRemaining?: number;
    word?: string;
}

export enum RouteSubmissionResponseOutcomeCodeEnum {
    TARGET_NONCANONICAL_PATH = "TARGET_NONCANONICAL_PATH"
}

export enum RouteSubmissionResponseResultEnum3 {
    Found = "found",
    Invalid = "invalid",
    Repeated = "repeated"
}

export interface SelectAppearanceResponse {
    appearanceId: Uuid;
    selectedBackgroundId: Uuid;
    selectedCharacterId: Uuid;
    type: SelectAppearanceResponseTypeEnum;
}

export enum SelectAppearanceResponseTypeEnum {
    Character = "character",
    Background = "background"
}

export interface SelectedOption {
    selectedOptionId?: Uuid;
    selectedOptionType: SelectedOptionSelectedOptionTypeEnum;
}

export enum SelectedOptionSelectedOptionTypeEnum {
    Hint = "hint",
    Decoration = "decoration"
}

export interface SettingsResponse {
    musicEnabled: boolean;
    soundEnabled: boolean;
    tutorialCompleted: boolean;
}

export interface SettingsView {
    musicEnabled: boolean;
    soundEnabled: boolean;
    tutorialCompleted: boolean;
}

export interface SubmitFeedbackRequest {
    chapterId?: Uuid;
    comment?: string;
    rating: number;
    source: SubmitFeedbackRequestSourceEnum2 | "settings" | "chapter_completion";
}

export enum SubmitFeedbackRequestSourceEnum2 {
    Settings = "settings",
    ChapterCompletion = "chapter_completion"
}

export interface SubmitFeedbackResponse {
    feedbackId: Uuid;
    nextAction: NextAction;
    status: SubmitFeedbackResponseStatusEnum;
}

export enum SubmitFeedbackResponseStatusEnum {
    Submitted = "submitted"
}

export interface UpdateSettingsRequest {
    musicEnabled?: boolean;
    soundEnabled?: boolean;
}

export type Uuid = string;

export interface ValidationErrorItem {
    displayOptions?: ErrorDisplayOptions;
    field?: string;
    payload?: object;
    text: string;
    type: ValidationErrorItemTypeEnum;
}

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
    NON_ADJACENT_CELL = "NON_ADJACENT_CELL"
}

export interface ValidationProblem {
    errors: ValidationErrorItem[];
    type: ValidationProblemTypeEnum;
}

export enum ValidationProblemTypeEnum {
    VALIDATION_ERROR = "VALIDATION_ERROR"
}
