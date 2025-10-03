-- Add property_type column to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS property_type TEXT;
