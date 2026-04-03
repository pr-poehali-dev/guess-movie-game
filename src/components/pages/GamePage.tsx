import { useState, useEffect, useCallback } from 'react';
import { Movie, achievements } from '@/data/movies';
import { useRoundBasedImages } from '@/hooks/useTmdbImages';
import { GameStats } from '@/pages/Index';
import { useAuth } from '@/hooks/useAuth';
import Icon from '@/components/ui/icon';

interface GamePageProps {
  onFinish: (score: number, perfect: boolean, achievements: string[]) => void;
  stats: GameStats;
}

type GameState = 'playing' | 'answered' | 'gameover' | 'round-complete';

const QUESTIONS_PER_ROUND = 10;

export default function GamePage({ onFinish, stats }: GamePageProps) {
  const { user, isAuthenticated } = useAuth();
  const { loading: moviesLoading, getNewBatch, resetUsed } = useRoundBasedImages();
  const [queue, setQueue] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [lostLives, setLostLives] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!moviesLoading && !initialized) {
      const batch = getNewBatch(QUESTIONS_PER_ROUND);
      setQueue(batch);
      setInitialized(true);
    }
  }, [moviesLoading, initialized, getNewBatch]);

  const current = queue[currentIndex];

  const checkAchievements = useCallback((score: number, perfect: boolean, prevUnlocked: string[]) => {
    const earned: string[] = [];
    for (const ach of achievements) {
      if (prevUnlocked.includes(ach.id)) continue;
      if (ach.type === 'score' && score >= ach.requirement) earned.push(ach.id);
      if (ach.type === 'perfect' && perfect) earned.push(ach.id);
    }
    return earned;
  }, []);

  const handleAnswer = (index: number) => {
    if (gameState !== 'playing') return;
    setSelectedAnswer(index);
    setGameState('answered');

    if (index === current.correctIndex) {
      const newRoundScore = roundScore + 1;
      const newTotal = totalScore + 1;
      setRoundScore(newRoundScore);
      setTotalScore(newTotal);
      if (isAuthenticated) {
        const earned = checkAchievements(newTotal, lostLives === 0, stats.unlockedAchievements);
        if (earned.length > 0) {
          setNewAchievements(prev => [...prev, ...earned]);
          const achData = achievements.find(a => a.id === earned[0]);
          if (achData) setShowAchievement(achData.title + ' ' + achData.icon);
          setTimeout(() => setShowAchievement(null), 3000);
        }
      }
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setLostLives(prev => prev + 1);
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 600);
      if (newLives <= 0) {
        setTimeout(() => setGameState('gameover'), 1200);
        return;
      }
    }

    setTimeout(() => {
      if (currentIndex + 1 >= queue.length) {
        setGameState('round-complete');
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setGameState('playing');
        setImageLoaded(false);
      }
    }, 1500);
  };

  const handleNextRound = () => {
    const batch = getNewBatch(QUESTIONS_PER_ROUND);
    setQueue(batch);
    setCurrentIndex(0);
    setRound(prev => prev + 1);
    setRoundScore(0);
    setSelectedAnswer(null);
    setGameState('playing');
    setImageLoaded(false);
  };

  const handleFinish = () => {
    const perfect = lostLives === 0 && totalScore > 0;
    if (isAuthenticated) {
      const earned = checkAchievements(totalScore, perfect, stats.unlockedAchievements);
      const allEarned = [...new Set([...newAchievements, ...earned])];
      onFinish(totalScore, perfect, allEarned);
    } else {
      onFinish(totalScore, perfect, []);
    }
  };

  const handleRestart = () => {
    resetUsed();
    const batch = getNewBatch(QUESTIONS_PER_ROUND);
    setQueue(batch);
    setCurrentIndex(0);
    setLives(3);
    setRound(1);
    setRoundScore(0);
    setTotalScore(0);
    setGameState('playing');
    setSelectedAnswer(null);
    setImageLoaded(false);
    setNewAchievements([]);
    setLostLives(0);
  };

  const progress = ((currentIndex) / queue.length) * 100;

  if (moviesLoading || !queue.length || !queue[currentIndex]) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-pulse">🎬</div>
          <p className="text-gold font-oswald tracking-widest text-sm uppercase">Загружаем кадры из фильмов...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'round-complete') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="text-6xl mb-6">🎉</div>
          <div className="mb-2">
            <span className="text-gold text-xs uppercase tracking-[0.3em] font-oswald">Раунд {round}</span>
          </div>
          <h2 className="font-playfair text-4xl font-bold text-gold mb-2">
            Раунд пройден!
          </h2>
          <p className="text-gray-500 mb-8 font-oswald font-light">
            Отличная работа! Готов к следующему?
          </p>

          <div className="card-cinema rounded p-8 mb-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-gold font-playfair font-bold text-3xl">{roundScore}</div>
                <div className="text-gray-600 text-xs uppercase tracking-wider">за раунд</div>
              </div>
              <div>
                <div className="text-white font-playfair font-bold text-3xl">{totalScore}</div>
                <div className="text-gray-600 text-xs uppercase tracking-wider">всего очков</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  {[1,2,3].map(i => (
                    <span key={i} className="text-lg" style={{
                      filter: i <= lives ? 'none' : 'grayscale(1) opacity(0.2)',
                    }}>❤️</span>
                  ))}
                </div>
                <div className="text-gray-600 text-xs uppercase tracking-wider mt-1">жизни</div>
              </div>
            </div>
            {totalScore > stats.bestScore && totalScore > 0 && (
              <div className="text-gold text-sm font-oswald mb-2 flex items-center justify-center gap-2">
                <Icon name="TrendingUp" size={16} /> Новый рекорд!
              </div>
            )}
          </div>

          {newAchievements.length > 0 && (
            <div className="mb-6">
              <p className="text-gold text-sm mb-3 uppercase tracking-wider">Новые достижения</p>
              {newAchievements.map(id => {
                const ach = achievements.find(a => a.id === id);
                return ach ? (
                  <div key={id} className="achievement-badge unlocked p-3 rounded flex items-center gap-3 mb-2">
                    <span className="text-xl">{ach.icon}</span>
                    <div className="text-left">
                      <div className="text-gold text-sm font-semibold">{ach.title}</div>
                      <div className="text-gray-500 text-xs">{ach.description}</div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleNextRound} className="btn-cinema flex-1 py-3 rounded-sm text-sm animate-gold-pulse">
              <span className="flex items-center justify-center gap-2">
                <Icon name="ArrowRight" size={16} />
                Раунд {round + 1}
              </span>
            </button>
            <button onClick={handleFinish} className="flex-1 py-3 rounded-sm text-sm border border-white/10 text-gray-400 hover:border-gold/30 hover:text-gold transition-all font-oswald tracking-wider">
              В меню
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="text-6xl mb-6">💀</div>
          <h2 className="font-playfair text-4xl font-bold mb-2" style={{ color: '#e53e3e' }}>
            Игра окончена
          </h2>
          <p className="text-gray-500 mb-8 font-oswald font-light">
            Ты потерял все жизни
          </p>

          <div className="card-cinema rounded p-8 mb-8">
            <div className="text-7xl font-playfair font-black text-gold mb-2">{totalScore}</div>
            <div className="text-gray-500 text-sm uppercase tracking-widest mb-6">очков набрано</div>
            {totalScore > stats.bestScore && totalScore > 0 && (
              <div className="text-gold text-sm font-oswald mb-4 flex items-center justify-center gap-2">
                <Icon name="TrendingUp" size={16} /> Новый рекорд!
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-white font-bold text-xl">{round}</div>
                <div className="text-gray-600 text-xs uppercase tracking-wider">{round === 1 ? 'раунд' : round < 5 ? 'раунда' : 'раундов'}</div>
              </div>
              <div>
                <div className="text-white font-bold text-xl">{round * QUESTIONS_PER_ROUND - (QUESTIONS_PER_ROUND - currentIndex - 1)}</div>
                <div className="text-gray-600 text-xs uppercase tracking-wider">вопросов</div>
              </div>
            </div>
          </div>

          {newAchievements.length > 0 && (
            <div className="mb-6">
              <p className="text-gold text-sm mb-3 uppercase tracking-wider">Новые достижения</p>
              {newAchievements.map(id => {
                const ach = achievements.find(a => a.id === id);
                return ach ? (
                  <div key={id} className="achievement-badge unlocked p-3 rounded flex items-center gap-3 mb-2">
                    <span className="text-xl">{ach.icon}</span>
                    <div className="text-left">
                      <div className="text-gold text-sm font-semibold">{ach.title}</div>
                      <div className="text-gray-500 text-xs">{ach.description}</div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleRestart} className="btn-cinema flex-1 py-3 rounded-sm text-sm">
              Сыграть ещё
            </button>
            <button onClick={handleFinish} className="flex-1 py-3 rounded-sm text-sm border border-white/10 text-gray-400 hover:border-gold/30 hover:text-gold transition-all font-oswald tracking-wider">
              В меню
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        {showAchievement && (
          <div className="fixed top-20 right-6 z-50 animate-slide-in-right achievement-badge unlocked px-4 py-3 rounded flex items-center gap-3">
            <span>🏅</span>
            <div>
              <div className="text-gold text-xs uppercase tracking-wider">Достижение!</div>
              <div className="text-white text-sm font-semibold">{showAchievement}</div>
            </div>
          </div>
        )}

        <div className="py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1,2,3].map(i => (
              <span key={i} className="text-xl transition-all" style={{
                filter: i <= lives ? 'none' : 'grayscale(1) opacity(0.2)',
                transform: i <= lives ? 'scale(1)' : 'scale(0.8)',
              }}>
                ❤️
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider font-oswald" style={{
              background: 'rgba(212,168,67,0.1)',
              border: '1px solid rgba(212,168,67,0.2)',
              color: '#d4a843',
            }}>
              Раунд {round}
            </div>
            <div className="text-gray-500 text-sm font-oswald tracking-wider">
              <span className="text-white">{currentIndex + 1}</span> / {queue.length}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <div className="flex items-center gap-1 px-2 py-1 rounded" style={{
                background: 'rgba(212,168,67,0.06)',
                border: '1px solid rgba(212,168,67,0.15)',
              }}>
                <Icon name="Trophy" size={12} className="text-gold" />
                <span className="text-gold font-bold font-oswald text-xs">{(user.solo_rating || 0) + totalScore}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1 rounded" style={{
              background: 'rgba(212,168,67,0.1)',
              border: '1px solid rgba(212,168,67,0.25)',
            }}>
              <Icon name="Star" size={14} className="text-gold" />
              <span className="text-gold font-bold font-oswald">{totalScore}</span>
            </div>
          </div>
        </div>

        <div className="progress-cinema mb-6 rounded-full overflow-hidden">
          <div className="progress-cinema-fill rounded-full" style={{ width: `${progress}%` }} />
        </div>

        <div className={`film-strip rounded-sm overflow-hidden mb-6 ${shakeCard ? 'animate-shake' : ''}`} style={{
          aspectRatio: '16/9',
          position: 'relative',
        }}>
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
              <div className="animate-pulse text-gray-700">
                <Icon name="Film" size={48} />
              </div>
            </div>
          )}
          <img
            key={current.id + '-' + round}
            src={current.imageUrl}
            alt="Угадай фильм"
            className="w-full h-full object-cover animate-fade-in"
            style={{
              filter: 'brightness(0.85) contrast(1.05) saturate(0.9)',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4) 100%)',
          }} />
          <div className="absolute top-4 right-10 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider font-oswald" style={{
            background: current.difficulty === 'easy' ? 'rgba(34,197,94,0.2)' : current.difficulty === 'medium' ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)',
            color: current.difficulty === 'easy' ? '#4ade80' : current.difficulty === 'medium' ? '#facc15' : '#f87171',
            border: `1px solid ${current.difficulty === 'easy' ? 'rgba(34,197,94,0.3)' : current.difficulty === 'medium' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {current.difficulty === 'easy' ? 'Лёгкий' : current.difficulty === 'medium' ? 'Средний' : 'Сложный'}
          </div>
          <div className="absolute top-4 left-10 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider font-oswald" style={{
            background: 'rgba(0,0,0,0.5)',
            color: '#888',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {current.genre}
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm uppercase tracking-[0.3em] font-oswald mb-6">
          Что это за фильм?
        </p>

        <div className="grid grid-cols-1 gap-3">
          {current.options.map((option, i) => {
            let className = 'btn-answer';
            if (gameState === 'answered') {
              if (i === current.correctIndex) className += ' correct';
              else if (i === selectedAnswer) className += ' wrong';
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={gameState === 'answered'}
                className={`${className} w-full px-6 py-4 rounded-sm flex items-center gap-4`}
              >
                <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold font-oswald" style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-oswald text-sm tracking-wide">{option}</span>
                {gameState === 'answered' && i === current.correctIndex && (
                  <Icon name="Check" size={16} className="ml-auto text-green-400" />
                )}
                {gameState === 'answered' && i === selectedAnswer && i !== current.correctIndex && (
                  <Icon name="X" size={16} className="ml-auto text-red-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}