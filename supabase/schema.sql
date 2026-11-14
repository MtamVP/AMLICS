-- ============================================================================
-- AutoML & Interactive Code Studio — Supabase Database & Storage Schema
-- Chạy toàn bộ script này trong Supabase SQL Editor (1 click Run)
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Bảng SESSIONS: Quản lý phiên làm việc, cấu hình UI & trạng thái Cloud Worker
create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    title text not null default 'Untitled AutoML Project',
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

-- 2. Bảng CELLS: Lưu trạng thái các Cell code & cờ khóa Hybrid UI-to-Code (Lockable Cells)
create table if not exists public.cells (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.sessions(id) on delete cascade,
    cell_order int not null,
    step_type text not null check (step_type in ('data_load', 'preprocess', 'split_cv', 'model_train', 'evaluate', 'custom')),
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

-- 3. Bảng EXPERIMENTS: Lưu lịch sử chạy vào Leaderboard & biểu đồ đánh giá
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
    notes text default '',
    created_at timestamptz not null default now()
);

create index if not exists idx_cells_session on public.cells(session_id, cell_order);
create index if not exists idx_experiments_session on public.experiments(session_id, created_at desc);

-- 4. Bật Row Level Security (RLS) mở cho chế độ Demo / Session-based Studio (dễ cài đặt)
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

-- 5. Khởi tạo Storage Bucket "datasets" để đồng bộ file CSV giữa Web App và Colab/Kaggle
insert into storage.buckets (id, name, public)
values ('datasets', 'datasets', true)
on conflict (id) do nothing;

drop policy if exists "Public Access to datasets bucket" on storage.objects;
create policy "Public Access to datasets bucket" on storage.objects
    for all using (bucket_id = 'datasets') with check (bucket_id = 'datasets');

-- 6. Bật Realtime cho bảng sessions & experiments (hỗ trợ đồng bộ trạng thái)
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.experiments;
