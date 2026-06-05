create extension if not exists "pgcrypto";

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  mentorship text,
  ai_tool text,
  category text,
  link text not null,
  tags text,
  created_at timestamptz not null default now()
);

alter table public.course_lessons
  add column if not exists mentorship text;

create table if not exists public.gpts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  description text,
  link text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  mentorship text,
  name text not null,
  phone text,
  email text,
  cs_responsible text,
  last_meeting_at timestamptz,
  meetings_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_meetings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  login text not null unique,
  password text not null,
  is_admin boolean not null default false,
  can_create_templates boolean not null default false,
  is_cs boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  order_index integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  column_id uuid references public.kanban_columns(id) on delete set null,
  order_index integer not null default 0,
  responsible_id uuid references public.users(id) on delete set null,
  responsible_ids jsonb not null default '[]'::jsonb,
  creator_id uuid references public.users(id) on delete set null,
  status text not null default 'ativo',
  priority text not null default 'media',
  start_date date,
  due_date date,
  completed_at timestamptz,
  labels jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students
  add column if not exists cs_responsible text,
  add column if not exists last_meeting_at timestamptz,
  add column if not exists meetings_count integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.student_meetings
  add column if not exists student_id uuid not null references public.students(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

create or replace function public.touch_students_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists students_touch_updated_at on public.students;
create trigger students_touch_updated_at
before update on public.students
for each row
execute function public.touch_students_updated_at();

alter table public.student_meetings enable row level security;

alter table public.users
  add column if not exists is_cs boolean not null default false;

alter table public.kanban_columns
  add column if not exists color text,
  add column if not exists order_index integer not null default 0,
  add column if not exists is_archived boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.kanban_cards
  add column if not exists description text not null default '',
  add column if not exists column_id uuid references public.kanban_columns(id) on delete set null,
  add column if not exists order_index integer not null default 0,
  add column if not exists responsible_id uuid references public.users(id) on delete set null,
  add column if not exists responsible_ids jsonb not null default '[]'::jsonb,
  add column if not exists creator_id uuid references public.users(id) on delete set null,
  add column if not exists status text not null default 'ativo',
  add column if not exists priority text not null default 'media',
  add column if not exists start_date date,
  add column if not exists due_date date,
  add column if not exists completed_at timestamptz,
  add column if not exists labels jsonb not null default '[]'::jsonb,
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists comments jsonb not null default '[]'::jsonb,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists history jsonb not null default '[]'::jsonb,
  add column if not exists is_archived boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.message_templates enable row level security;
alter table public.course_lessons enable row level security;
alter table public.gpts enable row level security;
alter table public.students enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;

create policy "authenticated read message_templates"
  on public.message_templates for select to authenticated using (true);
create policy "authenticated insert message_templates"
  on public.message_templates for insert to authenticated with check (true);
create policy "authenticated update message_templates"
  on public.message_templates for update to authenticated using (true) with check (true);
create policy "authenticated delete message_templates"
  on public.message_templates for delete to authenticated using (true);

create policy "authenticated read course_lessons"
  on public.course_lessons for select to authenticated using (true);
create policy "authenticated insert course_lessons"
  on public.course_lessons for insert to authenticated with check (true);
create policy "authenticated update course_lessons"
  on public.course_lessons for update to authenticated using (true) with check (true);
create policy "authenticated delete course_lessons"
  on public.course_lessons for delete to authenticated using (true);

create policy "authenticated read gpts"
  on public.gpts for select to authenticated using (true);
create policy "authenticated insert gpts"
  on public.gpts for insert to authenticated with check (true);
create policy "authenticated update gpts"
  on public.gpts for update to authenticated using (true) with check (true);
create policy "authenticated delete gpts"
  on public.gpts for delete to authenticated using (true);

create policy "authenticated read students"
  on public.students for select to authenticated using (true);
create policy "authenticated insert students"
  on public.students for insert to authenticated with check (true);
create policy "authenticated update students"
  on public.students for update to authenticated using (true) with check (true);
create policy "authenticated delete students"
  on public.students for delete to authenticated using (true);

create policy "authenticated read student_meetings"
  on public.student_meetings for select to authenticated using (true);
create policy "authenticated insert student_meetings"
  on public.student_meetings for insert to authenticated with check (true);
create policy "authenticated delete student_meetings"
  on public.student_meetings for delete to authenticated using (true);

create policy "authenticated read kanban_columns"
  on public.kanban_columns for select to authenticated using (true);
create policy "authenticated insert kanban_columns"
  on public.kanban_columns for insert to authenticated with check (true);
create policy "authenticated update kanban_columns"
  on public.kanban_columns for update to authenticated using (true) with check (true);
create policy "authenticated delete kanban_columns"
  on public.kanban_columns for delete to authenticated using (true);

create policy "authenticated read kanban_cards"
  on public.kanban_cards for select to authenticated using (true);
create policy "authenticated insert kanban_cards"
  on public.kanban_cards for insert to authenticated with check (true);
create policy "authenticated update kanban_cards"
  on public.kanban_cards for update to authenticated using (true) with check (true);
create policy "authenticated delete kanban_cards"
  on public.kanban_cards for delete to authenticated using (true);
