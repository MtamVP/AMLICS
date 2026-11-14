import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DataProfile,
  ExperimentRecord,
  NotebookCell,
  NotebookWorkspaceMeta,
  PipelineConfig,
  SupabaseCredentials,
} from '../types/studio';
import { StoredByokState } from '../utils/aiByokClient';

const STORAGE_SYNC_KEY = 'amlics_cloud_sync_key_v1';
const DEFAULT_SYNC_KEY = 'amlics-main-studio';

export interface CloudWorkspaceSnapshot extends NotebookWorkspaceMeta {
  config: PipelineConfig;
  cells: NotebookCell[];
  dataProfile: DataProfile | null;
  experiments?: ExperimentRecord[];
  selectedExpId?: string | null;
  trainDatasetUrl?: string | null;
  testDatasetUrl?: string | null;
}

export interface SyncStatusResult {
  ok: boolean;
  needsSchema?: boolean;
  error?: string;
}

export const SYNC_MIGRATION_SQL = `-- Chạy đoạn SQL này trong Supabase SQL Editor để bật đồng bộ đa máy:
create table if not exists public.amlics_notebooks (
    sync_key text not null,
    id text not null,
    name text not null default 'AMLICS_Pipeline_Notebook',
    config jsonb not null default '{}'::jsonb,
    cells jsonb not null default '[]'::jsonb,
    data_profile jsonb default null,
    experiments jsonb not null default '[]'::jsonb,
    selected_exp_id text default null,
    train_dataset_url text default null,
    test_dataset_url text default null,
    updated_at timestamptz not null default now(),
    primary key (sync_key, id)
);

create table if not exists public.amlics_user_settings (
    sync_key text primary key,
    active_workspace_id text default null,
    byok_state jsonb not null default '{}'::jsonb,
    ui_preferences jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create index if not exists idx_amlics_notebooks_sync on public.amlics_notebooks(sync_key, updated_at desc);
alter table public.amlics_notebooks enable row level security;
alter table public.amlics_user_settings enable row level security;
drop policy if exists "Allow public access to amlics_notebooks" on public.amlics_notebooks;
create policy "Allow public access to amlics_notebooks" on public.amlics_notebooks for all using (true) with check (true);
drop policy if exists "Allow public access to amlics_user_settings" on public.amlics_user_settings;
create policy "Allow public access to amlics_user_settings" on public.amlics_user_settings for all using (true) with check (true);`;

const clientCache = new Map<string, SupabaseClient>();

function getClient(creds: SupabaseCredentials): SupabaseClient | null {
  const url = (creds.url || '').trim().replace(/\/$/, '');
  const key = (creds.anonKey || '').trim();
  if (!url || !key) return null;
  const cacheKey = `${url}::${key}`;
  let existing = clientCache.get(cacheKey);
  if (!existing) {
    existing = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clientCache.set(cacheKey, existing);
  }
  return existing;
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table')
  );
}

export function getOrInitSyncKey(): string {
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_KEY);
    if (raw && raw.trim()) return raw.trim();
    localStorage.setItem(STORAGE_SYNC_KEY, DEFAULT_SYNC_KEY);
  } catch {
    // ignore
  }
  return DEFAULT_SYNC_KEY;
}

export function saveSyncKey(nextKey: string): string {
  const cleaned = nextKey.trim().replace(/[^a-zA-Z0-9._@-]/g, '-') || DEFAULT_SYNC_KEY;
  try {
    localStorage.setItem(STORAGE_SYNC_KEY, cleaned);
  } catch {
    // ignore
  }
  return cleaned;
}

function sanitizeExperimentsForCloud(exps: ExperimentRecord[] = []): ExperimentRecord[] {
  return exps.slice(0, 40).map((exp, idx) => ({
    ...exp,
    // Keep plots for the 8 most recent runs so Supabase row stays compact & fast
    figures: idx < 8 ? exp.figures : [],
  }));
}

export async function pushNotebookToSupabase(
  creds: SupabaseCredentials,
  syncKey: string,
  snapshot: CloudWorkspaceSnapshot
): Promise<SyncStatusResult> {
  const client = getClient(creds);
  if (!client) return { ok: false, error: 'Chưa cấu hình Supabase URL & Key' };
  try {
    const lightCells = (snapshot.cells || []).map((c) => ({
      ...c,
      figures: [],
      outputText: (c.outputText || '').slice(-12000),
    }));
    const { error } = await client.from('amlics_notebooks').upsert(
      {
        sync_key: syncKey,
        id: snapshot.id,
        name: snapshot.name,
        config: snapshot.config,
        cells: lightCells,
        data_profile: snapshot.dataProfile,
        experiments: sanitizeExperimentsForCloud(snapshot.experiments || []),
        selected_exp_id: snapshot.selectedExpId ?? null,
        train_dataset_url: snapshot.trainDatasetUrl ?? null,
        test_dataset_url: snapshot.testDatasetUrl ?? null,
        updated_at: new Date(snapshot.updatedAt || Date.now()).toISOString(),
      },
      { onConflict: 'sync_key,id' }
    );
    if (error) {
      return {
        ok: false,
        needsSchema: isMissingTableError(error),
        error: error.message,
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteNotebookFromSupabase(
  creds: SupabaseCredentials,
  syncKey: string,
  notebookId: string
): Promise<SyncStatusResult> {
  const client = getClient(creds);
  if (!client) return { ok: false, error: 'Not configured' };
  try {
    const { error } = await client
      .from('amlics_notebooks')
      .delete()
      .eq('sync_key', syncKey)
      .eq('id', notebookId);
    if (error) {
      return { ok: false, needsSchema: isMissingTableError(error), error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function pushUserSettingsToSupabase(
  creds: SupabaseCredentials,
  syncKey: string,
  payload: {
    activeWorkspaceId?: string;
    byokState?: StoredByokState;
    uiPreferences?: Record<string, unknown>;
  }
): Promise<SyncStatusResult> {
  const client = getClient(creds);
  if (!client) return { ok: false, error: 'Not configured' };
  try {
    const row: Record<string, unknown> = {
      sync_key: syncKey,
      updated_at: new Date().toISOString(),
    };
    if (payload.activeWorkspaceId !== undefined) {
      row.active_workspace_id = payload.activeWorkspaceId;
    }
    if (payload.byokState !== undefined) {
      row.byok_state = payload.byokState;
    }
    if (payload.uiPreferences !== undefined) {
      row.ui_preferences = payload.uiPreferences;
    }
    const { error } = await client
      .from('amlics_user_settings')
      .upsert(row, { onConflict: 'sync_key' });
    if (error) {
      return { ok: false, needsSchema: isMissingTableError(error), error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function pullAllFromSupabase(
  creds: SupabaseCredentials,
  syncKey: string
): Promise<{
  ok: boolean;
  needsSchema?: boolean;
  error?: string;
  notebooks: CloudWorkspaceSnapshot[];
  activeWorkspaceId: string | null;
  byokState: StoredByokState | null;
  settingsUpdatedAt: number;
}> {
  const client = getClient(creds);
  if (!client) {
    return {
      ok: false,
      error: 'Chưa cấu hình Supabase URL & Key',
      notebooks: [],
      activeWorkspaceId: null,
      byokState: null,
      settingsUpdatedAt: 0,
    };
  }

  try {
    const [nbRes, setRes] = await Promise.all([
      client
        .from('amlics_notebooks')
        .select('*')
        .eq('sync_key', syncKey)
        .order('updated_at', { ascending: false }),
      client
        .from('amlics_user_settings')
        .select('*')
        .eq('sync_key', syncKey)
        .maybeSingle(),
    ]);

    if (nbRes.error) {
      return {
        ok: false,
        needsSchema: isMissingTableError(nbRes.error),
        error: nbRes.error.message,
        notebooks: [],
        activeWorkspaceId: null,
        byokState: null,
        settingsUpdatedAt: 0,
      };
    }

    if (setRes.error && !isMissingTableError(setRes.error)) {
      return {
        ok: false,
        error: setRes.error.message,
        notebooks: [],
        activeWorkspaceId: null,
        byokState: null,
        settingsUpdatedAt: 0,
      };
    }

    const notebooks: CloudWorkspaceSnapshot[] = (nbRes.data || []).map((row) => ({
      id: String(row.id),
      name: String(row.name || 'AMLICS_Pipeline_Notebook'),
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      config: row.config as PipelineConfig,
      cells: Array.isArray(row.cells) ? (row.cells as NotebookCell[]) : [],
      dataProfile: (row.data_profile as DataProfile | null) ?? null,
      experiments: Array.isArray(row.experiments)
        ? (row.experiments as ExperimentRecord[])
        : [],
      selectedExpId: (row.selected_exp_id as string | null) ?? null,
      trainDatasetUrl: (row.train_dataset_url as string | null) ?? null,
      testDatasetUrl: (row.test_dataset_url as string | null) ?? null,
    }));

    const settingsRow = setRes.data;
    const settingsUpdatedAt = settingsRow?.updated_at
      ? new Date(settingsRow.updated_at).getTime()
      : 0;

    return {
      ok: true,
      needsSchema: isMissingTableError(setRes.error),
      notebooks,
      activeWorkspaceId: (settingsRow?.active_workspace_id as string | null) ?? null,
      byokState:
        settingsRow?.byok_state && Object.keys(settingsRow.byok_state).length > 0
          ? (settingsRow.byok_state as StoredByokState)
          : null,
      settingsUpdatedAt,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      notebooks: [],
      activeWorkspaceId: null,
      byokState: null,
      settingsUpdatedAt: 0,
    };
  }
}

export async function uploadCsvTextToSyncStorage(
  creds: SupabaseCredentials,
  syncKey: string,
  notebookId: string,
  kind: 'train' | 'test',
  filename: string,
  csvText: string
): Promise<string | null> {
  const client = getClient(creds);
  if (!client || csvText.length > 15 * 1024 * 1024) return null;
  try {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `sync/${syncKey}/${notebookId}/${kind}_${safeName}`;
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const { error } = await client.storage
      .from('datasets')
      .upload(path, blob, { upsert: true, contentType: 'text/csv' });
    if (error) return null;
    const { data } = client.storage.from('datasets').getPublicUrl(path);
    return data.publicUrl || null;
  } catch {
    return null;
  }
}

export async function downloadCsvTextFromSyncUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    return text && text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}
