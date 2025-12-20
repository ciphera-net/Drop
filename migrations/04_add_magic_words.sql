-- Add magic_words column to uploads table
ALTER TABLE public.uploads 
ADD COLUMN magic_words text UNIQUE;

-- Create index for faster lookup
CREATE INDEX uploads_magic_words_idx ON public.uploads (magic_words);

