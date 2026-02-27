export interface DirectorConfig {
  id: string;
  slug: string;
  displayName: string;
  roleDescription: string;
  systemPrompt: string;
  toolWhitelist: string[];
  modelPreference: string;
}

export interface DirectorResult {
  directorSlug: string;
  summary: string;
  resultData: Record<string, unknown>;
  tokensUsed: number;
  durationMs: number;
}
