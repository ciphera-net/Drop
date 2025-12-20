-- Add password protection columns to uploads table
ALTER TABLE public.uploads 
ADD COLUMN is_password_protected boolean DEFAULT false,
ADD COLUMN password_salt text,
ADD COLUMN encrypted_key text,
ADD COLUMN encrypted_key_iv text;

