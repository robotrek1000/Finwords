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

import {
  AcknowledgeLevelResultsData,
  AcknowledgeLevelResultsError,
  AcknowledgeLevelResultsParams,
  BootstrapData,
  ClaimRewardData,
  ClaimRewardError,
  ClaimRewardParams,
  ClaimRewardRequest,
  ConfirmCampaignCompleteShownData,
  ConfirmCampaignCompleteShownError,
  ConfirmNarrativeShownData,
  ConfirmNarrativeShownError,
  ConfirmNarrativeShownParams,
  DismissFeedbackData,
  DismissFeedbackError,
  DismissFeedbackParams,
  GetAppearanceCatalogData,
  GetAppearanceCatalogError,
  GetCurrentStateData,
  GetCurrentStateError,
  GetLevelResultsData,
  GetLevelResultsError,
  GetLevelResultsParams,
  GetPersonalDictionaryData,
  GetPersonalDictionaryError,
  GetPersonalDictionaryParams,
  ProcessProblem,
  ResumeLevelData,
  ResumeLevelError,
  ResumeLevelParams,
  RouteSubmissionRequest,
  SelectAppearanceData,
  SelectAppearanceError,
  SelectAppearanceParams,
  StartLevelData,
  StartLevelError,
  StartLevelParams,
  SubmitFeedbackData,
  SubmitFeedbackError,
  SubmitFeedbackRequest,
  SubmitRouteData,
  SubmitRouteError,
  SubmitRouteParams,
  UpdateSettingsData,
  UpdateSettingsError,
  UpdateSettingsRequest,
  UseHintData,
  UseHintError,
  UseHintParams,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Api<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * @description API-017. Пользователь подтвердил просмотр экрана результатов завершённого уровня. Тело отсутствует. Операция write-once: повторный вызов с тем же Idempotency-Key возвращает сохранённый ответ; повторный новый intent после подтверждения отклоняется. После успешного подтверждения resultsState становится acknowledged, а награда за этот уровень при её наличии может быть получена через API-009. Если nextAction=claim_reward, pendingReward обязателен и указывает ровно на available-награду в rewards[]; для Golden-награды nextAction всегда claim_reward, поэтому pendingReward также обязателен.
   *
   * @tags results
   * @name AcknowledgeLevelResults
   * @summary Подтвердить просмотр итогов завершённого уровня
   * @request POST:/api/v1/levels/{levelId}/results/acknowledge
   * @secure
   * @response `200` `AcknowledgeLevelResultsData` Итоги подтверждены. Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: INVALID_FORMAT (levelId не UUID; невалидный формат заголовков Idempotency-Key/If-Match).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, LEVEL_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (payload.currentEtag), LEVEL_NOT_COMPLETED (уровень не завершён), RESULTS_ALREADY_ACKNOWLEDGED.
   * @response `500` `ProcessProblem`
   */
  acknowledgeLevelResults = (
    { levelId }: AcknowledgeLevelResultsParams,
    params: RequestParams = {},
  ) =>
    this.http.request<
      AcknowledgeLevelResultsData,
      AcknowledgeLevelResultsError
    >({
      path: `/api/v1/levels/${levelId}/results/acknowledge`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-001 / INF.01. Первичная инициализация клиента (первый запуск Finwords WebView) или восстановление состояния после переустановки приложения. Тело отсутствует; clientId извлекается сервером из JWT — клиент не передаёт свой идентификатор (MUST NOT). Если профиль не существует — создаётся с дефолтами: knowledgePoints=0, hintBalance=5, настройки {musicEnabled=true, soundEnabled=true, tutorialCompleted=false}, стартовые декорации (DATA-023). Если профиль существует — идемпотентный no-op. nextAction вычисляется по приоритету FLOW-010 (claim_reward -> open_feedback -> next_chapter/campaign_complete -> none). Ошибки: 401, 403 GAME_UNAVAILABLE, 500 INTERNAL_ERROR. 400 и 404 не применяются (входных данных нет, профиль создаётся bootstrap-ом).
   *
   * @tags bootstrap
   * @name Bootstrap
   * @summary Bootstrap — создать или восстановить профиль клиента и вернуть агрегированное начальное состояние
   * @request POST:/api/v1/clients/me/bootstrap
   * @secure
   * @response `200` `BootstrapData` Успешный bootstrap: полная проекция состояния клиента (профиль создан или уже существовал). Заголовок ETag — сильный ETag текущего состояния (только в заголовке, в теле не дублируется). Заголовок Idempotency-Key-Status: processed — первичная обработка; replayed — повторный вызов с тем же Idempotency-Key (no-op, сохранённый ответ).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `500` `ProcessProblem`
   */
  bootstrap = (params: RequestParams = {}) =>
    this.http.request<BootstrapData, ProcessProblem>({
      path: `/api/v1/clients/me/bootstrap`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-009 / INF.09. Пользователь забрал награду (экран наград, выбор опции при необходимости). Тело — discriminated oneOf: rewardType=hint не содержит selectedOptionId; rewardType=decoration требует selectedOptionId. Вариант hint пополняет CLIENT.hint_balance; вариант decoration создаёт запись CLIENT_DECORATION и не изменяет hintBalance. Для награды, открытой результатами уровня, пользователь сначала подтверждает просмотр итогов через API-017. Для повторения после STATE_VERSION_CONFLICT клиент читает API-002 и сохраняет тот же Idempotency-Key только если pendingReward.rewardId совпадает с path rewardId и rewards[] содержит запись с тем же rewardId и status=available; pendingResults и выбор первой available-награды не используются. Успешный claim очищает pendingReward только при совпадении его rewardId с path rewardId. Фиксирует claimed_at (write-once; повторный вызов с тем же ключом — replay 200). Claim regular-награды сохраняет collecting- прогресс regular-конверта и может вернуть nextAction=play для возобновления уровня в прогрессе. Доступная chapter_golden-награда имеет приоритет над regular: regular-прогресс сохраняется и снова становится активным после claim Golden-награды. Ошибки: 400 (валидация входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, REWARD_NOT_FOUND), 409 (STATE_VERSION_CONFLICT, RESULTS_ACKNOWLEDGEMENT_REQUIRED, REWARD_NOT_AVAILABLE, REWARD_ALREADY_CLAIMED, REWARD_OPTION_UNAVAILABLE), 500 INTERNAL_ERROR.
   *
   * @tags rewards
   * @name ClaimReward
   * @summary Атомарно и идемпотентно получить выбранную награду
   * @request POST:/api/v1/rewards/{rewardId}/claim
   * @secure
   * @response `200` `ClaimRewardData` Награда получена: подтверждённый результат claim и единственное следующее действие. Claim regular награды может вернуть nextAction=play для возобновления уровня в прогрессе. Приоритетная Golden- награда не сбрасывает regular-прогресс: он возобновляется после её claim. При совпадении clientState.pendingReward.rewardId с rewardId запроса сервер очищает этот указатель; иной указатель не изменяется. Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: REQUIRED_FIELD (пустое тело / отсутствие rewardType или selectedOptionId для rewardType=decoration), INVALID_VALUE (недопустимое значение rewardType), FORBIDDEN_FIELD (selectedOptionId для rewardType=hint), UNKNOWN_FIELD, INVALID_FORMAT (rewardId не UUID; malformed JSON), TOO_LARGE_PAYLOAD (тело > 32 KiB).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, REWARD_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (payload.currentEtag), RESULTS_ACKNOWLEDGEMENT_REQUIRED (для награды завершённого уровня не вызван API-017), REWARD_NOT_AVAILABLE (награда недоступна для claim), REWARD_ALREADY_CLAIMED (награда уже получена), REWARD_OPTION_UNAVAILABLE (выбранная опция награды недоступна).
   * @response `500` `ProcessProblem`
   */
  claimReward = (
    { rewardId }: ClaimRewardParams,
    data: ClaimRewardRequest,
    params: RequestParams = {},
  ) =>
    this.http.request<ClaimRewardData, ClaimRewardError>({
      path: `/api/v1/rewards/${rewardId}/claim`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description API-015 / INF.15. Клиент показал пользователю экран завершения кампании. Тело отсутствует. Устанавливает campaign_completion_shown_at на CLIENT (write-once; повторный вызов — no-op 200); последующий просмотр финала остаётся read-only, награды повторно не выдаются. Завершение кампании вычисляется из CLIENT_CHAPTER_PROGRESS / CLIENT_LEVEL_PROGRESS (кампания не хранится отдельной сущностью). Ошибки: 401, 403, 404 CLIENT_NOT_FOUND, 409 (STATE_VERSION_CONFLICT, CAMPAIGN_NOT_COMPLETED), 500 INTERNAL_ERROR. 400 не применяется (нет входных данных).
   *
   * @tags campaign
   * @name ConfirmCampaignCompleteShown
   * @summary Зафиксировать первый автоматический показ экрана завершения кампании
   * @request POST:/api/v1/campaigns/current/completion-shown
   * @secure
   * @response `200` `ConfirmCampaignCompleteShownData` Показ завершения кампании подтверждён (или no-op replay). Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (payload.currentEtag), CAMPAIGN_NOT_COMPLETED (кампания не завершена).
   * @response `500` `ProcessProblem`
   */
  confirmCampaignCompleteShown = (params: RequestParams = {}) =>
    this.http.request<
      ConfirmCampaignCompleteShownData,
      ConfirmCampaignCompleteShownError
    >({
      path: `/api/v1/campaigns/current/completion-shown`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-003 / INF.03. Клиент показал пользователю нарратив главы (экран истории перед первым уровнем главы). Тело отсутствует. Write-once: если narrative_shown_at уже установлен — no-op 200 с текущим значением независимо от статуса главы. Порядок проверок: идемпотентность -> If-Match -> существование главы (404) -> no-op 200 при уже установленном поле, иначе 409 CHAPTER_LOCKED. Ошибки: 400 (валидация входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, CHAPTER_NOT_FOUND), 409 (STATE_VERSION_CONFLICT, CHAPTER_LOCKED), 500 INTERNAL_ERROR.
   *
   * @tags state
   * @name ConfirmNarrativeShown
   * @summary Подтвердить первый фактический показ нарратива главы
   * @request POST:/api/v1/chapters/{chapterId}/narrative-shown
   * @secure
   * @response `200` `ConfirmNarrativeShownData` Показ нарратива подтверждён (или no-op replay при уже установленном narrative_shown_at). Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: INVALID_FORMAT (path-параметр chapterId не UUID; невалидный формат заголовков Idempotency-Key/If-Match).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, CHAPTER_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (устаревший If-Match, payload.currentEtag), CHAPTER_LOCKED (глава недоступна; проверяется только при первой записи).
   * @response `500` `ProcessProblem`
   */
  confirmNarrativeShown = (
    { chapterId }: ConfirmNarrativeShownParams,
    params: RequestParams = {},
  ) =>
    this.http.request<ConfirmNarrativeShownData, ConfirmNarrativeShownError>({
      path: `/api/v1/chapters/${chapterId}/narrative-shown`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-014 / INF.14. Пользователь закрыл промпт фидбека без оценки (кнопка «Позже»/крестик). Тело отсутствует. Устанавливает feedback_prompt_shown_at (write-once; повторный вызов — no-op 200); запись FEEDBACK при dismiss не создаётся; будущий промпт после следующей подходящей главы остаётся допустимым (DATA-020). Ошибки: 400 (валидация входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, CHAPTER_NOT_FOUND), 409 STATE_VERSION_CONFLICT, 500 INTERNAL_ERROR.
   *
   * @tags feedback
   * @name DismissFeedback
   * @summary Зафиксировать закрытие автоматического Feedback промпта без отправки
   * @request POST:/api/v1/chapters/{chapterId}/feedback-prompt/dismiss
   * @secure
   * @response `200` `DismissFeedbackData` Закрытие промпта подтверждено (или no-op replay). Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: INVALID_FORMAT (path-параметр chapterId не UUID; невалидный формат заголовков).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, CHAPTER_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (устаревший If-Match, payload.currentEtag).
   * @response `500` `ProcessProblem`
   */
  dismissFeedback = (
    { chapterId }: DismissFeedbackParams,
    params: RequestParams = {},
  ) =>
    this.http.request<DismissFeedbackData, DismissFeedbackError>({
      path: `/api/v1/chapters/${chapterId}/feedback-prompt/dismiss`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-011 / INF.11. Экран внешних видов (гардероб): персонажи и фоны с признаками доступности (isOwned) и текущего выбора (isSelected). Каталог фиксированный и небольшой (14 обликов), пагинация не применяется. Ошибки: 401, 403, 404 CLIENT_NOT_FOUND, 500 INTERNAL_ERROR. 400 не применяется (нет входных данных).
   *
   * @tags appearances
   * @name GetAppearanceCatalog
   * @summary Получить каталог внешних видов с признаками владения и текущего выбора (чтение)
   * @request GET:/api/v1/appearances
   * @secure
   * @response `200` `GetAppearanceCatalogData` Каталог обликов (14 записей) и текущий выбор. Заголовок ETag — сильный ETag текущего состояния клиента (в теле не дублируется).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND.
   * @response `500` `ProcessProblem`
   */
  getAppearanceCatalog = (params: RequestParams = {}) =>
    this.http.request<GetAppearanceCatalogData, GetAppearanceCatalogError>({
      path: `/api/v1/appearances`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-002 / INF.02. Чтение последнего подтверждённого состояния Home, прогресса, балансов, незавершённого уровня и ожидающих наград без повторного применения команд. Ничего не изменяет. Ошибки: 401, 403 GAME_UNAVAILABLE, 404 CLIENT_NOT_FOUND, 500 INTERNAL_ERROR. 400 не применяется (входных данных нет).
   *
   * @tags state
   * @name GetCurrentState
   * @summary Получить текущее игровое состояние клиента (чтение)
   * @request GET:/api/v1/clients/me/state
   * @secure
   * @response `200` `GetCurrentStateData` Текущее состояние клиента. Заголовок ETag — сильный ETag текущего состояния (только в заголовке; клиент обязан сохранить его для следующего If-Match).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND (профиль клиента не найден, не создан bootstrap-ом).
   * @response `500` `ProcessProblem`
   */
  getCurrentState = (params: RequestParams = {}) =>
    this.http.request<GetCurrentStateData, GetCurrentStateError>({
      path: `/api/v1/clients/me/state`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-008 / INF.08. Экран результатов после завершения уровня: полные итоги — read-only snapshot сетки (BoardView), все найденные целевые слова (с определениями), бонусные слова (без клеток). Без создания новой попытки и без изменения прогресса. Ошибки: 400 (валидация входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, LEVEL_NOT_FOUND), 409 LEVEL_NOT_COMPLETED (результаты отдаются только для завершённого уровня), 500 INTERNAL_ERROR.
   *
   * @tags results
   * @name GetLevelResults
   * @summary Получить подтверждённые итоги завершённого уровня и read-only snapshot поля (чтение)
   * @request GET:/api/v1/levels/{levelId}/results
   * @secure
   * @response `200` `GetLevelResultsData` Итоги завершённого уровня и read-only snapshot поля. Заголовок ETag — сильный ETag текущего состояния клиента (в теле не дублируется).
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: INVALID_FORMAT (path-параметр levelId не UUID).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, LEVEL_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: LEVEL_NOT_COMPLETED (уровень не завершён).
   * @response `500` `ProcessProblem`
   */
  getLevelResults = (
    { levelId }: GetLevelResultsParams,
    params: RequestParams = {},
  ) =>
    this.http.request<GetLevelResultsData, GetLevelResultsError>({
      path: `/api/v1/levels/${levelId}/results`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-016 / INF.16. Экран личного словаря (собранные слова), подгрузка следующих страниц. Возвращаются только строки CLIENT_FOUND_WORD с word_type=bonus; target-слова, определения и метаданные хранения не передаются. Полный bonus dictionary и его файл никогда не передаются в WebView. Сортировка фиксированная: foundAt desc, затем word asc (клиент не управляет). Пагинация offset/limit (offset >= 0, default 0; limit 1..100, default 50); пустая страница — 200 с dictionaryEntries=[] и total=0. Ошибки: 400 (OUT_OF_RANGE для offset < 0 или limit вне 1..100; INVALID_FORMAT для нечисловых значений), 401, 403, 404 CLIENT_NOT_FOUND, 500 INTERNAL_ERROR.
   *
   * @tags dictionary
   * @name GetPersonalDictionary
   * @summary Получить личный словарь — только найденные данным клиентом bonus-слова (чтение)
   * @request GET:/api/v1/clients/me/dictionary-entries
   * @secure
   * @response `200` `GetPersonalDictionaryData` Страница личного словаря: resource-named dictionaryEntries + корпоративный конверт part. Заголовок ETag — сильный ETag текущего состояния клиента (в теле не дублируется).
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: OUT_OF_RANGE (offset < 0, limit вне 1..100), INVALID_FORMAT (offset/limit не являются целыми числами).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND.
   * @response `500` `ProcessProblem`
   */
  getPersonalDictionary = (
    query: GetPersonalDictionaryParams = {},
    params: RequestParams = {},
  ) =>
    this.http.request<GetPersonalDictionaryData, GetPersonalDictionaryError>({
      path: `/api/v1/clients/me/dictionary-entries`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-005 / INF.05. Восстановление сессии игры: возвращает текущее игровое состояние (без изменений), включая активную серию подсказок (hintState, если серия есть). Ошибки: 400 (валидация входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, LEVEL_NOT_FOUND), 409 LEVEL_NOT_IN_PROGRESS (уровень не в прогрессе), 500 INTERNAL_ERROR.
   *
   * @tags gameplay
   * @name ResumeLevel
   * @summary Возобновить незавершённый уровень и получить подтверждённое состояние (чтение)
   * @request GET:/api/v1/levels/{levelId}/state
   * @secure
   * @response `200` `ResumeLevelData` Подтверждённое состояние незавершённого уровня. Заголовок ETag — сильный ETag текущего состояния (общее правило; в теле не дублируется).
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: INVALID_FORMAT (path-параметр levelId не UUID).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, LEVEL_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: LEVEL_NOT_IN_PROGRESS (уровень не в прогрессе).
   * @response `500` `ProcessProblem`
   */
  resumeLevel = ({ levelId }: ResumeLevelParams, params: RequestParams = {}) =>
    this.http.request<ResumeLevelData, ResumeLevelError>({
      path: `/api/v1/levels/${levelId}/state`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-012 / INF.12. Пользователь выбрал внешний вид из каталога. Тело отсутствует. Проверяется владение и тип облика (character/background); выбранный персонаж или фон сохраняется (selected_character_decoration_id / selected_background_decoration_id; write-once семантика при повторном выборе того же — replay/no-op). Ошибки: 400 (валидация входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, APPEARANCE_NOT_FOUND), 409 (STATE_VERSION_CONFLICT, APPEARANCE_NOT_OWNED), 500 INTERNAL_ERROR.
   *
   * @tags appearances
   * @name SelectAppearance
   * @summary Выбрать принадлежащий клиенту внешний вид (персонаж или фон)
   * @request POST:/api/v1/appearances/{appearanceId}/select
   * @secure
   * @response `200` `SelectAppearanceData` Выбор подтверждён: выбранный облик и актуальные выбранные персонаж/фон. Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: INVALID_FORMAT (path-параметр appearanceId не UUID; невалидный формат заголовков).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, APPEARANCE_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (payload.currentEtag), APPEARANCE_NOT_OWNED (внешний вид не приобретён).
   * @response `500` `ProcessProblem`
   */
  selectAppearance = (
    { appearanceId }: SelectAppearanceParams,
    params: RequestParams = {},
  ) =>
    this.http.request<SelectAppearanceData, SelectAppearanceError>({
      path: `/api/v1/appearances/${appearanceId}/select`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-004 / INF.04. Пользователь начал уровень (кнопка «Играть»). Тело отсутствует. Фиксирует level_version_id и started_at, инициализирует игровое состояние (сетка 3x3..6x6 из LEVEL_VERSION.content, цели без раскрытия слов). Атомарно: первый успешный старт уровня 1 устанавливает server-controlled tutorialCompleted=false -> true (read-only из CLIENT.settings; решение Contract First). Доступная обязательная награда должна быть получена до старта уровня (409 REWARD_PENDING_CLAIM, ECON-014). Ошибки: 400 (валидация входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, LEVEL_NOT_FOUND), 409 (STATE_VERSION_CONFLICT, LEVEL_LOCKED, LEVEL_ALREADY_IN_PROGRESS, LEVEL_ALREADY_COMPLETED, LEVEL_CONTENT_UNAVAILABLE, REWARD_PENDING_CLAIM), 500 INTERNAL_ERROR.
   *
   * @tags gameplay
   * @name StartLevel
   * @summary Начать доступный уровень и получить стартовый игровой snapshot
   * @request POST:/api/v1/levels/{levelId}/start
   * @secure
   * @response `200` `StartLevelData` Уровень запущен: стартовый snapshot уровня (сетка, цели без раскрытия слов). Заголовок ETag — обновлённый сильный ETag состояния клиента (общее правило). Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: INVALID_FORMAT (path-параметр levelId не UUID; невалидный формат заголовков).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, LEVEL_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (payload.currentEtag), LEVEL_LOCKED, LEVEL_ALREADY_IN_PROGRESS, LEVEL_ALREADY_COMPLETED, LEVEL_CONTENT_UNAVAILABLE, REWARD_PENDING_CLAIM (обязательная доступная награда должна быть получена до старта уровня, ECON-014).
   * @response `500` `ProcessProblem`
   */
  startLevel = ({ levelId }: StartLevelParams, params: RequestParams = {}) =>
    this.http.request<StartLevelData, StartLevelError>({
      path: `/api/v1/levels/${levelId}/start`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description API-013 / INF.13. Пользователь оставил оценку и/или комментарий в промпте фидбека или в настройках. source=chapter_completion (автоматический, DATA-020) требует chapterId и подавляется любым предыдущим FEEDBACK клиента (409 FEEDBACK_AUTO_NOT_ALLOWED, FLOW-009); повторный submit для той же главы — 409 FEEDBACK_NOT_ELIGIBLE. source=settings (повторяемый, UX-015) — chapterId запрещён (400 FORBIDDEN_FIELD); фидбек из настроек разрешён повторно, коды 409 FEEDBACK_* не применяются. Первая успешная отправка отключает будущий автоматический показ, но не ручную отправку из Settings. Для source=chapter_completion фиксируется write-once feedback_prompt_shown_at. Ошибки: 400 (REQUIRED_FIELD при отсутствии source/rating, INVALID_VALUE для source, OUT_OF_RANGE для rating вне 1..5, TOO_LONG для comment > 500, FORBIDDEN_FIELD для chapterId при source=settings, INVALID_FORMAT для malformed JSON / не-UUID chapterId, TOO_LARGE_PAYLOAD), 401, 403, 404 (CLIENT_NOT_FOUND, CHAPTER_NOT_FOUND), 409 (STATE_VERSION_CONFLICT, FEEDBACK_NOT_ELIGIBLE, FEEDBACK_AUTO_NOT_ALLOWED), 500 INTERNAL_ERROR.
   *
   * @tags feedback
   * @name SubmitFeedback
   * @summary Сохранить пользовательский Feedback (рейтинг, необязательный комментарий, контекст)
   * @request POST:/api/v1/feedbacks
   * @secure
   * @response `200` `SubmitFeedbackData` Feedback сохранён: идентификатор фидбека и единственное следующее действие. Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: REQUIRED_FIELD (отсутствие source/rating), INVALID_VALUE (недопустимое значение source), OUT_OF_RANGE (rating вне 1..5), TOO_LONG (comment > 500 символов), FORBIDDEN_FIELD (chapterId при source=settings), INVALID_FORMAT (malformed JSON; chapterId не UUID), TOO_LARGE_PAYLOAD (тело > 32 KiB).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, CHAPTER_NOT_FOUND (для source=chapter_completion).
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (payload.currentEtag), FEEDBACK_NOT_ELIGIBLE (глава не завершена или промпт не показан; только для source=chapter_completion), FEEDBACK_AUTO_NOT_ALLOWED (любой предыдущий FEEDBACK клиента подавляет automatic source, FLOW-009; только для source=chapter_completion).
   * @response `500` `ProcessProblem`
   */
  submitFeedback = (data: SubmitFeedbackRequest, params: RequestParams = {}) =>
    this.http.request<SubmitFeedbackData, SubmitFeedbackError>({
      path: `/api/v1/feedbacks`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description API-006 / INF.06. Пользователь провёл линию по клеткам сетки и отпустил (попытка слова). Backend проверяет маршрут по закреплённой версии уровня (canonical-путь цели, прямое или обратное направление — found target) и, для bonus, по закреплённой verified версии полного словаря (DICTIONARY_VERSION, чтение словаря — только backend, INF.21; полный словарь клиенту не передаётся). Результаты: found (target или bonus), invalid (слова нет в словаре / маршрут не соответствует доске), repeated (слово уже найдено на уровне, без повторного начисления). При завершении уровня финальным маршрутом фиксируется write-once completed_at. Найденное bonus-слово может открыть regular-награду: тогда ответ содержит rewardOpened с нормализованными progress/options, nextAction=claim_reward, а в актуальном API-002 pendingReward.rewardId совпадает с rewardOpened.rewardId. Ошибки: 400 (валидация маршрута и входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, LEVEL_NOT_FOUND), 409 (STATE_VERSION_CONFLICT, LEVEL_NOT_IN_PROGRESS, REWARD_PENDING_CLAIM — ECON-014), 500 INTERNAL_ERROR.
   *
   * @tags gameplay
   * @name SubmitRoute
   * @summary Передать завершённый маршрут по клеткам и получить результат серверной проверки
   * @request POST:/api/v1/levels/{levelId}/routes
   * @secure
   * @response `200` `SubmitRouteData` Результат проверки маршрута (found target / found bonus / invalid / repeated). Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed (replay возвращает сохранённый результат).
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: REQUIRED_FIELD (отсутствие route / пустое тело), INVALID_FORMAT (levelId не UUID; malformed JSON), OUT_OF_RANGE (длина route < 2 или > 36, координаты вне сетки 3x3..6x6), DUPLICATE_CELL (повтор клетки в маршруте), NON_ADJACENT_CELL (не-ортогональное соседство), TOO_LARGE_PAYLOAD (тело > 32 KiB).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, LEVEL_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (payload.currentEtag), LEVEL_NOT_IN_PROGRESS, REWARD_PENDING_CLAIM (обязательная доступная награда должна быть получена до игрового действия, ECON-014).
   * @response `500` `ProcessProblem`
   */
  submitRoute = (
    { levelId }: SubmitRouteParams,
    data: RouteSubmissionRequest,
    params: RequestParams = {},
  ) =>
    this.http.request<SubmitRouteData, SubmitRouteError>({
      path: `/api/v1/levels/${levelId}/routes`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description API-010 / INF.10. Пользователь изменил настройки (музыка/звук) в UI. Тело обязано содержать хотя бы одно из musicEnabled/soundEnabled; пустой объект {} недопустим (400 REQUIRED_FIELD, это не no-op). tutorialCompleted — обязательное read-only поле из CLIENT.settings (строгий JSONB, DATA-023), только server-controlled: клиент не передаёт его (MUST NOT, иначе 400 READ_ONLY_FIELD). Ошибки: 400 (REQUIRED_FIELD для {}, READ_ONLY_FIELD для tutorialCompleted, UNKNOWN_FIELD, TOO_LARGE_PAYLOAD), 401, 403, 404 CLIENT_NOT_FOUND, 409 STATE_VERSION_CONFLICT, 500 INTERNAL_ERROR.
   *
   * @tags settings
   * @name UpdateSettings
   * @summary Сохранить настройки игры (музыка/звук) и получить серверно подтверждённое состояние
   * @request PATCH:/api/v1/clients/me/settings
   * @secure
   * @response `200` `UpdateSettingsData` Настройки сохранены: серверно подтверждённое состояние (включая server-controlled tutorialCompleted). Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: REQUIRED_FIELD (пустой объект {}, отсутствие обоих полей), READ_ONLY_FIELD (передача server-controlled поля tutorialCompleted), UNKNOWN_FIELD (поле, не известное серверу), TOO_LARGE_PAYLOAD (тело > 32 KiB).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (устаревший If-Match, payload.currentEtag).
   * @response `500` `ProcessProblem`
   */
  updateSettings = (data: UpdateSettingsRequest, params: RequestParams = {}) =>
    this.http.request<UpdateSettingsData, UpdateSettingsError>({
      path: `/api/v1/clients/me/settings`,
      method: "PATCH",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description API-007 / INF.07. Пользователь запросил подсказку (раскрытие следующей буквы canonical-пути целевого слова). Тело отсутствует. Списывает 1 балл из глобального CLIENT.hint_balance (per-level бюджетов нет); раскрытие финальной буквы завершает целевое слово (+1 knowledgePoints), может завершить уровень и открыть награду (rewardOpened). Ответ самодостаточен — повторный refetch уровня не требуется. Ошибки: 400 (валидация входных данных), 401, 403, 404 (CLIENT_NOT_FOUND, LEVEL_NOT_FOUND), 409 (STATE_VERSION_CONFLICT, LEVEL_NOT_IN_PROGRESS, HINTS_EXHAUSTED, REWARD_PENDING_CLAIM), 500 INTERNAL_ERROR.
   *
   * @tags gameplay
   * @name UseHint
   * @summary Использовать подсказку и получить обновлённое состояние цели
   * @request POST:/api/v1/levels/{levelId}/hints
   * @secure
   * @response `200` `UseHintData` Подсказка применена: раскрытые клетки серии, при завершении цели — completedTarget и найденные слова. Заголовок ETag — обновлённый сильный ETag состояния клиента. Заголовок Idempotency-Key-Status: processed | replayed.
   * @response `400` `ValidationProblem` VALIDATION_ERROR — корневой errors[]. Коды для этой операции: INVALID_FORMAT (path-параметр levelId не UUID; невалидный формат заголовков).
   * @response `401` `ProcessProblem`
   * @response `403` `ProcessProblem`
   * @response `404` `ProcessProblem` NOT FOUND — ProcessProblem. Коды для этой операции: CLIENT_NOT_FOUND, LEVEL_NOT_FOUND.
   * @response `409` `ProcessProblem` CONFLICT — ProcessProblem. Коды для этой операции: STATE_VERSION_CONFLICT (payload.currentEtag), LEVEL_NOT_IN_PROGRESS, HINTS_EXHAUSTED (баланс подсказок исчерпан), REWARD_PENDING_CLAIM (ECON-014).
   * @response `500` `ProcessProblem`
   */
  useHint = ({ levelId }: UseHintParams, params: RequestParams = {}) =>
    this.http.request<UseHintData, UseHintError>({
      path: `/api/v1/levels/${levelId}/hints`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
}
