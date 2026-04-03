import { useState, useEffect } from 'react';
import funcUrls from '../../backend/func2url.json';
import Icon from '@/components/ui/icon';

const API_URL = (funcUrls as Record<string, string>)['vk-auth'] || '';
const ADMIN_KEY_STORAGE = 'kinovikto_admin_key';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'score' | 'perfect';
  requirement: number;
  sort_order: number;
  is_active: boolean;
}

const emptyAchievement: Achievement = {
  id: '',
  title: '',
  description: '',
  icon: '',
  type: 'score',
  requirement: 1,
  sort_order: 0,
  is_active: true,
};

async function apiCall(action: string, adminKey: string, data: Record<string, unknown> = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, admin_key: adminKey, ...data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Ошибка');
  return json;
}

export default function AdminAchievements() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(ADMIN_KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAchievements = async (key: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('admin_list_achievements', key);
      setAchievements(data.achievements);
      setAuthorized(true);
      localStorage.setItem(ADMIN_KEY_STORAGE, key);
      setAdminKey(key);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка';
      if (msg.includes('запрещён') || msg.includes('403')) {
        setError('Неверный ключ');
        localStorage.removeItem(ADMIN_KEY_STORAGE);
        setAuthorized(false);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) loadAchievements(adminKey);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) loadAchievements(keyInput.trim());
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.id.trim() || !editing.title.trim()) {
      setError('ID и название обязательны');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await apiCall('admin_save_achievement', adminKey, { achievement: editing });
      setAchievements(data.achievements);
      setEditing(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Деактивировать достижение "${id}"?`)) return;
    setError('');
    try {
      const data = await apiCall('admin_delete_achievement', adminKey, { achievement_id: id });
      setAchievements(data.achievements);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey('');
    setAuthorized(false);
    setAchievements([]);
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm">
          <h1 className="text-gold font-oswald text-2xl mb-6 text-center tracking-wider">
            Админ-панель достижений
          </h1>
          {error && <div className="text-red-400 text-sm mb-4 text-center">{error}</div>}
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="Введите секретный ключ"
            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white placeholder-gray-500 mb-4 focus:border-gold/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-cinema py-3 rounded text-sm"
          >
            {loading ? 'Проверка...' : 'Войти'}
          </button>
          <a href="/" className="block text-center text-gray-500 text-sm mt-4 hover:text-gold transition-colors">
            Вернуться на сайт
          </a>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-gold font-oswald text-2xl tracking-wider">Достижения</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setEditing({ ...emptyAchievement, sort_order: achievements.length + 1 })}
              className="btn-cinema px-4 py-2 rounded text-sm flex items-center gap-2"
            >
              <Icon name="Plus" size={16} />
              Добавить
            </button>
            <a href="/admin/upload" className="px-4 py-2 rounded text-sm border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30 transition-all flex items-center gap-2">
              <Icon name="Image" size={16} />
              Картинки
            </a>
            <button onClick={handleLogout} className="px-4 py-2 rounded text-sm border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-all">
              <Icon name="LogOut" size={16} />
            </button>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm mb-4 bg-red-400/10 border border-red-400/20 rounded px-4 py-2">{error}</div>}

        {editing && (
          <div className="card-cinema rounded p-6 mb-6 border border-gold/20">
            <h2 className="text-gold font-oswald text-lg mb-4">
              {editing.id && achievements.find(a => a.id === editing.id) ? 'Редактирование' : 'Новое достижение'}
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">ID (латиница, уникальный)</label>
                <input
                  value={editing.id}
                  onChange={e => setEditing({ ...editing, id: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                  disabled={!!achievements.find(a => a.id === editing.id)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none disabled:opacity-50"
                  placeholder="my_achievement"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Название</label>
                <input
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none"
                  placeholder="Мастер кино"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Описание</label>
                <input
                  value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none"
                  placeholder="Набери 50 очков"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Иконка (эмодзи)</label>
                <input
                  value={editing.icon}
                  onChange={e => setEditing({ ...editing, icon: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none"
                  placeholder="🏆"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Тип</label>
                <select
                  value={editing.type}
                  onChange={e => setEditing({ ...editing, type: e.target.value as 'score' | 'perfect' })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none"
                >
                  <option value="score">По очкам (score)</option>
                  <option value="perfect">Идеальный раунд (perfect)</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Порог (requirement)</label>
                <input
                  type="number"
                  min={1}
                  value={editing.requirement}
                  onChange={e => setEditing({ ...editing, requirement: parseInt(e.target.value) || 1 })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Порядок сортировки</label>
                <input
                  type="number"
                  min={0}
                  value={editing.sort_order}
                  onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-gold/50 focus:outline-none"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
                    className="accent-[#d4a843]"
                  />
                  <span className="text-gray-300 text-sm">Активно</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-cinema px-6 py-2 rounded text-sm"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-6 py-2 rounded text-sm border border-white/10 text-gray-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`card-cinema rounded p-4 flex items-center gap-4 transition-all ${!ach.is_active ? 'opacity-40' : ''}`}
            >
              <span className="text-3xl w-10 text-center">{ach.icon || '❓'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gold font-oswald font-semibold">{ach.title}</span>
                  <span className="text-gray-600 text-xs font-mono">{ach.id}</span>
                  {!ach.is_active && (
                    <span className="text-red-400 text-xs border border-red-400/30 px-2 py-0.5 rounded">неактивно</span>
                  )}
                </div>
                <div className="text-gray-500 text-sm">{ach.description}</div>
                <div className="text-gray-600 text-xs mt-1">
                  {ach.type === 'score' ? `Набрать ${ach.requirement} очков` : 'Идеальный раунд'}
                  {' · '}Порядок: {ach.sort_order}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditing({ ...ach })}
                  className="p-2 text-gray-400 hover:text-gold transition-colors"
                  title="Редактировать"
                >
                  <Icon name="Pencil" size={16} />
                </button>
                {ach.is_active && (
                  <button
                    onClick={() => handleDelete(ach.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Деактивировать"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {achievements.length === 0 && !loading && (
            <div className="text-center text-gray-500 py-12">Нет достижений</div>
          )}
        </div>
      </div>
    </div>
  );
}
