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
  ai_tool text,
  category text,
  link text not null,
  tags text,
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

alter table public.message_templates enable row level security;
alter table public.course_lessons enable row level security;
alter table public.gpts enable row level security;
alter table public.students enable row level security;

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
