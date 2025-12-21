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
  file_deleted boolean default false
);

-- RLS
alter table public.uploads enable row level security;

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

-- 3. Update (Increment download count) -> Needs function or policy
-- For MVP, we might skip enforcing download limit via DB constraints and do it in UI/Edge function.
-- To allow client to update download_count (not secure, but MVP):
-- create policy "Public increment count"
--   on public.uploads for update
--   using (true)
--   with check (true);

-- 4. Delete: Only Owner
create policy "Owner can delete"
  on public.uploads for delete
  using (auth.uid() = user_id);


-- Storage Bucket (If not created via UI)
insert into storage.buckets (id, name, public) values ('drop-files', 'drop-files', false);

-- Storage Policies
-- 1. Upload
create policy "Anyone can upload file"
  on storage.objects for insert
  with check ( bucket_id = 'drop-files' );

-- 2. Download
create policy "Anyone can download file"
  on storage.objects for select
  using ( bucket_id = 'drop-files' );

-- 3. Delete
create policy "Owner can delete file"
  on storage.objects for delete
  using ( bucket_id = 'drop-files' and (auth.uid() = owner) );

-- ==========================================
-- Migrations
-- ==========================================

-- 01_enable_realtime_uploads.sql
-- Enable Realtime for uploads table
alter publication supabase_realtime add table public.uploads;

-- 02_add_password_protection.sql
-- Note: Columns might already exist in base schema
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE public.uploads ADD COLUMN is_password_protected boolean DEFAULT false;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.uploads ADD COLUMN password_salt text;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.uploads ADD COLUMN encrypted_key text;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE public.uploads ADD COLUMN encrypted_key_iv text;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 03_add_file_deleted_flag.sql
DO $$ 
BEGIN 
    ALTER TABLE public.uploads ADD COLUMN file_deleted boolean default false;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 04_add_magic_words.sql
-- Add magic_words column to uploads table
ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS magic_words text UNIQUE;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS uploads_magic_words_idx ON public.uploads (magic_words);

-- 05_remove_burn_on_read.sql
-- Remove burn on read functionality columns
alter table public.uploads 
drop column if exists download_limit,
drop column if exists download_count;

-- 06_restore_max_downloads.sql
-- Restore max downloads functionality
alter table public.uploads 
add column if not exists download_limit int, -- NULL means unlimited
add column if not exists download_count int default 0;

-- 08_remove_tags_from_uploads.sql
alter table public.uploads
drop column if exists tags;

