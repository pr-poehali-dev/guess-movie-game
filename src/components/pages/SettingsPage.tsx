import { useState } from 'react';
import { GameStats } from '@/pages/Index';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/hooks/useAuth';
import Icon from '@/components/ui/icon';

interface SettingsPageProps {
  stats: GameStats;
  onResetStats: () => void;
}

export default function SettingsPage({ stats, onResetStats }: SettingsPageProps) {
  const { achievements } = useAchievements();
  const { user, isAuthenticated, login } = useAuth();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('kinovikto_name') || '');
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem('kinovikto_difficulty') || 'all');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('kinovikto_sound') !== 'false');

  const handleSaveName = () => {
    if (playerName.trim()) {
      localStorage.setItem('kinovikto_name', playerName.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleDifficulty = (val: string) => {
    setDifficulty(val);
    localStorage.setItem('kinovikto_difficulty', val);
  };

  const handleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('kinovikto_sound', String(next));
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    onResetStats();
    setConfirmReset(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="font-playfair text-4xl font-bold text-gradient-gold mb-2">Настройки</h1>
          <p className="text-gray-500 font-oswald font-light tracking-wider">Персонализируй свой опыт</p>
        </div>

        <div className="space-y-4">
          {!isAuthenticated && (
            <div className="card-cinema rounded p-6 animate-fade-in-up delay-75" style={{ borderColor: 'rgba(74,118,168,0.3)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#4a76a8' }}>
                  <span className="text-white font-bold text-lg">VK</span>
                </div>
                <div className="flex-1">
                  <div className="text-white font-oswald text-sm">Войти через ВКонтакте</div>
                  <p className="text-gray-500 text-xs font-oswald font-light">Сохраняй прогресс, смотри друзей и соревнуйся</p>
                </div>
                <button
                  onClick={login}
                  className="px-4 py-2 rounded-sm text-sm font-oswald tracking-wider transition-all flex-shrink-0"
                  style={{ background: '#4a76a8', color: '#fff', border: '1px solid rgba(74,118,168,0.6)' }}
                >
                  Войти
                </button>
              </div>
            </div>
          )}

          {isAuthenticated && user && (
            <div className="card-cinema rounded p-6 animate-fade-in-up delay-75" style={{ borderColor: 'rgba(74,222,128,0.2)' }}>
              <div className="flex items-center gap-3">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" style={{ border: '2px solid rgba(212,168,67,0.3)' }} />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, #d4a843, #9a7830)' }}>
                    {user.first_name[0]}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-white font-oswald text-sm">{user.first_name} {user.last_name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon name="Check" size={12} className="text-green-400" />
                    <span className="text-green-400 text-xs font-oswald font-light">VK подключён</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card-cinema rounded p-6 animate-fade-in-up delay-100">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="User" size={14} className="text-gold" />
              <span className="text-gold font-oswald text-xs uppercase tracking-wider">Имя игрока</span>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                placeholder="Введи своё имя..."
                maxLength={20}
                className="flex-1 bg-[#0a0a0a] border border-white/10 text-white px-4 py-3 rounded-sm text-sm font-oswald focus:outline-none focus:border-gold/40 transition-colors placeholder-gray-700"
              />
              <button
                onClick={handleSaveName}
                className="btn-cinema px-5 py-3 rounded-sm text-sm"
              >
                {saved ? '✓' : 'Сохранить'}
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2 font-oswald font-light">Имя отображается в рейтинге</p>
          </div>

          {/* Difficulty */}
          <div className="card-cinema rounded p-6 animate-fade-in-up delay-200">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="Gauge" size={14} className="text-gold" />
              <span className="text-gold font-oswald text-xs uppercase tracking-wider">Сложность</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'easy', label: 'Лёгкая', color: '#4ade80' },
                { value: 'all', label: 'Любая', color: '#d4a843' },
                { value: 'hard', label: 'Сложная', color: '#f87171' },
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => handleDifficulty(item.value)}
                  className="py-3 px-4 rounded-sm text-sm font-oswald tracking-wider transition-all"
                  style={{
                    background: difficulty === item.value ? `${item.color}15` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${difficulty === item.value ? item.color + '60' : 'rgba(255,255,255,0.08)'}`,
                    color: difficulty === item.value ? item.color : '#666',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound */}
          <div className="card-cinema rounded p-6 animate-fade-in-up delay-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name={soundEnabled ? "Volume2" : "VolumeX"} size={14} className="text-gold" />
                <div>
                  <span className="text-white font-oswald text-sm">Звуковые эффекты</span>
                  <p className="text-gray-600 text-xs font-oswald font-light">Звуки при правильных/неправильных ответах</p>
                </div>
              </div>
              <button
                onClick={handleSound}
                className="w-12 h-6 rounded-full transition-all flex-shrink-0"
                style={{
                  background: soundEnabled ? 'linear-gradient(135deg, #d4a843, #9a7830)' : 'rgba(255,255,255,0.1)',
                  position: 'relative',
                }}
              >
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all" style={{
                  left: soundEnabled ? '26px' : '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }} />
              </button>
            </div>
          </div>

          {/* Stats summary */}
          <div className="card-cinema rounded p-6 animate-fade-in-up delay-400">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="BarChart2" size={14} className="text-gold" />
              <span className="text-gold font-oswald text-xs uppercase tracking-wider">Моя статистика</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Игр сыграно', value: stats.gamesPlayed },
                { label: 'Лучший результат', value: stats.bestScore },
                { label: 'Всего очков', value: stats.totalScore },
                { label: 'Достижений', value: `${stats.unlockedAchievements.length}/${achievements.length}` },
              ].map((item, i) => (
                <div key={i} className="text-center p-3 rounded" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="text-gold font-playfair font-bold text-xl">{item.value}</div>
                  <div className="text-gray-600 text-xs font-oswald">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Reset */}
          <div className="card-cinema rounded p-6 animate-fade-in-up delay-500" style={{ borderColor: confirmReset ? 'rgba(239,68,68,0.3)' : undefined }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="Trash2" size={14} className="text-red-400" />
                  <span className="text-red-400 font-oswald text-xs uppercase tracking-wider">Сброс прогресса</span>
                </div>
                <p className="text-gray-600 text-xs font-oswald font-light">
                  {confirmReset ? '⚠️ Нажми ещё раз для подтверждения' : 'Удалить все очки, достижения и историю игр'}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-sm text-sm font-oswald transition-all"
                style={{
                  background: confirmReset ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                }}
              >
                {confirmReset ? 'Подтвердить' : 'Сбросить'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-gray-700 text-xs font-oswald tracking-wider">
          КиноВикторина · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}