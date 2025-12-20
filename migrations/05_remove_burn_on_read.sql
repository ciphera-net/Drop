-- Remove burn on read functionality columns
alter table public.uploads 
drop column if exists download_limit,
drop column if exists download_count;

