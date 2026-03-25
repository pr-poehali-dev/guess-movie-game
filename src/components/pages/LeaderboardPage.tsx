import { GameStats } from '@/pages/Index';
import { achievements } from '@/data/movies';
import Icon from '@/components/ui/icon';

interface LeaderboardProps {
  leaderboard: { name: string; score: number; date: string }[];
  stats: GameStats;
}

const medals = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage({ leaderboard, stats }: LeaderboardProps) {
  const playerName = localStorage.getItem('kinovikto_name') || 'Игрок';

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, transparent, #d4a843)' }} />
            <span className="text-4xl">🏆</span>
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, transparent, #d4a843)' }} />
          </div>
          <h1 className="font-playfair text-4xl font-bold text-gradient-gold mb-2">Рейтинг</h1>
          <p className="text-gray-500 font-oswald font-light tracking-wider">Лучшие результаты игроков</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard table */}
          <div className="lg:col-span-2 animate-fade-in-up delay-100">
            <div className="card-cinema rounded overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <Icon name="Trophy" size={16} className="text-gold" />
                <span className="text-gold font-oswald text-sm uppercase tracking-wider">Таблица лидеров</span>
              </div>
              {leaderboard.length === 0 ? (
                <div className="p-12 text-center text-gray-600">
                  <Icon name="Film" size={32} className="mx-auto mb-4 opacity-30" />
                  <p className="font-oswald">Пока нет результатов. Сыграй первым!</p>
                </div>
              ) : (
                <div>
                  {leaderboard.map((entry, i) => (
                    <div key={i} className={`flex items-center gap-4 px-6 py-4 border-b border-white/[0.03] transition-all hover:bg-white/[0.02] ${
                      entry.name === playerName ? 'bg-gold/5' : ''
                    }`}>
                      <div className="w-8 text-center flex-shrink-0">
                        {i < 3 ? (
                          <span className="text-lg">{medals[i]}</span>
                        ) : (
                          <span className="text-gray-600 font-oswald font-bold text-sm">{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-oswald font-semibold text-sm ${entry.name === playerName ? 'text-gold' : 'text-white'}`}>
                          {entry.name}
                          {entry.name === playerName && <span className="ml-2 text-[10px] text-gold/60">(ты)</span>}
                        </div>
                        <div className="text-gray-600 text-xs">{entry.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-playfair font-bold text-xl ${i === 0 ? 'text-gold' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {entry.score}
                        </span>
                        <span className="text-gray-600 text-xs font-oswald">очков</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My stats */}
          <div className="space-y-4 animate-fade-in-up delay-200">
            <div className="card-cinema rounded p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="User" size={14} className="text-gold" />
                <span className="text-gold font-oswald text-xs uppercase tracking-wider">Моя статистика</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Лучший результат', value: stats.bestScore, icon: '⭐' },
                  { label: 'Всего очков', value: stats.totalScore, icon: '🎯' },
                  { label: 'Игр сыграно', value: stats.gamesPlayed, icon: '🎬' },
                  { label: 'Идеальных раундов', value: stats.perfectRounds, icon: '💎' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-500 text-sm font-oswald font-light flex items-center gap-2">
                      <span>{item.icon}</span>{item.label}
                    </span>
                    <span className="text-white font-playfair font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="card-cinema rounded p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="Award" size={14} className="text-gold" />
                <span className="text-gold font-oswald text-xs uppercase tracking-wider">Достижения</span>
              </div>
              <div className="space-y-2">
                {achievements.map(ach => {
                  const unlocked = stats.unlockedAchievements.includes(ach.id);
                  return (
                    <div key={ach.id} className={`flex items-center gap-3 p-2 rounded transition-all ${unlocked ? 'opacity-100' : 'opacity-30'}`}>
                      <span className="text-lg">{ach.icon}</span>
                      <div className="flex-1">
                        <div className={`text-xs font-semibold font-oswald ${unlocked ? 'text-gold' : 'text-gray-500'}`}>{ach.title}</div>
                        <div className="text-[10px] text-gray-600">{ach.description}</div>
                      </div>
                      {unlocked && <Icon name="CheckCircle" size={12} className="text-gold flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
