export type MunicipalityStatus = 'Active' | 'Upcoming';
export type RolloutStage = 'assessment' | 'onboarding' | 'validation' | 'activation';

/** A CARCANMADCARLAN municipality shown on the public selector (mirrors the React model 1:1). */
export interface Municipality {
  code: string;
  name: string;
  status: MunicipalityStatus;
  image: string;
  active?: boolean;
  href?: string;
  rolloutStage?: RolloutStage;
}
