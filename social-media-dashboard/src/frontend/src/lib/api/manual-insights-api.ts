/**
 * Manual Instagram/Facebook CSV/ZIP upload API helpers.
 */

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  'http://localhost:8000';
const DEFAULT_MANUAL_ACCOUNT_ID = 'ClubArtizen';

export type ManualPlatform = 'insta' | 'facebook' | 'linkedin';
export type ManualUploadMode = 'csv' | 'zip' | 'xls';
export type ManualInstagramUploadScope = 'channelwise' | 'posts';

export interface ManualUploadResult {
  message: string;
  source?: string;
  ig_user_id?: string;
  fb_user_id?: string;
  li_org_id?: string;
  processed_files?: number;
  processed_file_names?: string[];
  touched_dates?: number;
  created_entries?: number;
  updated_entries?: number;
  metric_keys?: string[];
  archive_name?: string;
  processed_file?: string;
  processed_posts?: number;
  [key: string]: unknown;
}

export interface ManualUploadInput {
  platform: ManualPlatform;
  mode: ManualUploadMode;
  instagramScope?: ManualInstagramUploadScope;
  accountId: string;
  files: File[];
}

function stringifyDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(stringifyDetail).filter(Boolean).join(', ');
  }
  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  return '';
}

export function getManualUploadPath(
  platform: ManualPlatform,
  mode: ManualUploadMode,
  accountId: string,
  instagramScope: ManualInstagramUploadScope = 'channelwise',
): string {
  const normalizedAccountId = accountId.trim() || DEFAULT_MANUAL_ACCOUNT_ID;
  const safeId = encodeURIComponent(normalizedAccountId);

  if (platform === 'linkedin') {
    return `/manual/linkedin/xls/${safeId}`;
  }

  if (platform === 'insta' && instagramScope === 'posts') {
    return `/manual/insta/posts/${safeId}/csvs`;
  }

  const endpointType = mode === 'zip' ? 'folders' : 'csvs';
  return `/manual/${platform}/${endpointType}/${safeId}`;
}

export async function uploadManualInsights({
  platform,
  mode,
  instagramScope = 'channelwise',
  accountId,
  files,
}: ManualUploadInput): Promise<ManualUploadResult> {
  const path = getManualUploadPath(platform, mode, accountId, instagramScope);
  const formData = new FormData();

  if (platform === 'linkedin') {
    const workbook = files[0];
    if (!workbook) {
      throw new Error('Please choose a LinkedIn .xls workbook to upload.');
    }
    formData.append('xls_file', workbook);
  } else if (platform === 'insta' && instagramScope === 'posts') {
    if (files.length === 0) {
      throw new Error('Please choose one or more post CSV files to upload.');
    }
    files.forEach((file) => formData.append('posts_csv', file));
  } else if (mode === 'csv') {
    files.forEach((file) => formData.append('files', file));
  } else {
    const archive = files[0];
    if (!archive) {
      throw new Error('Please choose a ZIP file to upload.');
    }
    formData.append('folder_archive', archive);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    const detailMessage = stringifyDetail(detail);
    throw new Error(detailMessage || `Upload failed (${response.status}).`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Upload completed but response payload was invalid.');
  }

  return payload as ManualUploadResult;
}

export interface InstagramDashboardLayoutWidget {
  instance_id: string;
  widget_id: string;
  config?: Record<string, string | number | boolean | null>;
}

export interface InstagramDashboardLayoutPayload {
  ig_user_id: string;
  dashboard_user_id: string;
  active_widgets: InstagramDashboardLayoutWidget[];
  updated_at?: string | null;
}

export async function fetchInstagramDashboardLayout(
  igUserId: string,
  dashboardUserId?: string,
): Promise<InstagramDashboardLayoutPayload> {
  const normalizedIgUserId = igUserId.trim() || DEFAULT_MANUAL_ACCOUNT_ID;
  const query = dashboardUserId?.trim()
    ? `?dashboard_user_id=${encodeURIComponent(dashboardUserId.trim())}`
    : '';
  const response = await fetch(
    `${BASE_URL}/manual/insta/layout/${encodeURIComponent(normalizedIgUserId)}${query}`,
    { cache: 'no-store' },
  );

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    throw new Error(stringifyDetail(detail) || `Layout fetch failed (${response.status}).`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Layout fetch completed but response payload was invalid.');
  }

  return payload as InstagramDashboardLayoutPayload;
}

export async function saveInstagramDashboardLayout(params: {
  igUserId: string;
  dashboardUserId?: string;
  activeWidgets: InstagramDashboardLayoutWidget[];
}): Promise<InstagramDashboardLayoutPayload> {
  const normalizedIgUserId = params.igUserId.trim() || DEFAULT_MANUAL_ACCOUNT_ID;
  const response = await fetch(
    `${BASE_URL}/manual/insta/layout/${encodeURIComponent(normalizedIgUserId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dashboard_user_id: params.dashboardUserId?.trim() || undefined,
        active_widgets: params.activeWidgets,
      }),
    },
  );

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    throw new Error(stringifyDetail(detail) || `Layout save failed (${response.status}).`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Layout save completed but response payload was invalid.');
  }

  return payload as InstagramDashboardLayoutPayload;
}

export interface FacebookDashboardLayoutPayload {
  fb_user_id: string;
  dashboard_user_id: string;
  active_widgets: InstagramDashboardLayoutWidget[];
  updated_at?: string | null;
}

export async function fetchFacebookDashboardLayout(
  fbUserId: string,
  dashboardUserId?: string,
): Promise<FacebookDashboardLayoutPayload> {
  const normalizedFbUserId = fbUserId.trim() || DEFAULT_MANUAL_ACCOUNT_ID;
  const query = dashboardUserId?.trim()
    ? `?dashboard_user_id=${encodeURIComponent(dashboardUserId.trim())}`
    : '';
  const response = await fetch(
    `${BASE_URL}/manual/facebook/layout/${encodeURIComponent(normalizedFbUserId)}${query}`,
    { cache: 'no-store' },
  );

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    throw new Error(stringifyDetail(detail) || `Layout fetch failed (${response.status}).`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Layout fetch completed but response payload was invalid.');
  }

  return payload as FacebookDashboardLayoutPayload;
}

export async function saveFacebookDashboardLayout(params: {
  fbUserId: string;
  dashboardUserId?: string;
  activeWidgets: InstagramDashboardLayoutWidget[];
}): Promise<FacebookDashboardLayoutPayload> {
  const normalizedFbUserId = params.fbUserId.trim() || DEFAULT_MANUAL_ACCOUNT_ID;
  const response = await fetch(
    `${BASE_URL}/manual/facebook/layout/${encodeURIComponent(normalizedFbUserId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dashboard_user_id: params.dashboardUserId?.trim() || undefined,
        active_widgets: params.activeWidgets,
      }),
    },
  );

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    throw new Error(stringifyDetail(detail) || `Layout save failed (${response.status}).`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Layout save completed but response payload was invalid.');
  }

  return payload as FacebookDashboardLayoutPayload;
}

export interface LinkedInDashboardLayoutPayload {
  li_org_id: string;
  dashboard_user_id: string;
  active_widgets: InstagramDashboardLayoutWidget[];
  updated_at?: string | null;
}

export async function fetchLinkedInDashboardLayout(
  liOrgId: string,
  dashboardUserId?: string,
): Promise<LinkedInDashboardLayoutPayload> {
  const normalizedLiOrgId = liOrgId.trim() || DEFAULT_MANUAL_ACCOUNT_ID;
  const query = dashboardUserId?.trim()
    ? `?dashboard_user_id=${encodeURIComponent(dashboardUserId.trim())}`
    : '';
  const response = await fetch(
    `${BASE_URL}/manual/linkedin/layout/${encodeURIComponent(normalizedLiOrgId)}${query}`,
    { cache: 'no-store' },
  );

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    throw new Error(stringifyDetail(detail) || `Layout fetch failed (${response.status}).`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Layout fetch completed but response payload was invalid.');
  }

  return payload as LinkedInDashboardLayoutPayload;
}

export async function saveLinkedInDashboardLayout(params: {
  liOrgId: string;
  dashboardUserId?: string;
  activeWidgets: InstagramDashboardLayoutWidget[];
}): Promise<LinkedInDashboardLayoutPayload> {
  const normalizedLiOrgId = params.liOrgId.trim() || DEFAULT_MANUAL_ACCOUNT_ID;
  const response = await fetch(
    `${BASE_URL}/manual/linkedin/layout/${encodeURIComponent(normalizedLiOrgId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dashboard_user_id: params.dashboardUserId?.trim() || undefined,
        active_widgets: params.activeWidgets,
      }),
    },
  );

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : payload;
    throw new Error(stringifyDetail(detail) || `Layout save failed (${response.status}).`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Layout save completed but response payload was invalid.');
  }

  return payload as LinkedInDashboardLayoutPayload;
}
