# Quizza — App Store Submission Checklist

## In-App (Code) — All Complete

- [x] Privacy Policy linked in Profile tab (`quizza-eta.vercel.app/privacy.html`)
- [x] Delete Account with double confirmation (Profile tab)
- [x] In-app review prompt (after 3rd win, 60-day throttle)
- [x] Share results (Wordle-style text with visual fingerprint)
- [x] Onboarding overlay for first-time users
- [x] Error overlay for network failures and auth expiry
- [x] Landing page with App Store download button + Android Coming Soon
- [x] OG meta tags + image for link previews
- [x] Apple Smart App Banner meta tag
- [x] Universal Links (AASA: `/join/*`, `/share`)
- [x] Support page (`quizza-eta.vercel.app/support.html`)
- [x] Sentry error monitoring integrated
- [x] App version: 1.2.0 (no beta/alpha text)
- [x] File size: ~30 MB (well under 100 MB limit)

## App Store Connect — Must Complete Before Submission

### Blockers (cannot submit without these)

- [ ] **App Privacy Nutrition Label**
  - Data collected: email (account creation), username (app functionality), game scores (app functionality)
  - Crash data: collected by Sentry (not linked to identity)
  - No third-party tracking, no advertising
  - Complete at: App Store Connect → App Privacy

- [ ] **Screenshots**
  - Required sizes: 6.7" (iPhone 15 Pro Max) and 5.5" (iPhone 8 Plus)
  - Take real screenshots from TestFlight — NOT scaled-down versions of 6.7"
  - If no physical iPhone 8, use Xcode Simulator set to iPhone 8 Plus
  - Recommended screens:
    1. Live multiplayer room or score reveal (strongest hook)
    2. Solo gameplay with question + answers
    3. Category selection grid
    4. Community challenges feed
    5. 1v1 challenge result
    6. Dashboard home screen
  - Add short captions (5-7 words max) in Figma/Canva

- [ ] **App Store Description**
  - First 2 sentences visible before "More" — lead with value prop
  - Mention: 20,000+ questions, 35+ categories, multiplayer, challenge friends
  - No competitor names (e.g. "like Kahoot")
  - No pricing mentions

- [ ] **Keywords Field** (100 characters max, comma-separated)
  - `trivia,quiz,multiplayer,brain game,trivia game,knowledge,1v1,challenge,friends game,group,battle`

- [ ] **Age Rating**
  - Complete questionnaire in App Store Connect
  - No violent/sexual content → should be 4+

- [ ] **Review Notes**
  - Demo account: `review@quizza.app` / `QuizzaReview2026!`
  - Note: "To test the app, log in with the demo account above. For multiplayer, we recommend testing Solo and Community Challenge modes, which are fully functional with a single account. Live rooms require two devices — we are happy to arrange a demo session if needed."

- [ ] **Support URL**
  - Set to: `https://quizza-eta.vercel.app/support.html`

- [ ] **Privacy Policy URL**
  - Set to: `https://quizza-eta.vercel.app/privacy.html`

- [ ] **IAP Configuration** (only if shipping paid features at launch)
  - If launching fully free (no Quizza+, no supporter tip): skip, nothing to configure
  - If adding "Buy us a pizza" supporter IAP ($2.99): must be created and in "Ready to Submit" state before app submission
  - Cannot add new IAPs to a live app without a separate review cycle

### Recommended (not required, but high impact)

- [ ] **App Preview Video** (15-30 seconds)
  - Lead with live gameplay in first 3 seconds (not a logo)
  - Show: room game, score reveal, share moment
  - Record from TestFlight, edit in iMovie

- [ ] **App Name & Subtitle** (ASO)
  - Name: `Quizza — Social Trivia Game`
  - Subtitle: `Play Live, Challenge Friends`

- [ ] **Select "Manually Release This Version"**
  - Hold approved build until marketing is ready
  - Coordinate launch day with social posts, community notifications

## Post-Launch v1.1 Priorities

- [ ] Streak local notifications (UNUserNotificationCenter — no server needed, highest-ROI retention lever)
- [ ] Push notifications for challenges (expo-notifications + APNs + server infrastructure)
- [ ] Deep links for 1v1 challenge invites (Universal Links + AASA)
- [ ] Image-based share cards (react-native-view-shot)
- [ ] Leaderboard tab (global rankings)
- [ ] "Buy us a pizza" supporter IAP ($2.99, no features, tip jar framing)
- [ ] A/B test share copy variants

## Monetization Strategy (Future)

- **Ad-free permanently at free tier** — ads interrupt peak engagement moments and risk early negative reviews that permanently suppress App Store rating
- **Quizza+ subscription** (when ready) — status/customization focus: custom avatars, profile themes, exclusive badges, extended stats, private community challenges. NOT content-gating (kills the social loop)
- **Supporter tip jar** — "Buy us a pizza 🍕 and keep Quizza ad-free" ($2.99 one-time). Low friction, signals validation, funds development

## Launch Day Coordination

- [ ] Notify all beta testers / waitlist simultaneously
- [ ] Post on all social channels at the same time
- [ ] Submit to Product Hunt
- [ ] Post Show HN thread
- [ ] Post in r/indiegaming, r/trivia, r/iosgaming
- [ ] Monitor Sentry dashboard and App Store reviews in real time
- [ ] Respond to every review within 24 hours
