# UI/UX design playbook for a React Native trivia game

**The most successful mobile trivia games share a surprisingly consistent set of design patterns: large, color-coded answer buttons in the thumb zone, sub-500ms animation feedback on every tap, speed-weighted scoring with visible timers, and “juicy” micro-interactions layering visual + haptic + audio cues.** This report distills specific, implementable patterns from Wordle, Duolingo, Trivia Crack, QuizUp, Kahoot, and Sporcle into a blueprint for an Expo React Native trivia app — with exact colors, timings, component architectures, and library recommendations.

-----

## The game screen should follow a three-zone vertical layout

Every top-performing trivia app organizes the gameplay screen into the same fundamental structure: **status bar at top, question content in the middle, interactive answer area at bottom**. This isn’t coincidence — it maps directly to mobile thumb-zone ergonomics, where the bottom two-thirds of the screen sits in the natural thumb arc.

**Top zone (~15% of screen height):** A fixed header containing the progress indicator, timer, and score. Duolingo uses a thin green progress bar  spanning the full width.  Kahoot pairs a depleting horizontal countdown bar with a numeric readout. QuizUp splits this zone to show both players’ avatars and live scores.  The key principle: keep status information compact and persistent so players maintain awareness without it competing with question content. Use a segmented progress bar (one dot or segment per question) for quizzes under 20 questions, or a continuous animated bar for longer sessions.

**Middle zone (~35%):** The question display area. All studied apps use **18–22px bold sans-serif text** for questions, centered or left-aligned, with generous line height (1.5–1.6×). Duolingo adds character illustrations above the question for personality;  QuizUp strips everything to just text, optimizing for flow state.  For image-based questions, cap media at 60% of the zone width with a max height constraint so it never pushes answer buttons off-screen.

**Bottom zone (~50%):** The answer interaction area. This is the primary tap zone and must contain the largest touch targets. Kahoot’s full-screen colored buttons, Trivia Crack’s raised 3D buttons, and Duolingo’s full-width selection rows all prioritize one thing: **making it nearly impossible to mis-tap**. Stack four answer buttons vertically with **48dp minimum height** (56–64dp recommended), **12dp spacing** between them, and a primary action “Submit” or “Check” button at the very bottom if answers aren’t auto-submitted on tap.

-----

## Color-coded feedback is the universal language of trivia

A remarkably consistent color vocabulary emerges across all seven apps: **green signals correct, red signals incorrect**, and a neutral gray or brand-colored state indicates unselected. The specific implementation, however, separates polished apps from amateur ones.

**Wordle’s palette** is the gold standard for answer-state communication. Its exact values — correct `#6AAA64`, present `#C9B458`, absent `#787C7E`,  with dark mode variants `#538D4E`, `#B59F3B`, `#3A3A3C` — were deliberately chosen to avoid psychological penalties. Josh Wardle used gray instead of red for wrong answers because research shows red negatively impacts cognitive performance. For a trivia app, adopt this philosophy: use **saturated green for correct** (`#10B981` or `#6AAA64`) and **muted red for incorrect** (`#EF4444`) rather than aggressive, high-saturation reds.

**Kahoot’s dual-coding system** pairs each answer with both a color and a geometric shape: red triangle, blue diamond, yellow circle, green square.   This is an accessibility power move — **8% of males have red-green color blindness**,  so shapes provide a redundant information channel. Implement this by adding ✓/✗ icons alongside color changes on answer reveal. Never rely on color alone to convey correctness. 

For your app’s overall palette, follow the **60-30-10 rule**: 60% background  (white `#FAFAFA` or dark `#1F2937`), 30% secondary surface color for cards and buttons, 10% accent for interactive elements and scoring. Duolingo’s signature green (`#58CC02`) works because it’s applied sparingly — primary CTA buttons and correct-answer states only. Define your palette with CSS variables for seamless dark mode:

```
Light:  --bg: #FAFAFA  --surface: #FFFFFF  --correct: #10B981  --wrong: #EF4444  --accent: #6366F1
Dark:   --bg: #1F2937  --surface: #374151  --correct: #34D399  --wrong: #F87171  --accent: #818CF8
```

-----

## Five micro-interactions that separate polished apps from prototypes

The gap between a functional quiz app and one that feels “juicy” (the game-design term Duolingo uses internally)  comes down to layered feedback on every interaction. Here are the five non-negotiable animations, with exact implementation specs for React Native Reanimated.

**1. Answer button press animation.** On `pressIn`, scale the button to `0.95` using `withSpring({damping: 15, stiffness: 150})`. On `pressOut`, spring back to `1.0`. Duolingo adds a 3D depth effect — a **4px darker bottom border** that compresses on press, simulating a physical button depression. Pair this with `expo-haptics` calling `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on every tap.  

**2. Answer reveal color transition.** After selection, animate the button background from neutral to green/red over **300ms** using Reanimated’s `interpolateColor()`. Simultaneously reveal the correct answer in green if the player chose wrong. The total pause on the reveal state should be **1–1.5 seconds** before transitioning to the next question — long enough to register the result but short enough to maintain pacing.

**3. Wrong-answer shake.** Wordle’s shake animation is iconic: a rapid horizontal oscillation  of `±10px` over **250ms**  using `withSequence(withTiming(-10, 50), withTiming(10, 50), withTiming(-10, 50), withTiming(10, 50), withTiming(0, 50))`. Fire `Haptics.notificationAsync(NotificationFeedbackType.Error)` simultaneously.  This triple-layered feedback (visual shake + color change + haptic buzz) creates unmistakable error communication. 

**4. Score counter increment.** When points are awarded, don’t just swap numbers — animate the count-up from old to new value over **200–300ms** with ease-out timing. Add a brief scale pulse (`1.0 → 1.2 → 1.0` over 300ms) on the score text. For bonus points, show a floating “+10” label that rises and fades out near the score area using a `translateY` + `opacity` animation.

**5. Question transition.** Slide the current question left while the next slides in from the right, both over **250–300ms** with `withTiming`. Use Moti’s `AnimatePresence` with `exitBeforeEnter` to orchestrate this cleanly.  Alternatively, keep all questions on a single screen and animate content internally to avoid React Navigation overhead — this is what most production quiz apps do.

-----

## Timer design directly affects engagement and scoring psychology

Timer visualization is more than a countdown — it’s a core game mechanic that drives urgency. The three studied approaches each suit different gameplay styles.

**Circular countdown timer** (best for per-question timers of 10–30 seconds): Use `react-native-countdown-circle-timer` with color transitions from green to yellow to red mapped to time thresholds.  QuizUp’s **10-second timer** with speed-based scoring (losing 1 point per second elapsed) created intense competitive pressure.  Place the timer prominently in the top zone with the numeric seconds displayed in the center of the ring.

**Linear depleting bar** (best for overall quiz timers): Kahoot’s horizontal bar that shrinks from full-width to zero is simple and effective. Implement with a Reanimated `width` animation driven by remaining time. Color-code the bar: green above 50% time remaining, yellow at 25–50%, red below 25% with a pulse animation in the final 5 seconds using `withRepeat(withSequence(withTiming(0.7, 200), withTiming(1, 200)), -1)` on opacity.

**Speed-based scoring** dramatically increases engagement over correctness-only scoring. QuizUp awards up to 20 points per question minus 1 per elapsed second.  Kahoot weights points similarly.  **Implement a visible “points available” counter that ticks down alongside the timer** — this creates a tangible connection between speed and reward that pure timers lack.

-----

## Navigation architecture and progression keep players in flow

The most critical navigation decision for a trivia app: **keep all questions on a single `QuizScreen` and animate content changes internally** rather than navigating between screens per question. This eliminates navigation stack overhead, gives full animation control, and prevents the back-swipe gesture from accidentally exiting mid-quiz.

The recommended React Navigation architecture:

- **Bottom Tab Navigator** — Home/Play, Leaderboards, Profile, Settings
- **Stack Navigator** (nested in Play tab) — Category Select → Quiz Screen → Results → Review Answers
- Disable back gestures during gameplay with `gestureEnabled: false`  and `beforeRemove` event listeners 
- Present Results as a `transparentModal` overlay for a polished reveal feel

**Progress and difficulty cues** should be woven into the visual design, not stated explicitly. Duolingo’s learning path uses node colors and icons to indicate locked, active, and completed states. For a trivia app, use **color saturation and icon complexity** to signal difficulty: muted, simple icons for easy rounds; vibrant, detailed icons for hard ones. Within a quiz, if questions get progressively harder, subtly shift the background color temperature (cooler → warmer) or add a thin colored accent bar at the top that intensifies.

For the results screen, follow Wordle’s shareable stats model: display a **guess distribution bar chart** or accuracy breakdown, highlight the current game’s stats in your accent color, and include a one-tap share button that generates a spoiler-free results card  (score, percentage, streak — no answers revealed). Wordle’s emoji grid went viral precisely because it shared the journey without spoiling the destination.

-----

## Multiplayer UI demands visible opponents and live scoring

Real-time competitive trivia requires three UI elements working in concert: **opponent presence, live score comparison, and post-round leaderboards**.

QuizUp’s split-screen approach — both players’ avatars and names visible throughout, with scores updating in real-time — creates a persistent sense of direct competition.  Implement this with a compact opponent bar at the top showing their avatar, name, and score, animated with `withSpring` whenever their score changes via WebSocket events. Show a brief indicator when they answer (a small checkmark or X near their avatar) so the player knows the opponent is active.

Kahoot’s between-question leaderboard (top 5 players shown with animated position changes) creates dramatic tension in group play.  For 1v1, show a score comparison bar after each question — a horizontal bar where your color fills from the left and the opponent’s from the right, proportional to each player’s total score. This instantly communicates who’s winning without requiring number comparison.

The podium/results ceremony matters more than most developers realize. Kahoot reveals top 3 with a 3-second staggered reveal (3rd → 2nd → 1st). Implement this with Lottie celebration animations — confetti for the winner, a trophy or medal animation for the top 3. Use `lottie-react-native` with pre-loaded JSON files from LottieFiles  for confetti (`renderMode: "HARDWARE"` for GPU acceleration), triggering on `ref.current.play(0)` at the reveal moment. 

-----

## Implementation stack and mobile-specific specifications

**Core animation stack:** React Native Reanimated ~4.x (runs on UI thread by default), React Native Gesture Handler ~2.x, Moti ~0.29 for declarative transitions, and Lottie for designer-quality celebrations. Reanimated 4 introduces CSS-compatible animations alongside the worklet API  — use `withTiming` and `withSpring` for game animations, and layout animations (`FadeIn`, `SlideInRight`) for screen transitions. 

**Touch targets:** Enforce a **48dp minimum** on all interactive elements.  Use `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` on smaller elements.  Implement tap debouncing (ignore taps within 200ms of the previous) to prevent double-submission. Register taps on finger lift (`onPressOut`), not finger down, so users can slide away to cancel.

**Typography:** Load custom fonts via `expo-font` with `useFonts` hook.  Use **17px regular** for body text,   **20–22px bold** for questions, **14–16px monospace** for timer/score displays (prevents layout shift during countdown). Duolingo uses DIN Next Rounded; Kahoot uses Montserrat.  Both are rounded sans-serifs that feel approachable — choose a similar personality. Set line height to 1.5× font size. 

**Haptics pattern:** Create a `useHaptic` hook wrapping `expo-haptics` with platform checks (no-op on web).  Map feedback types: `Light` for button taps, `Success` for correct answers, `Error` for wrong answers, `selectionAsync()` for timer ticks or option highlighting.  Apple’s HIG guidance applies: haptics should be subtle and reserved for meaningful interactions.

**Performance guardrails:** Never update React state during Reanimated animation callbacks — use shared values exclusively and bridge back with `runOnJS` only for final state updates like score changes. Pre-fetch question batches before gameplay starts. Pre-load Lottie JSON at app launch. Use `React.memo` on question and answer components to prevent re-renders during animations. Profile with Expo Dev Builds, not Expo Go, for accurate frame-rate measurement.

-----

## Conclusion

The design patterns across top trivia games converge on a clear set of principles: **minimize cognitive load during gameplay**  (one question at a time, maximum 4 answer choices, stripped-down UI chrome), **layer multi-sensory feedback** (visual color change + haptic + optional audio on every interaction),   and **make speed tangible** (visible countdown timers tied directly to scoring). The most transferable innovations are Wordle’s staggered tile-reveal animation creating anticipation,   Duolingo’s 3D “pushable” button style creating tactile satisfaction,  Kahoot’s shape+color dual-coding solving accessibility elegantly,  and QuizUp’s minimal-distraction split-screen enabling flow state in multiplayer.

For implementation priority, build these in order: the three-zone layout with proper touch targets, answer button press + color reveal animations using Reanimated, the circular countdown timer, haptic feedback integration, score animation, and finally the celebration/confetti layer. Each addition compounds the feeling of polish — and in a competitive market, that layered “juiciness” is what separates an app people try once from one they open every day.