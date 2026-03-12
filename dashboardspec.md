# Trivia game dashboard design: a pattern-driven blueprint

**A trivia game dashboard with Play Solo, Room, and Challenge modes should center on a single dominant CTA in the thumb-friendly bottom third of the screen, use a card-based challenge feed as the primary content surface, and limit visible stats to 3–5 metrics.** This synthesis draws from the architecture of six leading mobile games — Duolingo, Kahoot, Trivia Crack, Clash Royale, QuizUp, and Fortnite — distilling their patterns into specific, implementable recommendations for a dashboard that balances three distinct game modes. The most critical insight: every successful game dashboard has exactly one unmistakable primary action, and everything else is organized to support that action.

-----

## The anatomy of a winning game dashboard

Across all six apps studied, a consistent structural hierarchy emerges. Clash Royale’s single-screen hub with its massive yellow “BATTLE” button represents the gold standard — **all key functionality lives in the lower 50% of the screen**,  and UI depth never exceeds one level.  Duolingo’s linear path creates an implicit CTA through the next unlocked lesson.  Trivia Crack uses a game list as its primary surface with “New Game” prominent at the top. 

For a trivia game with three modes (Play Solo, Room, Challenge), the recommended dashboard architecture follows a **hub-with-sections** model:

```
┌──────────────────────────────────┐
│  [≡]  Player Level  💎 Gems  🔥7  │  ← Status bar: currency + streak
│──────────────────────────────────│
│  Welcome back, @username         │
│  🏆 12 wins · 🔥 7-day streak   │  ← Compact stat row (scrollable)
│──────────────────────────────────│
│  ⚔️ PENDING CHALLENGES (3)       │  ← Challenge feed section
│  ┌────────────────────────────┐  │
│  │ 👤 @rival · Science · 2h   │  │  ← Challenge card (swipeable)
│  │      [Accept]  [Decline]   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 👤 @friend · Your turn!    │  │
│  └────────────────────────────┘  │
│──────────────────────────────────│
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ SOLO │ │ ROOM │ │CHALL.│    │  ← Mode cards (equal width)
│  │  🎯  │ │  👥  │ │  ⚔️  │    │
│  └──────┘ └──────┘ └──────┘    │
│──────────────────────────────────│
│  🏠  🏆  [ ▶ PLAY ]  👥  👤    │  ← Bottom nav with center FAB
└──────────────────────────────────┘
```

**The primary CTA** — a center-docked floating action button labeled “PLAY” — should be **56×56px minimum**, elevated above the bottom navigation bar in a cradle notch. This mirrors Clash Royale’s yellow BATTLE button placement in the easy-reach thumb zone.  Tapping it should open a quick-start flow that defaults to the user’s most recently played mode (a Fortnite pattern that reduces friction to replay).

The **bottom tab bar** should contain exactly 5 items: Home, Leaderboard, Play (center FAB), Friends, and Profile. This matches the dominant pattern across Duolingo (5 tabs), Clash Royale (5 tabs), and Kahoot (4–5 tabs). Tab bar height should be **56–64px** plus safe area insets, with **24×24px icons** and 10–12pt labels beneath each. 

-----

## Challenge feed: the heartbeat of social engagement

The challenge feed is the dashboard’s most dynamic element and deserves center-screen real estate. Drawing from Trivia Crack’s active games list and Words With Friends’ “Your Move / Their Move” organization, the feed should use **swipeable cards** as its atomic unit.

Each challenge card should contain: the opponent’s **avatar (40px circle)**, **display name** (bold, 16sp), **@handle** (gray, 14sp), the **challenge category/topic**, **time since sent**, and the current **status**. Cards should be color-coded: a subtle **green left-border** for “Your Turn,” **amber** for “Waiting,” and **blue** for incoming challenges needing acceptance.

**Swipe gestures on cards** provide rapid interaction. Swiping right reveals an “Accept” action (green background), swiping left reveals “Decline” (red background), with a completion threshold at **30% of card width**. Light haptic feedback fires on gesture completion. Critically, always pair gestures with visible button alternatives — gestures are not discoverable on their own. 

For the challenge creation flow, target **3 taps maximum** from dashboard to challenge sent. The optimal flow mirrors Clash Royale’s efficiency: tap “Challenge” mode card → search/select friend → confirm. The friend selection screen should show **online friends first** (green dot indicator, matching Trivia Crack’s pattern),  then offline friends sorted by recency. A “Quick Challenge” option that sends to a random friend further reduces friction.

**Acceptance patterns** vary meaningfully between apps. Words With Friends uses an implicit acceptance model — making your first move constitutes accepting.  Clash Royale requires an explicit tap. For a trivia game, the **explicit accept/decline with a banner notification** is recommended. When an incoming challenge arrives, display a **top banner** that persists until the user acts, with “Accept” and “Decline” buttons, plus the opponent’s avatar and challenge details. This matches the pattern for high-priority in-app notifications.

-----

## Three modes, one dashboard: organizing Solo, Room, and Challenge

The three game modes should appear as **equal-width cards in a horizontal row** positioned between the challenge feed and the bottom navigation. Each card gets an icon, label, and a subtle badge count (for Room: active rooms available; for Challenge: pending challenges). This pattern draws from Kahoot’s mode selection cards and Trivia Crack’s game mode organization. 

**Play Solo** should emphasize streak progression and personal bests. The card can show the user’s current category progress or a “Continue” prompt for an in-progress session. Solo mode is the lowest-friction entry point and should always be available, even without an internet connection.

**Room (sync multiplayer)** needs a lobby creation and joining flow. Borrow from Kahoot’s PIN-based system — the host creates a room and gets a **4–6 digit code** that others enter to join.   The lobby screen should show joined players’ avatars appearing one by one (Kahoot’s animated join list creates anticipation).   Display a “Waiting for players…” state with a countdown timer or manual “Start” button once minimum players have joined. All party members must see each other’s ready status before the host can launch, following Fortnite’s “Ready Up” pattern.  

**Challenge (async friend challenges)** is the most socially engaging mode. This section handles the invitation flow described above. Pending challenges from this mode should bubble up into the main dashboard’s challenge feed. When a challenge is completed by both players, display the result as a **match result card** showing both players’ scores, the winner highlighted with a subtle animation, and a prominent “Rematch” button.

-----

## User search and @handle system that scales

The friend search experience must balance speed with accuracy. Based on cross-platform analysis of Discord, Fortnite, Instagram, and Twitter/X, implement a **two-tier search** system: friends first, then global.

**Search bar specifications**: 36–44px height, 8–12px corner radius (pill shape trending), left-aligned magnifying glass icon (16–20px), placeholder text “Search by @username…”, and a clear (X) button that appears once text is entered. Position the search bar at the top of the Friends screen, expanding to full-screen on tap.

**Autocomplete behavior** should follow these timing rules:

- **0 characters (on focus)**: Show recent searches (5–8 items) and suggested users based on mutual connections 
- **1–2 characters**: Begin filtering local friends list immediately (no API call needed)
- **2–3 characters**: Trigger remote API search for global users with a **250–300ms debounce**
- **Always use `distinctUntilChanged`** to prevent duplicate requests and `switchMap` to cancel in-flight requests when the query changes

Each search result item should be **56–64px tall** with this layout: **avatar (40px circle) → display name (bold, 15–16sp) + @handle (gray, 13–14sp) → inline action button** (“Challenge” or “Add Friend”). Show mutual friends context (“Also friends with @player1”) beneath the handle when available — this is the Instagram/Twitter pattern that increases trust and conversion on friend requests.

**Username validation rules** for the @handle system: allow **a-z, 0-9, underscores, and periods**;  enforce a **3–20 character limit** (balancing Discord’s 2-char minimum  with Twitter’s 15-char maximum);  force **case-insensitive** matching; prohibit consecutive periods and leading/trailing special characters.   Check availability in real-time with a **500–800ms debounce**, showing a green checkmark for available, red X for taken, and a spinner while checking.  Display character rules **proactively** beneath the input field, not just after validation errors.  

-----

## Metrics display: less is more, but make it count

Duolingo’s streak system proves that **one hero metric drives retention**  — users with 7-day streaks are **3.6x more likely** to stay engaged long-term.  For a trivia game, the streak counter deserves hero treatment.

Display metrics in a **compact stat pill row** spanning full screen width at approximately 44–48px height. Show 3–4 pills maximum: 🔥 streak (days), 🏆 wins, 📊 win rate, and ⚡ current rank. Use the **“Big Number + Label” pattern** — the metric value in 18–24pt bold, the label in 11–12pt secondary gray, paired with a 20×20px icon. Reserve detailed stats (total games played, per-category accuracy, longest streak, loss count) for the Profile tab.

**Micro-animations make stats feel alive.** When a stat changes, use a **number counter roll animation** (300–500ms, ease-out) from old to new value.  The streak flame icon should **scale to 1.2x then spring back** on daily increment.  Progress bars (XP to next level) animate smoothly with a slight overshoot at the destination (400ms, ease-out-back). Reserve confetti/particle bursts exclusively for major milestones — level ups, streak milestones at 7/30/100 days — and cap particle count at 30–50 for mobile performance. Always honor the device’s reduced-motion accessibility setting. 

**Match history** should follow Clash Royale’s battle log pattern: a scrollable list showing opponent name, score, category played, result (color-coded green/red), and timestamp. Each entry should be tappable to reveal detailed question-by-question breakdown. Include a “Replay” or “Rematch” button on completed matches.

-----

## Empty states that convert instead of confuse

Empty states are onboarding opportunities, not dead ends.   Every empty state needs exactly three elements: an **illustration** (120–200px), a **positive-framing headline** (16–20pt bold), and a **single primary CTA** (44px minimum height, brand primary color).  

The five critical empty states for this trivia dashboard:

- **No pending challenges**: Illustration of a character looking eager. Copy: “Ready for a challenge? Pick a friend and put your knowledge to the test.” CTA: “Challenge a Friend”
- **No friends added**: Two characters waving at each other. Copy: “Trivia is better with rivals! Find friends or share your invite code.” CTA: “Find Friends” with a secondary “Share Invite Link” text button
- **No match history**: Empty trophy case. Copy: “Your first victory is waiting. Jump into a game!” CTA: “Play Now”
- **First-time user landing**: Welcome illustration with game mascot. Copy: “Welcome! Ready to prove you’re the trivia champion?” CTA: “Start Playing” — then immediately funnel into a first game, never leave users staring at an empty dashboard  
- **All caught up** (completion state): Relaxing character with confetti. Copy: “You’ve crushed all your challenges! 🎉 Come back soon for more.” CTA: “Invite a Friend” as secondary 

**Key principle**: onboarding empty states should educate and inspire (“Two parts instruction, one part delight”), while returning-user empty states should celebrate completion and suggest next actions.  Never repeat onboarding messaging to experienced users. Duolingo avoids empty states entirely by pre-populating content  — consider seeding new users with a bot-initiated challenge to eliminate the cold-start problem.  

-----

## Real-time updates and notification hierarchy

Incoming challenges should update the dashboard live via **WebSocket connections**, delivering sub-100ms latency with only 2–14 bytes of framing overhead per message.  Implement reconnection logic with exponential backoff (starting at 2 seconds, maximum 30 seconds) and send heartbeat pings every 15–30 seconds to detect dropped connections.

When a new challenge arrives while the user is on the dashboard, the challenge card should **slide in from the top of the feed** with a 300ms animation plus light haptic feedback. Simultaneously, the tab bar badge on Home should increment with a brief **scale bounce** (1.2x → 1.0x, 200ms).

The **notification priority hierarchy** should be:

- **Critical** (incoming challenge): Top banner that persists until user action, with haptic feedback and optional sound. Banner includes opponent avatar, challenge details, and Accept/Decline buttons
- **High** (turn reminder in active game): Bottom toast with action button, auto-dismissing after 5 seconds 
- **Medium** (friend request, room invitation): Badge count on the relevant tab
- **Low** (stat update, leaderboard change): Subtle animation on the dashboard metric itself

For push notifications when the app is backgrounded, personalize the copy: “[Friend Name] challenged you to Science trivia! 🎯 Can you beat them?” Optimal send windows are **12–1pm and 7–9pm**.  Match notification frequency to the user’s play frequency — sending 5 notifications per week to a user who plays 5 times per week.  Never send between 10pm and 7am unless explicitly opted in.

**Pull-to-refresh** should supplement WebSocket updates on the challenge feed, leaderboard, and match history.   Use a 64–80px pull threshold with a custom branded animation (game mascot spinning, question mark rotating). Display a “Last updated: X min ago” timestamp after completion.

-----

## Conclusion

The most effective trivia game dashboard follows three principles that emerged consistently across every successful app analyzed. First, **ruthless focus on one primary action** — the Play button must be unmistakable and always within thumb reach, sitting in a center-docked FAB at 56px.  Second, **the challenge feed is the social engine** — making it the central content surface transforms the dashboard from a static menu into a living social space that pulls users back. Third, **progressive disclosure protects simplicity** — show 3–5 stats on the surface, tuck detailed analytics into the profile, and use empty states as conversion tools rather than dead ends. 

The specific pattern worth stealing from Clash Royale above all others: **UI depth never exceeding one level**,  with popups appearing as overlays so users maintain spatial orientation.  For a trivia game juggling three modes, this means mode selection, friend search, and challenge details should all appear as overlay sheets rather than full navigation transitions. Combined with swipeable challenge cards, 3-tap challenge creation, and real-time WebSocket updates, this architecture creates a dashboard that feels alive, social, and irresistibly playable. 