import { GameStats } from '@/pages/Index';
import { achievements } from '@/data/movies';
import { useTmdbImages } from '@/hooks/useTmdbImages';
import Icon from '@/components/ui/icon';

interface HomePageProps {
  onStart: () => void;
  stats: GameStats;
}

export default function HomePage({ onStart, stats }: HomePageProps) {
  const unlockedCount = stats.unlockedAchievements.length;
  const { movies } = useTmdbImages();

  return (
    <div className="min-h-screen pt-20 pb-16 px-6">
      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center py-16 md:py-24">
        {/* Film reel decoration */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in-up">
          <div className="h-px flex-1 max-w-24" style={{ background: 'linear-gradient(to right, transparent, #d4a843)' }} />
          <span className="text-gold text-xs tracking-[0.4em] uppercase font-oswald">Кинотеатр</span>
          <div className="h-px flex-1 max-w-24" style={{ background: 'linear-gradient(to left, transparent, #d4a843)' }} />
        </div>

        <h1
          className="font-playfair font-black mb-4 animate-fade-in-up delay-100"
          style={{
            fontSize: 'clamp(2.5rem, 7vw, 5rem)',
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, #f5e6c8 0%, #d4a843 50%, #9a7830 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Угадай фильм
          <br />
          <em style={{ fontStyle: 'italic' }}>по кадру</em>
        </h1>

        <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto animate-fade-in-up delay-200 font-oswald font-light tracking-wide">
          Проверь свои знания кино. 3 жизни, каждый правильный ответ — 1 очко.
          Открывай достижения и покоряй рейтинг.
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up delay-300">
          <button
            onClick={onStart}
            className="btn-cinema px-12 py-4 text-base rounded-sm animate-gold-pulse"
          >
            <span className="flex items-center gap-3">
              <Icon name="Play" size={18} />
              Начать игру
            </span>
          </button>
        </div>

        {/* Stats mini */}
        {stats.gamesPlayed > 0 && (
          <div className="mt-8 flex items-center justify-center gap-8 animate-fade-in-up delay-400">
            <div className="text-center">
              <div className="text-gold font-playfair font-bold text-2xl">{stats.bestScore}</div>
              <div className="text-gray-600 text-xs uppercase tracking-wider">Рекорд</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-gold font-playfair font-bold text-2xl">{stats.gamesPlayed}</div>
              <div className="text-gray-600 text-xs uppercase tracking-wider">Игр сыграно</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-gold font-playfair font-bold text-2xl">{unlockedCount}</div>
              <div className="text-gray-600 text-xs uppercase tracking-wider">Достижений</div>
            </div>
          </div>
        )}
      </div>

      {/* Film strip */}
      <div className="max-w-6xl mx-auto mb-16 animate-fade-in-up delay-300">
        <div className="film-strip rounded overflow-hidden" style={{ height: '180px', padding: '0 36px' }}>
          <div className="flex gap-1 h-full items-center overflow-hidden">
            {movies.slice(0, 6).map((m, i) => (
              <div key={i} className="flex-shrink-0 h-36 w-48 overflow-hidden" style={{
                filter: 'brightness(0.6) sepia(0.2)',
                border: '1px solid #1a1a1a',
              }}>
                <img src={m.imageUrl} alt={m.title} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to play */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="font-playfair text-2xl text-center mb-8 text-gradient-gold animate-fade-in-up">Как играть</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '🎬', title: 'Смотри кадр', text: 'Тебе показывают кадр из известного фильма' },
            { icon: '🎯', title: 'Выбирай ответ', text: '4 варианта — только один правильный' },
            { icon: '❤️', title: '3 жизни', text: 'За ошибку — минус жизнь. Не потеряй все три!' },
          ].map((item, i) => (
            <div key={i} className={`card-cinema p-6 rounded text-center animate-fade-in-up delay-${(i+2)*100}`}>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="font-playfair text-lg text-gold mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm font-oswald font-light">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements preview */}
      <div className="max-w-4xl mx-auto">
        <h2 className="font-playfair text-2xl text-center mb-8 text-gradient-gold">Достижения</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {achievements.map((ach) => {
            const unlocked = stats.unlockedAchievements.includes(ach.id);
            return (
              <div key={ach.id} className={`achievement-badge p-4 rounded flex items-center gap-3 ${unlocked ? 'unlocked' : ''}`}>
                <div className="text-2xl" style={{ filter: unlocked ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                  {ach.icon}
                </div>
                <div>
                  <div className={`text-sm font-semibold font-oswald ${unlocked ? 'text-gold' : 'text-gray-600'}`}>
                    {ach.title}
                  </div>
                  <div className="text-[11px] text-gray-600 font-oswald font-light">{ach.description}</div>
                </div>
                {unlocked && (
                  <Icon name="Check" size={14} className="text-gold ml-auto flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}