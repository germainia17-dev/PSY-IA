-- Add push_token column to profiles for Expo Push API
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index for efficient push queries
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;
