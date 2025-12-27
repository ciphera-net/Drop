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
          and file_deleted = false
          and (
            download_limit is null
            or
            download_count < download_limit
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
     -- update public.uploads set file_deleted = true where id = row_id;
     return query select _count, true, false;
     return;
  end if;

  -- Increment
  _count := coalesce(_count, 0) + 1;

  -- Update
  update public.uploads
  set download_count = _count
  where id = row_id;

  -- Allowed is true because we just successfully incremented within the limit
  return query select _count, (_limit is not null and _count >= _limit), true;
end;
$$;


-- ==========================================
-- Migrations
-- ==========================================

-- 01_enable_realtime_uploads.sql
-- Enable Realtime for uploads table
alter publication supabase_realtime add table public.uploads;

-- 12_fix_storage_policy.sql
-- Allow owners to update their own files (useful for authenticated users)
-- This fixes issues where x-upsert might be used or required for overwrites.

create policy "Owner can update file"
  on storage.objects for update
  using ( bucket_id = 'drop-files' and (auth.uid() = owner) );

-- 13_add_encrypted_message.sql

ALTER TABLE public.uploads
ADD COLUMN message_encrypted text,
ADD COLUMN message_iv text;

-- 14_add_file_type_column.sql
alter table public.uploads add column file_type text;

-- 15_add_file_hash.sql
ALTER TABLE public.uploads ADD COLUMN file_hash text;

-- 16_add_notify_on_download.sql
-- Add notification preference and sender email columns
ALTER TABLE public.uploads 
ADD COLUMN notify_on_download boolean DEFAULT false,
ADD COLUMN sender_email text;

-- 17_add_file_requests.sql

-- Create File Requests table
create table public.file_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  status text default 'active', -- active, closed
  public_key text not null, -- JWK String
  encrypted_private_key text not null, -- Encrypted with Box Password
  encrypted_private_key_iv text not null,
  salt text not null -- For deriving key from Box Password
);

-- Add request_id to uploads
alter table public.uploads
add column request_id uuid references public.file_requests(id);

-- RLS for file_requests
alter table public.file_requests enable row level security;

create policy "Users can create requests"
  on public.file_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can view own requests"
  on public.file_requests for select
  using (auth.uid() = user_id);

create policy "Public can view active requests by ID"
  on public.file_requests for select
  using (status = 'active'); 

create policy "Users can delete own requests"
  on public.file_requests for delete
  using (auth.uid() = user_id);

-- Update uploads RLS to allow public insert if they have a valid request_id
-- Existing policy: "Anyone can upload" (true) covers this.
-- But we might want to restrict viewing uploads linked to requests?
-- Existing policy: "Secure public download"
-- It allows download if `auth.uid() = owner`.
-- For requests, the `user_id` of the upload should probably be the Request Owner?
-- Or should it be NULL (anonymous uploader)?
-- If it's NULL, then `auth.uid() = owner` fails.
-- We need to update "Secure public download" to allow the Request Owner to download.

create policy "Request owner can view uploads"
  on public.uploads for select
  using (
    exists (
      select 1 from public.file_requests
      where id = request_id
      and user_id = auth.uid()
    )
  );

-- Also need to allow Request Owner to delete uploads in their request
create policy "Request owner can delete uploads"
  on public.uploads for delete
  using (
    exists (
      select 1 from public.file_requests
      where id = request_id
      and user_id = auth.uid()
    )
  );

-- 18_add_request_notifications.sql

-- Add notification email column to file_requests if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'file_requests' and column_name = 'notify_email') then
    alter table public.file_requests add column notify_email text;
  end if;
end $$;

-- Enable RLS for file_requests
alter table public.file_requests enable row level security;

-- Existing policies might not allow reading 'notify_email' for anonymous users.
-- We do NOT want anonymous users to read 'notify_email' directly via Supabase client.
-- But the 'notify-upload' API route uses the Service Role (Admin Client), which bypasses RLS.
-- So we don't need to change RLS policies for public access.

-- However, we must ensure the `notify_email` column is actually populated by the `CreateRequestDialog`.

-- 19_add_request_expiration.sql

-- Add expiration_time to file_requests
alter table public.file_requests
add column expiration_time timestamp with time zone;

-- 20_secure_request_access.sql
-- 1. Create a secure function to fetch a single request by ID
-- This bypasses RLS (SECURITY DEFINER) but enforces its own logic (must be active)
-- We allows expired requests to be fetched so we can show a "Request Expired" message,
-- but "closed" requests are hidden.
create or replace function public.get_public_file_request(request_id uuid)
returns setof public.file_requests
language plpgsql
security definer
as $$
begin
  return query
  select *
  from public.file_requests
  where id = request_id
  and status = 'active';
end;
$$;

-- 2. Revoke public RLS policy that allowed enumeration
drop policy if exists "Public can view active requests by ID" on public.file_requests;

-- 3. Grant execute permission to anon/public
grant execute on function public.get_public_file_request(uuid) to public;
grant execute on function public.get_public_file_request(uuid) to anon;
grant execute on function public.get_public_file_request(uuid) to authenticated;

-- 21_add_rate_limiting.sql
create table if not exists public.rate_limits (
  ip text not null,
  endpoint text not null,
  requests int default 1,
  last_request timestamp with time zone default now(),
  primary key (ip, endpoint)
);

-- RLS: Enable but add no policies. 
-- This ensures only the Service Role (API routes) can access it, not the client.
alter table public.rate_limits enable row level security;

-- 22_add_user_verifications.sql
-- Create table for user verifications
create table if not exists public.user_verifications (
  user_id uuid references auth.users(id) on delete cascade primary key,
  is_verified boolean default false,
  otp_code text,
  otp_expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_verifications enable row level security;

-- Policies
create policy "Users can view their own verification status"
  on public.user_verifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own verification status"
  on public.user_verifications for update
  using (auth.uid() = user_id);

create policy "Users can insert their own verification status"
  on public.user_verifications for insert
  with check (auth.uid() = user_id);

-- Functions
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_verifications (user_id)
  values (new.id);
  return new;
end;
$$;

-- Trigger to automatically create verification record on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 23_prevent_infinite_downloads_for_anon.sql
-- Fix existing anonymous uploads that have infinite downloads (set to 10 as a fallback)
-- Only for those that are NOT part of a request (request_id IS NULL)
UPDATE uploads 
SET download_limit = 10 
WHERE user_id IS NULL AND download_limit IS NULL AND request_id IS NULL;

-- Add constraint to prevent future anonymous uploads with infinite downloads
-- Exception: If it is part of a file request (request_id IS NOT NULL), we allow it (as it's controlled by the requester)
ALTER TABLE uploads
ADD CONSTRAINT check_anon_download_limit 
CHECK (
  user_id IS NOT NULL 
  OR download_limit IS NOT NULL 
  OR request_id IS NOT NULL
);

-- 24_enforce_user_verification.sql
-- Enforce user verification for critical actions

-- 1. Helper Function to check if a user is verified
-- Returns true if:
--   a) User is anonymous (auth.uid() IS NULL) -- because we allow anon uploads
--   b) User is authenticated AND has a verified record in user_verifications
-- Returns false if:
--   a) User is authenticated BUT NOT verified
create or replace function public.is_verified_or_anon()
returns boolean
language sql
security definer
stable
as $$
  select 
    (auth.uid() is null) 
    or 
    exists (
      select 1 from public.user_verifications 
      where user_id = auth.uid() 
      and is_verified = true
    );
$$;

-- 2. Update 'uploads' Insert Policy
drop policy if exists "Anyone can upload" on public.uploads;

create policy "Verified users or anon can upload"
  on public.uploads for insert
  with check ( public.is_verified_or_anon() );

-- 3. Update 'file_requests' Insert Policy
-- Requests require authentication, so we don't allow anon here.
drop policy if exists "Users can create requests" on public.file_requests;

create policy "Verified users can create requests"
  on public.file_requests for insert
  with check (
    auth.uid() = user_id
    and
    exists (
      select 1 from public.user_verifications 
      where user_id = auth.uid() 
      and is_verified = true
    )
  );

-- 4. Update Storage 'objects' Insert Policy
drop policy if exists "Anyone can upload file" on storage.objects;

create policy "Verified users or anon can upload file"
  on storage.objects for insert
  with check (
    bucket_id = 'drop-files' 
    and 
    public.is_verified_or_anon()
  );

-- 25_fix_secure_download_policy.sql
-- Fix the logic in "Secure public download" storage policy
-- The previous logic allowed deleted files to be downloaded if they had a download limit,
-- because the OR condition short-circuited or was evaluated incorrectly relative to file_deleted.
-- The new logic enforces file_deleted = false AND (limit check).

drop policy "Secure public download" on storage.objects;

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
          and file_deleted = false
          and (
            download_limit is null
            or
            download_count < download_limit
          )
        )
    )
  );

-- 26_add_user_profiles.sql
-- Add simplelogin_api_key to user_profiles (or create user_profiles if it doesn't exist)
-- This table extends auth.users with app-specific settings.

create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  simplelogin_api_key text
);

-- RLS
alter table public.user_profiles enable row level security;

-- Users can view their own profile
create policy "Users can view own profile" 
  on public.user_profiles for select 
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" 
  on public.user_profiles for update 
  using (auth.uid() = id);

-- Users can insert their own profile
create policy "Users can insert own profile" 
  on public.user_profiles for insert 
  with check (auth.uid() = id);

-- Update the existing handle_new_user function to create profile on signup
create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer set search_path = public
as $$
begin
  -- Insert into verifications
  insert into public.user_verifications (user_id)
  values (new.id);

  -- Insert into profiles
  insert into public.user_profiles (id)
  values (new.id);

  return new;
end;
$$;

-- 27_add_profile_fields.sql
-- Add display_name to user_profiles
alter table public.user_profiles 
add column if not exists display_name text;

-- Add updated_at column
alter table public.user_profiles 
add column if not exists updated_at timestamptz default now();

-- 28_add_user_preferences.sql
-- Add preferences columns to user_profiles
alter table public.user_profiles 
add column if not exists default_expiration text default '1h',
add column if not exists default_download_limit integer default null,
add column if not exists default_auto_delete boolean default false;

-- 29_add_security_fields.sql
-- Add pgp_public_key to user_profiles
alter table public.user_profiles 
add column if not exists pgp_public_key text;

-- 30_add_storage_limit.sql
-- Add storage_limit to user_profiles
alter table public.user_profiles
add column if not exists storage_limit bigint default 5368709120; -- 5 GB in bytes

-- Update existing profiles that might be null (though the default handles new ones)
update public.user_profiles
set storage_limit = 5368709120
where storage_limit is null;

-- 31_add_session_management.sql
-- Function to get active sessions for the current user
create or replace function get_active_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  ip inet,
  user_agent text,
  is_current boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_session_id uuid;
begin
  current_session_id := (select (auth.jwt() ->> 'session_id')::uuid);
  
  return query
  select
    s.id,
    s.created_at,
    s.updated_at,
    s.ip,
    s.user_agent,
    (s.id = current_session_id) as is_current
  from
    auth.sessions s
  where
    s.user_id = auth.uid()
  order by
    s.created_at desc;
end;
$$;

-- Function to revoke a specific session
create or replace function revoke_session(session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.sessions
  where id = session_id
  and user_id = auth.uid();
end;
$$;

-- Function to revoke all other sessions
create or replace function revoke_all_other_sessions()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_session_id uuid;
begin
  current_session_id := (select (auth.jwt() ->> 'session_id')::uuid);
  
  delete from auth.sessions
  where user_id = auth.uid()
  and id != current_session_id;
end;
$$;

-- 32_performance_optimization.sql
-- 1. Add missing indices for high-traffic filtering
create index if not exists uploads_expiration_time_idx on public.uploads (expiration_time) where file_deleted = false;
create index if not exists uploads_user_id_idx on public.uploads (user_id);
create index if not exists uploads_request_id_idx on public.uploads (request_id);

-- 2. Optimized Rate Limiting Function (1 DB Call instead of 2)
create or replace function check_rate_limit_rpc(
  _ip text, 
  _endpoint text, 
  _limit int, 
  _window_seconds int
)
returns boolean
language plpgsql
security definer
as $$
declare
  _current_requests int;
  _last_request timestamptz;
  _now timestamptz := now();
begin
  -- Attempt to update existing record
  update public.rate_limits
  set 
    requests = case 
      when _now - last_request > (_window_seconds || ' seconds')::interval then 1 -- Reset window
      else requests + 1 -- Increment
    end,
    last_request = case 
      when _now - last_request > (_window_seconds || ' seconds')::interval then _now -- Reset time
      else last_request 
    end
  where ip = _ip and endpoint = _endpoint
  returning requests, last_request into _current_requests, _last_request;

  -- If no record existed, insert one
  if not found then
    insert into public.rate_limits (ip, endpoint, requests, last_request)
    values (_ip, _endpoint, 1, _now)
    on conflict (ip, endpoint) do nothing; -- Handle race condition
    return true;
  end if;

  -- Return allowed status
  -- Note: If we just reset the window (requests=1), it is allowed.
  -- If we incremented, check if we exceeded limit.
  return _current_requests <= _limit;
end;
$$;

-- 3. Optimized Cleanup Query (Filter in DB, not Memory)
create or replace function get_expired_or_limit_reached_ids(batch_size int default 50)
returns table (id uuid)
language sql
security definer
as $$
  select id from public.uploads
  where file_deleted = false
  and (
    -- Condition A: Time Expired
    expiration_time < now()
    or
    -- Condition B: Download Limit Reached
    (download_limit is not null and download_count >= download_limit)
  )
  limit batch_size;
$$;

-- 33_fix_burn_after_download.sql
-- Fix increment_download_count to NOT mark file as deleted immediately.
-- This prevents the creation of "Zombies" (files marked deleted in DB but still in storage),
-- because the Cleanup Job (get_expired_or_limit_reached_ids) only looks for file_deleted = false.
-- By keeping file_deleted = false, the Cleanup Job will find it (via limit check), 
-- delete the storage, and THEN mark it as deleted.

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
     -- Limit was already reached
     return query select _count, true, false;
     return;
  end if;

  -- Increment
  _count := coalesce(_count, 0) + 1;

  -- Update
  update public.uploads
  set download_count = _count
  where id = row_id;

  -- Allowed is true because we just successfully incremented within the limit
  return query select _count, (_limit is not null and _count >= _limit), true;
end;
$$;

-- Cleanup existing Zombies (Files marked deleted in DB but still in Storage)
-- This fixes the issue for users who already experienced the bug.
delete from storage.objects 
where bucket_id = 'drop-files' 
and exists (
    select 1 from public.uploads 
    where id::text = split_part(storage.objects.name, '/', 1) 
    and file_deleted = true
);
