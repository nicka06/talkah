-- Add from_email column to emails table
ALTER TABLE emails ADD COLUMN from_email TEXT;

-- Update existing records to have a default from_email
UPDATE emails SET from_email = 'hello@talkah.com' WHERE from_email IS NULL;
