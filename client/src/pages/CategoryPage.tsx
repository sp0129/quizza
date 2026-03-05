import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import Sparkles from '../components/Sparkles';
import { getCategoryTheme } from '../utils/categoryThemes';

interface Category {
  id: number;
  name: string;
}

export default function CategoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') ?? 'solo';
  const target = searchParams.get('target') ?? '';

  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [dropdown, setDropdown] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setDropdown([]); return; }
    const q = search.toLowerCase();
    setDropdown(categories.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6));
  }, [search, categories]);

  const handleSelect = (cat: Category) => {
    setSelected(cat);
    setSearch('');
    setDropdown([]);
  };

  const go = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'solo') {
        const result = await api.post<{ gameId: string; questionSetId: string }>(
          '/games/solo',
          { category: selected.name, categoryId: selected.id }
        );
        navigate(`/game/${result.gameId}?mode=async&qsid=${result.questionSetId}&cat=${encodeURIComponent(selected.name)}&catId=${selected.id}`);
      } else if (mode === 'room') {
        const result = await api.post<{ roomId: string; roomCode: string; questionSetId: string; category: string }>(
          '/rooms',
          { category: selected.name, categoryId: selected.id }
        );
        navigate(`/room/${result.roomId}?host=true&qsid=${result.questionSetId}&cat=${encodeURIComponent(result.category)}&catId=${selected.id}&rc=${result.roomCode}`);
      } else if (mode === 'challenge') {
        const result = await api.post<{ gameId: string; questionSetId: string }>(
          '/challenges',
          { targetUsername: target, category: selected.name, categoryId: selected.id }
        );
        navigate(`/game/${result.gameId}?mode=async&qsid=${result.questionSetId}&cat=${encodeURIComponent(selected.name)}&catId=${selected.id}`);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const modeLabelMap: Record<string, string> = {
    solo: '⚡ Solo Play',
    room: '🏠 Create Room',
    challenge: '⚔️ Challenge',
  };
  const modeLabel = modeLabelMap[mode] ?? mode;

  return (
    <div className="cat-page">
      <Sparkles />

      <div className="cat-inner">
        {/* Animated header */}
        <div className="cat-header">
          <div className="speech-bubble">Pick a category! 🍕</div>
          <PizzaMascot mood="excited" size={60} className="mascot-entrance mascot-excited" />
          <span className="cat-mode-pill">
            {modeLabel}{target ? ` — ${target}` : ''}
          </span>
          {error && <p className="inline-error">{error}</p>}
        </div>

        {/* Category grid */}
        <div className="cat-grid-wrap">
          <div className="cat-grid">
            {categories.map(cat => {
              const theme = getCategoryTheme(cat.name, cat.id);
              const isSelected = selected?.id === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`cat-tile${isSelected ? ' selected' : ''}`}
                  style={{ background: theme.gradient }}
                  onClick={() => handleSelect(cat)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleSelect(cat)}
                >
                  <span className="cat-tile-emoji">{theme.emoji}</span>
                  <span className="cat-tile-name">{cat.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky bottom: search + go */}
        <div className="cat-bottom">
          <div className="cat-autocomplete">
            {dropdown.length > 0 && (
              <div className="cat-dropdown">
                {dropdown.map(cat => (
                  <div
                    key={cat.id}
                    className="cat-dropdown-item"
                    onClick={() => handleSelect(cat)}
                  >
                    {getCategoryTheme(cat.name, cat.id).emoji} {cat.name}
                  </div>
                ))}
              </div>
            )}
            <input
              className="field"
              type="text"
              placeholder="Search for a topic…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn btn-play btn-block"
            onClick={go}
            disabled={!selected || loading}
          >
            {loading ? 'Starting…' : "Let's Go →"}
          </button>
        </div>
      </div>
    </div>
  );
}
