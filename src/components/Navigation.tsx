import { Page, GameStats } from '@/pages/Index';
import Icon from '@/components/ui/icon';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  stats: GameStats;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: 'Главная', icon: 'Home' },
  { id: 'game', label: 'Игра', icon: 'Play' },
  { id: 'leaderboard', label: 'Рейтинг', icon: 'Trophy' },
  { id: 'settings', label: 'Настройки', icon: 'Settings' },
];

export default function Navigation({ currentPage, onNavigate, stats }: NavigationProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 animate-fade-in" style={{
      background: 'linear-gradient(to bottom, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.85) 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(10px)',
    }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
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

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Score badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{
          background: 'rgba(212,168,67,0.08)',
          border: '1px solid rgba(212,168,67,0.2)',
        }}>
          <Icon name="Star" size={14} className="text-gold" />
          <span className="text-gold font-oswald font-semibold text-sm">{stats.totalScore}</span>
          <span className="text-gray-600 text-xs">очков</span>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex border-t border-white/5">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] uppercase tracking-wider transition-all ${
              currentPage === item.id ? 'text-gold' : 'text-gray-600'
            }`}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}