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
  download_limit int,
  download_count int default 0,
  is_password_protected boolean default false,
  password_salt text,
  encrypted_key text,
  encrypted_key_iv text
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
create policy "Public increment count"
  on public.uploads for update
  using (true)
  with check (true);

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
