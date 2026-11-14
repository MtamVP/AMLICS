import React, { useState } from 'react';
import {
  X,
  Cloud,
  Copy,
  Check,
  ExternalLink,
  Download,
  RefreshCw,
  Wifi,
  Database,
  Terminal,
  KeyRound,
} from 'lucide-react';
import { generateOneClickColabScript } from '../engine/supabaseCloudClient';
import { HardwareInfo, SupabaseCredentials, WorkerStatus } from '../types/studio';
import { downloadCloudRunnerIpynb } from '../utils/ipynbExporter';

interface CloudConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onRegenerateSession: () => void;
  credentials: SupabaseCredentials;
  onSaveCredentials: (creds: SupabaseCredentials) => void;
  cloudConnected: boolean;
  workerStatus: WorkerStatus;
  hardwareInfo: HardwareInfo | null;
  onPingWorker: () => void;
}

export const CloudConnectModal: React.FC<CloudConnectModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onRegenerateSession,
  credentials,
  onSaveCredentials,
  cloudConnected,
  workerStatus,
  hardwareInfo,
  onPingWorker,
}) => {
  const [urlInput, setUrlInput] = useState(credentials.url);
  const [keyInput, setKeyInput] = useState(credentials.anonKey);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const oneClickScript = generateOneClickColabScript(sessionId, urlInput, keyInput);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCredentials({ url: urlInput, anonKey: keyInput });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(oneClickScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Kết nối Tier 2: Google Colab (12.7GB) / Kaggle (30GB + GPU)
              </h2>
              <p className="text-[11px] text-slate-400">
                Đồng bộ thời gian thực qua Supabase Realtime Broadcast — Chạy 1 lần, điều khiển 100% trên Web
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Live Status Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  workerStatus === 'idle'
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50'
                    : workerStatus === 'busy'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-600'
                }`}
              />
              <div>
                <div className="text-xs font-bold text-slate-100">
                  Trạng thái Cloud Worker:{' '}
                  <span
                    className={
                      workerStatus !== 'offline' ? 'text-emerald-400' : 'text-slate-400'
                    }
                  >
                    {workerStatus !== 'offline'
                      ? `ONLINE (${hardwareInfo?.platform || 'Remote Python'})`
                      : 'Đang chờ chạy Cell trên Colab / Kaggle...'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Session ID: <span className="text-indigo-300">{sessionId}</span>
                  {hardwareInfo && (
                    <span className="ml-2 text-emerald-300">
                      | GPU: {hardwareInfo.gpu} | RAM: {hardwareInfo.ram_used_gb}/
                      {hardwareInfo.ram_total_gb} GB
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPingWorker}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
              >
                <Wifi className="w-3 h-3 text-emerald-400" /> Ping Worker
              </button>
              <button
                type="button"
                onClick={onRegenerateSession}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
                title="Đổi mã Session ID mới"
              >
                <RefreshCw className="w-3 h-3" /> Đổi Session
              </button>
            </div>
          </div>

          {/* Step 1: Supabase Credentials */}
          <form onSubmit={handleSave} className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Bước 1: Cấu hình Supabase Broker (Lưu tự động vào trình duyệt)</span>
              </div>
              {cloudConnected && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ✓ Realtime Channel Subscribed
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Supabase Project URL (https://xxx.supabase.co):
                </label>
                <input
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Supabase Anon Public Key:
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                💡 Mẹo: Kênh <strong>Realtime Broadcast</strong> hoạt động ngay lập tức khi điền URL & Anon Key mà không bắt buộc tạo bảng SQL trước!
              </span>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
              >
                {savedNotice ? '✓ Đã lưu & Kết nối!' : 'Lưu & Kết nối Supabase'}
              </button>
            </div>
          </form>

          {/* Step 2: 1-Click Colab / Kaggle Script */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>
                  Bước 2: Copy đoạn mã 1-Click này dán vào 1 Cell trên Google Colab hoặc Kaggle và bấm Run
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Đã Copy Code!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy 1-Click Runner Code
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadCloudRunnerIpynb(sessionId, urlInput, keyInput)
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" /> Tải file .ipynb
                </button>
              </div>
            </div>

            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto select-all">
              {oneClickScript}
            </pre>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <a
                  href="https://colab.research.google.com/#create=true"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Mở Notebook mới trên Google Colab
                </a>
                <a
                  href="https://www.kaggle.com/code"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Mở Kaggle Notebooks (Nhớ bật Internet)
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sqlText = `create extension if not exists "pgcrypto";
create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    title text not null default 'Untitled AutoML Project',
    runtime_mode text not null default 'pyodide',
    worker_status text not null default 'offline',
    worker_meta jsonb not null default '{}'::jsonb,
    dataset_name text,
    dataset_storage_path text,
    data_profile jsonb default null,
    ui_pipeline_config jsonb not null default '{}'::jsonb,
    last_heartbeat_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create table if not exists public.cells (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.sessions(id) on delete cascade,
    cell_order int not null,
    step_type text not null,
    title text not null,
    generated_code text not null default '',
    current_code text not null default '',
    is_locked boolean not null default false,
    last_status text not null default 'idle',
    last_output_text text default '',
    last_duration_ms int default 0,
    updated_at timestamptz not null default now(),
    unique(session_id, cell_order)
);
create table if not exists public.experiments (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.sessions(id) on delete cascade,
    run_number int not null,
    model_name text not null,
    task_type text not null default 'classification',
    runtime_used text not null,
    hyperparameters jsonb not null default '{}'::jsonb,
    preprocessing_summary jsonb not null default '{}'::jsonb,
    metrics jsonb not null default '{}'::jsonb,
    plots jsonb not null default '{}'::jsonb,
    feature_importance jsonb not null default '[]'::jsonb,
    code_snapshot jsonb not null default '[]'::jsonb,
    duration_ms int not null default 0,
    created_at timestamptz not null default now()
);
alter table public.sessions enable row level security;
alter table public.cells enable row level security;
alter table public.experiments enable row level security;
drop policy if exists "Allow public access to sessions" on public.sessions;
create policy "Allow public access to sessions" on public.sessions for all using (true) with check (true);
drop policy if exists "Allow public access to cells" on public.cells;
create policy "Allow public access to cells" on public.cells for all using (true) with check (true);
drop policy if exists "Allow public access to experiments" on public.experiments;
create policy "Allow public access to experiments" on public.experiments for all using (true) with check (true);
insert into storage.buckets (id, name, public) values ('datasets', 'datasets', true) on conflict (id) do nothing;
drop policy if exists "Public Access to datasets bucket" on storage.objects;
create policy "Public Access to datasets bucket" on storage.objects for all using (bucket_id = 'datasets') with check (bucket_id = 'datasets');`;
                  navigator.clipboard.writeText(sqlText);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 font-medium"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                {copiedSql ? '✓ Đã Copy SQL Schema!' : 'Copy SQL Schema (Chạy trong Supabase SQL Editor)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
