import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import { colors, gradients } from '../theme';
import {
  getCategoryTheme, cleanCategoryName, CATEGORY_SORT_ORDER, parseGradientColors,
} from '../utils/categoryThemes';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

interface Category { id: number; name: string; }

const { width: SCREEN_W } = Dimensions.get('window');
const COLS = 3;
const H_PAD = 12;
const GAP = 8;
const TILE_W = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;
const BOTTOM_BAR_H = 160;

export default function CategoryScreen({ route, navigation }: Props) {
  const { mode, target } = route.params;
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [dropdown, setDropdown] = useState<Category[]>([]);
  const [blitz, setBlitz] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Category[]>('/categories').then(raw => {
      const cleaned = raw.map(c => ({ ...c, name: cleanCategoryName(c.name) }));
      cleaned.sort((a, b) => {
        const ia = CATEGORY_SORT_ORDER.indexOf(a.id);
        const ib = CATEGORY_SORT_ORDER.indexOf(b.id);
        if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
      setCategories(cleaned);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setDropdown([]); return; }
    const q = search.toLowerCase();
    setDropdown(categories.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6));
  }, [search, categories]);

  const timerSeconds = blitz ? 15 : 30;
  const modeLabelMap: Record<string, string> = {
    solo: '⚡ Solo Play', room: '🏠 Create Room', challenge: '⚔️ Challenge',
  };
  const modeLabel = `${modeLabelMap[mode] ?? mode}${target ? ` — ${target}` : ''}`;

  const go = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'solo') {
        const r = await api.post<{ gameId: string; questionSetId: string }>(
          '/games/solo', { category: selected.name, categoryId: selected.id }
        );
        navigation.replace('Game', { gameId: r.gameId, mode: 'async', questionSetId: r.questionSetId, category: selected.name, catId: selected.id, timer: timerSeconds });
      } else if (mode === 'room') {
        const r = await api.post<{ roomId: string; roomCode: string; questionSetId: string; category: string }>(
          '/rooms', { category: selected.name, categoryId: selected.id, timerSeconds }
        );
        navigation.replace('Room', { roomId: r.roomId, questionSetId: r.questionSetId, category: r.category, roomCode: r.roomCode, isHost: true, timer: timerSeconds });
      } else if (mode === 'challenge') {
        const r = await api.post<{ gameId: string; questionSetId: string }>(
          '/challenges', { targetUsername: target, category: selected.name, categoryId: selected.id }
        );
        navigation.replace('Game', { gameId: r.gameId, mode: 'async', questionSetId: r.questionSetId, category: selected.name, catId: selected.id, timer: timerSeconds });
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderTile = (item: Category) => {
    const theme = getCategoryTheme(item.name, item.id);
    const [c1, c2] = parseGradientColors(theme.gradient);
    const isSelected = selected?.id === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={[s.tile, isSelected && s.tileSelected]}
        onPress={() => setSelected(item)}
        activeOpacity={0.75}
        delayPressIn={80}
      >
        <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tileInner}>
          <Text style={s.tileEmoji}>{theme.emoji}</Text>
          <Text style={s.tileName} numberOfLines={2}>{item.name}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={gradients.bg} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 8, paddingBottom: BOTTOM_BAR_H + insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
      >
        {/* Header */}
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={s.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={s.mascotRow}>
          <View style={s.bubble}><Text style={s.bubbleText}>Pick a category! 🍕</Text></View>
          <PizzaMascot mood="excited" size={55} />
        </View>

        <View style={s.modePill}>
          <Text style={s.modePillText}>{modeLabel}</Text>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <View style={s.searchWrap}>
          <TextInput
            style={s.searchInput}
            placeholder="Search for a topic..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {dropdown.length > 0 && (
            <View style={s.dropdown}>
              {dropdown.map(cat => {
                const theme = getCategoryTheme(cat.name, cat.id);
                return (
                  <TouchableOpacity key={cat.id} style={s.dropdownItem}
                    onPress={() => { setSelected(cat); setSearch(''); setDropdown([]); }}>
                    <Text style={s.dropdownText}>{theme.emoji} {cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Category grid — flexWrap on inner View, NOT on contentContainerStyle */}
        <View style={s.grid}>
          {categories.map(renderTile)}
        </View>
      </ScrollView>

      {/* Fixed bottom bar */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.timerToggle}>
          <TouchableOpacity style={[s.timerOption, !blitz && s.timerOptionActive]} onPress={() => setBlitz(false)}>
            <Text style={[s.timerOptionText, !blitz && s.timerOptionTextActive]}>⏱ Standard · 30s</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.timerOption, blitz && s.timerOptionActive]} onPress={() => setBlitz(true)}>
            <Text style={[s.timerOptionText, blitz && s.timerOptionTextActive]}>⚡ Blitz · 15s</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[s.goBtn, (!selected || loading) && s.goBtnDisabled]} onPress={go} disabled={!selected || loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.goBtnText}>{selected ? "Let's Go →" : 'Pick a category'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PAD },
  closeBtn: {
    alignSelf: 'flex-end', width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  closeBtnText: { color: colors.textPrimary, fontSize: 16 },
  mascotRow: { alignItems: 'center', marginBottom: 6 },
  bubble: {
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  bubbleText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  modePill: {
    alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modePillText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  error: { color: colors.red, fontSize: 14, textAlign: 'center', marginBottom: 8 },
  searchWrap: { marginBottom: 12, zIndex: 20 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12,
    color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdown: {
    position: 'absolute', top: 48, left: 0, right: 0, backgroundColor: colors.surface2,
    borderRadius: 12, zIndex: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dropdownText: { color: colors.textPrimary, fontSize: 14 },
  // Grid: flexWrap on the container View makes scrollable wrapping grids work on iOS
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: { width: TILE_W, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  tileSelected: { borderColor: colors.white },
  tileInner: { padding: 8, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  tileEmoji: { fontSize: 24, marginBottom: 4 },
  tileName: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 13 },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    padding: 16, gap: 10,
  },
  timerToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border,
  },
  timerOption: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  timerOptionActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  timerOptionText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  timerOptionTextActive: { color: colors.textPrimary },
  goBtn: { backgroundColor: colors.green, borderRadius: 14, padding: 16, alignItems: 'center' },
  goBtnDisabled: { opacity: 0.4 },
  goBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
