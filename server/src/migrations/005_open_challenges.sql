-- Open Challenges: public leaderboards created from solo game results
CREATE TABLE IF NOT EXISTS open_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by_user_id UUID NOT NULL REFERENCES users(id),
  posted_by_username VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('5Q', '10Q')),
  question_set_id UUID NOT NULL REFERENCES question_sets(id),
  posted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  player_count INTEGER NOT NULL DEFAULT 1,
  high_score INTEGER NOT NULL DEFAULT 0,
  high_score_username VARCHAR(255),
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One submission per user per challenge
CREATE TABLE IF NOT EXISTS open_challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES open_challenges(id),
  user_id UUID NOT NULL REFERENCES users(id),
  username VARCHAR(255) NOT NULL,
  correct_count INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (challenge_id, user_id)
);

-- For "Most Played" sort on browse page
CREATE INDEX IF NOT EXISTS idx_open_challenges_most_played
  ON open_challenges (player_count DESC, posted_at DESC)
  WHERE is_visible = TRUE;

-- For category filtering
CREATE INDEX IF NOT EXISTS idx_open_challenges_category
  ON open_challenges (category, expires_at DESC)
  WHERE is_visible = TRUE;

-- For leaderboard ranking within a challenge
CREATE INDEX IF NOT EXISTS idx_open_challenge_submissions_leaderboard
  ON open_challenge_submissions (challenge_id, total_score DESC, correct_count DESC, time_seconds ASC);

-- For "My Challenges" queries (Phase 5)
CREATE INDEX IF NOT EXISTS idx_open_challenges_posted_by
  ON open_challenges (posted_by_user_id);
