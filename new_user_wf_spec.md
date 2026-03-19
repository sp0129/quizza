# Quizza: New User Onboarding Dashboard - Design Spec (Redesigned)

**Version**: 2.0 (Redesigned)  
**Status**: Ready for Feedback  
**Date**: March 18, 2026

-----

## Core Philosophy

**Get them into a game FAST. First game → First dopamine hit → Repeat play.**

- ✅ All game modes accessible (Solo, Open Challenges, Create Room, Join Room; Duel unlocks with friends)
- ✅ Nothing grayed out or disabled — but clear visual hierarchy (one primary action)
- ✅ Progressive reveal: 0 games = minimal (just play), 1+ games = full experience (hero, progress, challenges)
- ✅ Mascot used sparingly at key moments, not continuously animated
- ✅ Open Challenges promoted AFTER first game (user needs context first)
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
//   - 1 game, 1 friend  → NOT new user (has a friend + knows how to play → Duel unlocks)
//   - 5 games, 0 friends → NOT new user (experienced solo player, knows the app)

const isNewUser =
  (stats.friends_count === 0 && stats.games_played_total < 5) ||
  (stats.friends_count > 0 && stats.games_played_total === 0);

// Single DashboardScreen component with three rendering states:
// State A (isNewUser && games_played_total === 0) → Mascot + "Play Your First Game" + secondary rooms
// State B (isNewUser && games_played_total > 0)   → HeroSection + GameModeGrid + ProgressSection
// Standard (!isNewUser)                           → MetricsRow + GameModeGrid + ChallengesFeed + ResultsFeed
// Tabs are identical across all states
```

### Why We Don’t Disable Features

**Old thinking**: “Hide features until they add friends”
**New thinking**: “Show them everything is available. Friends unlock Duels, not core features.”

**What triggers transition to standard dashboard:**

- Adding a friend + completing at least 1 game → standard (Duel unlocks via half-sheet)
- Completing 5+ games solo → standard (they clearly know the app)
- Note: only COMPLETED games count (all modes — solo, room, challenge). Abandoned/quit games are never stored.

**What changes on standard dashboard:**

- Hero section gone → replaced by standard metrics row (daily streak, wins, win rate)
- ⚔️ Challenge button opens half-sheet with BOTH “Duel a Friend” and “Create Open Challenge”
  (vs new user where it goes straight to Create Open Challenge)
- Friends tab content populates (becomes useful)
- Incoming duels section appears (they can be challenged by friends)
- Results section populates (duel results with friends)

**Note on stats:** The new user dashboard does NOT show “wins” or “win rate” — those only make sense with competitive games. New user progress shows: Games Played, Best Score, and Daily Streak.

-----

## New User Home Screen — Two Internal States

The new user experience has **two internal states** based on games played. This is progressive disclosure: show less initially, reveal as engagement grows.

-----

### State A: Never Played (0 games) — “Just Get Them Playing”

The entire screen is focused on ONE action: play your first game. No hero, no challenges, no competing CTAs. Minimal friction.

```
┌──────────────────────────────────────┐
│ [Avatar] Hi @username! 👋            │
│                      [+ Add Friend]  │ ← Subtle, top right
│                                      │
│                                      │
│         [Mascot — static,            │
│          welcoming pose]             │ ← NOT continuously animated
│                                      │
│    “Ready to test your knowledge?”   │
│    “Quick thinking = bigger scores!” │
│                                      │
│   ┌──────────────────────────────┐   │
│   │    ▶ Play Your First Game    │   │ ← ONE dominant primary CTA
│   └──────────────────────────────┘   │ ← Navigates to Solo category picker
│                                      │
├──────────────────────────────────────┤
│                                      │
│ Also available:                      │ ← Secondary, visually quiet
│ ┌────────────┐  ┌────────────┐       │
│ │ Join Room  │  │ Create Room│       │ ← Smaller, subdued buttons
│ │ 🚪 Enter   │  │ 👥 Host    │       │ ← Available but not competing
│ │ a code     │  │ a game     │       │
│ └────────────┘  └────────────┘       │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:**
- One clear action. No decision paralysis.
- Speed messaging planted from the start (“Quick thinking = bigger scores!”)
- Rooms available but secondary (covers the “friend invited me to join” use case)
- ⚔️ Challenge button NOT shown yet — they don't know what challenges are
- Mascot is static/welcoming, not bouncing continuously

-----

### State B: Has Played (1+ games) — “Full New User Experience”

After their first game, the dashboard expands. They now have context for what challenges mean. The **Play Again quick-action** is the dominant element — keep the loop tight.

```
┌──────────────────────────────────────┐
│ [Avatar] Welcome back, @username! 🎮 │
│                      [+ Add Friend]  │
│                                      │
├──────────────────────────────────────┤
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ▶ Play Movies Again 🎬          │ │ ← Quick-action: last played category
│ └──────────────────────────────────┘ │ ← Skips category picker, starts immediately
│                                      │ ← Dominant, above everything else
├──────────────────────────────────────┤
│                                      │
│  ✨ DISCOVER CHALLENGES ✨            │ ← Hero section
│                                      │
│  [Mascot — subtle idle animation]    │
│                                      │
│  “Test your knowledge against”       │
│  “the community”                     │
│                                      │
│  🔥 Science  📚 History              │
│  🎬 Movies   🧠 Geography            │
│  ... and more                        │
│                                      │
│  [Explore Open Challenges →]         │ ← CTA → Challenges tab
│                                      │
├──────────────────────────────────────┤
│ 🎮 OR EXPLORE                        │
│                                      │
│ ┌─────────────────┬─────────────────┐│
│ │ [Solo Play]     │[Play&Challenge]││
│ │ 🎯 New          │ ⚔️ Play now,   ││
│ │ category        │ dare others    ││
│ └─────────────────┴─────────────────┘│
│                                      │
│ ┌─────────────────┬─────────────────┐│
│ │ [Create Room]   │ [Join Room]    ││
│ │ 👥 Host a game  │ 🚪 Enter a code││
│ └─────────────────┴─────────────────┘│
│                                      │
├──────────────────────────────────────┤
│ 🏆 YOUR PROGRESS                     │
│                                      │
│ 🔥 Daily Streak: 2 days! 🚀          │
│ “Keep it going!”                     │
│                                      │
│ ⭐ Best Score: 720 points            │
│ “Can you beat your best?”            │
│                                      │
│ 📊 Games Played: 3                   │
│                                      │
└──────────────────────────────────────┘
```

**Quick-action bar:**
- Shows last played category with “Play {Category} Again {emoji}”
- Skips category picker — goes straight to game (same category, new questions)
- Most prominent element after header
- If user hasn't played yet (shouldn't happen in State B, but defensive): falls back to “Play Solo 🎯”

**Grid section labeled “OR EXPLORE”** — positions it as the alternative to the quick-action, not the primary path. Grid buttons stay equal weight for consistency with standard dashboard.

**Progress section simplified** — stats only, no extra CTAs. “Create a Challenge” push is earned on the results screen (see below), not spammed on the dashboard.

**Streak is a DAILY PLAY STREAK** (played at least one game per day). Replaces win streak everywhere (new user + standard dashboard). Encourages daily return.

**Streak copy:**
- 0 days: “Start your streak today! 🔥” (NOT “0 days”)
- 1+ days: “Keep it going!”

-----

### Challenge Button — Behavior by User Type

#### New Users (1+ games): Direct to Create Open Challenge

For new users, the button reads **"Play & Challenge" ⚔️** (not just "Challenge" — less intimidating, clearer mental model: play first, challenge comes after). Tapping it goes **straight to the Create Open Challenge flow** (no half-sheet). They don't have friends to duel, so there's no reason to show that option.

→ Tap ⚔️ → Category picker → play (identical to solo) → results framed as “Post this challenge?”

During gameplay, show a subtle banner: **”Creating a challenge 🏟️”** so the user has context throughout.

#### Standard Users: Half-Sheet with Two Options

For standard users (have friends + games), tapping ⚔️ Challenge opens a bottom half-sheet:

```
┌────────────────────────────────────────┐
│ ⚔️ CHALLENGE                           │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 👤 Duel a Friend                   │ │
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

**”Duel a Friend” flow:**
→ Friend picker → select category → play → results (duel mode)

**”Create Open Challenge” flow:**
→ Select category → play (identical to solo) → results screen framed as “Post this challenge?”

During gameplay for Create Open Challenge, show banner: **”Creating a challenge 🏟️”**

### Results Screen — “Play Again” is ALWAYS the Primary CTA

Across ALL game modes, the results screen's dominant action is **Play Again** (same category, new questions). This is the habit loop. Everything else is secondary.

```
┌──────────────────────────────┐
│ {Outcome message + score}    │
│ {Perfect bonus if applicable}│
│                              │
│ ┌──────────────────────────┐ │
│ │ ▶ Play {Category} Again  │ │ ← PRIMARY CTA (always, every mode)
│ └──────────────────────────┘ │
│                              │
│ {Secondary actions below}    │
│                              │
└──────────────────────────────┘
```

### Secondary Actions by Entry Point

| Entry Point | Secondary Actions |
|---|---|
| **Solo** | “Post as Challenge” (shown conditionally — see below) · “Home” |
| **Create Open Challenge** | “Post Challenge” (prominent, expected) · “Not Now” · “Home” |
| **Duel** | “Rematch” · “Home” |
| **Open Challenge (playing)** | “View Leaderboard” · “Home” |
| **Room** | “Home” |

### “Post as Challenge” — Earned, Not Spammed

The challenge nudge on the Solo results screen is conditional on performance:

- **Perfect game**: Strong nudge with custom copy (“Think anyone can beat that? 😈”) + prominent button
- **Good game (≥60% correct)**: Plain “Post as Challenge” button shown, no extra copy
- **Poor game (<60% correct)**: No “Post as Challenge” button — don't encourage posting a score they're not proud of

### Create Open Challenge Results

For games entered via the Create Open Challenge flow:
- “Post Challenge” is prominent (this was the intent)
- “Not Now” as subtle text link (they can skip if they did poorly)
- “Play Again” is still the primary CTA above both — they might want to try for a better score before posting
- Perfect bonus copy still plays if applicable

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
│ 🔥 Science         [42 players]     │ ← Player count as prominent badge
│    Posted by @sumit                 │
│    Play to see scores               │ ← Scores hidden until played
│    ▶ Discover                       │
│                                     │
│ 📚 History          [18 players]    │
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
│ ✅ Duel each other                  │
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

**Win streak lives here** — while the home dashboard shows daily play streak (retention mechanic), the Profile tab's stats section should include win streak (consecutive competitive wins) for users who care about competitive metrics. This keeps it accessible without cluttering the main dashboard.

-----

## Transition: From New User to Standard Dashboard

### Internal Transition: 0 games → 1+ games (within new user)

After first game completes, the user returns to a dashboard that has expanded significantly. To avoid a jarring "everything changed" moment, ease the transition:

1. **Hero section fades in** with a `FadeInDown` entrance animation (not instant)
2. **Game mode grid** slides in below
3. **Progress section** fades in last with the user's first stats populated
4. Optional: a brief **toast or banner** at the top: "Nice one! Here's what's next 🎉" — disappears after 3 seconds

This gives the user a guided "reveal" rather than a sudden wall of new content. Each section appears in sequence (staggered ~200ms) so it feels intentional, not broken.

### Transition to Standard Dashboard

**Path A — Social user (adds friend first):**
1. Signs up → State A (0 games — "Play Your First Game")
2. Adds a friend → still new user State A (0 games, 1 friend — keep hand-holding)
3. Plays first game → exits new user (1 game + 1 friend → standard dashboard, Duel unlocks)

**Path B — Solo grinder (plays without adding friends):**
1. Signs up → State A (0 games)
2. Plays first game → State B (hero, grid, progress)
3. Plays 5th game → exits new user (standard dashboard)

**Path C — Quick start (adds friend + plays immediately):**
1. Signs up → State A
2. Adds friend + plays first game → exits new user directly

**Visual Changes on Transition to Standard:**

1. Hero section gone → replaced by standard metrics row (daily streak, wins, win rate)
2. ⚔️ Challenge button now opens half-sheet (with "Duel a Friend" + "Create Open Challenge") instead of going directly to Create Open Challenge
3. Incoming duels / results sections appear
4. All 5 tabs remain the same — no tabs appear/disappear

**No celebration popup needed** — the UI changes naturally are enough

-----

## Visual Hierarchy & Spacing

### Layout is a ScrollView (standard mobile pattern)

**State A (0 games)** — content priority:
1. **Header** — Avatar + greeting
2. **Mascot + Primary CTA** — "Play Your First Game" (dominates the screen)
3. **Secondary Room Buttons** — smaller, below

**State B (1+ games)** — content priority:
1. **Header** — Avatar + greeting + Add Friend CTA
2. **Hero Section** — Open Challenges advertisement (largest visual block)
3. **Game Mode Grid** — 2x2 buttons (Solo, Challenge, Create Room, Join Room)
4. **Progress Section** — Stats + CTAs

On taller phones (iPhone 14+) State B may fit without scrolling. On shorter phones it scrolls. This is fine — hero is immersive at the top, actionable content below. State A will almost always fit without scrolling (that's intentional — no friction).

### Why Not Sparse

- Mascot fills space at key moments (State A welcome, State B hero)
- Large, readable buttons
- Generous padding between sections
- Color/emoji makes it visually interesting
- Static category list provides visual richness in hero

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

For non-perfect solo games:
- **≥60% correct**: plain "Post as Challenge" button, no nudge copy
- **<60% correct**: no "Post as Challenge" button at all — don't push them to share a score they're not proud of

The nudge is earned, not spammed. Three tiers: perfect → strong push, good → quiet option, poor → not shown.

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
|0 games — CTA   |”Play Your First Game” (single dominant action)   |
|0 games — hint  |”Quick thinking = bigger scores!”                 |
|1+ games — hero |”Test your knowledge against the community”       |
|1+ games — greeting|”Welcome back, @username! 🎮”                  |
|Challenges tab  |”Discover” (not “Play”)                           |
|Empty Friends   |”Your first friend is waiting…”                   |
|Streak 0 days   |”Start your streak today! 🔥” (NOT “0 days”)      |
|Button CTAs     |Action words: “Discover”, “Play”, “Create”, “Join”|
|1v1 games       |”Duel” (not “Challenge a Friend”)                 |

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

- [ ] Add `games_played_total`, `best_score`, `daily_streak`, `last_played_category` to `/users/me/stats` endpoint
- [ ] Keep `win_streak` in stats (for Profile tab)
- [ ] Add `friends_count` to stats (or derive client-side from friends list)
- [ ] Implement perfect accuracy bonus in game completion logic (server-side)
- [ ] Implement `isNewUser` detection logic in DashboardScreen

### Phase 2: Layout & Structure (High Priority)

- [ ] Build State A (0 games): mascot + "Play Your First Game" CTA + secondary room buttons
- [ ] Build State B quick-action bar: "Play {Category} Again" (skips category picker)
- [ ] Build `HeroSection` component for State B (mascot + categories + Explore CTA)
- [ ] Build `ProgressSection` component (daily streak, best score, games played — no extra CTAs)
- [ ] Add conditional rendering in DashboardScreen (State A vs State B vs standard)
- [ ] Staggered entrance animation for State A → B transition (FadeInDown, 200ms stagger)
- [ ] Implement ⚔️ Challenge button behavior (direct to open challenge for new users, half-sheet for standard)
- [ ] Build half-sheet component for standard user challenge picker ("Duel a Friend" + "Create Open Challenge")
- [ ] Add "Creating a challenge 🏟️" banner to GameScreen when entering via Create Open Challenge
- [ ] Make "Play {Category} Again" the primary CTA on ALL results screens (every mode)
- [ ] Implement earned "Post as Challenge" logic (perfect → strong nudge, ≥60% → plain button, <60% → hidden)
- [ ] Player count badge styling on challenge browse cards

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
|% users viewing challenges tab in first 3 sessions|70%+  |Hero appears after first game, drives discovery|
|% users playing first game in 24h              |60%+  |Accessible buttons + encouragement|
|% users posting first challenge within 7d      |45%+  |Earned nudge on good/perfect games|
|% users adding first friend within 14d         |40%+  |Multiple CTAs across dashboard    |
|Avg games in first session                     |3+    |Play Again loop keeps users engaged|
|Day-7 retention (new users)                    |30%+  |Daily streak + Play Again loop    |

-----

## Data Sources (no new tables needed)

All data for new user detection and progress display is derivable from existing tables:

- **games_played_total**: `COUNT(*) FROM games WHERE (player_a_id = $1 OR player_b_id = $1) AND status = 'completed'` (all modes, including solo)
- **friends_count**: `COUNT(*) FROM friendships WHERE (user_a_id = $1 OR user_b_id = $1) AND status = 'accepted'`
- **best_score**: `MAX(CASE WHEN player_a_id = $1 THEN player_a_score ELSE player_b_score END) FROM games WHERE (player_a_id = $1 OR player_b_id = $1) AND status = 'completed'` (new field to add to stats endpoint)
- **daily_streak**: Derived from `completed_at` dates — count consecutive days (from today backward) with at least one completed game. Streak includes today if they've played; only breaks at end of day with no game. (New calculation to add to stats endpoint. Replaces win streak on home dashboard.)
- **win_streak**: Existing calculation — keep in stats endpoint for Profile tab. Not shown on home dashboard.
- **last_played_category**: `SELECT category FROM games WHERE (player_a_id = $1 OR player_b_id = $1) AND status = 'completed' ORDER BY completed_at DESC LIMIT 1` (for "Play {Category} Again" quick-action)
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
1. **Daily streak on home, win streak on profile** — daily streak replaces win streak on the home dashboard (both new user and standard). Win streak moves to Profile tab stats. Both need to be in the stats endpoint.
1. **Best score is new** — needs to be added to the stats endpoint. `MAX(CASE WHEN player_a_id = $1 THEN player_a_score ELSE player_b_score END)` from completed games.
1. **last_played_category is new** — needed for "Play {Category} Again" quick-action. Add to stats endpoint.
1. **games_played for detection must count ALL completed games** — including solo. This is different from the standard dashboard's competitive-only stats. The stats endpoint should return both: `games_played_total` (for detection) and `games_played_competitive` / `wins` (for standard metrics).
1. **"Play Again" is the primary CTA on every results screen** — across all modes. Same category, new questions. Skips category picker. Everything else is secondary.
1. **"Post as Challenge" is earned** — only shown on solo results when ≥60% correct. Strong nudge copy only on perfect games. Not shown at all below 60%. Not shown on dashboard progress section.
1. **Player count badge on challenge cards** — make `player_count` visually prominent on browse cards (badge style, not buried in meta text). This is the one signal that makes discovery feel alive.