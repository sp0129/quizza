# Quizza: New User Onboarding Dashboard - Design Spec (Redesigned)

**Version**: 2.0 (Redesigned)  
**Status**: Ready for Feedback  
**Date**: March 18, 2026

-----

## Core Philosophy

**Enable EVERYTHING. Advertise Open Challenges. Make it visually engaging and fun.**

- ✅ All game modes accessible (Solo, Open Challenges, Create Room, Join Room; 1v1 Challenge unlocks with friends)
- ✅ Nothing grayed out or disabled
- ✅ Visually rich with mascot/animation (not sparse 4-button grid)
- ✅ Open Challenges is the STAR of the show (hero section)
- ✅ Full feature parity with standard users
- ✅ Centered content with smart spacing

-----

## Dashboard Switching Logic

### Detection

```typescript
// New user = someone who still needs the hand-held onboarding experience.
// Two conditions exit the new user state:
//   1. They have at least 1 friend AND at least 1 game played
//   2. They have 5+ games played (regardless of friends)
//
// This means:
//   - 0 games, 0 friends → new user (truly fresh)
//   - 3 games, 0 friends → new user (still solo, still learning)
//   - 0 games, 1 friend → new user (added friend before playing — keep hand-holding)
//   - 1 game, 1 friend  → NOT new user (has a friend + knows how to play → show 1v1 Challenge)
//   - 5 games, 0 friends → NOT new user (experienced solo player, knows the app)

const isNewUser =
  (stats.friends_count === 0 && stats.games_played_total < 5) ||
  (stats.friends_count > 0 && stats.games_played_total === 0);

// Single DashboardScreen component with conditional sections:
// isNewUser → show HeroSection + ProgressSection
// !isNewUser → show MetricsRow + ChallengesFeed + ResultsFeed
// GameModeGrid + tabs are identical for both
```

### Why We Don’t Disable Features

**Old thinking**: “Hide features until they add friends”
**New thinking**: “Show them everything is available. Friends unlock 1v1 challenges, not core features.”

**What triggers transition to standard dashboard:**

- Adding a friend + completing at least 1 game → standard (1v1 Challenge unlocks via half-sheet)
- Completing 5+ games solo → standard (they clearly know the app)
- Note: only COMPLETED games count (all modes — solo, room, challenge). Abandoned/quit games are never stored.

**What changes on standard dashboard:**

- Hero section gone → replaced by standard metrics row (daily streak, wins, win rate)
- ⚔️ Challenge button opens half-sheet with BOTH "Challenge a Friend" and "Create Open Challenge"
  (vs new user where it goes straight to Create Open Challenge)
- Friends tab content populates (becomes useful)
- Incoming challenges section appears (they can be challenged)
- Results section populates (head-to-head results with friends)

**Note on stats:** The new user dashboard does NOT show "wins" or "win rate" — those only make sense with competitive games. New user progress shows: Games Played, Best Score, and Daily Streak.

-----

## New User Home Screen - Full Design

### Header

```
┌──────────────────────────────────────┐
│ [Avatar] Hi @username! 👋            │
│                      [+ Add Friend]  │ ← Subtle CTA, top right
│                                      │
└──────────────────────────────────────┘
```

**Copy varies by progress (2 states only):**

- Never played: “Hi @username! 👋”
- Has played at least 1 game: “Welcome back, @username! 🎮”

-----

### Hero Section (Open Challenges Advertised)

**Large, animated, eye-catching:**

```
┌────────────────────────────────────────┐
│                                        │
│  ✨ DISCOVER NEW CHALLENGES ✨         │
│                                        │
│  [Animated Pizza/Dog mascot]           │
│  [Dancing, pointing, encouraging]      │
│  [Bounces gently in loop]              │
│                                        │
│  "Test your knowledge against"         │
│  "the community"                       │
│                                        │
│  🔥 Science                            │
│  📚 History                            │
│  🎬 Movies                             │
│  🧠 Geography                          │
│  ... and more                          │
│                                        │
│  [Explore Open Challenges →]           │ ← CTA (taps to Challenges tab)
│  "See all challenges"                  │
│                                        │
└────────────────────────────────────────┘
```

**Animation Ideas:**

- Mascot bounces and looks at user
- Arrow button pulses gently (“Come here!”)
- Background subtle color shift (not distracting)

**Copy Strategy:**

- Emphasize discovery (“new challenges”)
- Show available categories (static list, no live counts — better to show nothing than “0 playing”)
- Keep it aspirational but honest

-----

### Game Mode Buttons (4 Active Options)

**Arranged in a thoughtful 2x2 grid with descriptions:**

```
┌──────────────────────────────────────┐
│ 🎮 PLAY NOW                           │
├──────────────────────────────────────┤
│                                      │
│ ┌─────────────────┬─────────────────┐│
│ │ [Solo Play]     │ [Challenge]    ││
│ │ 🎯              │ ⚔️              ││
│ │ Play alone &    │ Challenge a    ││
│ │ build your      │ friend or the  ││
│ │ streak          │ community      ││
│ │                 │                ││
│ │ [Play]          │ [Go]           ││
│ └─────────────────┴─────────────────┘│
│                                      │
│ ┌─────────────────┬─────────────────┐│
│ │ [Create Room]   │ [Join Room]    ││
│ │ 👥              │ 🚪              ││
│ │ Play with       │ Enter a code   ││
│ │ friends via     │ to join a      ││
│ │ code            │ friend's game  ││
│ │                 │                ││
│ │ [Create]        │ [Join]         ││
│ └─────────────────┴─────────────────┘│
│                                      │
└──────────────────────────────────────┘
```

**Design Notes:**

- All 4 buttons same visual weight (none disabled/grayed)
- Icons + emojis make it visually interesting
- Short copy (2-3 words max)
- ⚔️ Challenge button is dual-purpose (opens half-sheet with two options)
- Same 2x2 grid for BOTH new users and standard users — consistent layout
- Buttons are tappable, lead to respective features

-----

### Challenge Button — Behavior by User Type

#### New Users: Direct to Create Open Challenge

For new users, tapping ⚔️ Challenge goes **straight to the Create Open Challenge flow** (no half-sheet). They don't have friends to 1v1, so there's no reason to show that option.

→ Tap ⚔️ → Category picker → play (identical to solo) → results framed as "Post this challenge?"

#### Standard Users: Half-Sheet with Two Options

For standard users (have friends + games), tapping ⚔️ Challenge opens a bottom half-sheet:

```
┌────────────────────────────────────────┐
│ ⚔️ CHALLENGE                           │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 👤 Challenge a Friend              │ │
│ │ Pick a friend and go head-to-head  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 🏟️ Create Open Challenge           │ │
│ │ Play solo, then dare the community │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [Cancel]                               │
└────────────────────────────────────────┘
```

**"Challenge a Friend" flow:**
→ Friend picker → select category → play → results (1v1 mode)

**"Create Open Challenge" flow:**
→ Select category → play (identical to solo) → results screen framed as "Post this challenge?"

### Results Screen Framing — Solo vs Create Challenge

The gameplay is identical. Only the results screen differs:

| Entry Point | Results Screen Framing |
|---|---|
| **Solo** | Score → outcome → "Post as Challenge" (optional button, bonus nudge on perfect) |
| **Create Open Challenge** | Score → outcome → "Your challenge is ready! Post it?" (expected action, primary CTA) |

For "Create Open Challenge", the results screen:
- Primary CTA: "Post Challenge" (prominent green button)
- Secondary: "Not Now" (subtle text link — they can skip posting without losing their score, e.g. if they did poorly)
- Perfect bonus copy still plays if applicable

-----

### Your Progress Section

**Motivational, shows growth. Two states: never played / has played.**

**Streak here is a DAILY PLAY STREAK** (played at least one game per day), NOT a consecutive win streak. This is different from the standard dashboard's win streak. Daily streak works for solo-only users and encourages daily return.

**Never played (0 games):**

```
┌──────────────────────────────────────┐
│ 🏆 YOUR PROGRESS                     │
├──────────────────────────────────────┤
│                                      │
│ 🔥 Daily Streak: 0 days              │
│ "Play a game to start your streak!"  │
│                                      │
│ ⭐ Best Score: — (None yet)          │
│ "Your first score is coming!"        │
│                                      │
│ 📊 Games Played: 0                   │
│ "Every game makes you smarter!"      │
│                                      │
│ [Play Solo Now] ← Primary CTA        │
│ or [Explore Challenges] ← Secondary  │
│                                      │
└──────────────────────────────────────┘
```

**Has played (1+ games):**

```
┌──────────────────────────────────────┐
│ 🏆 YOUR PROGRESS                     │
├──────────────────────────────────────┤
│                                      │
│ 🔥 Daily Streak: 2 days! 🚀          │
│ "Keep it going!"                     │
│                                      │
│ ⭐ Best Score: 720 points            │
│ "Can you beat your best?"            │
│                                      │
│ 📊 Games Played: 3                   │
│ "Speed is your secret weapon!"       │
│                                      │
│ [Create a Challenge ⚔️]              │ ← Navigates to Create Open Challenge flow
│ [Explore Challenges 🏟️]              │ ← Navigates to Challenges tab
│                                      │
└──────────────────────────────────────┘
```

-----

## Tab Structure (Bottom Navigation)

**All 5 tabs visible to new users (consistent with standard dashboard):**

1. **Home** (current view - new user version)
1. **Challenges** 🏟️ (Open Challenges - “Discover/Explore”)
1. **Board** 🏆 (Leaderboard)
1. **Friends** 👥 (Empty state: “Add your first friend to start playing together”)
1. **Profile** 👤 (Your stats, settings, logout)

**Why this is better:**

- Consistent mental model — same 5 tabs as standard dashboard
- No tabs appearing/disappearing as user progresses
- Friends tab exists but shows encouraging empty state
- Leaderboard visible from day one (motivation to climb)

-----

## Screen 2: Challenges Tab (“Discover” for New Users)

**Same as standard Open Challenges, but with slightly different copy:**

```
┌─────────────────────────────────────┐
│ DISCOVER CHALLENGES                 │ ← Title (vs “Open Challenges” for standard)
│ “Test yourself against the          │
│  community”                          │
├─────────────────────────────────────┤
│                                     │
│ Sort: [Most Played] [Newest]        │
│ Filter: [All] [Science] [Movies]    │
│                                     │
│ 🔥 Science                          │
│    Posted by @sumit                 │
│    Play to see scores               │ ← Scores hidden until played
│    ▶ Discover                       │
│                                     │
│ 📚 History                          │
│    Posted by @historian             │
│    Play to see scores               │
│    ▶ Discover                       │
│                                     │
│ [Infinite Scroll...]                │
│                                     │
└─────────────────────────────────────┘
```

-----

## Screen 3: Friends Tab (Empty State)

**When they have no friends yet:**

```
┌─────────────────────────────────────┐
│ FRIENDS                             │
├─────────────────────────────────────┤
│                                     │
│ [Mascot illustration or animation]  │
│ Looking lonely, or waiting eagerly  │
│                                     │
│ "Your first friend is waiting..."   │
│                                     │
│ Add a friend to:                    │
│ ✅ Challenge each other             │
│ ✅ Play group games together        │
│ ✅ See head-to-head results         │
│ ✅ Build rivalries                  │
│                                     │
│ [Search by Username] ← CTA          │ ← Opens existing username search
│                                     │
└─────────────────────────────────────┘
```

-----

## Screen 4: Profile Tab

**No changes needed for new users — same Profile screen as standard users.** The existing profile already shows stats, avatar, and settings. No new user-specific modifications required.

-----

## Transition: From New User to Standard Dashboard

### Transition Triggers

**Path A — Social user (adds friend first):**
1. Signs up → new user dashboard (0 games, 0 friends)
2. Adds a friend → still new user (0 games, 1 friend — keep hand-holding)
3. Plays first game → exits new user (1 game + 1 friend → standard dashboard with 1v1 Challenge)

**Path B — Solo grinder (plays without adding friends):**
1. Signs up → new user dashboard (0 games, 0 friends)
2. Plays 1-4 games → still new user (learning, no friends)
3. Plays 5th game → exits new user (experienced enough to see standard dashboard)

**Path C — Quick start (adds friend + plays immediately):**
1. Signs up → new user dashboard
2. Adds friend + plays first game → exits new user

**Visual Changes on Transition:**

1. Hero section replaced by standard metrics row
2. ⚔️ Challenge button now opens half-sheet (with "Challenge a Friend" + "Create Open Challenge") instead of going directly to Create Open Challenge
3. Progress/stats populate with real data
4. All 5 tabs remain the same — no tabs appear/disappear

**No celebration popup needed** — the UI changes naturally are enough

-----

## Visual Hierarchy & Spacing

### Layout is a ScrollView (standard mobile pattern)

Content priority order (top to bottom):

1. **Header** — Avatar + greeting + Add Friend CTA
2. **Hero Section** — Open Challenges advertisement (largest visual block, mascot animation)
3. **Game Mode Grid** — 2x2 buttons
4. **Progress Section** — Stats + CTAs

On taller phones (iPhone 14+) this may fit without scrolling. On shorter phones (iPhone SE) it scrolls naturally. This is fine — hero is immersive at the top, actionable content below.

### Why Not Sparse

- Mascot animation in hero fills space
- Large, readable buttons
- Generous padding between sections
- Color/emoji makes it visually interesting
- Static category list provides visual richness

-----

## Scoring Philosophy — Speed + Accuracy

**CRITICAL**: This messaging must be woven into the new user experience from the start. Users need to understand that Quizza rewards both **knowing the answer** and **answering quickly** — before they encounter a situation where they get 10/10 but lose to someone with 8/10.

### How Scoring Works (user-facing explanation)

Per question: 50-100 points if correct (faster = more points), 0 if wrong.
- Answer instantly → 100 points
- Answer at the last second → 50 points
- Wrong or timeout → 0 points

### Perfect Accuracy Bonus (NEW)

Reward 100% accuracy with a bonus to make it feel special:
- **10Q mode**: 10/10 correct → +100 bonus points
- **5Q mode**: 5/5 correct → +50 bonus points

This ensures a perfect slow player always beats a fast player who got one wrong, while still rewarding speed within the same accuracy tier.

### Perfect Bonus — Result Screen Animation

The bonus is revealed as a separate celebratory moment AFTER the base score displays:

1. **Score counter finishes** → e.g. "950" (base score from per-question points)
2. **Brief pause** (0.5s beat — let the score register)
3. **Banner appears**: "Perfect round! 🎯 +100 bonus" (fun, snappy — not clinical)
4. **+100 animates upward** and flies into the score total
5. **Score counter ticks up** → "1050" with a scale pop + haptic buzz
6. Confetti/sparkle already playing from the "win" state enhances the moment

**Copy variants** (rotate randomly, pick one per game):

*Hype / Exclamation:*
- "Perfect round! 🎯"
- "Flawless victory! 💎"
- "Nothing but net! 🏀"
- "Clean sweep! 🧹"
- "Nailed it! 🔨"

*Humor / Personality:*
- "Big brain energy! 🧠"
- "Are you cheating?! 👀"
- "Okay, show-off 😏"
- "Did you write these questions? 🤔"
- "Your brain called. It wants a raise 💰"
- "Someone's been studying 📚"

*Awe / Respect:*
- "Absolute legend 👑"
- "Take a bow 🎭"
- "That was surgical 🔬"
- "Not a single miss 🎯"
- "You made that look easy ✨"

All variants are followed by "+100 bonus" (10Q) or "+50 bonus" (5Q) on a second line.

This is the standard "bonus reveal" pattern (Candy Crush, arcade games, etc.) — the delayed reveal creates an extra dopamine hit on top of the score.

### Solo Mode — Post Challenge Nudge

When the perfect bonus is in **solo mode**, follow up the bonus animation with a nudge to post as a challenge. This is the highest-confidence moment to convert a solo player into an open challenge poster — they just aced it and feel great.

**Copy variants** (shown below the bonus, rotate randomly — use dynamic {n} for question count):
- "Perfect score. Think anyone can beat that? 😈" → [Post as Challenge]
- "{n} for {n}. Let the world try 🏟️" → [Post as Challenge]
- "That was too easy for you. Share it! 🔥" → [Post as Challenge]
- "Dare someone to match this 👀" → [Post as Challenge]
- "Flex worthy. Post it! 💪" → [Post as Challenge]

For non-perfect solo games, keep the existing "Post as Challenge" button without the extra nudge copy — the nudge is a reward for the perfect moment only.

### Where to Surface Speed Messaging

| Touchpoint | Copy (fun, never threatening) |
|---|---|
| New user hero section | “Quick thinking = bigger scores!” |
| Pre-game tip (random) | “Speed counts! The faster you answer, the more points you earn” |
| Result screen (fast answer) | “Lightning fast! +95 points” |
| Result screen (slow answer) | “Correct! But speed earns bonus points next time” |
| Open Challenge detail | “It’s not just what you know — it’s how fast you know it” |

### Tone

- **Always fun, gamelike, never threatening or serious** — this is an entertainment/gaming app
- Frame speed as a bonus, not a punishment: “faster = bonus points” not “slow = penalty”
- Use playful language: “lightning fast”, “quick thinking”, “brain speed”
- Never make users feel bad for being slow — celebrate correctness first, then hint at speed

-----

## Copy Philosophy

### For New Users: Encouragement + Excitement

|Context         |Copy                                              |
|----------------|--------------------------------------------------|
|Hero section    |”Test your brain speed against the community!”    |
|After first game|”You’re on fire! 🔥”                               |
|Challenges tab  |”Discover” (not “Play”)                           |
|Empty Friends   |”Your first friend is waiting…”                   |
|Button CTAs     |Action words: “Discover”, “Play”, “Create”, “Join”|
|Speed hint      |”Quick thinking = bigger scores!”                 |

### Avoid Gatekeeping Language

**❌ Don’t say:**

- “Add friends to unlock”
- “This feature requires friends”
- “Available only for verified users”
- “You lost because you were too slow”

**✅ Do say:**

- “Play alone or with friends”
- “Invite someone to play together”
- “Everyone starts solo”
- “Speed is your secret weapon!”

-----

## Implementation Priorities

### Phase 1: Backend + Detection (High Priority)

- [ ] Add `games_played_total`, `best_score`, `daily_streak` to `/users/me/stats` endpoint
- [ ] Add `friends_count` to stats (or derive client-side from friends list)
- [ ] Implement perfect accuracy bonus in game completion logic (server-side)
- [ ] Implement `isNewUser` detection logic in DashboardScreen

### Phase 2: Layout & Structure (High Priority)

- [ ] Build `HeroSection` component (mascot placeholder + categories + CTA)
- [ ] Build `ProgressSection` component (daily streak, best score, games played + CTAs)
- [ ] Add conditional rendering in DashboardScreen (`isNewUser` toggles hero vs metrics, progress vs feeds)
- [ ] Implement ⚔️ Challenge button behavior (direct to open challenge for new users, half-sheet for standard)
- [ ] Build half-sheet component for standard user challenge picker

### Phase 3: Polish & Empty States (Medium Priority)

- [ ] Friends tab empty state (mascot + "Search by Username" CTA)
- [ ] Perfect bonus animation on results screen (banner → fly into score → tick up)
- [ ] Mascot animation in hero (bounce, look at user)
- [ ] Speed messaging touchpoints (hero copy, pre-game tips)
- [ ] Solo perfect nudge copy ("Think anyone can beat that?")

### Phase 4: Create Open Challenge Flow (Medium Priority)

- [ ] New game mode entry: ⚔️ → category picker → play → results framed as "Post this challenge?"
- [ ] Results screen: "Post Challenge" primary CTA + "Not Now" secondary
- [ ] Differentiate results framing between Solo and Create Challenge entry points

-----

## Success Metrics

|Metric                                         |Target|Rationale                         |
|-----------------------------------------------|------|----------------------------------|
|% users viewing challenges tab in first session|70%+  |Hero section drives discovery     |
|% users playing first game in 24h              |60%+  |Accessible buttons + encouragement|
|% users posting first challenge within 7d      |45%+  |Progress section shows option     |
|% users adding first friend within 14d         |40%+  |Multiple CTAs across dashboard    |
|Day-7 retention (new users)                    |30%+  |Mascot + streaks + progress       |

-----

## Data Sources (no new tables needed)

All data for new user detection and progress display is derivable from existing tables:

- **games_played_total**: `COUNT(*) FROM games WHERE (player_a_id = $1 OR player_b_id = $1) AND status = 'completed'` (all modes, including solo)
- **friends_count**: `COUNT(*) FROM friendships WHERE (user_a_id = $1 OR user_b_id = $1) AND status = 'accepted'`
- **best_score**: `MAX(CASE WHEN player_a_id = $1 THEN player_a_score ELSE player_b_score END) FROM games WHERE (player_a_id = $1 OR player_b_id = $1) AND status = 'completed'` (new field to add to stats endpoint)
- **daily_streak**: Derived from `completed_at` dates — count consecutive days (from today backward) with at least one completed game. Streak includes today if they've played; only breaks at end of day with no game. (New calculation to add to stats endpoint. Replaces win streak everywhere — standard dashboard too.)
- **first_game_completed_at**: `MIN(completed_at) FROM games WHERE (player_a_id = $1 OR player_b_id = $1) AND status = 'completed'` (if needed)

No `UserOnboarding` table. Analytics (CTA clicks, tab views) can be added client-side later via Mixpanel/Amplitude if needed.

-----

## Notes for Claude Code

**Key implementation points:**

1. **Single DashboardScreen component** — use conditional sections (`isNewUser && <HeroSection />`, `!isNewUser && <MetricsRow />`), NOT a separate NewUserDashboard file. Shared pieces (grid, tabs) stay identical. Less code drift over time.
1. **Extract new sections as components** — `HeroSection`, `ProgressSection` as their own files, rendered conditionally
1. **Hero section is the marquee** — make it visually compelling
1. **No live data** — show static category list in hero, no live player counts (avoids showing "0 playing")
1. **Tab navigation** — all 5 tabs visible and identical for new + standard users; Friends tab shows empty state for new users
1. **No disabled states** — all buttons are active and tappable
1. **Mobile-first** — test on iPhone/Android first
1. **Perfect bonus is server-side** — calculated in the game completion logic alongside `calculatePoints()`, so the DB score includes the bonus. The animation on the results screen is purely visual (the bonus is already in the total)
1. **Abandoned games are never stored** — if a user quits mid-game, no game record is saved. Only completed games count toward the `games_played` threshold for new user detection
1. **Daily streak replaces win streak everywhere** — needs to be added to the stats endpoint. Count consecutive days (from today backward) where the user completed at least one game. This replaces the existing win streak on BOTH new user and standard dashboards. Win rate already covers the competitive metric.
1. **Best score is new** — needs to be added to the stats endpoint. `MAX(player_a_score)` from completed games.
1. **games_played for detection must count ALL completed games** — including solo. This is different from the standard dashboard's competitive-only stats. The stats endpoint should return both: `games_played_total` (for detection) and `games_played_competitive` / `wins` (for standard metrics).