-- Add friend request flow: pending/accepted status + who initiated
ALTER TABLE friendships
  ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill existing friendships as accepted
UPDATE friendships SET status = 'accepted' WHERE status = 'accepted';

-- Index for quickly finding pending requests for a user
CREATE INDEX IF NOT EXISTS idx_friendships_pending
  ON friendships (status) WHERE status = 'pending';
