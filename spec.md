# Trivia Game App - Product Specification

## 1. Overview

A real-time multiplayer trivia game where users compete against friends or random opponents in category-based quiz challenges. Players answer 10 multiple-choice questions with a 30-second timer per question, earning points based on correctness and answer speed.

**Platform:** Web app (React + Node.js + PostgreSQL), with future iOS port planned.

---

## 2. Core Features

### 2.1 Game Modes

#### Synchronous (Real-time) Mode
- Both players answer questions simultaneously
- Questions are locked to the same pace
- When Player A answers, they wait for Player B (or 30-second timer expires)
- Both players see the same questions in the same order
- Winner determined immediately when both players complete all 10 questions

#### Asynchronous (Solo) Mode
- Player A initiates a challenge and completes 10 questions
- Player B joins the same challenge later (within 24 hours) and answers the identical 10 questions
- Both players get instant feedback on each answer
- Score updates in real-time as they answer
- Winner determined when Player B completes their round

### 2.2 Matchmaking

**Random Online Match:**
- App attempts to find a live opponent in the selected category for 30 seconds
- If a match is found → Synchronous mode begins
- If no match found → Challenge auto-converts to Asynchronous mode
- Player A can start playing immediately while waiting for an async opponent

**Invite Friend:**
- Player A searches for a friend by username
- Player A selects a category
- SMS notification sent to Player B with a challenge link
- Player B clicks link, logs in, and plays the same 10 questions
- Can be sync or async depending on timing

**Solo Play (Future):**
- Play against computer AI or just for practice (not in initial scope)

---

## 3. Question System

### 3.1 Question Data Sources

Questions are sourced from two providers:

1. **Open Trivia Database (opentdb.com)**
   - Free, open-source trivia API
   - Used via: `https://opentdb.com/api.php?amount=10&category=[ID]&type=multiple`

2. **Custom JSON Files (GitHub-hosted)**
   - User-maintained JSON files for custom/niche categories
   - Allows adding categories not available in Open Trivia DB
   - Stored in GitHub repo; app pulls at runtime (no app update needed)
   - Format:
     ```json
     {
       "category": "Formula 1",
       "questions": [
         {
           "question": "Who won the 2023 F1 World Championship?",
           "correct_answer": "Max Verstappen",
           "incorrect_answers": ["Lewis Hamilton", "Charles Leclerc", "Lando Norris"],
           "difficulty": "easy"
         }
       ]
     }
     ```

### 3.2 Question Selection Logic

**Proportional Sampling:**
- Count total questions available per category from both sources
- If category has 100 questions from Open Trivia DB and 200 from JSON files:
  - Pull 33% (3-4 questions) from Open Trivia DB
  - Pull 67% (6-7 questions) from JSON files
- Randomly shuffle selected questions
- Use consistent seeding so both players in a game get identical question sets

**Question Set Creation:**
1. Backend receives category selection
2. Backend calculates proportions
3. Backend randomly samples 10 questions from combined pool
4. Backend stores `questionSetId` with the 10 selected questions in database
5. Both players linked to same `questionSetId` for that game

### 3.3 Question Difficulty

- Questions progress from easy → hard
- Each question has a difficulty level (easy, medium, hard)
- Questions returned in difficulty-ascending order

---

## 4. Scoring System

### 4.1 Points Per Question

- **Maximum points per question:** 100
- **Minimum points for correct answer:** 50 (at 29 seconds)
- **Points scale:** Linear based on response time
  - 0 seconds (instant) = 100 points
  - 29 seconds = 50 points
  - Interpolate linearly in between
- **Wrong answer:** 0 points (no penalty, no points awarded)
- **No answer (timer expires):** 0 points

### 4.2 Total Score

- Sum of points across all 10 questions
- Maximum possible score: 1,000 points
- Score updates in real-time as player answers each question

### 4.3 Winner Determination

**Synchronous Mode:**
- Both players' final scores compared when the second player finishes
- Higher score wins
- Ties are possible

**Asynchronous Mode:**
- Player A's score is final when they complete their 10 questions
- Player B's score is final when they complete their 10 questions
- Comparison made when Player B finishes (or 24-hour timeout)
- Higher score wins

---

## 5. User Profiles

### 5.1 Profile Data

Each user has:
- **Username** (unique, required)
- **Profile picture** (optional, URL)
- **Email** (required for login/SMS)
- **Phone number** (required for SMS challenges)
- **Account created date**
- **Last login**

### 5.2 Player Stats

Visible on user profiles:
- **Win/loss record** (overall and by category)
- **Head-to-head record** (vs. specific friends)
- **Average score** (overall and by category)
- **Total games played**

### 5.3 Friend Profiles

When viewing a friend's profile:
- See their stats
- See head-to-head record (wins/losses against them)
- Quick button to challenge them
- See recent games together

---

## 6. Challenges & Invitations

### 6.1 Friend Challenge Flow

1. Player A opens their friend's profile
2. Player A clicks "Challenge" button
3. Player A selects a category
4. System generates SMS notification for Player B
5. SMS contains:
   - Player A's name/username
   - Category name
   - Click-able link to app/challenge
   - Challenge ID
6. Player B clicks link → app opens with challenge pre-loaded
7. Player B can accept and play

### 6.2 Random Online Challenge Flow

1. Player A selects category
2. App searches for live opponent for 30 seconds
3. **If match found:** Both start sync match with same question set
4. **If no match:** Challenge converts to async mode
   - Player A can play immediately
   - Player B joins async challenge if they log in within 24 hours
   - Shows pending challenges on Player B's dashboard

### 6.3 Pending Challenges

- Players see list of pending async challenges awaiting them
- Can accept and play at any time
- Challenge expires after 24 hours (shows countdown)
- After expiration, neither player can join

---

## 7. Real-time Game Flow

### 7.1 Synchronous Game Flow

```
T=0s:   Both players see Question 1 + 30s timer starts
T=5s:   Player A taps answer → instant feedback (✓ or ✗)
        Score updates (e.g., 95 points)
        Player A waits for Player B
T=12s:  Player B taps answer → instant feedback
        Player B's score updates
        Both players advance to Question 2
T=42s:  Both players see Question 2 + timer resets
[repeat for all 10 questions]
T≈300s: Both players finish Question 10
        Final scores displayed
        Winner declared
        Game summary shown
```

### 7.2 Asynchronous Game Flow

```
T=0s:   Player A starts challenge
        Sees Question 1 + 30s timer
T=5s:   Player A answers Q1 → feedback + score update
        Question 2 appears (Player A can answer immediately)
        No waiting
[Player A completes all 10 questions at their own pace]
T≈150s: Player A finishes with final score (e.g., 850 points)
        Game summary shown
        Awaits Player B

[24 hours later]
T=0s:   Player B logs in, sees pending challenge from Player A
        Clicks challenge → sees same 10 questions
        Starts playing at their own pace
T≈200s: Player B finishes
        Final score displayed
        Comparison with Player A shown
        Winner declared
```

### 7.3 In-Game UI Elements

- **Question counter:** "Question 3 of 10"
- **Timer:** Large countdown timer (30s → 0s)
- **Current score:** Live-updating score for current round
- **Question text:** Large, readable font
- **4 answer options:** Buttons (A, B, C, D)
- **Feedback:** Immediate visual feedback (green ✓ / red ✗) after answer
- **Next button:** Auto-advance or manual "Next" button

---

## 8. Categories

Available categories sourced from Open Trivia DB + custom JSON files:

Examples:
- General Knowledge
- Science & Nature
- History
- Geography
- Entertainment (Movies, TV, Music, Books, Video Games)
- Sports
- Formula 1 (custom)
- Anime (custom)
- etc.

**Implementation:** Dynamically fetch available categories from both sources on app startup.

---

## 9. Technical Architecture

### 9.1 Tech Stack

- **Frontend:** React (TypeScript recommended)
- **Backend:** Node.js (Express or similar)
- **Database:** PostgreSQL
- **Hosting:** Railway or Render (free tier for DB + backend)
- **External APIs:**
  - Open Trivia DB API
  - Twilio (SMS notifications)
  - GitHub Raw Content API (for custom JSON question files)

### 9.2 Database Schema (PostgreSQL)

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  profile_picture_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Games Table
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  question_set_id UUID NOT NULL,
  player_a_id UUID NOT NULL REFERENCES users(id),
  player_b_id UUID REFERENCES users(id), -- NULL if async waiting
  category VARCHAR(255) NOT NULL,
  game_mode VARCHAR(50) NOT NULL, -- 'sync' or 'async'
  player_a_score INTEGER,
  player_b_score INTEGER,
  winner_id UUID REFERENCES users(id), -- NULL if tie or incomplete
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP, -- For async games (24 hours from creation)
  CONSTRAINT player_a_not_null CHECK (player_a_id IS NOT NULL)
);
```

#### QuestionSets Table
```sql
CREATE TABLE question_sets (
  id UUID PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL, -- Array of 10 questions with answers
  source VARCHAR(50) NOT NULL, -- 'mixed' (both sources), 'trivia_db', 'custom_json'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### GameAnswers Table
```sql
CREATE TABLE game_answers (
  id UUID PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id),
  player_id UUID NOT NULL REFERENCES users(id),
  question_index INTEGER NOT NULL, -- 0-9
  selected_answer VARCHAR(255) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Friends Table
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY,
  user_a_id UUID NOT NULL REFERENCES users(id),
  user_b_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT different_users CHECK (user_a_id < user_b_id),
  UNIQUE(user_a_id, user_b_id)
);
```

#### Game Invitations Table
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES users(id),
  invitee_id UUID NOT NULL REFERENCES users(id),
  category VARCHAR(255) NOT NULL,
  game_id UUID REFERENCES games(id),
  status VARCHAR(50) NOT NULL, -- 'pending', 'accepted', 'expired'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP
);
```

### 9.3 API Endpoints (Node.js Backend)

#### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Logout

#### Users
- `GET /users/:username` - Get user profile + stats
- `GET /users/:userId/stats` - Get detailed stats
- `PUT /users/:userId` - Update profile (picture, etc.)
- `GET /users/:userId/friends` - Get friend list
- `GET /users/:userId1/vs/:userId2` - Get head-to-head record

#### Games
- `POST /games/create-random` - Create random matchmake challenge
- `POST /games/create-friend` - Invite friend to challenge
- `GET /games/:gameId` - Get game details
- `POST /games/:gameId/answer` - Submit answer to question
- `GET /games/:gameId/status` - Get current game state
- `GET /games/pending` - Get pending async challenges

#### Questions
- `GET /categories` - Get available categories
- `GET /questions/set/:questionSetId` - Get questions for a game

#### Invitations
- `POST /invitations/:invitationId/accept` - Accept friend challenge
- `GET /invitations/pending` - Get pending invitations
- `POST /invitations/:invitationId/decline` - Decline invitation

#### SMS/Notifications
- `POST /notifications/send-sms` - Backend triggers SMS via Twilio

### 9.4 Question Fetching Flow

**Backend process to get questions:**

1. Receive category from frontend
2. Fetch available question count from:
   - Open Trivia DB (via API or cached count)
   - GitHub JSON file (via raw content URL)
3. Calculate proportions (e.g., 30% trivia DB, 70% custom)
4. Fetch ~15 questions from each source (to ensure 10 after shuffling)
5. Combine, shuffle, and select random 10
6. Store in `QuestionSets` table with unique ID
7. Return questions to frontend with `questionSetId`

**GitHub JSON file structure:**
```
https://raw.githubusercontent.com/[username]/[repo]/main/questions/[category].json
```

### 9.5 Real-time Synchronization

**Sync Mode:**
- WebSocket connection for real-time updates
- Player A answers → emit event → notify Player B + server
- Server waits for both answers before advancing
- Broadcast "Question advance" to both players

**Async Mode:**
- No real-time requirement
- Each player's answer submitted via HTTP POST
- Server records answer + calculates score
- No waiting

### 9.6 SMS Notifications (Twilio)

**When challenge is created:**
1. Backend calls Twilio API
2. SMS sent to invitee's phone with:
   - "You've been challenged to a trivia game!"
   - Category name
   - Challenge link (e.g., `app.trivia.com/challenge/[challengeId]`)
3. Invitee clicks link → app opens with challenge pre-loaded

---

## 10. Future Enhancements (Out of Scope for MVP)

- Leaderboards (global, by category, friends)
- Hardcore mode (penalties for wrong answers)
- Cute animations for correct/wrong answers
- Solo practice mode
- Power-ups/boosters during games
- Custom difficulty selection
- Seasonal challenges
- Social features (comments, replays, shares)
- AI opponent
- Mobile app (iOS via React Native)
- Dark mode

---

## 11. Success Metrics

- User registration rate
- Game completion rate (% of started games finished)
- Average game duration
- Player retention (DAU/MAU)
- SMS open rate (% who click challenge link)

---

## 12. Implementation Phases

### Phase 1: MVP (Core Gameplay)
- User authentication
- Random sync matchmaking
- Async challenge flow
- Question fetching from Open Trivia DB only
- Basic scoring
- Game completion and winner determination

### Phase 2: Enhanced Features
- Friend invitations + SMS
- Custom JSON question support
- Player profiles + stats
- Head-to-head records

### Phase 3: Polish
- UI/UX refinements
- Performance optimization
- Edge case handling
- Animations

### Phase 4: iOS Port
- React Native implementation
- Platform-specific optimizations

---

## 13. Notes for Developer

- Ensure robust error handling for external APIs (Open Trivia DB, Twilio, GitHub)
- Implement rate limiting to avoid API quota issues
- Use connection pooling for PostgreSQL
- Validate all user inputs (especially during game answers)
- Implement proper authentication/JWT tokens
- Log all game results for audit/replay purposes
- Handle edge cases: timeouts, disconnections, duplicate submissions
- Consider caching for category lists and question availability counts
