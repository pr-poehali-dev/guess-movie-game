import { GameStats } from '@/pages/Index';
import { useAuth } from '@/hooks/useAuth';
import Icon from '@/components/ui/icon';

type NavPage = 'home' | 'mode-select' | 'leaderboard' | 'settings' | 'profile';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  stats: GameStats;
}

export default function Navigation({ currentPage, onNavigate, stats }: NavigationProps) {
  const { user, isAuthenticated, login, loading } = useAuth();
  const isGameActive = ['mode-select', 'game', 'lobby', 'multiplayer'].includes(currentPage);

  const navItems: { id: NavPage; label: string; icon: string }[] = [
    { id: 'home', label: 'Главная', icon: 'Home' },
    { id: 'mode-select', label: 'Игра', icon: 'Play' },
    { id: 'leaderboard', label: 'Рейтинг', icon: 'Trophy' },
    { id: 'settings', label: 'Настройки', icon: 'Settings' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 animate-fade-in" style={{
      background: 'linear-gradient(to bottom, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.85) 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(10px)',
    }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="w-8 h-8 flex items-center justify-center rounded" style={{
            background: 'linear-gradient(135deg, #d4a843, #9a7830)',
          }}>
            <span style={{ fontSize: '16px' }}>🎬</span>
          </div>
          <div>
            <span className="text-gold font-playfair font-bold text-lg leading-none block">
              КиноВикторина
            </span>
            <span className="text-[10px] tracking-[0.2em] text-gray-600 uppercase">
              Угадай фильм по кадру
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${
                currentPage === item.id || (item.id === 'mode-select' && isGameActive) ? 'active' : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded" style={{
            background: 'rgba(212,168,67,0.08)',
            border: '1px solid rgba(212,168,67,0.2)',
          }}>
            <Icon name="Star" size={14} className="text-gold" />
            <span className="text-gold font-oswald font-semibold text-sm">
              {isAuthenticated && user ? user.total_score : stats.totalScore}
            </span>
            <span className="text-gray-600 text-xs">очков</span>
          </div>

          {loading ? (
            <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
          ) : isAuthenticated && user ? (
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 transition-all hover:opacity-80"
            >
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.first_name}
                  className="w-9 h-9 rounded-full object-cover"
                  style={{
                    border: currentPage === 'profile' ? '2px solid #d4a843' : '2px solid rgba(255,255,255,0.15)',
                  }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #d4a843, #9a7830)',
                    color: '#0a0a0a',
                  }}
                >
                  {user.first_name[0]}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-oswald tracking-wider transition-all"
              style={{
                background: '#4a76a8',
                color: '#fff',
                border: '1px solid rgba(74,118,168,0.6)',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>VK</span>
              <span className="hidden sm:inline">Войти</span>
            </button>
          )}
        </div>
      </div>

      <div className="md:hidden flex border-t border-white/5">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] uppercase tracking-wider transition-all ${
              currentPage === item.id || (item.id === 'mode-select' && isGameActive) ? 'text-gold' : 'text-gray-600'
            }`}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
        {isAuthenticated && user && (
          <button
            onClick={() => onNavigate('profile')}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] uppercase tracking-wider transition-all ${
              currentPage === 'profile' ? 'text-gold' : 'text-gray-600'
            }`}
          >
            {user.photo_url ? (
              <img src={user.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <Icon name="User" size={16} />
            )}
            Профиль
          </button>
        )}
      </div>
    </header>
  );
}