export type HttpMethod = 'GET' | 'POST' | 'PATCH';

export type DemoOperationId =
  | 'bootstrap'
  | 'state'
  | 'start-level'
  | 'resume-level'
  | 'submit-route'
  | 'use-hint'
  | 'level-results'
  | 'claim-reward'
  | 'acknowledge-results'
  | 'update-settings'
  | 'appearances'
  | 'select-appearance'
  | 'submit-feedback';

export interface OperationSpec {
  apiId: DemoOperationId;
  method: HttpMethod;
  templatePath: string;
  mutation: boolean;
  ifMatch: boolean;
}

export const operationRegistry: OperationSpec[] = [
  { apiId: 'bootstrap', method: 'POST', templatePath: '/demo-api/bootstrap', mutation: true, ifMatch: false },
  { apiId: 'state', method: 'GET', templatePath: '/demo-api/state', mutation: false, ifMatch: false },
  { apiId: 'start-level', method: 'POST', templatePath: '/demo-api/levels/{levelId}/start', mutation: true, ifMatch: true },
  { apiId: 'resume-level', method: 'GET', templatePath: '/demo-api/levels/{levelId}/state', mutation: false, ifMatch: false },
  { apiId: 'submit-route', method: 'POST', templatePath: '/demo-api/levels/{levelId}/routes', mutation: true, ifMatch: true },
  { apiId: 'use-hint', method: 'POST', templatePath: '/demo-api/levels/{levelId}/hints', mutation: true, ifMatch: true },
  { apiId: 'level-results', method: 'GET', templatePath: '/demo-api/levels/{levelId}/results', mutation: false, ifMatch: false },
  { apiId: 'claim-reward', method: 'POST', templatePath: '/demo-api/rewards/{rewardId}/claim', mutation: true, ifMatch: true },
  { apiId: 'acknowledge-results', method: 'POST', templatePath: '/demo-api/levels/{levelId}/results/acknowledge', mutation: true, ifMatch: true },
  { apiId: 'update-settings', method: 'PATCH', templatePath: '/demo-api/settings', mutation: true, ifMatch: true },
  { apiId: 'appearances', method: 'GET', templatePath: '/demo-api/appearances', mutation: false, ifMatch: false },
  { apiId: 'select-appearance', method: 'POST', templatePath: '/demo-api/appearances/{appearanceId}/select', mutation: true, ifMatch: true },
  { apiId: 'submit-feedback', method: 'POST', templatePath: '/demo-api/feedback', mutation: true, ifMatch: true },
];

export function toMswPath(templatePath: string): string {
  return templatePath.replace(/\{([^}]+)\}/g, ':$1');
}
