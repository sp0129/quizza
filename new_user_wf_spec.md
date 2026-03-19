# Quizza: New User Onboarding Dashboard - Design Spec (Redesigned)

**Version**: 2.0 (Redesigned)  
**Status**: Ready for Feedback  
**Date**: March 18, 2026

-----

## Core Philosophy

**Enable EVERYTHING. Advertise Open Challenges. Make it visually engaging and fun.**

- ✅ All 4 game modes accessible (Solo, Create Room, Join Room, Open Challenges)
- ✅ Nothing grayed out or disabled
- ✅ Visually rich with mascot/animation (not sparse 4-button grid)
- ✅ Open Challenges is the STAR of the show (hero section)
- ✅ Full feature parity with standard users
- ✅ Centered content with smart spacing

-----

## Dashboard Switching Logic

### Detection

```typescript
const isNewUser = user.friends.length === 0;

if (isNewUser) {
  return <NewUserDashboard />;
} else {
  return <StandardDashboard />;
}
```

### Why We Don’t Disable Features

**Old thinking**: “Hide features until they add friends”
**New thinking**: “Show them everything is available. Friends unlock group game modes, not core features.”

**What changes when they add a friend:**

- Friends tab content populates (becomes useful)
- Incoming challenges section appears (they can be challenged)
- Results section populates (head-to-heads with friends)
- But Create Room, Join Room still work the same way

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

**Copy varies by progress:**

- First visit: “Hi @username! 👋”
- After first game: “Welcome back, @username! 🎮”
- After 3+ games: “You’re on fire, @username! 🔥”

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
│  "Join thousands of players"           │
│  "Competing on community trivia"       │
│                                        │
│  🔥 127 Playing Science Right Now      │
│  📚 89 Playing History                 │
│  🎬 56 Playing Movies                  │
│  🧠 42 Playing Geography               │
│                                        │
│  [Explore Open Challenges →]           │ ← CTA (taps to Challenges tab)
│  "See all challenges"                  │
│                                        │
└────────────────────────────────────────┘
```

**Animation Ideas:**

- Mascot bounces and looks at user
- Numbers update in real-time (live count of who’s playing)
- Arrow button pulses gently (“Come here!”)
- Background subtle color shift (not distracting)

**Copy Strategy:**

- Emphasize community (“thousands of players”)
- Emphasize discovery (“new challenges”)
- Show social proof (real-time player counts)

-----

### Game Mode Buttons (4 Active Options)

**Arranged in a thoughtful 2x2 grid with descriptions:**

```
┌──────────────────────────────────────┐
│ 🎮 PLAY NOW                           │
├──────────────────────────────────────┤
│                                      │
│ ┌─────────────────┬─────────────────┐│
│ │ [Solo Play]     │ [Create Room]   ││
│ │ 🎯              │ 👥              ││
│ │ Play alone &    │ Play with       ││
│ │ build your      │ friends via     ││
│ │ streak          │ code            ││
│ │                 │                 ││
│ │ [Play]          │ [Create]        ││
│ └─────────────────┴─────────────────┘│
│                                      │
│ ┌─────────────────┬─────────────────┐│
│ │ [Join Room]     │ [Challenges]    ││
│ │ 🔓              │ 🌐              ││
│ │ Enter a code    │ Play community  ││
│ │ to join a       │ challenges      ││
│ │ friend's game   │ (see hero ↑)    ││
│ │                 │                 ││
│ │ [Join]          │ [Discover]      ││
│ └─────────────────┴─────────────────┘│
│                                      │
└──────────────────────────────────────┘
```

**Design Notes:**

- All 4 buttons same visual weight (none disabled/grayed)
- Icons + emojis make it visually interesting
- Short copy (2-3 words max)
- “Open Challenges” now called [Challenges] → “Discover” (consistent with tab name)
- Buttons are tappable, lead to respective features

-----

### Your Progress Section

**Motivational, shows growth:**

```
┌──────────────────────────────────────┐
│ 🏆 YOUR PROGRESS                     │
├──────────────────────────────────────┤
│                                      │
│ 🔥 Current Streak: 0 days            │
│ "Play a game to start your streak!"  │
│                                      │
│ ⭐ Best Score: — (None yet)          │
│ "Your first win is coming!"          │
│                                      │
│ 📊 Games Played: 0                   │
│ "Every game makes you smarter!"      │
│                                      │
│ [Play Solo Now] ← Primary CTA        │
│ or [Explore Challenges] ← Secondary  │
│                                      │
└──────────────────────────────────────┘
```

**After First Game Played:**

```
┌──────────────────────────────────────┐
│ 🏆 YOUR PROGRESS                     │
├──────────────────────────────────────┤
│                                      │
│ 🔥 Current Streak: 1 day! 🚀         │
│ "Keep it going!"                     │
│                                      │
│ ⭐ Best Score: 1250 points           │
│ "Nice start! You're learning fast!"  │
│                                      │
│ 📊 Games Played: 1                   │
│ "You're officially a trivia player!" │
│                                      │
│ [Post as Challenge] ← New option     │
│ [Play Another] [Explore Challenges]  │
│                                      │
└──────────────────────────────────────┘
```

**After 3+ Games:**

```
┌──────────────────────────────────────┐
│ 🏆 YOUR PROGRESS                     │
├──────────────────────────────────────┤
│                                      │
│ 🔥 Current Streak: 3 days! 🔥🔥🔥    │
│ "You're on FIRE! 🎉"                 │
│                                      │
│ ⭐ Best Score: 1450 points           │
│ "You're crushing it!"                │
│                                      │
│ 📊 Games Played: 3                   │
│ "You could join our leaderboard..."  │
│                                      │
│ [Post Challenge] [Continue Playing]  │
│ [Check Leaderboard] [Add a Friend]   │
│                                      │
└──────────────────────────────────────┘
```

-----

## Tab Structure (Bottom Navigation)

**All 4 tabs visible to new users (consistent with standard dashboard):**

1. **Home** (current view - new user version)
1. **Challenges** (Open Challenges - “Discover/Explore”)
1. **Friends** (Empty state: “Add your first friend to start playing together”)
1. **Profile** (Your stats, settings, logout)

**Why this is better:**

- Consistent mental model when they add first friend
- Friends tab exists but shows encouraging empty state
- Less “hidden” features appearing suddenly
- Reduces surprise/confusion

-----

## Screen 2: Challenges Tab (“Discover” for New Users)

**Same as standard Open Challenges, but with slightly different copy:**

```
┌─────────────────────────────────────┐
│ DISCOVER CHALLENGES                 │ ← Title (vs "Community" for standard)
│ "Join challenges created by         │
│  thousands of players like you"      │
├─────────────────────────────────────┤
│                                     │
│ Sort: [Most Played] [Newest]        │
│ Filter: [All] [Science] [Movies]    │
│                                     │
│ 🔥 Science (347 players) Trending   │ ← Show "Trending" badge
│    Posted by @sumit                 │
│    High Score: 1500 points          │
│    ▶ Discover                       │
│                                     │
│ 📚 History (289 players)            │
│    Posted by @historian             │
│    High Score: 1450 points          │
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
│ Invite a friend to:                 │
│ ✅ Challenge each other             │
│ ✅ Play group games together        │
│ ✅ See head-to-head results         │
│ ✅ Build rivalries                  │
│                                     │
│ [Add Your First Friend] ← CTA       │
│                                     │
│ Or share your code:                 │
│ "SUMIT123" [Copy] [Share]           │
│                                     │
└─────────────────────────────────────┘
```

-----

## Screen 4: Profile Tab (New User Version)

```
┌────────────────────────────────────┐
│ @username                          │
│ Joined March 18, 2026              │
│ [Edit Profile]                     │
├────────────────────────────────────┤
│                                    │
│ STATS                              │
│ 🔥 Streak: 0 days                 │
│ ⭐ Best Score: —                  │
│ 🎮 Games Played: 0                │
│ 📚 Categories: 0                  │
│                                    │
├────────────────────────────────────┤
│                                    │
│ PROFILE                            │
│ [Change Username]                  │
│ [Change Avatar]                    │
│ [Change Theme]                     │
│                                    │
├────────────────────────────────────┤
│                                    │
│ [Invite Friends] ← Featured CTA    │
│ "Play with people you know"        │
│                                    │
│ SETTINGS                           │
│ [Notifications]                    │
│ [Sound Effects]                    │
│ [Privacy]                          │
│                                    │
│ [Logout]                           │
│                                    │
└────────────────────────────────────┘
```

-----

## Transition: From New User to Standard Dashboard

### What Happens When User Adds First Friend

**Immediately:**

1. `user.friends.length` becomes 1
1. Dashboard re-renders automatically
1. No page reload needed

**Visual Changes:**

1. Friends tab content populates (shows friend, option to challenge)
1. Incoming challenges section might appear (if friend challenges them)
1. Results section becomes available
1. Copy updates to reflect “you have friends now”

**No celebration popup needed** — the UI changes naturally are enough

### New User Dashboard → Standard Dashboard

**Before (New User):**

```
Home | Challenges | Friends (Empty) | Profile
```

**After (Added Friend):**

```
Home | Challenges | Friends (Populated) | Profile
```

**Home screen changes:**

- Hero section might change copy (“Play with @friend_name now!”)
- Friends tab becomes functional
- New sections might appear (Incoming Challenges, Results)

-----

## Visual Hierarchy & Spacing

### What Takes Up Space

1. **Hero Section** (40% of screen) — Open Challenges advertisement
1. **Game Mode Buttons** (35% of screen) — 4 equal options
1. **Progress Section** (25% of screen) — Motivational

**Total = 100% of viewport, well-distributed**

### Why Not Sparse

- Mascot animation in hero fills space
- Large, readable buttons
- Generous padding between sections
- Color/emoji makes it visually interesting
- Live data (player counts) provides movement

-----

## Copy Philosophy

### For New Users: Encouragement + Excitement

|Context         |Copy                                              |
|----------------|--------------------------------------------------|
|Hero section    |“Discover thousands of trivia games”              |
|After first game|“You’re on fire! 🔥”                               |
|Challenges tab  |“Discover” (not “Play”)                           |
|Empty Friends   |“Your first friend is waiting…”                   |
|Button CTAs     |Action words: “Discover”, “Play”, “Create”, “Join”|

### Avoid Gatekeeping Language

**❌ Don’t say:**

- “Add friends to unlock”
- “This feature requires friends”
- “Available only for verified users”

**✅ Do say:**

- “Play alone or with friends”
- “Invite someone to play together”
- “Everyone starts solo”

-----

## Implementation Priorities

### Phase 1: Layout & Structure (High Priority)

- [ ] Create `NewUserDashboard` component
- [ ] Implement conditional rendering logic
- [ ] Build hero section with mascot placeholder
- [ ] Build game mode buttons (4 equal options)
- [ ] Build progress tracker
- [ ] Responsive mobile layout

### Phase 2: Animation & Polish (Medium Priority)

- [ ] Mascot animation (bounce, look at user)
- [ ] Live player count updates (refresh every 30s)
- [ ] Button press animations
- [ ] Smooth transitions between tabs

### Phase 3: Empty State Handling (Medium Priority)

- [ ] Friends tab empty state (with mascot illustration)
- [ ] Progress messages (before/after first game)
- [ ] Contextual CTAs based on progress

### Phase 4: Analytics & Optimization (Low Priority)

- [ ] Track which CTA users tap (hero, buttons, progress)
- [ ] A/B test copy variations
- [ ] Optimize mascot animation performance

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

## Data to Track

```typescript
interface UserOnboarding {
  first_login_at: Date;
  first_game_completed_at?: Date;
  first_challenge_posted_at?: Date;
  first_friend_added_at?: Date;
  
  // For analytics
  cta_clicked?: "hero" | "solo_button" | "challenges_button" | "create_room" | "join_room";
  challenges_tab_viewed_at?: Date;
  friends_tab_viewed_at?: Date;
  
  games_played: number;
  challenges_posted: number;
}
```

-----

## Notes for Claude Code

**Key implementation points:**

1. **Keep NewUserDashboard separate** from StandardDashboard (easier to manage both variants)
1. **Reuse components** for buttons, progress tracker, etc. (pass in variant props)
1. **Hero section is the marquee** — make it visually compelling
1. **Responsive design** — stacks on mobile, 2x2 grid on tablet/desktop
1. **Mascot animation** — consider Lottie or simple CSS (not heavy)
1. **Live data** — fetch player counts every 30-60 seconds for hero section
1. **Tab navigation** — all 4 tabs visible, Friends tab shows empty state
1. **No disabled states** — all buttons are active and tappable
1. **Mobile-first** — test on iPhone/Android first