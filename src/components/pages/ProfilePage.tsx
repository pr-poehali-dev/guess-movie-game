import { useState, useEffect } from 'react';
import { useAuth, VkFriend } from '@/hooks/useAuth';
import Icon from '@/components/ui/icon';

export default function ProfilePage() {
  const { user, logout, fetchFriends } = useAuth();
  const [friends, setFriends] = useState<VkFriend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'friends'>('stats');

  useEffect(() => {
    if (activeTab === 'friends' && friends.length === 0) {
      setLoadingFriends(true);
      fetchFriends()
        .then(setFriends)
        .finally(() => setLoadingFriends(false));
    }
  }, [activeTab, friends.length, fetchFriends]);

  if (!user) return null;

  const winRate = user.games_played > 0
    ? Math.round((user.wins / user.games_played) * 100)
    : 0;

  const playingFriends = friends.filter(f => f.is_player);
  const otherFriends = friends.filter(f => !f.is_player);

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
          {(['stats', 'friends'] as const).map(tab => (
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
              {tab === 'stats' ? 'Статистика' : 'Друзья'}
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

        {activeTab === 'friends' && (
          <div className="space-y-4 animate-fade-in-up delay-200">
            {loadingFriends ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4 animate-pulse">🎬</div>
                <p className="text-gold font-oswald tracking-widest text-sm uppercase">Загрузка друзей...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12 card-cinema rounded p-8">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-gray-400 font-oswald">Список друзей пуст</p>
                <p className="text-gray-600 text-sm font-oswald font-light mt-1">
                  Пригласите друзей в игру!
                </p>
              </div>
            ) : (
              <>
                {playingFriends.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="Gamepad2" size={14} className="text-gold" />
                      <span className="text-gold font-oswald text-xs uppercase tracking-wider">
                        Играют в КиноВикторину ({playingFriends.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {playingFriends.map(friend => (
                        <div key={friend.vk_id} className="card-cinema rounded p-4 flex items-center gap-3">
                          {friend.photo_url ? (
                            <img src={friend.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: '2px solid rgba(212,168,67,0.3)' }} />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-cinema-light flex items-center justify-center text-gold font-bold">
                              {friend.first_name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-oswald text-sm truncate">
                              {friend.first_name} {friend.last_name}
                            </div>
                            {friend.stats && (
                              <div className="text-gray-500 text-xs font-oswald font-light">
                                {friend.stats.total_score} очков · {friend.stats.games_played} игр
                              </div>
                            )}
                          </div>
                          <Icon name="Star" size={14} className="text-gold flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {otherFriends.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name="Users" size={14} className="text-gray-500" />
                      <span className="text-gray-500 font-oswald text-xs uppercase tracking-wider">
                        Друзья VK ({otherFriends.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {otherFriends.map(friend => (
                        <div key={friend.vk_id} className="card-cinema rounded p-4 flex items-center gap-3" style={{ opacity: 0.6 }}>
                          {friend.photo_url ? (
                            <img src={friend.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-cinema-light flex items-center justify-center text-gray-500 font-bold">
                              {friend.first_name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-400 font-oswald text-sm truncate">
                              {friend.first_name} {friend.last_name}
                            </div>
                            <div className="text-gray-600 text-xs font-oswald font-light">Ещё не играет</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-8 animate-fade-in-up delay-300">
          <button
            onClick={logout}
            className="w-full py-3 rounded-sm text-sm font-oswald tracking-wider transition-all"
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171',
            }}
          >
            Выйти из аккаунта
          </button>
        </div>

        <div className="text-center mt-8 text-gray-700 text-xs font-oswald tracking-wider">
          КиноВикторина · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}