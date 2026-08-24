import type {
  AcknowledgeLevelResultsResponse,
  AppearanceCatalogResponse,
  CellRef,
  ClaimRewardRequest,
  ClaimRewardResponse,
  ClientStateResponse,
  HintUseResponse,
  LevelPlayResponse,
  LevelResultsResponse,
  RouteSubmissionResponse,
  SelectAppearanceResponse,
  SettingsResponse,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
  UpdateSettingsRequest,
} from '../../shared/demoTypes';
import { createHttpApiAdapter } from '../../infra/api/adapters/httpApiAdapter';
import type { HttpResponseResult } from '../../infra/api/adapters/httpApiAdapter';
import { operationRegistry } from '../../infra/api/operationRegistry';
import { createEtagStore } from '../../infra/http/etagStore';
import { createMutationCoordinator } from '../../infra/http/mutationCoordinator';

export interface P1Api {
  loadState(signal?: AbortSignal): Promise<ClientStateResponse>;
  enterLevel(
    state: ClientStateResponse,
    signal?: AbortSignal,
  ): Promise<LevelPlayResponse>;
  useHint(levelId: string, signal?: AbortSignal): Promise<HintUseResponse>;
  submitRoute(
    levelId: string,
    route: CellRef[],
    signal?: AbortSignal,
  ): Promise<RouteSubmissionResponse>;
  updateSettings(body: UpdateSettingsRequest): Promise<SettingsResponse>;
  getAppearances(): Promise<AppearanceCatalogResponse>;
  selectAppearance(appearanceId: string): Promise<SelectAppearanceResponse>;
  submitFeedback(body: SubmitFeedbackRequest): Promise<SubmitFeedbackResponse>;
  getLevelResults(
    levelId: string,
    signal?: AbortSignal,
  ): Promise<LevelResultsResponse>;
  acknowledgeLevelResults(
    levelId: string,
    signal?: AbortSignal,
  ): Promise<AcknowledgeLevelResultsResponse>;
  claimReward(
    rewardId: string,
    body: ClaimRewardRequest,
    signal?: AbortSignal,
  ): Promise<ClaimRewardResponse>;
}

type PathParams = Record<string, string>;

interface FlowError extends Error {
  type: string;
}

interface OperationScope {
  generation: number;
  signal?: AbortSignal;
}

function createFlowError(type: string): FlowError {
  const error = new Error(type) as FlowError;
  error.type = type;
  return error;
}

function createAbortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

function errorType(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('type' in error)) {
    return undefined;
  }
  return typeof error.type === 'string' ? error.type : undefined;
}

function shouldRetainIntent(error: unknown): boolean {
  const type = errorType(error);
  if (!type || type === 'UNKNOWN_ERROR') return true;
  if (type !== 'INTERNAL_ERROR') return false;
  const record = typeof error === 'object' && error !== null
    ? error as Record<string, unknown>
    : undefined;
  const payload = record && typeof record.payload === 'object'
    ? record.payload as Record<string, unknown>
    : undefined;
  return payload?.retryable === true;
}

function operationPath(apiId: string, params: PathParams = {}): string {
  const operation = operationRegistry.find((candidate) => candidate.apiId === apiId);
  if (!operation) {
    throw new Error(`Unknown API operation: ${apiId}`);
  }
  return operation.templatePath.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = params[key];
    if (!value) {
      throw new Error(`Missing path parameter ${key} for ${apiId}`);
    }
    return encodeURIComponent(value);
  });
}

export function createP1Api(): P1Api {
  const etagStore = createEtagStore();
  const mutationCoordinator = createMutationCoordinator();
  const http = createHttpApiAdapter({
    baseUrl: import.meta.env.MODE === 'test' ? 'http://localhost' : '',
  });
  let currentOperationGeneration = 0;

  function beginOperation(signal?: AbortSignal): OperationScope {
    currentOperationGeneration += 1;
    return { generation: currentOperationGeneration, signal };
  }

  function assertCurrentOperation(scope: OperationScope): void {
    if (scope.signal?.aborted) throw createAbortError();
    if (scope.generation !== currentOperationGeneration) {
      throw new Error('Stale operation response ignored');
    }
  }

  function commitResponse<T>(
    response: HttpResponseResult<T>,
    scope: OperationScope,
  ): T {
    assertCurrentOperation(scope);
    if (response.etag) etagStore.set(response.etag);
    return response.data;
  }

  async function sendMutationAttempt<T>(
    apiId: string,
    body: unknown,
    intent: ReturnType<typeof mutationCoordinator.begin>,
    scope: OperationScope,
    params: PathParams = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const operation = operationRegistry.find((candidate) => candidate.apiId === apiId);
    if (!operation || !operation.mutation) {
      throw new Error(`Operation ${apiId} is not a registered mutation`);
    }

    const headers: Record<string, string> = {
      'Idempotency-Key': intent.key,
    };
    if (operation.ifMatch) {
      const etag = etagStore.getCurrent();
      if (!etag) {
        mutationCoordinator.resolve(intent.intentId);
        throw new Error(`No current ETag for ${apiId}`);
      }
      headers['If-Match'] = etag;
    }

    const options = {
      ...(body === undefined ? {} : { body }),
      headers,
      signal,
    };
    const response =
      operation.method === 'PATCH'
        ? await http.patch<T>(operationPath(apiId, params), options)
        : await http.post<T>(operationPath(apiId, params), options);

    assertCurrentOperation(scope);
    if (mutationCoordinator.isStale(intent.intentId, intent.requestGeneration)) {
      throw new Error(`Stale response ignored for ${apiId}`);
    }
    return commitResponse(response, scope);
  }

  async function mutate<T>(
    apiId: string,
    body: unknown,
    scope: OperationScope,
    params: PathParams = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const intent = mutationCoordinator.begin({ apiId, params, body });
    try {
      const data = await sendMutationAttempt<T>(apiId, body, intent, scope, params, signal);
      mutationCoordinator.resolve(intent.intentId);
      return data;
    } catch (error) {
      mutationCoordinator.resolve(intent.intentId);
      throw error;
    }
  }

  async function readState(
    scope: OperationScope,
    signal?: AbortSignal,
  ): Promise<ClientStateResponse> {
    const response = await http.get<ClientStateResponse>(operationPath('state'), {
      signal,
    });
    return commitResponse(response, scope);
  }

  async function resumeLevel(
    levelId: string,
    scope: OperationScope,
    signal?: AbortSignal,
  ): Promise<LevelPlayResponse> {
    const response = await http.get<LevelPlayResponse>(
      operationPath('resume-level', { levelId }),
      { signal },
    );
    return commitResponse(response, scope);
  }

  async function getLevelResults(
    levelId: string,
    scope: OperationScope,
    signal?: AbortSignal,
  ): Promise<LevelResultsResponse> {
    const response = await http.get<LevelResultsResponse>(
      operationPath('level-results', { levelId }),
      { signal },
    );
    return commitResponse(response, scope);
  }

  function onlyAvailableLevel(state: ClientStateResponse): string {
    const available = state.clientState.levels.filter(
      (level) => level.status === 'available',
    );
    if (available.length === 0) throw createFlowError('NO_AVAILABLE_LEVEL');
    if (available.length > 1) throw createFlowError('AMBIGUOUS_AVAILABLE_LEVEL');
    return available[0].levelId;
  }

  async function startLevel(
    state: ClientStateResponse,
    scope: OperationScope,
    signal?: AbortSignal,
  ): Promise<LevelPlayResponse> {
    const levelId = onlyAvailableLevel(state);
    const descriptor = { apiId: 'start-level', params: { levelId } };
    const intent = mutationCoordinator.beginOrRetry(descriptor);

    try {
      const data = await sendMutationAttempt<LevelPlayResponse>(
        'start-level',
        undefined,
        intent,
        scope,
        { levelId },
        signal,
      );
      mutationCoordinator.resolve(intent.intentId);
      return data;
    } catch (error) {
      if (errorType(error) !== 'STATE_VERSION_CONFLICT') {
        if (!shouldRetainIntent(error)) mutationCoordinator.resolve(intent.intentId);
        throw error;
      }

      try {
        const refreshed = await readState(scope, signal);
        const inProgressLevel = refreshed.clientState.inProgressLevel;
        if (inProgressLevel) {
          mutationCoordinator.resolve(intent.intentId);
          return resumeLevel(inProgressLevel.levelId, scope, signal);
        }
        const refreshedLevelId = onlyAvailableLevel(refreshed);
        if (refreshedLevelId !== levelId) {
          mutationCoordinator.resolve(intent.intentId);
          throw createFlowError('AVAILABLE_LEVEL_CHANGED');
        }

        const retryIntent = mutationCoordinator.beginOrRetry(descriptor);
        const data = await sendMutationAttempt<LevelPlayResponse>(
          'start-level',
          undefined,
          retryIntent,
          scope,
          { levelId },
          signal,
        );
        mutationCoordinator.resolve(retryIntent.intentId);
        return data;
      } catch (recoveryError) {
        if (!shouldRetainIntent(recoveryError)) {
          mutationCoordinator.resolve(intent.intentId);
        }
        throw recoveryError;
      }
    }
  }

  async function useHint(
    levelId: string,
    scope: OperationScope,
    signal?: AbortSignal,
  ): Promise<HintUseResponse> {
    const descriptor = { apiId: 'use-hint', params: { levelId } };
    const intent = mutationCoordinator.beginOrRetry(descriptor);

    try {
      const data = await sendMutationAttempt<HintUseResponse>(
        'use-hint',
        undefined,
        intent,
        scope,
        { levelId },
        signal,
      );
      mutationCoordinator.resolve(intent.intentId);
      return data;
    } catch (error) {
      if (errorType(error) !== 'STATE_VERSION_CONFLICT') {
        if (!shouldRetainIntent(error)) mutationCoordinator.resolve(intent.intentId);
        throw error;
      }

      try {
        const activeLevel = await resumeLevel(levelId, scope, signal);
        if (activeLevel.targetsRemaining <= 0) {
          mutationCoordinator.resolve(intent.intentId);
          throw createFlowError('LEVEL_NOT_IN_PROGRESS');
        }
        const retryIntent = mutationCoordinator.beginOrRetry(descriptor);
        const data = await sendMutationAttempt<HintUseResponse>(
          'use-hint',
          undefined,
          retryIntent,
          scope,
          { levelId },
          signal,
        );
        mutationCoordinator.resolve(retryIntent.intentId);
        return data;
      } catch (recoveryError) {
        if (!shouldRetainIntent(recoveryError)) {
          mutationCoordinator.resolve(intent.intentId);
        }
        throw recoveryError;
      }
    }
  }

  async function submitRoute(
    levelId: string,
    route: CellRef[],
    scope: OperationScope,
    signal?: AbortSignal,
  ): Promise<RouteSubmissionResponse> {
    const body = { route };
    const descriptor = { apiId: 'submit-route', params: { levelId }, body };
    const intent = mutationCoordinator.beginOrRetry(descriptor);

    try {
      const data = await sendMutationAttempt<RouteSubmissionResponse>(
        'submit-route',
        body,
        intent,
        scope,
        { levelId },
        signal,
      );
      mutationCoordinator.resolve(intent.intentId);
      return data;
    } catch (error) {
      if (errorType(error) !== 'STATE_VERSION_CONFLICT') {
        if (!shouldRetainIntent(error)) mutationCoordinator.resolve(intent.intentId);
        throw error;
      }

      try {
        const activeLevel = await resumeLevel(levelId, scope, signal);
        if (activeLevel.targetsRemaining <= 0) {
          mutationCoordinator.resolve(intent.intentId);
          throw createFlowError('LEVEL_NOT_IN_PROGRESS');
        }
        const retryIntent = mutationCoordinator.beginOrRetry(descriptor);
        const data = await sendMutationAttempt<RouteSubmissionResponse>(
          'submit-route',
          body,
          retryIntent,
          scope,
          { levelId },
          signal,
        );
        mutationCoordinator.resolve(retryIntent.intentId);
        return data;
      } catch (recoveryError) {
        if (!shouldRetainIntent(recoveryError)) {
          mutationCoordinator.resolve(intent.intentId);
        }
        throw recoveryError;
      }
    }
  }

  async function claimReward(
    rewardId: string,
    body: ClaimRewardRequest,
    scope: OperationScope,
    signal?: AbortSignal,
  ): Promise<ClaimRewardResponse> {
    const descriptor = { apiId: 'claim-reward', params: { rewardId }, body };
    const intent = mutationCoordinator.beginOrRetry(descriptor);

    try {
      const data = await sendMutationAttempt<ClaimRewardResponse>(
        'claim-reward',
        body,
        intent,
        scope,
        { rewardId },
        signal,
      );
      mutationCoordinator.resolve(intent.intentId);
      return data;
    } catch (error) {
      if (errorType(error) !== 'STATE_VERSION_CONFLICT') {
        if (!shouldRetainIntent(error)) mutationCoordinator.resolve(intent.intentId);
        throw error;
      }

      try {
        const refreshed = await readState(scope, signal);
        const hasExactAvailableReward = refreshed.clientState.rewards.some(
          (reward) => reward.rewardId === rewardId && reward.status === 'available',
        );
        if (
          refreshed.clientState.pendingReward?.rewardId !== rewardId
          || !hasExactAvailableReward
        ) {
          throw error;
        }
        const retryIntent = mutationCoordinator.beginOrRetry(descriptor);
        const data = await sendMutationAttempt<ClaimRewardResponse>(
          'claim-reward',
          body,
          retryIntent,
          scope,
          { rewardId },
          signal,
        );
        mutationCoordinator.resolve(retryIntent.intentId);
        return data;
      } catch (recoveryError) {
        if (!shouldRetainIntent(recoveryError)) {
          mutationCoordinator.resolve(intent.intentId);
        }
        throw recoveryError;
      }
    }
  }

  async function acknowledgeLevelResults(
    levelId: string,
    scope: OperationScope,
    signal?: AbortSignal,
  ): Promise<AcknowledgeLevelResultsResponse> {
    const descriptor = { apiId: 'acknowledge-results', params: { levelId } };
    const intent = mutationCoordinator.beginOrRetry(descriptor);

    try {
      const data = await sendMutationAttempt<AcknowledgeLevelResultsResponse>(
        'acknowledge-results',
        undefined,
        intent,
        scope,
        { levelId },
        signal,
      );
      mutationCoordinator.resolve(intent.intentId);
      return data;
    } catch (error) {
      if (errorType(error) !== 'STATE_VERSION_CONFLICT') {
        if (!shouldRetainIntent(error)) mutationCoordinator.resolve(intent.intentId);
        throw error;
      }

      try {
        const refreshed = await readState(scope, signal);
        if (refreshed.clientState.pendingResults?.levelId !== levelId) {
          throw error;
        }
        const retryIntent = mutationCoordinator.beginOrRetry(descriptor);
        const data = await sendMutationAttempt<AcknowledgeLevelResultsResponse>(
          'acknowledge-results',
          undefined,
          retryIntent,
          scope,
          { levelId },
          signal,
        );
        mutationCoordinator.resolve(retryIntent.intentId);
        return data;
      } catch (recoveryError) {
        if (!shouldRetainIntent(recoveryError)) {
          mutationCoordinator.resolve(intent.intentId);
        }
        throw recoveryError;
      }
    }
  }

  return {
    async loadState(signal) {
      const scope = beginOperation(signal);
      await mutate<ClientStateResponse>('bootstrap', undefined, scope, {}, signal);
      return readState(scope, signal);
    },

    enterLevel(state, signal) {
      const scope = beginOperation(signal);
      const inProgressLevel = state.clientState.inProgressLevel;
      return inProgressLevel
        ? resumeLevel(inProgressLevel.levelId, scope, signal)
        : startLevel(state, scope, signal);
    },

    useHint(levelId, signal) {
      return useHint(levelId, beginOperation(signal), signal);
    },

    submitRoute(levelId, route, signal) {
      return submitRoute(levelId, route, beginOperation(signal), signal);
    },

    getLevelResults(levelId, signal) {
      return getLevelResults(levelId, beginOperation(signal), signal);
    },

    acknowledgeLevelResults(levelId, signal) {
      return acknowledgeLevelResults(levelId, beginOperation(signal), signal);
    },

    updateSettings(body) {
      return mutate<SettingsResponse>('update-settings', body, beginOperation());
    },

    async getAppearances() {
      const scope = beginOperation();
      const response = await http.get<AppearanceCatalogResponse>(operationPath('appearances'));
      return commitResponse(response, scope);
    },

    selectAppearance(appearanceId) {
      return mutate<SelectAppearanceResponse>(
        'select-appearance',
        undefined,
        beginOperation(),
        { appearanceId },
      );
    },

    async submitFeedback(body) {
      const scope = beginOperation();
      const comment = body.comment?.trim();
      const normalizedBody: SubmitFeedbackRequest = {
        source: body.source,
        rating: body.rating,
        ...(comment ? { comment } : {}),
      };
      const descriptor = { apiId: 'submit-feedback', body: normalizedBody };
      const intent = mutationCoordinator.beginOrRetry(descriptor);

      try {
        const data = await sendMutationAttempt<SubmitFeedbackResponse>(
          'submit-feedback',
          normalizedBody,
          intent,
          scope,
          {},
          undefined,
        );
        mutationCoordinator.resolve(intent.intentId);
        return data;
      } catch (error) {
        if (!shouldRetainIntent(error)) mutationCoordinator.resolve(intent.intentId);
        throw error;
      }
    },

    claimReward(rewardId, body, signal) {
      return claimReward(rewardId, body, beginOperation(signal), signal);
    },
  };
}

export const defaultP1Api = createP1Api();
