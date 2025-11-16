
export enum TestFocus {
  UI_E2E = 'UI/E2E',
  API = 'API',
  BusinessRules = 'Business Rules',
}

export enum DetailLevel {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export interface FormState {
  userStory: string;
  systemUrl: string;
  testFocus: TestFocus;
  detailLevel: DetailLevel;
}
