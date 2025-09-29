-- Temporarily disable RLS for listing_images to fix the issue
-- Run this in Supabase SQL Editor

-- Option 1: Disable RLS entirely for listing_images (simplest fix)
ALTER TABLE listing_images DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, use these very permissive policies instead:
-- (Comment out the line above and uncomment the lines below)

/*
-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can view listing images" ON listing_images;
DROP POLICY IF EXISTS "Authenticated users can insert listing images" ON listing_images;
DROP POLICY IF EXISTS "Authenticated users can update listing images" ON listing_images;
DROP POLICY IF EXISTS "Authenticated users can delete listing images" ON listing_images;
DROP POLICY IF EXISTS "Authenticated users can manage listing images" ON listing_images;
DROP POLICY IF EXISTS "Users can manage own listing images" ON listing_images;

-- Create a single permissive policy that allows everything
CREATE POLICY "Allow all operations on listing_images" ON listing_images
    FOR ALL USING (true) WITH CHECK (true);
*/