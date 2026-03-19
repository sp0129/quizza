# Quizza: Open Challenges System - Claude Code Spec

**Version**: 1.0  
**Status**: Ready for Implementation  
**Last Updated**: March 18, 2026

-----

## Table of Contents

1. [Feature Overview](#feature-overview)
1. [Game Mechanics](#game-mechanics)
1. [Data Models](#data-models)
1. [Frontend Screens](#frontend-screens)
1. [Result Screen Messaging](#result-screen-messaging)
1. [Backend Endpoints](#backend-endpoints)
1. [Implementation Phases](#implementation-phases)

-----

## Feature Overview

**Open Challenges** allows users to post their completed solo games as public leaderboards that other users can join and compete on.

### Core Loop

1. User plays Solo game (5 or 10 questions)
1. User finishes → sees encouraging result message
1. Option: “Post as Challenge” → challenge appears on public board
1. Other users browse challenges, filter by category, join
1. They play same questions, see their rank on leaderboard
1. One attempt only — no replays (they already know the answers)

### Non-Competitive Philosophy

- **No 1v1 matchmaking**: All players on same challenge form a leaderboard
- **Non-zero-sum**: You ranking higher doesn’t hurt others
- **Asynchronous**: Players join challenges at different times
- **Ranked, not rated**: Position on leaderboard, not “won/lost”

-----

## Game Mechanics

### Solo Game Variants

- **5-Question Mode**: Quick games, 5 questions per round
- **10-Question Mode**: Standard games, 10 questions per round

### Scoring

**CRITICAL**: Open Challenges use the **exact same** `calculatePoints()` function from `server/src/services/scoring.ts` as all other game modes (Solo, Sync, Room). There is NO separate scoring formula.

#### Per-Question Scoring (`calculatePoints`)

```typescript
// server/src/services/scoring.ts — single source of truth for ALL modes
function calculatePoints(isCorrect: boolean, timeTakenSeconds: number): number {
  if (!isCorrect) return 0;
  const clamped = Math.min(Math.max(timeTakenSeconds, 0), 29);
  return Math.round(100 - (clamped / 29) * 50);
}
```

- **Wrong answer or timeout** → **0 points**
- **Correct answer** → **50 to 100 points**, scaled linearly by speed:
  - Instant (0s) → 100 points
  - Slowest correct (29s) → 50 points
- **Total score** = sum of per-question points

#### Score Ranges

| Mode | Max Score (all correct, instant) | Min Score (all correct, slowest) |
|------|--------------------------------|----------------------------------|
| 5Q   | 500                            | 250                              |
| 10Q  | 1000                           | 500                              |

#### Examples Showing Score vs Correctness Difference

**Scenario A: Fast vs Slow (Same Correctness)**

```
Player 1: 8/10 correct, avg 5s per question
  - Per correct question: ~91 pts each
  - Total Score: 728 pts → Rank #1

Player 2: 8/10 correct, avg 20s per question
  - Per correct question: ~66 pts each
  - Total Score: 528 pts → Rank #2

Same correctness, different ranks — speed matters.
```

**Scenario B: Different Correctness**

```
Player 1: 10/10 correct, avg 25s per question
  - Per correct question: ~57 pts each
  - Total Score: 570 pts → Rank #2

Player 2: 8/10 correct, avg 3s per question
  - Per correct question: ~95 pts each
  - Total Score: 760 pts → Rank #1

Fewer correct answers but faster — ranks higher.
```

#### Key Implementation Notes

1. **Always use `calculatePoints()` from `services/scoring.ts`** — never reimplement scoring logic
1. **Display `total_score`** (sum of per-question points) on results and leaderboards
1. **Messaging is based on correctness percentage** (for simplicity/UX)
1. **Ranking by `total_score`** — `ORDER BY total_score DESC, correct_count DESC, time_seconds ASC, submitted_at ASC`
1. **Ties possible**: Same `total_score` → earliest `submitted_at` first

-----

## ⚠️ CRITICAL: Single Scoring System

**The most important rule: Open Challenges use the same `calculatePoints()` as every other mode. No separate formula.**

### ALL displays and rankings use `total_score`

|Aspect            |Rule                                                                                    |
|------------------|----------------------------------------------------------------------------------------|
|**What User Sees**|`total_score` (e.g., “850 points”, “720 points”)                                        |
|**Ranking Logic** |Sort by `total_score DESC, correct_count DESC, time_seconds ASC, submitted_at ASC`                                            |
|**Messaging**     |Based on correctness percentage (e.g., 8/10 = 80% = “Great job!”) but score is displayed|
|**Comparison**    |Score = sum of per-question `calculatePoints()` (correctness + speed per question)      |

### Examples

**Example 1: Results Screen (What User Sees)**

```
Perfect! 🎯
Score: 950 points
Category: Science
```

**Example 2: Leaderboard Display (10Q)**

```
🥇 @alice (950 points)
🥈 @bob (820 points)
🥉 @carol (760 points)
4. @sumit (680 points)
```

**Example 3: What Determines Messaging**

```
User gets 8/10 correct, avg 8s per question
total_score = 720
Display: “720 points”
Message: “Great job! 👏” (based on 80% correctness)
```

**Example 4: Why Order Matters**

```
@alice and @bob both answered 9/10
But:
  @alice: 860 points (fast, avg 4s)
  @bob: 630 points (slow, avg 22s)
Rank: @alice #1, @bob #2 (same correctness, different speed)
```

-----

## Data Models

### Challenge (Schema)

```typescript
interface Challenge {
  id: string; // UUID
  posted_by_user_id: string; // UUID
  posted_by_username: string;
  
  category: string; // e.g., "Science", "Movies"
  mode: "5Q" | "10Q"; // Number of questions
  question_ids: string[]; // Immutable list of question IDs
  
  posted_at: Date;
  expires_at: Date; // 7 days from now (v1)
  
  // Stats (cached, updated on each submission)
  player_count: number;
  high_score: number; // Highest total_score
  high_score_username: string;
  high_score_correct: number; // e.g., 10
  
  // Metadata
  is_visible: boolean; // For soft deletes
  created_at: Date;
  updated_at: Date;
}
```

### Challenge Submission (Schema)

```typescript
interface ChallengeSubmission {
  id: string; // UUID
  challenge_id: string; // FK to Challenge
  user_id: string; // FK to User
  username: string;
  
  // Performance
  correct_count: number; // e.g., 8 (out of 10)
  total_questions: number; // 5 or 10
  total_score: number; // For ranking (1000-point scale)
  
  // Timing
  time_seconds: number; // Seconds to complete
  submitted_at: Date;
  
  // Metadata
  is_visible: boolean; // For soft deletes
  created_at: Date;
}
```


-----

## Frontend Screens

### Screen 1: Solo Result Screen (Existing, Modified)

**Triggered After**: User completes solo game (5Q or 10Q)

**Data Required**:

- `correct_count`: number (e.g., 8)
- `total_questions`: number (5 or 10)
- `total_score`: number (0-1000)
- `time_seconds`: number

**Layout**:

```
┌──────────────────────────────┐
│ {MESSAGE}                    │ ← Based on correct_count/total
│                              │
│ {EMOJI}                      │
│                              │
│ Score: {total_score}
│                              │
│ [Post as Challenge] [+] ← Prominent CTA
│ [Play Again] [Home]          │
└──────────────────────────────┘
```

**Messaging Logic** (See below: Result Screen Messaging)

-----

### Screen 2: Open Challenges Tab (New)

**Triggered**: User taps “Challenges” tab on home

**Data Required**:

- List of challenges (sorted by player_count desc, posted_at desc)
- User’s best score on each challenge (optional, for v2)
- Filters: category, sort order

**Layout**:

```
┌─────────────────────────────────────┐
│ OPEN CHALLENGES                     │
├─────────────────────────────────────┤
│ Sort: [Most Played] [Newest] [v]    │
│ Filter: [Science] [Movies] [More]   │
│ [Search] ← v2 feature               │
├─────────────────────────────────────┤
│                                     │
│ 🔥 Science (47 players)             │
│    Posted by @sumit                 │
│    High Score: 950                 │
│    Your Best: 720 ← if played      │
│    ▶ Play                           │
│                                     │
│ [Infinite Scroll - Load More...]    │
│                                     │
└─────────────────────────────────────┘
```

**Interaction**:

- Tap challenge card → Challenge Detail screen
- Tap “Play” → Start game with that challenge’s questions

**Sorting Options**:

1. **Most Played** (default): Order by `player_count DESC`, then `posted_at DESC`
1. **Newest**: Order by `posted_at DESC`
1. **Trending** (v2): Order by recent activity (submissions in last 24h)

**Filtering Options**:

- By category (top 10 categories shown, “More” expands)
- Search (v2)

-----

### Screen 3: Challenge Detail Screen (New)

**Triggered**: User taps a challenge on Open Challenges board

**Data Required**:

- Challenge metadata (title, category, posted_by_username, posted_at)
- Top 5 leaderboard entries
- Player count
- User’s best attempt (if exists)

**Layout**:

```
┌───────────────────────────────────┐
│ {CATEGORY_EMOJI} Science Trivia   │
│ Posted by @sumit (3 days ago)     │
│                                   │
│ 47 people have played             │
│ High Score: 950                  │
│ Your Best: 720 (if played)        │
│                                   │
│ Leaderboard (Top 5):              │
│ 🥇 @trivia_king (950)            │ ← Ranked by total_score
│ 🥈 @quiz_master (880)             │ ← (speed affects ranking)
│ 🥉 @sumit (820)                   │ ← Same correctness ≠ same rank
│ 4. @alice (760)                  │ ← Faster players rank higher
│ 5. @bob (680)                    │ ← Even with same answers
│ [See all 47...]                   │
│                                   │
│ [Play This Challenge]             │
│ [Close]                           │
│                                   │
└───────────────────────────────────┘
```

**CRITICAL**: Rankings are **always based on `total_score`**, not `correct_count`. Two players with the same display score (e.g., both 9/10) will have different ranks if one was faster.

**Interaction**:

- Tap “[See all 47…]” → Leaderboard Overlay (Screen 4)
- Tap “[Play This Challenge]” → Start game, then go to Result Screen

-----

### Screen 4: Challenge Leaderboard Overlay (New)

**Triggered**: User taps “See all X…” on Challenge Detail

**Data Required**:

- All submissions for challenge (paginated, 10 per page)
- User’s rank and score (highlighted)

**Layout**:

```
┌────────────────────────────────┐
│ Science Trivia (by @sumit)     │
│ 87 total players               │
├────────────────────────────────┤
│                                │
│ 🥇 @trivia_king (950)         │
│ 🥈 @quiz_master (880)          │
│ 🥉 @sumit (820)                │
│ 4. @alice (760)               │
│ 5. @bob (680)                 │
│ 6. YOU (720) ← highlighted    │
│ 7. @carol (650)               │
│ 8. @dave (600)                │
│ 9. @eve (550)                 │
│ 10. @frank (500)              │
│                                │
│ [Load More...] ← pagination    │
│                                │
│ [Close]                        │
│                                │
└────────────────────────────────┘
```

**Interaction**:

- Infinite scroll (load 10 more on scroll to bottom)
- Highlight current user’s entry

-----

### Screen 5: My Challenges Tab (New)

**Triggered**: User taps “My Challenges” (new tab on home)

**Data Required**:

- All challenges posted by user
- For each: player_count, high_score, high_score_correct, user’s rank, user’s score

**Layout**:

```
┌────────────────────────────┐
│ MY CHALLENGES (3)          │
├────────────────────────────┤
│                            │
│ 🔥 Science (87 players)    │
│    Your Score: 820         │
│    Your Rank: 4th          │
│    High Score: 950        │
│    Posted: 3 days ago      │
│    Expires: 4 days         │
│    ▶ View Leaderboard      │
│                            │
│ 🎬 Movies (12 players)     │
│    Your Score: 680         │
│    Your Rank: 2nd 🥈       │
│    High Score: 720        │
│    Posted: 1 day ago       │
│    Expires: 6 days         │
│    ▶ View Leaderboard      │
│                            │
│ 📚 History (2 players)     │
│    Your Score: 760         │
│    Your Rank: 1st 🥇       │
│    High Score: 760        │
│    Posted: 2 hours ago     │
│    Expires: 7 days         │
│    ▶ View Leaderboard      │
│                            │
└────────────────────────────┘
```

**Interaction**:

- Tap challenge card → View Leaderboard Overlay for that challenge
- Tap card itself → Challenge Detail screen

-----

## Result Screen Messaging

**This is triggered after BOTH solo games AND challenge submissions.**

### Messaging Logic

**Based on: `correct_count / total_questions`**

|Correct|Out of 5|Out of 10|Message                                     |Emoji|
|-------|--------|---------|--------------------------------------------|-----|
|5      |5/5     |—        |“Perfect! 🎯”                                |🎯    |
|4      |4/5     |—        |“Outstanding! 🌟”                            |🌟    |
|9      |—       |9/10     |“Outstanding! 🌟”                            |🌟    |
|8      |—       |8/10     |“Great job! 👏”                              |👏    |
|3      |3/5     |—        |“Great job! 👏”                              |👏    |
|7      |—       |7/10     |“Well played! 👍”                            |👍    |
|2      |2/5     |—        |“Well played! 👍”                            |👍    |
|6      |—       |6/10     |“Well played! 👍”                            |👍    |
|1      |1/5     |—        |“Not bad! 💪”                                |💪    |
|5      |—       |5/10     |“Not bad! 💪”                                |💪    |
|0      |0/5     |—        |“New to this? 🌱 You just learned 5 things!” |🌱    |
|0      |—       |0/10     |“New to this? 🌱 You just learned 10 things!”|🌱    |

### Logic Implementation (Pseudocode)

```typescript
function getResultMessage(correctCount: number, totalQuestions: number): { message: string; emoji: string } {
  const percentage = (correctCount / totalQuestions) * 100;
  
  if (percentage === 100) {
    return { message: "Perfect!", emoji: "🎯" };
  } else if (percentage >= 80) {
    return { message: "Outstanding!", emoji: "🌟" };
  } else if (percentage >= 60) {
    return { message: "Great job!", emoji: "👏" };
  } else if (percentage >= 40) {
    return { message: "Well played!", emoji: "👍" };
  } else if (percentage >= 20) {
    return { message: "Not bad!", emoji: "💪" };
  } else if (percentage > 0) {
    return { message: `Getting there! You learned ${totalQuestions} new things.`, emoji: "🚀" };
  } else {
    return { message: `New to this? 🌱 You just learned ${totalQuestions} things!`, emoji: "🌱" };
  }
}
```

### Result Screen Layout (Updated)

**After Solo Game:**

```
┌──────────────────────────────┐
│ Perfect! 🎯                  │ ← Message (based on correct_count)
│                              │
│ Score: 950                   │ ← Actual total_score
│ ← For context only
│ Time: 120 seconds            │
│                              │
│ [Post as Challenge]          │ ← Primary CTA
│ [Play Again]                 │
│ [Home]                       │
└──────────────────────────────┘
```

**After Challenge Submission (Same Mode as Solo, but with Leaderboard):**

```
┌──────────────────────────────┐
│ Outstanding! 🌟              │ ← Message (based on correct_count)
│                              │
│ Your Score: 720              │ ← Actual total_score
│                              │
│ Science Leaderboard:         │
│ 🥇 @trivia_king (950)        │ ← Ranked by total_score
│ 🥈 @quiz_master (880)        │
│ 🥉 YOU (720)                 │ ← Your rank
│ 4. @sumit (680)              │
│ 5. @alice (650)              │
│                              │
│ [Post Your Own Challenge]    │
│ [Play Another] [Home]        │
└──────────────────────────────┘
```

-----

## Backend Endpoints

### 1. POST /api/challenges

**Create a new challenge from solo game result**

**Request**:

```typescript
{
  category: string; // "Science"
  mode: "5Q" | "10Q";
  question_ids: string[]; // [uuid1, uuid2, ...]
  correct_count: number; // 8
  total_score: number; // 850 (0-1000 scale)
  time_seconds: number; // 120
}
```

**Response**:

```typescript
{
  id: string;
  category: string;
  mode: "5Q" | "10Q";
  posted_at: Date;
  expires_at: Date;
  posted_by_username: string;
  // ... full Challenge object
}
```

**Authentication**: Requires `auth_token`

-----

### 2. GET /api/challenges

**Browse challenges with filters and sorting**

**Query Parameters**:

```
?sort=most_played | newest | trending (default: most_played)
?category=Science&category=Movies (multiple allowed)
?limit=20
?offset=0 (for pagination)
?search=python (v2 feature)
```

**Response**:

```typescript
{
  challenges: [
    {
      id: string;
      category: string;
      posted_by_username: string;
      posted_at: Date;
      player_count: number;
      high_score: number;
      high_score_correct: number;
      user_best_score?: number; // Only if user is authenticated
      user_best_correct?: number;
    }
  ];
  total_count: number;
  has_more: boolean;
}
```

-----

### 3. GET /api/challenges/:id

**Get challenge detail (with top leaderboard entries)**

**Response**:

```typescript
{
  id: string;
  category: string;
  mode: "5Q" | "10Q";
  posted_by_username: string;
  posted_at: Date;
  expires_at: Date;
  player_count: number;
  high_score: number;
  high_score_correct: number;
  
  leaderboard: [
    {
      rank: number;
      username: string;
      correct_count: number;
      total_questions: number;
      total_score: number;
      submitted_at: Date;
      is_current_user: boolean;
    }
  ]; // Top 5 only
  
  user_attempt?: {
    rank: number;
    correct_count: number;
    total_score: number;
    submitted_at: Date;
  }; // Only if user authenticated and has played
}
```

-----

### 4. GET /api/challenges/:id/leaderboard

**Get full leaderboard with pagination**

**Query Parameters**:

```
?limit=10
?offset=0
```

**Response**:

```typescript
{
  challenge_id: string;
  total_players: number;
  leaderboard: [
    {
      rank: number;
      username: string;
      correct_count: number;
      total_questions: number;
      total_score: number;
      submitted_at: Date;
      is_current_user: boolean;
    }
  ];
  user_rank?: number; // If user is authenticated, their rank (1-indexed)
  has_more: boolean;
}
```

**Ranking Rule**: Sorted by `total_score DESC, correct_count DESC, time_seconds ASC, submitted_at ASC`. **Rankings are always score-based**, not correctness-based.

-----

### 5. POST /api/challenges/:id/submit

**Submit a player’s attempt at a challenge**

**Request**:

```typescript
{
  challenge_id: string;
  correct_count: number;
  total_questions: number; // Should match challenge's mode
  total_score: number;
  time_seconds: number;
}
```

**Response**:

```typescript
{
  submission_id: string;
  rank: number;
  message: string; // "Perfect!" etc.
  leaderboard: [...]; // Updated leaderboard with user's new rank
}
```

-----

### 6. GET /api/user/challenges

**Get all challenges posted by current user**

**Response**:

```typescript
{
  challenges: [
    {
      id: string;
      category: string;
      mode: "5Q" | "10Q";
      posted_at: Date;
      expires_at: Date;
      player_count: number;
      high_score: number;
      high_score_correct: number;
      
      user_stats: {
        user_score: number;
        user_correct_count: number;
        user_rank: number;
      };
    }
  ];
}
```

-----

## Implementation Phases

### Phase 1: Backend Foundation (Week 1)

**Objectives**:

- [ ] Create Challenge and ChallengeSubmission schemas
- [ ] Implement POST /api/challenges (create challenge)
- [ ] Implement GET /api/challenges (list with sorting)
- [ ] Implement POST /api/challenges/:id/submit (submit attempt)
- [ ] Database indexing for performance

**Definition of Done**:

- API endpoints tested
- Queries optimized (< 200ms response time)
- No n+1 queries

-----

### Phase 2: Frontend - Result Screen (Week 2)

**Objectives**:

- [ ] Update Solo Result Screen with new messaging logic
- [ ] Add “Post as Challenge” button + modal
- [ ] Test all message variations (0-100%)
- [ ] Ensure messaging works for both 5Q and 10Q modes

**Definition of Done**:

- All message variants display correctly
- Post modal functional
- Challenge successfully created and appears on board

-----

### Phase 3: Frontend - Open Challenges Board (Week 3)

**Objectives**:

- [ ] Create “Open Challenges” tab on home
- [ ] Implement challenge list with infinite scroll
- [ ] Add category filtering
- [ ] Add “Most Played” / “Newest” sorting
- [ ] Display user’s best score on challenges they’ve played

**Definition of Done**:

- Board loads challenges correctly
- Filtering/sorting works
- Infinite scroll functional
- Performance acceptable (< 2s load)

-----

### Phase 4: Frontend - Challenge Detail & Leaderboard (Week 4)

**Objectives**:

- [ ] Create Challenge Detail screen with top 5 leaderboard
- [ ] Create Leaderboard Overlay with full rankings
- [ ] Implement “Play This Challenge” flow
- [ ] Show user’s current rank

**Definition of Done**:

- All screens render correctly
- Leaderboard rankings accurate
- Challenge submission flow works end-to-end

-----

### Phase 5: Frontend - My Challenges Tab (Week 5)

**Objectives**:

- [ ] Create “My Challenges” tab
- [ ] Display all posted challenges with stats
- [ ] Show user’s rank on own challenges
- [ ] “View Leaderboard” link functional

**Definition of Done**:

- User can see all posted challenges
- Stats accurate (player count, user’s rank, etc.)
- Navigation between screens seamless

-----

### Phase 6: Polish & Launch (Week 6)

**Objectives**:

- [ ] End-to-end testing (solo → post → play → rank)
- [ ] Performance optimization
- [ ] Copy refinement (messaging, CTAs)
- [ ] Mobile UX polish
- [ ] Error handling (edge cases)

**Definition of Done**:

- No bugs found in testing
- All happy paths work
- Error states handled gracefully
- Ready for TestFlight

-----

## Technical Considerations

### Database Performance

**Indexes Required**:

```sql
-- For "Most Played" sort
CREATE INDEX idx_challenges_player_count_posted_at 
  ON challenges(player_count DESC, posted_at DESC)
  WHERE is_visible = true AND expires_at > NOW();

-- For category filtering
CREATE INDEX idx_challenges_category_expires_at 
  ON challenges(category, expires_at DESC)
  WHERE is_visible = true;

-- For leaderboard ranking
CREATE INDEX idx_submissions_challenge_score 
  ON challenge_submissions(challenge_id, total_score DESC)
  WHERE is_visible = true;
```

### Caching Strategy (Optional for v1)

- Cache top 10 challenges in Redis (refresh every hour)
- Cache user’s submitted challenges (refresh on new submission)
- Cache individual leaderboards (refresh on new submission)

### Rate Limiting

- POST /challenges: 100 per user per day (prevent spam)
- GET /challenges: 1000 per user per hour (prevent scraping)
- POST /submit: 500 per user per day (prevent manipulation)

-----

## Edge Cases & Error Handling

### Scenario 1: Challenge Expires

- Challenge becomes invisible on “Open Challenges” tab
- Users cannot submit new attempts
- Existing leaderboard still viewable (in “My Challenges” tab)

### Scenario 2: User Deletes Account

- All posted challenges remain visible
- Username shows as “[Deleted User]”
- All submissions remain with original username (historical)

### Scenario 3: Duplicate Submission

- A user can only play a given challenge **once**
- Enforce via UNIQUE constraint on `(challenge_id, user_id)`
- If user has already submitted, return 409 Conflict
- Rationale: replays are unfair since the user already knows the answers

### Scenario 4: Category Not Found

- If category doesn’t exist in question bank, return 400 error
- Message: “Invalid category”

### Scenario 5: Questions No Longer Available

- If question is deleted after challenge posted, still playable
- Questions are immutable snapshots in Challenge.question_ids

-----

## Success Metrics (Measurement)

|Metric                       |Target|Collection Method                                          |
|-----------------------------|------|-----------------------------------------------------------|
|% Users posting challenge    |40%+  |Analytics event: “challenge_posted”                        |
|Challenges with ≥1 submission|70%+  |DB query: challenges with player_count > 1                 |
|Avg submissions per challenge|15+   |DB query: COUNT / total_challenges                         |
|Unique challenges played/user |5+    |DB query: COUNT(DISTINCT challenge_id) per user            |
|Day-7 retention              |35%+  |Cohort analysis: open_challenges active users              |
|Avg session time             |+20%  |Analytics: compare solo-only vs open-challenges users      |

-----

## Notes for Claude Code

When implementing, remember:

1. **Single scoring system**: Always use `calculatePoints()` from `services/scoring.ts` — never reimplement or create alternate formulas
1. **Messaging**: Use percentage-based thresholds, not raw scores
1. **Non-Competitive Language**: Never say “beat”, “won”, “lost”. Use “ranked”, “scored”
1. **Real Usernames**: Human connection is key; show actual usernames everywhere
1. **Asynchronous Design**: No “waiting for opponent” mechanics
1. **Cold Start**: Be ready to seed challenges as admin user
1. **Mobile First**: Test all screens on iPhone/Android
1. **Performance**: Leaderboards should load in < 1 second

-----

## Appendix: Copy Variations by Score

### 5-Question Mode

|Correct|Message                                  |Context          |
|-------|-----------------------------------------|-----------------|
|5/5    |Perfect! 🎯                               |Solo or Challenge|
|4/5    |Outstanding! 🌟                           |Solo or Challenge|
|3/5    |Great job! 👏                             |Solo or Challenge|
|2/5    |Well played! 👍                           |Solo or Challenge|
|1/5    |Not bad! 💪                               |Solo or Challenge|
|0/5    |New to this? 🌱 You just learned 5 things.|Solo or Challenge|

### 10-Question Mode

|Correct|Message                                   |Context          |
|-------|------------------------------------------|-----------------|
|10/10  |Perfect! 🎯                                |Solo or Challenge|
|9/10   |Outstanding! 🌟                            |Solo or Challenge|
|8/10   |Great job! 👏                              |Solo or Challenge|
|7/10   |Well played! 👍                            |Solo or Challenge|
|6/10   |Well played! 👍                            |Solo or Challenge|
|5/10   |Not bad! 💪                                |Solo or Challenge|
|4/10   |Not bad! 💪                                |Solo or Challenge|
|3/10   |Not bad! 💪                                |Solo or Challenge|
|2/10   |Getting there! 🚀 You learned 10 things.   |Solo or Challenge|
|1/10   |Getting there! 🚀 You learned 10 things.   |Solo or Challenge|
|0/10   |New to this? 🌱 You just learned 10 things!|Solo or Challenge|