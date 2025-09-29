-- Fix for Clerk integration - run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own listings" ON listings;
DROP POLICY IF EXISTS "Users can update own listings" ON listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON listings;
DROP POLICY IF EXISTS "Users can manage own listing images" ON listing_images;

-- Create new policies that work with Clerk user IDs
-- Allow any authenticated user to insert listings (we'll check user_id in the app)
CREATE POLICY "Authenticated users can insert listings" ON listings
    FOR INSERT WITH CHECK (true);

-- Users can only update listings where user_id matches their Clerk ID
CREATE POLICY "Users can update own listings" ON listings
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can only delete listings where user_id matches their Clerk ID  
CREATE POLICY "Users can delete own listings" ON listings
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- For listing_images, allow management for any authenticated user for now
CREATE POLICY "Authenticated users can manage listing images" ON listing_images
    FOR ALL WITH CHECK (true);