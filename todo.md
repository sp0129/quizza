# Quizza — TODO

> Organized by implementation phase. Tasks requiring external action are marked **`[YOU]`**.

---

## Project Setup

- [ ] Initialize monorepo structure (`/client`, `/server`)
- [ ] Set up React + TypeScript frontend (Vite recommended)
- [ ] Set up Node.js + Express backend (TypeScript)
- [ ] Configure ESLint + Prettier for both packages
- [ ] Add `.env.example` with all required env vars
- [ ] **`[YOU]`** Create GitHub repo for custom question JSON files (used at runtime)
- [ ] **`[YOU]`** Provision a PostgreSQL database on Railway or Render
- [ ] **`[YOU]`** Set up backend hosting on Railway or Render
- [ ] **`[YOU]`** Set up frontend hosting on Vercel or Netlify
- [ ] Wire up CI: lint + build on every PR (GitHub Actions)

---

## Phase 1 — MVP (Core Gameplay)

### Auth
- [ ] Design `users` table and run migration
- [ ] `POST /auth/signup` — create user with hashed password
- [ ] `POST /auth/login` — return JWT
- [ ] `POST /auth/logout` — invalidate session / clear cookie
- [ ] Auth middleware: verify JWT on protected routes
- [ ] Frontend: signup page, login page, protected route wrapper

### Database Schema
- [ ] Create `users` table
- [ ] Create `question_sets` table (stores JSONB question arrays)
- [ ] Create `games` table (supports sync + async, expiry for async)
- [ ] Create `game_answers` table (per-question answer records)
- [ ] Set up PostgreSQL connection pool in backend

### Question Fetching (Open Trivia DB only for MVP)
- [ ] `GET /categories` — fetch and return category list from Open Trivia DB
- [ ] Backend service: fetch 10 questions from `opentdb.com` by category
- [ ] Sort questions easy → hard before storing
- [ ] Store question set in `question_sets` table, return `questionSetId`
- [ ] `GET /questions/set/:questionSetId` — return questions for a game (no correct answers leaked to client until answered)

### Matchmaking
- [ ] `POST /games/create-random` — create a game, join matchmaking queue for category
- [ ] Matchmaking queue: poll for 30 seconds for a live opponent
- [ ] On match found → create sync game, link both players to same `questionSetId`
- [ ] On timeout → convert game to async mode; player A can begin immediately
- [ ] WebSocket server setup (for sync mode real-time events)

### Gameplay
- [ ] `POST /games/:gameId/answer` — record answer, calculate points (linear 50–100 based on `time_taken_seconds`)
- [ ] `GET /games/:gameId/status` — return current game state (scores, question index, mode)
- [ ] Sync mode: server holds question advancement until both players answer or 30s timer fires
- [ ] Async mode: player advances independently, no waiting
- [ ] `GET /games/pending` — list pending async challenges for logged-in user
- [ ] Frontend: game screen with question counter, 30s countdown timer, 4 answer buttons, live score
- [ ] Frontend: instant answer feedback (green ✓ / red ✗)
- [ ] Frontend: auto-advance (sync waits for both; async advances immediately)

### Scoring & Game Completion
- [ ] Points formula: `max(50, 100 - ceil((time_taken / 29) * 50))`
- [ ] Sum per-question points into final score on game completion
- [ ] Write winner to `games.winner_id` when both players finish (or async 24h timeout)
- [ ] `GET /games/:gameId` — return game result + comparison when complete
- [ ] Frontend: end-of-game summary screen (scores, winner declaration)

### Async Challenge Expiry
- [ ] Set `games.expires_at = created_at + 24 hours` for async games
- [ ] Reject answers submitted after expiry
- [ ] Frontend: show countdown to expiry on pending challenge cards

---

## Phase 2 — Enhanced Features

### Friends
- [ ] Create `friendships` table (with `user_a_id < user_b_id` constraint to avoid duplicates)
- [ ] `GET /users/:userId/friends` — list friends
- [ ] Add friend by username (search + request flow)
- [ ] `GET /users/:userId1/vs/:userId2` — head-to-head record

### Friend Challenges + SMS
- [ ] Create `invitations` table
- [ ] `POST /games/create-friend` — create challenge, generate invitation record
- [ ] `POST /invitations/:invitationId/accept` — accept and start async game
- [ ] `POST /invitations/:invitationId/decline`
- [ ] `GET /invitations/pending` — list outstanding invitations
- [ ] **`[YOU]`** Create a Twilio account and get `ACCOUNT_SID`, `AUTH_TOKEN`, and a phone number
- [ ] **`[YOU]`** Register an app domain for SMS deep links (e.g. `app.trivia.com`) and configure DNS
- [ ] Backend: call Twilio API to send SMS with challenge link on invite creation
- [ ] Deep link handler on frontend: `/challenge/:id` route pre-loads the correct game

### Custom JSON Questions (GitHub-hosted)
- [ ] **`[YOU]`** Add custom question JSON files to your GitHub questions repo (one file per category, matching the spec format)
- [ ] Backend service: fetch custom questions from GitHub Raw Content API at runtime
- [ ] Merge Open Trivia DB + custom questions; proportional sampling (e.g. 30% / 70% by pool size)
- [ ] Use consistent random seed per `questionSetId` so both players get identical questions
- [ ] Cache category question counts to reduce GitHub API calls

### User Profiles & Stats
- [ ] `GET /users/:username` — public profile + aggregate stats
- [ ] `GET /users/:userId/stats` — win/loss, avg score (overall + per category), games played
- [ ] `PUT /users/:userId` — update profile picture URL, phone number
- [ ] Frontend: profile page with stats grid, recent games list
- [ ] Frontend: friend profile page with head-to-head record + "Challenge" button

---

## Phase 3 — Polish

- [ ] UI/UX pass: typography, spacing, color system, responsive layout
- [ ] Animations: answer feedback, score increment, winner reveal
- [ ] Rate limiting on API routes (especially `/games/create-*` and Twilio-triggered endpoints)
- [ ] Input validation on all API endpoints (especially `POST /games/:gameId/answer`)
- [ ] Error handling for external APIs (Open Trivia DB, GitHub, Twilio) with fallback messages
- [ ] Handle edge cases: duplicate answer submissions, disconnect + reconnect mid-sync-game, expired async games
- [ ] Logging: structured logs for all game events (audit trail)
- [ ] Performance: cache Open Trivia DB category list; connection pooling tuned
- [ ] Load test sync game WebSocket flow
- [ ] End-to-end tests for game flows (sync + async)

---

## Phase 4 — iOS Port

- [ ] Evaluate React Native vs. Expo for cross-platform reuse of business logic
- [ ] Port frontend to React Native (shared hooks/services with web client where possible)
- [ ] Handle deep links natively (SMS challenge links open the app)
- [ ] Platform-specific optimizations (touch targets, safe areas, push notifications)
- [ ] **`[YOU]`** Register Apple Developer account and configure App Store Connect

---

## External Actions Summary

All tasks requiring you to set up external services:

| # | Task |
|---|------|
| 1 | Create GitHub repo for custom question JSON files |
| 2 | Provision PostgreSQL DB on Railway or Render |
| 3 | Set up backend hosting on Railway or Render |
| 4 | Set up frontend hosting on Vercel or Netlify |
| 5 | Create Twilio account; get `ACCOUNT_SID`, `AUTH_TOKEN`, and a number |
| 6 | Register app domain for SMS deep links (e.g. `app.trivia.com`) |
| 7 | Add question JSON files to your GitHub questions repo |
| 8 | Register Apple Developer account (Phase 4 only) |
