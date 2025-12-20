-- Restore max downloads functionality
alter table public.uploads 
add column download_limit int, -- NULL means unlimited
add column download_count int default 0;

