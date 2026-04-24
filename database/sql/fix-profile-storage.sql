-- Fix Profile Photo Storage
-- Run this in Supabase SQL Editor

-- 1. Create the PROFILE bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'PROFILE', 
  'PROFILE', 
  true,  -- Make it public so URLs work
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all profile photos" ON storage.objects;

-- 3. Create policies for the PROFILE bucket

-- Allow public read access to all profile photos
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'PROFILE');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'PROFILE' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'PROFILE' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'PROFILE' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role full access (for backend operations)
CREATE POLICY "Service role can manage all profile photos"
ON storage.objects
TO service_role
USING (bucket_id = 'PROFILE')
WITH CHECK (bucket_id = 'PROFILE');

-- 4. Verify the bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'PROFILE';
