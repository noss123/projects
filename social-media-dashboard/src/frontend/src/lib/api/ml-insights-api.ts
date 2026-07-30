/**
 * API helpers for the standalone ML service used by Predictive Insights.
 */

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ML_API_BASE_URL) ||
  'http://localhost:8001';

export interface MlPostRequest {
  description: string;
  duration_sec: number;
  publish_time: string;
  post_type: string;
}

export interface MlPredictResponse {
  predicted_like_rate: number;
  baseline_rate: number;
  shap_explanations: Record<string, number>;
}

export interface MlIdeaRequest {
  topic: string;
  post_type?: string;
}

export interface MlIdeaResponse {
  topic?: string;
  ideas?: string;
  message?: string;
}

export interface MlInsightResponse {
  detected_trend?: string;
  momentum?: number;
  strategy_and_caption?: string;
  historical_posts_referenced?: number;
  message?: string;
}

export interface MlTrackedTermsResponse {
  tracked_terms: string[];
}

export interface MlMessageResponse {
  message: string;
}

interface ErrorPayload {
  detail?: unknown;
  message?: unknown;
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(stringifyUnknown).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...init,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const parsed = (payload ?? {}) as ErrorPayload;
    const detail = stringifyUnknown(parsed.detail) || stringifyUnknown(parsed.message);
    throw new Error(detail || `ML API request failed (${response.status}).`);
  }

  return (payload ?? {}) as T;
}

export function predictPostEngagement(input: MlPostRequest): Promise<MlPredictResponse> {
  return apiFetch<MlPredictResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function generateIdeas(input: MlIdeaRequest): Promise<MlIdeaResponse> {
  return apiFetch<MlIdeaResponse>('/generate_ideas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function generateInsight(): Promise<MlInsightResponse> {
  return apiFetch<MlInsightResponse>('/generate_insight', {
    method: 'POST',
  });
}

export function listTrackedTerms(): Promise<MlTrackedTermsResponse> {
  return apiFetch<MlTrackedTermsResponse>('/terms/list');
}

export function addTrackedTerm(term: string): Promise<MlMessageResponse> {
  return apiFetch<MlMessageResponse>('/terms/add', {
    method: 'POST',
    body: JSON.stringify({ term }),
  });
}

export function removeTrackedTerm(term: string): Promise<MlMessageResponse> {
  return apiFetch<MlMessageResponse>('/terms/remove', {
    method: 'DELETE',
    body: JSON.stringify({ term }),
  });
}

export function reloadMlModel(): Promise<MlMessageResponse> {
  return apiFetch<MlMessageResponse>('/admin/reload_model', {
    method: 'POST',
  });
}
