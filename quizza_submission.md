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
  - `multiplayer,brain,pub,quiz,knowledge,battle,1v1,party,fast,compete,group`
  - Note: "trivia", "social", "game", "friends", "challenge", "live" are already indexed from title/subtitle

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

## Pre-Launch Actions (Before Submission)

- [ ] **Seed reviews via TestFlight** (MOST IMPORTANT)
  - Get 15-25 real testers playing 3-5 games each
  - They'll trigger the in-app review prompt (80%+ score on 2nd+ game)
  - Target: 4.5+ rating, 15+ reviews before public launch
  - This is the single highest ROI action — costs nothing

- [ ] **Outcome-based screenshot copy**
  - "Think fast. Score higher."
  - "Play live with friends"
  - "Challenge the world"
  - "Every second counts"
  - NOT feature-based ("35 categories") — outcome-based converts better

- [ ] **App Store description — first 2 lines**
  - "Not just what you know — how fast you know it. Play live trivia, challenge friends, and compete with the world."

- [ ] **Record 3-5 gameplay clips from TestFlight**
  - Screen-record: close games, perfect scores, clutch wins
  - Post on TikTok + Instagram Reels on launch day
  - The product footage IS the ad — no production budget needed

- [ ] **Seed community challenges**
  - Ensure 10-15 diverse open challenges exist across popular categories
  - New users need something to compete against day 1

## Post-Launch v1.1 Priorities

- [ ] PostHog analytics (game_completed, share_clicked, challenge_posted, invite_sent — can't improve what you can't measure)
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

# Quizza — ASO Growth Plan

## Current Status (Launch Day)

All foundational ASO is complete:

- App name with keywords in title ✅
- Subtitle with high-intent terms ✅
- Keyword field at 99/100 characters ✅
- Description with natural keyword language ✅
- Screenshots optimized for conversion ✅
- Preview video uploaded ✅
- In-app review prompt after wins ✅

---

## Keyword Field (Current — v1.0)

```
multiplayer,pub quiz,general knowledge,quiz night,trivia night,party,IQ,blitz,speed,battle,1v1,brain
```

**Rules:**
- Never use: free, best, top, new, #1 (Apple bans these)
- Never repeat words already in title or subtitle
- Update every 4-6 weeks based on ranking data
- Target keywords ranking 6-15 — these are the optimization sweet spot

---

## Priority Timeline

### Week 1-2 — Respond and Monitor

- Respond to every App Store review within 24 hours
- Especially respond to negative reviews — shows Apple you are engaged
- Monitor crash reports daily
- Watch for any review patterns suggesting UX issues

### Week 3-4 — First Keyword Check

- Sign up for **AppFollow** (free tier) or **AppFigures** (free for indie)
- Check which keywords Quizza is actually ranking for
- Identify keywords ranking 6-15 — update keyword field to push these higher
- Drop any keywords where you rank below 50 — replace with new candidates

### Month 2 — In-App Events + Conversion Data

- Create first **In-App Event** in App Store Connect
  - Example: "Launch Week Challenge" or "Weekend Trivia Tournament"
  - In-App Events appear directly in App Store search results
  - Massively underused by indie developers — free additional exposure
- Start **Apple Search Ads** at $5-10/day to get conversion rate data
  - Target: conversion rate above 25-30% for a game
  - If below — screenshots or description need iteration
- Review keyword rankings again and make second round of updates

### Month 2-3 — Product Page Optimization

- Available once you have sufficient traffic (few hundred page visits/day)
- Go to App Store Connect → Growth & Marketing → **Product Page Optimization**
- Create A/B test with alternate screenshots or preview video
- Run for minimum 7 days before reading results
- Keep winner, discard loser, repeat

### Month 3 — Localization

Translating metadata into other languages gives you completely separate keyword fields — 100 additional characters of keywords per language. Free organic reach.

**Priority languages:**

| Language | Market | Why |
|---|---|---|
| Spanish | US Hispanic + Latin America | Massive App Store market |
| Portuguese | Brazil | Fastest growing mobile market |
| French | France + Canada | High App Store spend per user |
| German | Germany + Austria | High conversion rates |

**What to translate:**
- App name
- Subtitle
- Description
- Keywords (research native search terms — don't just translate English keywords)

**Tools:**
- ChatGPT for natural translation of description
- AppFollow for keyword research in each language
- Native speaker review if possible before submitting

### Month 3+ — Custom Product Pages

- Available at App Store Connect → Growth & Marketing → **Custom Product Pages**
- Create up to 35 alternate versions of your listing
- Each can have different screenshots, preview video, and promotional text
- Use for targeted campaigns — e.g. a page specifically for pub quiz searchers
- Link your social media ads directly to the relevant custom page

---

## Rating Velocity — The Most Important ASO Factor

Apple's algorithm heavily weights:
- Average star rating
- Number of ratings
- Recency of ratings

**Your in-app prompt is already configured to fire after wins. This is your #1 ASO lever.**

Additional tactics:
- Ask beta testers to leave reviews on launch day
- Respond to every review — positive and negative
- Never incentivize reviews (Apple guideline violation)
- Re-prompt users after major app updates (throttle to 60 days)

**Targets:**
- 15+ reviews before public launch (from beta testers)
- 4.5+ average rating in first 30 days
- Maintain response rate of 100% on all reviews in first 90 days

---

## Tools to Use

| Tool | Purpose | Cost |
|---|---|---|
| AppFollow | Keyword tracking, review monitoring | Free tier available |
| AppFigures | Rankings, keyword data | Free for indie |
| Sensor Tower | Competitor keyword research | Limited free tier |
| Apple Search Ads | Conversion rate data, keyword validation | Pay per click |
| App Store Connect Analytics | Impressions, page views, conversion | Free — built in |

---

## Metrics to Track

| Metric | Target | Where to Find |
|---|---|---|
| Impressions | Growing week over week | App Store Connect Analytics |
| Product page views | Growing week over week | App Store Connect Analytics |
| Conversion rate | 25-30%+ | App Store Connect Analytics |
| Average rating | 4.5+ | App Store Connect |
| Total ratings | 15+ in first 30 days | App Store listing |
| Keyword rankings | Track top 20 keywords | AppFollow |

---

## Promotional Text (Update Anytime — No Review Required)

Current:
> Think fast. Play with friends. Flex your score. 20,000+ questions across 35+ categories — solo, 1v1, or live with the squad.

Update this for:
- Community events and challenges
- Seasonal moments (Super Bowl trivia, Oscars night, etc.)
- Milestones ("Join 1,000+ players")
- New feature launches

---

## Screenshots and Video (Update Anytime — No Review Required)

Current sequence:
1. Video preview (30s)
2. Dashboard — "Challenges Incoming. Are You Ready?" — purple
3. Gameplay — "Think Fast. Every Second Counts." — orange/red
4. Live Rooms — "Live Rooms. Real-Time Trivia." — yellow/orange
5. Categories — "35+ Categories. Find Your Obsession." — teal/green
6. VS Screen — "Pick a Friend. Pick a Category. Settle It." — yellow/pink

**A/B test ideas for month 2-3:**
- Lead with gameplay screenshot instead of dashboard
- Test different caption copy on screenshot 2
- Add image-based share card screenshot once that feature ships

---

## Notes

- Keywords, description, screenshots, promotional text, and preview video can all be updated without a new app submission
- Only code changes require a new binary and full review cycle
- Always make keyword changes based on data — not guesswork
- The 6-15 ranking range is where optimization moves the needle most
- Localization is the single most underused ASO lever for indie developers
