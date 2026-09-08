import { describe, expect, it } from 'vitest';
import { operationRegistry } from './operationRegistry';

interface OperationSpec {
  apiId: string;
  method: 'GET' | 'POST' | 'PATCH';
  templatePath: string;
  mutation: boolean;
  ifMatch: boolean;
  responseEtag: boolean;
  responseIks: boolean;
  bodyContract?: string;
}

// Network contract matrix (16 in-scope operations) — API-001..015 plus API-017.
const expected: OperationSpec[] = [
  {
    apiId: 'API-001',
    method: 'POST',
    templatePath: '/api/v1/clients/me/bootstrap',
    mutation: true,
    ifMatch: false,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-002',
    method: 'GET',
    templatePath: '/api/v1/clients/me/state',
    mutation: false,
    ifMatch: false,
    responseEtag: true,
    responseIks: false,
  },
  {
    apiId: 'API-003',
    method: 'POST',
    templatePath: '/api/v1/chapters/{chapterId}/narrative-shown',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-004',
    method: 'POST',
    templatePath: '/api/v1/levels/{levelId}/start',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-005',
    method: 'GET',
    templatePath: '/api/v1/levels/{levelId}/state',
    mutation: false,
    ifMatch: false,
    responseEtag: true,
    responseIks: false,
  },
  {
    apiId: 'API-006',
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
    method: 'POST',
    templatePath: '/api/v1/levels/{levelId}/hints',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-008',
    method: 'GET',
    templatePath: '/api/v1/levels/{levelId}/results',
    mutation: false,
    ifMatch: false,
    responseEtag: true,
    responseIks: false,
  },
  {
    apiId: 'API-009',
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
    method: 'POST',
    templatePath: '/api/v1/levels/{levelId}/results/acknowledge',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-010',
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
    method: 'GET',
    templatePath: '/api/v1/appearances',
    mutation: false,
    ifMatch: false,
    responseEtag: true,
    responseIks: false,
  },
  {
    apiId: 'API-012',
    method: 'POST',
    templatePath: '/api/v1/appearances/{appearanceId}/select',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-013',
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
    method: 'POST',
    templatePath: '/api/v1/chapters/{chapterId}/feedback-prompt/dismiss',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
  {
    apiId: 'API-015',
    method: 'POST',
    templatePath: '/api/v1/campaigns/current/completion-shown',
    mutation: true,
    ifMatch: true,
    responseEtag: true,
    responseIks: true,
  },
];

describe('operationRegistry — network contract matrix (16 in-scope API)', () => {
  it('содержит ровно 16 in-scope операций', () => {
    expect(operationRegistry).toHaveLength(16);
  });

  it.each(expected)('$apiId — $method $templatePath', (spec) => {
    const entry = operationRegistry.find((e) => e.apiId === spec.apiId);
    expect(entry).toBeDefined();
    expect(entry?.method).toBe(spec.method);
    expect(entry?.templatePath).toBe(spec.templatePath);
    expect(entry?.mutation).toBe(spec.mutation);
    expect(entry?.ifMatch).toBe(spec.ifMatch);
    expect(entry?.responseEtag).toBe(spec.responseEtag);
    expect(entry?.responseIks).toBe(spec.responseIks);
    if (spec.bodyContract) {
      expect(entry?.bodyContract).toBe(spec.bodyContract);
    } else {
      expect(entry?.bodyContract).toBeUndefined();
    }
  });
});
