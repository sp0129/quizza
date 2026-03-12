# Category selection UI patterns for mobile trivia apps

**A 2-column card grid with inline search, filter chips, and a pinned favorites section is the dominant winning pattern** across top education and trivia apps. This report synthesizes design and code patterns from Duolingo, Kahoot, Sporcle, QuizUp, and Trivia Crack into actionable guidance for a React Native Expo trivia app — covering layout, search, animations, favorites, state management, performance, and mobile ergonomics.

-----

## What the top apps actually do (and why it matters)

The six most studied trivia and education apps reveal three distinct category-selection philosophies, each optimized for a different content model.

**Kahoot** uses the pattern most relevant to a trivia app: a **search-first marketplace** with ~20 subject categories as horizontal filter chips, content displayed as card tiles in a scrollable grid, and sort options (Most Relevant, Most Played, Highest Quality). This suits its 30M+ user-generated quizzes.  **Sporcle** takes a browse-first approach with **15 text-based main categories** expanding into subcategories  — utilitarian but effective for its 1.6M quizzes.  **QuizUp** (discontinued 2021) offered a scrollable vertical list of **1,200+ topics**  with color-coded icons and a prominent “Favorite Topics” section pinned to the top,  establishing what remains the gold standard for topic-picker UX in trivia apps.

On the opposite end, **Duolingo deliberately eliminates category choice entirely**  — its linear path replaced a branching skill tree  after A/B testing showed guided progression improved learning outcomes. **Trivia Crack** randomizes selection via its signature spinning wheel.  Both approaches reduce decision fatigue but sacrifice user agency.

The key takeaway: **for a trivia app with dozens to hundreds of categories, the QuizUp/Kahoot hybrid model wins** — a searchable, filterable card grid with favorites pinned to the top. Color-coding and character mascots (used by Trivia Crack, Duolingo, and BrainPOP) create strong visual identity per category.

-----

## The optimal screen architecture

The recommended layout stacks four zones from top to bottom. A **fixed search bar** sits at the very top (outside the FlatList to avoid the notorious TextInput-losing-focus bug). Below it, **horizontal filter chips** in a scrollable row let users tap-filter by subject area. A **“Your Favorites” section** appears next when the user has pinned categories. Finally, the **full category grid** fills the remaining space as a 2-column FlatList/FlashList.

```
┌──────────────────────────────────┐
│  🔍 Search categories...    [✕]  │ ← Fixed TextInput (outside list)
├──────────────────────────────────┤
│  [Science] [History] [Sports] →  │ ← Horizontal ScrollView chips
├──────────────────────────────────┤
│  ⭐ Your Favorites               │ ← Conditional section
│  ┌──────┐  ┌──────┐             │
│  │ Sci  │  │ Hist │  →          │ ← Horizontal mini-scroll
│  └──────┘  └──────┘             │
├──────────────────────────────────┤
│  All Categories                  │
│  ┌──────┐  ┌──────┐            │
│  │  🔬  │  │  📜  │            │ ← 2-column FlashList grid
│  │ Sci  │  │ Hist │            │
│  └──────┘  └──────┘            │
│  ┌──────┐  ┌──────┐            │
│  │  🌍  │  │  🎬  │            │
│  │ Geo  │  │ Ent  │            │
│  └──────┘  └──────┘            │
└──────────────────────────────────┘
```

This architecture places search and filters in the intentional-reach zone (top) while keeping the browseable grid in the natural thumb zone. The search bar must be placed **outside** the FlatList rather than as `ListHeaderComponent` — passing an arrow function to `ListHeaderComponent` creates a new component instance each render, causing the TextInput to lose focus and the keyboard to dismiss on every keystroke. 

-----

## Search and filtering that feels instant

**Real-time filtering is the clear winner** for category lists of under 500 items. Results should update as the user types, with a **300ms debounce** to prevent unnecessary re-renders. The implementation requires three pieces: a debounce hook, memoized filtering, and proper keyboard handling.

```tsx
// useDebounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// In the category screen
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 300);

const filtered = useMemo(() => {
  if (!debouncedQuery) return categories;
  return categories.filter(c =>
    c.name.toLowerCase().includes(debouncedQuery.toLowerCase())
  );
}, [categories, debouncedQuery]);
```

For the search TextInput, set `autoCorrect={false}`, `autoCapitalize="none"`, and `returnKeyType="search"`. Do **not** auto-focus the field on a browsing screen — that immediately pulls up the keyboard and hides half the content. For fuzzy matching that handles typos, **Fuse.js** is a pure-JS library with zero native dependencies that works perfectly in Expo.

**Keyboard handling** is where React Native projects commonly break. The critical FlatList props are `keyboardDismissMode="on-drag"` (dismisses keyboard when the user starts scrolling) and `keyboardShouldPersistTaps="handled"` (allows tapping category cards without first dismissing the keyboard).   Note that `keyboardShouldPersistTaps` must be set on **every parent ScrollView** in the hierarchy to work.   On Android, set `"softwareKeyboardLayoutMode": "pan"` in app.json to prevent bottom tabs from being pushed above the keyboard.  For more complex keyboard interactions, **react-native-keyboard-controller** is Expo’s officially recommended library as of 2025. 

-----

## Card design: sizing, color, icons, and tap feedback

A **2-column grid** is optimal for category cards on phones ≥375px wide. Calculate card width dynamically: `(screenWidth - 2 * margin - gap) / numColumns`, which yields roughly **160–170px per card** on an iPhone. Use a slightly tall aspect ratio (roughly 1:1.1) with **12–16px corner radius** for a friendly, approachable feel. Each card should contain a centered icon/emoji at **40–48px**, a semi-bold title at **15sp** truncated to 2 lines, and optional metadata (“42 questions”) at **12sp** in a secondary color.

**Color-code every category** using a predefined palette of 8–12 distinct colors. Apply the category color as a **light background tint** (10–15% opacity) with a darker accent for icons and text. This is the dominant pattern across Trivia Crack, QuizUp, and BrainPOP:

```tsx
const CATEGORIES = {
  science:       { bg: '#E8F5E9', accent: '#2E7D32', emoji: '🔬' },
  history:       { bg: '#FFF3E0', accent: '#E65100', emoji: '📜' },
  geography:     { bg: '#E3F2FD', accent: '#1565C0', emoji: '🌍' },
  entertainment: { bg: '#F3E5F5', accent: '#7B1FA2', emoji: '🎬' },
  sports:        { bg: '#FBE9E7', accent: '#D84315', emoji: '⚽' },
};
```

**Tap feedback** makes or breaks perceived quality. The winning pattern is a **spring scale animation** to 0.95 on press-in, springing back to 1.0 on release,  paired with a **light haptic** via `expo-haptics`. This runs entirely on the native thread via Reanimated, so it stays buttery at 60fps even when the JS thread is busy:

```tsx
import Animated, { useSharedValue, useAnimatedStyle, 
  withSpring, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const CategoryCard = ({ item, onPress }) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(item.id);
      }}
    >
      <Animated.View style={[styles.card, animStyle]}>
        {/* card content */}
      </Animated.View>
    </Pressable>
  );
};
```

For entrance animations, use **staggered fade-in + slide-up** with Reanimated’s layout animations: `entering={FadeInUp.delay(index * 80).springify()}`.  The `pressto` library by Enzo Manuelmangano provides a drop-in `<PressableScale>` component that handles all of this with zero configuration. 

-----

## Favorites that users actually use

QuizUp’s “Favorite Topics” pinned to the top of the browse screen  is the pattern to emulate. Research shows three design decisions matter most.

**Use a star icon** (not heart or pin) for a utility-focused “quick access” feature — hearts imply emotional attachment and are better suited to content-liking. Place a **visible star icon** in the top-right corner of each category card  with generous `hitSlop={8}` for easy tapping. Support long-press as a secondary gesture that surfaces a context menu, but don’t rely on it for discoverability. Toggle the star between outline (unfavorited) and filled (favorited) states with a brief scale animation and haptic feedback.

**Display favorites as a horizontal scroll section** above the main grid, capped at the user’s 4–6 most recent pins. When the user has no favorites, show a friendly empty state:  “⭐ No favorites yet — tap the star on any category to pin it here.” Hide the entire section (don’t show the header) when empty.

**Persist with MMKV**, which is **30–100x faster** than AsyncStorage  and supports synchronous reads. Pair it with Zustand’s persist middleware for clean state management:

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();
const mmkvStorage = {
  getItem: (key) => storage.getString(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [...state.favorites, id],
        })),
    }),
    { name: 'favorites', storage: createJSONStorage(() => mmkvStorage) }
  )
);
```

For managed Expo projects without prebuild, fall back to `@react-native-async-storage/async-storage` behind the same abstraction layer.

-----

## Loading, empty, and error states done right

Every category screen has four states — loading, loaded, empty search, and error — and each demands specific treatment.

**Loading state**: Show a skeleton grid matching the exact dimensions of real category cards.  **Moti’s Skeleton component** (`moti/skeleton`) is the best Expo-compatible option, providing shimmer animations powered by Reanimated  and `expo-linear-gradient`.   Render 4–6 skeleton cards (enough to fill one screen) in a 2-column grid. Match skeleton dimensions to actual card dimensions to prevent layout shift when real content loads.  

**Empty search state**: Show a centered illustration  (a 64px emoji like 🔍 works well for MVP), a clear headline (“No categories found for ‘{query}’”), actionable guidance (“Try a different search or browse all categories”), and a CTA button (“Browse All Categories”) that clears the search.  Avoid blaming language.  For a trivia app, light humor works: “Looks like this topic stumped us too!”

**Error state**: Differentiate between network errors (“📡 No internet connection”) and server errors (“😕 Something went wrong”). Always provide a **Retry button**. Use the FlatList’s `ListEmptyComponent` prop for search empty states and conditionally render error/loading states above the list.

```tsx
// State machine approach
if (state === 'loading') return <CategoryGridSkeleton count={6} />;
if (state === 'error') return <ErrorState onRetry={loadCategories} />;

return (
  <FlashList
    data={filteredCategories}
    ListEmptyComponent={
      <EmptySearchState query={query} onClear={() => setQuery('')} />
    }
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
    }
  />
);
```

-----

## Performance: FlashList, lazy loading, and tuning

**FlashList is non-negotiable** over FlatList for category grids. Shopify’s benchmarks show **5–10x performance improvement**  — FlatList averaged 9.28 JS thread FPS versus FlashList’s 79.2 in stress tests.  FlashList recycles cell instances instead of destroying and recreating them,  which dramatically reduces mount/unmount costs. It’s a drop-in replacement with the same API.  

For images, **expo-image** replaces both the built-in Image component and the unmaintained react-native-fast-image.  Its killer features for grid performance are **BlurHash placeholders** (eliminates load flicker),  a `recyclingKey` prop designed specifically for FlashList recycling, `cachePolicy="memory-disk"`, and priority control.  Prefetch above-the-fold images on screen mount with `Image.prefetch(urls)`.

**Don’t use infinite scroll for categories.** Nielsen Norman Group research confirms pagination or load-all patterns outperform infinite scroll for goal-oriented, finite collections. For under 50 categories, load everything at once — FlashList’s virtualization handles the rendering. For 50–200, load in chunks of 30 with `onEndReached`. Beyond 200, rely on search/filter rather than scrolling.

Key tuning parameters for a 2-column grid where each row is ~150px tall on an ~800px screen:

```tsx
<FlashList
  data={categories}
  numColumns={2}
  estimatedItemSize={150}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  // Performance tuning
  initialNumToRender={10}
  maxToRenderPerBatch={6}
  windowSize={7}
/>
```

**Memoize aggressively**: wrap card components in `React.memo`, stabilize callbacks with `useCallback`,  and never use `StyleSheet.create` alternatives like styled-components inside list items (the context access and template parsing add measurable overhead per item).

-----

## Thumb zones and mobile ergonomics

Research from Steven Hoober shows **75% of smartphone interactions use the thumb**,  and on modern 6”+ phones,  the top 30% of the screen is effectively unreachable one-handed. The category screen architecture naturally accommodates this: the search bar and filter chips (used intentionally, not constantly) sit in the stretch zone at top, while the browseable card grid fills the natural thumb zone.

**Minimum tap targets are 44×44pt** (Apple HIG) or 48×48dp (Material Design). A 2-column card grid with 12–16px gaps between cards naturally provides generous tap targets well above these minimums. For the favorite star icon on each card, always add `hitSlop={8}` to expand the tappable area beyond the icon’s visual bounds.

Apply safe area insets via `contentContainerStyle` on the list (not by wrapping in SafeAreaView) so content scrolls under the status bar without clipping.  Use `useSafeAreaInsets()` from `react-native-safe-area-context` for granular control.  Always test on iPhone with Dynamic Island, notched iPhones, and Android with gesture navigation — each has different inset requirements.

-----

## Conclusion

The recommended library stack for a React Native Expo trivia app’s category screen is **FlashList** (list rendering), **expo-image** (optimized images with BlurHash), **react-native-reanimated** + **moti** (animations and skeletons), **expo-haptics** (tactile feedback), **react-native-mmkv** + **zustand** (favorites persistence), and **react-native-keyboard-controller** (keyboard handling). This stack runs animations and gestures entirely on the native thread, achieving consistent 60fps even on mid-range Android devices. 

The single most impactful architectural decision is keeping the search TextInput **outside the FlatList** as a fixed header — this one choice eliminates the most common keyboard bug in React Native list screens and simplifies the entire keyboard management story.  The second most impactful decision is using FlashList over FlatList, which delivers a 5–10x rendering performance improvement with zero API changes.   Together, these two decisions solve the majority of performance and UX issues that plague category selection screens in React Native apps.