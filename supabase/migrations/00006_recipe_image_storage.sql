-- Migration: Create Supabase Storage bucket for recipe images
-- Idempotent: safe to run multiple times

-- 1. Create a public bucket for recipe images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS policies for storage.objects (scoped to recipe-images bucket)

-- Allow authenticated users to upload to their own folder
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can upload recipe images'
  ) THEN
    CREATE POLICY "Users can upload recipe images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'recipe-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow authenticated users to update/replace their own images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can update own recipe images'
  ) THEN
    CREATE POLICY "Users can update own recipe images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'recipe-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow authenticated users to delete their own images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can delete own recipe images'
  ) THEN
    CREATE POLICY "Users can delete own recipe images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'recipe-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow anyone to read recipe images (public bucket)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Anyone can view recipe images'
  ) THEN
    CREATE POLICY "Anyone can view recipe images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'recipe-images');
  END IF;
END $$;
