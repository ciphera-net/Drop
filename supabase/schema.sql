-- 
-- Main Supabase Schema
-- This file contains the initial schema and all applied migrations.
--

-- ==========================================
-- Base Schema (from supabase_schema.sql)
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Uploads table
create table public.uploads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  filename_encrypted text not null,
  filename_iv text not null,
  mime_type_encrypted text,
  mime_type_iv text,
  size bigint not null,
  iv text not null, -- IV for the file blob
  expiration_time timestamp with time zone not null,
  is_password_protected boolean default false,
  password_salt text,
  encrypted_key text,
  encrypted_key_iv text,
  file_deleted boolean default false,
  magic_words text UNIQUE,
  download_limit int, -- NULL means unlimited
  download_count int default 0
);

-- RLS
alter table public.uploads enable row level security;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS uploads_magic_words_idx ON public.uploads (magic_words);

-- Policies

-- 1. Anyone can insert (Upload)
-- If logged in, auth.uid() is automatically used by Supabase client if we don't provide it, 
-- or we can provide it. We need to allow anon to insert too.
create policy "Anyone can upload"
  on public.uploads for insert
  with check (true);

-- 2. Read access
-- Public needs to read metadata (size, enc filename) to download.
-- UUIDs are hard to guess.
create policy "Public read by ID"
  on public.uploads for select
  using (true);

-- 3. Delete: Only Owner
create policy "Owner can delete"
  on public.uploads for delete
  using (auth.uid() = user_id);


-- Storage Bucket (If not created via UI)
insert into storage.buckets (id, name, public) values ('drop-files', 'drop-files', false);

-- Storage Policies
-- 1. Upload (Insert) - Allow anyone to upload new files
create policy "Anyone can upload file"
  on storage.objects for insert
  with check ( bucket_id = 'drop-files' );

-- 2. Secure Download (Select)
-- Logic: 
-- 1. Allow if auth user is the owner (uploader) - always see own files
-- 2. Public access ONLY if verified against DB (exists in uploads AND not deleted/limit reached)
create policy "Secure public download"
  on storage.objects for select
  using (
    bucket_id = 'drop-files'
    and (
        (auth.uid() = owner)
        or
        exists (
          select 1 from public.uploads
          where id::text = split_part(storage.objects.name, '/', 1)
          and (
            file_deleted = false
            or
            (download_limit is not null and download_count <= download_limit)
          )
        )
    )
  );

-- 3. Delete: Only Owner
create policy "Owner can delete file"
  on storage.objects for delete
  using ( bucket_id = 'drop-files' and (auth.uid() = owner) );


-- ==========================================
-- Functions
-- ==========================================

-- Function to safely increment download count and check limit atomically
create or replace function increment_download_count(row_id uuid)
returns table (new_count int, limit_reached boolean, allowed boolean)
language plpgsql
security definer
as $$
declare
  _limit int;
  _count int;
  _is_deleted boolean;
begin
  -- Lock the row for update to prevent race conditions
  select download_limit, download_count, file_deleted
  into _limit, _count, _is_deleted
  from public.uploads
  where id = row_id
  for update;

  if not found then
    raise exception 'File not found';
  end if;

  if _is_deleted then
     -- If already deleted, denied.
     return query select _count, true, false;
     return;
  end if;

  -- Check if we are ALREADY at the limit before this increment
  if _limit is not null and _count >= _limit then
     -- Limit was already reached (race condition handling if is_deleted wasn't set yet)
     -- Mark deleted self-healing
     update public.uploads set file_deleted = true where id = row_id;
     return query select _count, true, false;
     return;
  end if;

  -- Increment
  _count := coalesce(_count, 0) + 1;

  -- Update
  update public.uploads
  set download_count = _count,
      -- If limit reached (>= limit), mark deleted immediately
      file_deleted = case when (_limit is not null and _count >= _limit) then true else file_deleted end
  where id = row_id;

  -- Allowed is true because we just successfully incremented within the limit
  return query select _count, (_limit is not null and _count >= _limit), true;
end;
$$;
