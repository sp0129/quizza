import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Keyboard, LayoutAnimation,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { cleanCategoryName, CATEGORY_SORT_ORDER } from '../utils/categoryThemes';
import { FILTER_CATEGORY_IDS } from '../utils/categoryColors';
import SearchBar from '../components/category/SearchBar';
import FilterChips from '../components/category/FilterChips';
import FavoritesSection from '../components/category/FavoritesSection';
import { CategoryCard } from '../components/category/CategoryCard';
import CategorySkeleton from '../components/category/CategorySkeleton';
import EmptySearchState from '../components/category/EmptySearchState';
import { getGamePreferences } from '../utils/gamePreferences';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

interface Category { id: number; name: string; }

const { width: SCREEN_W } = Dimensions.get('window');
const BOTTOM_BAR_H = 210;

// ── Debounce hook ──────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Main screen ────────────────────────────────────────────────
export default function CategoryScreen({ route, navigation }: Props) {
  const { mode, target, targetAvatarId } = route.params;
  const insets = useSafeAreaInsets();

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [blitz, setBlitz] = useState(false);
  const [miniMode, setMiniMode] = useState(false);
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  // Load saved preferences as defaults
  useEffect(() => {
    getGamePreferences().then(prefs => {
      setBlitz(prefs.timer === 15);
      setMiniMode(prefs.questionCount === 5);
      setDifficulty(prefs.difficulty);
    });
  }, []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debouncedQuery = useDebounce(query, 300);

  // Fetch categories
  useEffect(() => {
    api.get<Category[]>('/categories')
      .then((raw) => {
        const cleaned = raw.map((c) => ({ ...c, name: cleanCategoryName(c.name) }));
        cleaned.sort((a, b) => {
          const ia = CATEGORY_SORT_ORDER.indexOf(a.id);
          const ib = CATEGORY_SORT_ORDER.indexOf(b.id);
          if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
        setCategories(cleaned);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter + search
  const filtered = useMemo(() => {
    let result = categories;

    // Apply chip filter
    if (activeFilter !== 'all') {
      const ids = FILTER_CATEGORY_IDS[activeFilter];
      if (ids) result = result.filter((c) => ids.includes(c.id));
    }

    // Apply search
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    return result;
  }, [categories, debouncedQuery, activeFilter]);

  // Mode label
  const modeLabelMap: Record<string, string> = {
    solo: 'Solo Play', room: 'Create Room', challenge: 'Challenge',
  };
  const modeLabel = `${modeLabelMap[mode] ?? mode}${target ? ` — ${target}` : ''}`;
  const timerSeconds = blitz ? 15 : 30;
  const questionCount = miniMode ? 5 : 10;

  // Handlers — toggle: tap selected card again to deselect
  const handleSelect = useCallback((item: Category) => {
    setSelected((prev) => {
      const next = prev?.id === item.id ? null : item;
      const wasSelected = prev !== null;
      const willBeSelected = next !== null;
      // Animate only when transitioning between selected/deselected
      if (wasSelected !== willBeSelected) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      return next;
    });
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setActiveFilter('all');
  }, []);

  const handleFilterSelect = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(key);
  }, []);

  const go = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    try {
      if (mode === 'solo') {
        const r = await api.post<{ gameId: string; questionSetId: string }>(
          '/games/solo', { category: selected.name, categoryId: selected.id, questionCount, difficulty: difficulty !== 'all' ? difficulty : undefined },
        );
        navigation.replace('Game', {
          gameId: r.gameId, mode: 'solo', questionSetId: r.questionSetId,
          category: selected.name, catId: selected.id, timer: timerSeconds, questionCount,
        });
      } else if (mode === 'room') {
        const r = await api.post<{ roomId: string; roomCode: string; questionSetId: string; category: string }>(
          '/rooms', { category: selected.name, categoryId: selected.id, timerSeconds, questionCount, difficulty: difficulty !== 'all' ? difficulty : undefined },
        );
        navigation.replace('Room', {
          roomId: r.roomId, questionSetId: r.questionSetId,
          category: r.category, roomCode: r.roomCode, isHost: true, timer: timerSeconds,
        });
      } else if (mode === 'challenge') {
        const r = await api.post<{ gameId: string; questionSetId: string }>(
          '/challenges', { targetUsername: target, category: selected.name, categoryId: selected.id, questionCount, difficulty: difficulty !== 'all' ? difficulty : undefined },
        );
        navigation.replace('Game', {
          gameId: r.gameId, mode: 'async', questionSetId: r.questionSetId,
          category: selected.name, catId: selected.id, timer: timerSeconds, questionCount,
          opponentUsername: target,
          opponentAvatarId: targetAvatarId,
        });
      }
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }, [selected, mode, target, timerSeconds, questionCount, navigation]);

  // Render item for FlashList
  const renderItem = useCallback(
    ({ item, index }: { item: Category; index: number }) => (
      <CategoryCard
        item={item}
        index={index}
        isSelected={selected?.id === item.id}
        onSelect={handleSelect}
      />
    ),
    [selected?.id, handleSelect],
  );

  const keyExtractor = useCallback((item: Category) => String(item.id), []);

  // List header: favorites + section title
  const ListHeader = useMemo(
    () => (
      <View>
        <FavoritesSection
          categories={categories}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
        {filtered.length > 0 && (
          <Text style={s.sectionTitle}>
            {debouncedQuery ? 'Search Results' : 'All Categories'}
          </Text>
        )}
      </View>
    ),
    [categories, selected?.id, handleSelect, filtered.length, debouncedQuery],
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Fixed header: back + mode pill + search + chips ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={s.modePill}>
            <Text style={s.modePillText}>{modeLabel}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.searchRow}>
          <SearchBar value={query} onChangeText={setQuery} onClear={handleClearSearch} />
        </View>

        <FilterChips activeFilter={activeFilter} onSelect={handleFilterSelect} />
      </View>

      {/* ── Error ── */}
      {error ? (
        <View style={s.errorRow}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── Content ── */}
      {loading ? (
        <CategorySkeleton />
      ) : (
        <FlashList
          data={filtered}
          numColumns={2}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={selected?.id}
          estimatedItemSize={150}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <EmptySearchState query={debouncedQuery || activeFilter} onClear={handleClearSearch} />
          }
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingBottom: BOTTOM_BAR_H + insets.bottom + 16,
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Fixed bottom bar ── */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 12 }]}>
        {selected && (
          <>
            <View style={s.timerToggle}>
              <TouchableOpacity
                style={[s.timerOption, !blitz && s.timerOptionActive]}
                onPress={() => setBlitz(false)}
              >
                <Text style={[s.timerOptionText, !blitz && s.timerOptionTextActive]}>
                  Standard · 30s
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.timerOption, blitz && s.timerOptionActive]}
                onPress={() => setBlitz(true)}
              >
                <Text style={[s.timerOptionText, blitz && s.timerOptionTextActive]}>
                  Blitz · 15s
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.timerToggle}>
              <TouchableOpacity
                style={[s.timerOption, !miniMode && s.timerOptionActive]}
                onPress={() => { setMiniMode(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[s.timerOptionText, !miniMode && s.timerOptionTextActive]}>
                  10 Questions
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.timerOption, miniMode && s.timerOptionActive]}
                onPress={() => { setMiniMode(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[s.timerOptionText, miniMode && s.timerOptionTextActive]}>
                  5 Questions
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.timerToggle}>
              {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[s.timerOption, difficulty === d && s.timerOptionActive, { flex: 1 }]}
                  onPress={() => { setDifficulty(d); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[s.timerOptionText, difficulty === d && s.timerOptionTextActive]}>
                    {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[s.goBtn, (!selected || submitting) && s.goBtnDisabled]}
          onPress={go}
          disabled={!selected || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.goBtnText}>
              {selected ? 'Start Game →' : 'Select a category to play'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Header
  header: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71,85,105,0.3)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '600',
  },
  modePill: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modePillText: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  searchRow: {
    paddingHorizontal: 16,
  },

  // Section title
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 12,
  },

  // Error
  errorRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },

  // Bottom bar
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(71,85,105,0.4)',
    padding: 16,
    gap: 10,
  },
  timerToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timerOption: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  timerOptionActive: {
    backgroundColor: 'rgba(124,58,237,0.2)',
  },
  timerOptionText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  timerOptionTextActive: {
    color: '#C4B5FD',
  },
  goBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  goBtnDisabled: {
    opacity: 0.4,
  },
  goBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
