import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Icon from '@/components/ui/icon';
import funcUrls from '../../../backend/func2url.json';

const API_URL = (funcUrls as Record<string, string>)['vk-auth'] || '';

interface LeaderboardPlayer {
  rank: number;
  id: number;
  vk_id: number;
  first_name: string;
  last_name: string;
  photo_url: string;
  total_score: number;
  games_played: number;
  best_score: number;
  wins: number;
  losses: number;
  draws: number;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardPlayer[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'leaders'>('stats');

  useEffect(() => {
    if (activeTab === 'leaders' && leaders.length === 0) {
      setLoadingLeaders(true);
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leaderboard' }),
      })
        .then(r => r.json())
        .then(data => setLeaders(data.players || []))
        .catch(() => {})
        .finally(() => setLoadingLeaders(false));
    }
  }, [activeTab, leaders.length]);

  if (!user) return null;

  const winRate = user.games_played > 0
    ? Math.round((user.wins / user.games_played) * 100)
    : 0;

  const medalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="relative inline-block mb-4">
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.first_name}
                className="w-24 h-24 rounded-full object-cover"
                style={{ border: '3px solid #d4a843', boxShadow: '0 0 20px rgba(212,168,67,0.3)' }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl"
                style={{ background: 'linear-gradient(135deg, #d4a843, #9a7830)' }}
              >
                {user.first_name[0]}
              </div>
            )}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#4a76a8' }}
            >
              <span className="text-white text-xs font-bold">VK</span>
            </div>
          </div>
          <h1 className="font-playfair text-3xl font-bold text-gradient-gold mb-1">
            {user.first_name} {user.last_name}
          </h1>
          <p className="text-gray-500 font-oswald font-light tracking-wider text-sm">
            Игрок КиноВикторины
          </p>
        </div>

        <div className="flex gap-2 mb-6 animate-fade-in-up delay-100">
          {(['stats', 'leaders'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 px-4 rounded-sm text-sm font-oswald tracking-wider transition-all"
              style={{
                background: activeTab === tab ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeTab === tab ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: activeTab === tab ? '#d4a843' : '#666',
              }}
            >
              {tab === 'stats' ? 'Статистика' : 'Лидеры'}
            </button>
          ))}
        </div>

        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fade-in-up delay-200">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Всего очков', value: user.total_score, icon: 'Star' },
                { label: 'Игр сыграно', value: user.games_played, icon: 'Gamepad2' },
                { label: 'Лучший результат', value: user.best_score, icon: 'Trophy' },
                { label: 'Процент побед', value: `${winRate}%`, icon: 'TrendingUp' },
              ].map((item, i) => (
                <div key={i} className="card-cinema p-5 rounded text-center">
                  <Icon name={item.icon} size={16} className="text-gold mx-auto mb-2" />
                  <div className="text-gold font-playfair font-bold text-2xl">{item.value}</div>
                  <div className="text-gray-600 text-xs font-oswald mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="card-cinema rounded p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="BarChart2" size={14} className="text-gold" />
                <span className="text-gold font-oswald text-xs uppercase tracking-wider">Результаты</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <div className="text-green-400 font-playfair font-bold text-xl">{user.wins}</div>
                  <div className="text-gray-600 text-xs font-oswald">Побед</div>
                </div>
                <div className="text-center p-3 rounded" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                  <div className="text-red-400 font-playfair font-bold text-xl">{user.losses}</div>
                  <div className="text-gray-600 text-xs font-oswald">Поражений</div>
                </div>
                <div className="text-center p-3 rounded" style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.15)' }}>
                  <div className="text-gold font-playfair font-bold text-xl">{user.draws}</div>
                  <div className="text-gray-600 text-xs font-oswald">Ничьих</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaders' && (
          <div className="space-y-3 animate-fade-in-up delay-200">
            {loadingLeaders ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4 animate-pulse">🏆</div>
                <p className="text-gold font-oswald tracking-widest text-sm uppercase">Загрузка рейтинга...</p>
              </div>
            ) : leaders.length === 0 ? (
              <div className="text-center py-12 card-cinema rounded p-8">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-gray-400 font-oswald">Пока нет игроков в рейтинге</p>
                <p className="text-gray-600 text-sm font-oswald font-light mt-1">
                  Сыграйте первую игру!
                </p>
              </div>
            ) : (
              leaders.map(player => {
                const isMe = player.id === user.id;
                return (
                  <div
                    key={player.id}
                    className="card-cinema rounded p-4 flex items-center gap-3"
                    style={isMe ? { border: '1px solid rgba(212,168,67,0.4)', background: 'rgba(212,168,67,0.06)' } : {}}
                  >
                    <div className="w-8 text-center font-playfair font-bold text-lg" style={{ color: player.rank <= 3 ? '#d4a843' : '#666' }}>
                      {medalEmoji(player.rank)}
                    </div>
                    {player.photo_url ? (
                      <img src={player.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: isMe ? '2px solid rgba(212,168,67,0.5)' : '2px solid rgba(255,255,255,0.08)' }} />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-gold font-bold" style={{ background: 'rgba(212,168,67,0.12)' }}>
                        {player.first_name[0] || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-oswald text-sm truncate">
                        {player.first_name} {player.last_name}
                        {isMe && <span className="text-gold ml-1">(вы)</span>}
                      </div>
                      <div className="text-gray-500 text-xs font-oswald font-light">
                        {player.games_played} игр · {player.wins} побед
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-gold font-playfair font-bold">{player.total_score}</div>
                      <div className="text-gray-600 text-xs font-oswald">очков</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <button
          onClick={logout}
          className="w-full mt-8 py-3 rounded-sm text-sm font-oswald tracking-wider transition-all animate-fade-in-up delay-300"
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: '#f87171',
          }}
        >
          <Icon name="LogOut" size={14} className="inline mr-2" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
