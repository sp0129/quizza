-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  profile_picture_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Question sets (10 questions stored as JSONB)
CREATE TABLE IF NOT EXISTS question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'trivia_db',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id UUID NOT NULL REFERENCES question_sets(id),
  player_a_id UUID NOT NULL REFERENCES users(id),
  player_b_id UUID REFERENCES users(id),
  category VARCHAR(255) NOT NULL,
  game_mode VARCHAR(50) NOT NULL DEFAULT 'async',
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  player_a_score INTEGER,
  player_b_score INTEGER,
  player_a_finished_at TIMESTAMP,
  player_b_finished_at TIMESTAMP,
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Per-question answer records
CREATE TABLE IF NOT EXISTS game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id),
  player_id UUID NOT NULL REFERENCES users(id),
  question_index INTEGER NOT NULL CHECK (question_index BETWEEN 0 AND 9),
  selected_answer VARCHAR(255) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER NOT NULL CHECK (time_taken_seconds BETWEEN 0 AND 30),
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (game_id, player_id, question_index)
);

-- Friendships (user_a_id always < user_b_id to avoid duplicates)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES users(id),
  user_b_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT different_users CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id),
  invitee_id UUID NOT NULL REFERENCES users(id),
  category VARCHAR(255) NOT NULL,
  game_id UUID REFERENCES games(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP
);

-- Matchmaking queue (cleared after match or timeout)
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  category VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms (N-player live game)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id),
  category VARCHAR(255) NOT NULL,
  question_set_id UUID REFERENCES question_sets(id),
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  room_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_players (
  room_id UUID NOT NULL REFERENCES rooms(id),
  player_id UUID NOT NULL REFERENCES users(id),
  username VARCHAR(255) NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  finished BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, player_id)
);

CREATE TABLE IF NOT EXISTS room_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  player_id UUID NOT NULL REFERENCES users(id),
  question_index INTEGER NOT NULL,
  selected_answer VARCHAR(255) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, player_id, question_index)
);
