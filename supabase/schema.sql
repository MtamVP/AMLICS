-- ============================================================================
-- AMLICS (AutoML & Interactive Code Studio) — Supabase Database & Storage Schema
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Bảng SESSIONS: Quản lý phiên làm việc, cấu hình UI & trạng thái Cloud Worker
create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    title text not null default 'Untitled_AMLICS_Notebook',
    runtime_mode text not null default 'pyodide' check (runtime_mode in ('pyodide', 'cloud')),
    worker_status text not null default 'offline' check (worker_status in ('offline', 'idle', 'busy')),
    worker_meta jsonb not null default '{}'::jsonb,
    dataset_name text,
    dataset_storage_path text,
    data_profile jsonb default null,
    ui_pipeline_config jsonb not null default '{}'::jsonb,
    last_heartbeat_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Bảng CELLS: Hỗ trợ cả Code Cells (Hybrid UI-to-Code) và Markdown Cells
create table if not exists public.cells (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.sessions(id) on delete cascade,
    cell_order int not null,
    cell_type text not null default 'code' check (cell_type in ('code', 'markdown')),
    step_type text not null check (step_type in ('data_load', 'preprocess', 'split_cv', 'model_train', 'evaluate', 'submission', 'custom', 'markdown_doc')),
    title text not null,
    generated_code text not null default '',
    current_code text not null default '',
    is_locked boolean not null default false,
    last_status text not null default 'idle' check (last_status in ('idle', 'running', 'success', 'error', 'stopped')),
    last_output_text text default '',
    last_duration_ms int default 0,
    updated_at timestamptz not null default now(),
    unique(session_id, cell_order)
);

-- Bổ sung cột cell_type nếu bảng đã được tạo từ phiên bản trước
alter table public.cells add column if not exists cell_type text not null default 'code';

-- 3. Bảng EXPERIMENTS: Lưu lịch sử chạy vào Leaderboard & biểu đồ đánh giá
create table if not exists public.experiments (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.sessions(id) on delete cascade,
    run_number int not null,
    dataset_name text default 'Dataset.csv',
    target_column text default 'target',
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
    notes text default '',
    created_at timestamptz not null default now()
);

alter table public.experiments add column if not exists dataset_name text default 'Dataset.csv';
alter table public.experiments add column if not exists target_column text default 'target';

create index if not exists idx_cells_session on public.cells(session_id, cell_order);
create index if not exists idx_experiments_session on public.experiments(session_id, created_at desc);

-- 4. Row Level Security (RLS)
alter table public.sessions enable row level security;
alter table public.cells enable row level security;
alter table public.experiments enable row level security;

drop policy if exists "Allow public access to sessions" on public.sessions;
create policy "Allow public access to sessions" on public.sessions
    for all using (true) with check (true);

drop policy if exists "Allow public access to cells" on public.cells;
create policy "Allow public access to cells" on public.cells
    for all using (true) with check (true);

drop policy if exists "Allow public access to experiments" on public.experiments;
create policy "Allow public access to experiments" on public.experiments
    for all using (true) with check (true);

-- 5. Storage Bucket "datasets"
insert into storage.buckets (id, name, public)
values ('datasets', 'datasets', true)
on conflict (id) do nothing;

drop policy if exists "Public Access to datasets bucket" on storage.objects;
create policy "Public Access to datasets bucket" on storage.objects
    for all using (bucket_id = 'datasets') with check (bucket_id = 'datasets');

-- 6. Bảng AMLICS_NOTEBOOKS: Đồng bộ toàn bộ Notebook độc lập xuyên nhiều máy (Config, Cells, DataProfile, Experiments/Leaderboard)
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

-- 7. Bảng AMLICS_USER_SETTINGS: Đồng bộ kho API Key AI (Gemini/GPT/DeepSeek), Active Notebook & Tuỳ chọn giao diện
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
create policy "Allow public access to amlics_notebooks" on public.amlics_notebooks
    for all using (true) with check (true);

drop policy if exists "Allow public access to amlics_user_settings" on public.amlics_user_settings;
create policy "Allow public access to amlics_user_settings" on public.amlics_user_settings
    for all using (true) with check (true);
