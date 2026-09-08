/**
 * Network contract matrix — the single handwritten metadata source for the 16
 * in-scope operations (API-001–015, 017).
 *
 * The generated client (`src/infra/api/generated`) remains the single wire-types
 * source; this registry only records exact method/template-path/header flags and
 * the request body contract per operation. Paths are OpenAPI template paths
 * (`{param}`), never resolved URLs.
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH';

export interface OperationSpec {
  apiId: string;
  operationId: string;
  method: HttpMethod;
  templatePath: string;
  mutation: boolean;
  ifMatch: boolean;
  responseEtag: boolean;
  responseIks: boolean;
  bodyContract?: string;
}

export const operationRegistry: OperationSpec[] = [
  {
    apiId: 'API-001',
    operationId: 'bootstrap',
    method: 'POST',
    templatePath: '/api/v1/clients/me/bootstrap',
    mutation: true,
    ifMatch: false,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-002',
    operationId: 'getCurrentState',
    method: 'GET',
    templatePath: '/api/v1/clients/me/state',
    mutation: false,
    ifMatch: false,
    responseEtag: true,
    responseIks: false,
  },
  {
    apiId: 'API-003',
    operationId: 'confirmNarrativeShown',
    method: 'POST',
    templatePath: '/api/v1/chapters/{chapterId}/narrative-shown',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-004',
    operationId: 'startLevel',
    method: 'POST',
    templatePath: '/api/v1/levels/{levelId}/start',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-005',
    operationId: 'resumeLevel',
    method: 'GET',
    templatePath: '/api/v1/levels/{levelId}/state',
    mutation: false,
    ifMatch: false,
    responseEtag: true,
    responseIks: false,
  },
  {
    apiId: 'API-006',
    operationId: 'submitRoute',
    method: 'POST',
    templatePath: '/api/v1/levels/{levelId}/routes',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
    bodyContract: 'RouteSubmissionRequest',
  },
  {
    apiId: 'API-007',
    operationId: 'useHint',
    method: 'POST',
    templatePath: '/api/v1/levels/{levelId}/hints',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-008',
    operationId: 'getLevelResults',
    method: 'GET',
    templatePath: '/api/v1/levels/{levelId}/results',
    mutation: false,
    ifMatch: false,
    responseEtag: true,
    responseIks: false,
  },
  {
    apiId: 'API-009',
    operationId: 'claimReward',
    method: 'POST',
    templatePath: '/api/v1/rewards/{rewardId}/claim',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
    bodyContract: 'ClaimRewardRequest',
  },
  {
    apiId: 'API-017',
    operationId: 'acknowledgeLevelResults',
    method: 'POST',
    templatePath: '/api/v1/levels/{levelId}/results/acknowledge',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-010',
    operationId: 'updateSettings',
    method: 'PATCH',
    templatePath: '/api/v1/clients/me/settings',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
    bodyContract: 'UpdateSettingsRequest',
  },
  {
    apiId: 'API-011',
    operationId: 'getAppearanceCatalog',
    method: 'GET',
    templatePath: '/api/v1/appearances',
    mutation: false,
    ifMatch: false,
    responseEtag: true,
    responseIks: false,
  },
  {
    apiId: 'API-012',
    operationId: 'selectAppearance',
    method: 'POST',
    templatePath: '/api/v1/appearances/{appearanceId}/select',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-013',
    operationId: 'submitFeedback',
    method: 'POST',
    templatePath: '/api/v1/feedbacks',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
    bodyContract: 'SubmitFeedbackRequest',
  },
  {
    apiId: 'API-014',
    operationId: 'dismissFeedback',
    method: 'POST',
    templatePath: '/api/v1/chapters/{chapterId}/feedback-prompt/dismiss',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-015',
    operationId: 'confirmCampaignCompleteShown',
    method: 'POST',
    templatePath: '/api/v1/campaigns/current/completion-shown',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
];
