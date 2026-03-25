import { useState, useEffect, useCallback } from 'react';
import { achievements } from '@/data/movies';
import { useTmdbImages } from '@/hooks/useTmdbImages';
import { GameStats } from '@/pages/Index';
import Icon from '@/components/ui/icon';

interface GamePageProps {
  onFinish: (score: number, perfect: boolean, achievements: string[]) => void;
  stats: GameStats;
}

type GameState = 'playing' | 'answered' | 'gameover' | 'finished';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GamePage({ onFinish, stats }: GamePageProps) {
  const { movies, loading: moviesLoading } = useTmdbImages();
  const [queue, setQueue] = useState(() => shuffle(movies).slice(0, 10));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [lostLives, setLostLives] = useState(0);

  useEffect(() => {
    if (!moviesLoading) {
      setQueue(shuffle(movies).slice(0, 10));
    }
  }, [moviesLoading]);

  const current = queue[currentIndex];

  const checkAchievements = useCallback((newScore: number, perfect: boolean, prevUnlocked: string[]) => {
    const earned: string[] = [];
    for (const ach of achievements) {
      if (prevUnlocked.includes(ach.id)) continue;
      if (ach.type === 'score' && newScore >= ach.requirement) earned.push(ach.id);
      if (ach.type === 'perfect' && perfect) earned.push(ach.id);
    }
    return earned;
  }, []);

  const handleAnswer = (index: number) => {
    if (gameState !== 'playing') return;
    setSelectedAnswer(index);
    setGameState('answered');

    if (index === current.correctIndex) {
      const newScore = score + 1;
      setScore(newScore);
      const earned = checkAchievements(newScore, lostLives === 0, stats.unlockedAchievements);
      if (earned.length > 0) {
        setNewAchievements(prev => [...prev, ...earned]);
        const achData = achievements.find(a => a.id === earned[0]);
        if (achData) setShowAchievement(achData.title + ' ' + achData.icon);
        setTimeout(() => setShowAchievement(null), 3000);
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
        setGameState('finished');
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setGameState('playing');
        setImageLoaded(false);
      }
    }, 1500);
  };

  const handleFinish = () => {
    const perfect = lostLives === 0 && score > 0;
    const earned = checkAchievements(score, perfect, stats.unlockedAchievements);
    const allEarned = [...new Set([...newAchievements, ...earned])];
    onFinish(score, perfect, allEarned);
  };

  const handleRestart = () => {
    setQueue(shuffle(movies).slice(0, 10));
    setCurrentIndex(0);
    setLives(3);
    setScore(0);
    setGameState('playing');
    setSelectedAnswer(null);
    setImageLoaded(false);
    setNewAchievements([]);
    setLostLives(0);
  };

  const progress = ((currentIndex) / queue.length) * 100;

  if (moviesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-pulse">🎬</div>
          <p className="text-gold font-oswald tracking-widest text-sm uppercase">Загружаем кадры из фильмов...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover' || gameState === 'finished') {
    const isWin = gameState === 'finished';
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="text-6xl mb-6">{isWin ? '🏆' : '💀'}</div>
          <h2 className="font-playfair text-4xl font-bold mb-2" style={{
            color: isWin ? '#d4a843' : '#e53e3e',
          }}>
            {isWin ? 'Раунд завершён!' : 'Игра окончена'}
          </h2>
          <p className="text-gray-500 mb-8 font-oswald font-light">
            {isWin ? 'Ты прошёл все вопросы!' : 'Ты потерял все жизни'}
          </p>

          <div className="card-cinema rounded p-8 mb-8">
            <div className="text-7xl font-playfair font-black text-gold mb-2">{score}</div>
            <div className="text-gray-500 text-sm uppercase tracking-widest mb-6">очков набрано</div>
            {score > stats.bestScore && score > 0 && (
              <div className="text-gold text-sm font-oswald mb-4 flex items-center justify-center gap-2">
                <Icon name="TrendingUp" size={16} /> Новый рекорд!
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-white font-bold text-xl">{queue.length - currentIndex === 0 ? queue.length : currentIndex}</div>
                <div className="text-gray-600 text-xs uppercase tracking-wider">вопросов</div>
              </div>
              <div>
                <div className="text-white font-bold text-xl">{lives}</div>
                <div className="text-gray-600 text-xs uppercase tracking-wider">жизней осталось</div>
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
        {/* Achievement popup */}
        {showAchievement && (
          <div className="fixed top-20 right-6 z-50 animate-slide-in-right achievement-badge unlocked px-4 py-3 rounded flex items-center gap-3">
            <span>🏅</span>
            <div>
              <div className="text-gold text-xs uppercase tracking-wider">Достижение!</div>
              <div className="text-white text-sm font-semibold">{showAchievement}</div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="py-6 flex items-center justify-between">
          {/* Lives */}
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

          {/* Question counter */}
          <div className="text-gray-500 text-sm font-oswald tracking-wider">
            <span className="text-white">{currentIndex + 1}</span> / {queue.length}
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 px-3 py-1 rounded" style={{
            background: 'rgba(212,168,67,0.1)',
            border: '1px solid rgba(212,168,67,0.25)',
          }}>
            <Icon name="Star" size={14} className="text-gold" />
            <span className="text-gold font-bold font-oswald">{score}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-cinema mb-6 rounded-full overflow-hidden">
          <div className="progress-cinema-fill rounded-full" style={{ width: `${progress}%` }} />
        </div>

        {/* Movie frame */}
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
            key={current.id}
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
          {/* Film overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4) 100%)',
          }} />
          {/* Difficulty badge */}
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

        {/* Question */}
        <p className="text-center text-gray-400 text-sm uppercase tracking-[0.3em] font-oswald mb-6">
          Что это за фильм?
        </p>

        {/* Answers */}
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