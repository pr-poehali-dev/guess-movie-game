import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface LobbyPageProps {
  onCreateRoom: () => Promise<string | null>;
  onJoinRoom: (code: string) => Promise<boolean>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export default function LobbyPage({ onCreateRoom, onJoinRoom, onBack, loading, error }: LobbyPageProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [code, setCode] = useState('');

  const handleCreate = async () => {
    setMode('create');
    await onCreateRoom();
  };

  const handleJoin = async () => {
    if (code.trim().length < 4) return;
    await onJoinRoom(code.trim());
  };

  if (mode === 'choose') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="max-w-md w-full animate-fade-in-up">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, transparent, #d4a843)' }} />
              <span className="text-gold text-xs tracking-[0.4em] uppercase font-oswald">Сетевая игра</span>
              <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, transparent, #d4a843)' }} />
            </div>
            <h1 className="font-playfair text-4xl font-bold text-gradient-gold mb-3">
              Дуэль
            </h1>
            <p className="text-gray-500 font-oswald font-light text-sm">
              Создай комнату или введи код друга
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="card-cinema rounded p-6 w-full text-left group hover:border-gold/30 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(212,168,67,0.06) 0%, transparent 70%)',
              }} />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded flex items-center justify-center shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(212,168,67,0.15), rgba(212,168,67,0.05))',
                  border: '1px solid rgba(212,168,67,0.2)',
                }}>
                  <Icon name="Plus" size={22} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-playfair text-xl font-bold text-white group-hover:text-gold transition-colors">
                    Создать комнату
                  </h3>
                  <p className="text-gray-500 text-xs font-oswald font-light">
                    Получишь код — отправь другу
                  </p>
                </div>
                <Icon name="ArrowRight" size={18} className="text-gray-600 ml-auto group-hover:text-gold group-hover:translate-x-1 transition-all" />
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="card-cinema rounded p-6 w-full text-left group hover:border-gold/30 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(212,168,67,0.06) 0%, transparent 70%)',
              }} />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded flex items-center justify-center shrink-0" style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <Icon name="LogIn" size={22} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="font-playfair text-xl font-bold text-white group-hover:text-gold transition-colors">
                    Присоединиться
                  </h3>
                  <p className="text-gray-500 text-xs font-oswald font-light">
                    Введи код комнаты друга
                  </p>
                </div>
                <Icon name="ArrowRight" size={18} className="text-gray-600 ml-auto group-hover:text-gold group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded text-center text-sm font-oswald" style={{
              background: 'rgba(229,62,62,0.1)',
              border: '1px solid rgba(229,62,62,0.3)',
              color: '#e53e3e',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={onBack}
            className="mt-6 w-full py-3 text-sm text-gray-500 hover:text-gold transition-colors font-oswald tracking-wider"
          >
            <span className="flex items-center justify-center gap-2">
              <Icon name="ArrowLeft" size={14} />
              Назад
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="max-w-md w-full animate-fade-in-up">
          <div className="text-center mb-10">
            <div className="text-4xl mb-4">🎟️</div>
            <h2 className="font-playfair text-3xl font-bold text-gradient-gold mb-2">
              Введи код комнаты
            </h2>
            <p className="text-gray-500 font-oswald font-light text-sm">
              Попроси код у того, кто создал комнату
            </p>
          </div>

          <div className="card-cinema rounded p-6 mb-4">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="w-full text-center text-3xl font-oswald tracking-[0.5em] py-4 bg-transparent border-b-2 border-white/10 focus:border-gold/50 outline-none text-white placeholder:text-gray-700 transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded text-center text-sm font-oswald" style={{
              background: 'rgba(229,62,62,0.1)',
              border: '1px solid rgba(229,62,62,0.3)',
              color: '#e53e3e',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading || code.trim().length < 4}
            className="btn-cinema w-full py-4 rounded-sm text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Подключение...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Icon name="LogIn" size={16} />
                Войти в комнату
              </span>
            )}
          </button>

          <button
            onClick={() => { setMode('choose'); setCode(''); }}
            className="mt-4 w-full py-3 text-sm text-gray-500 hover:text-gold transition-colors font-oswald tracking-wider"
          >
            <span className="flex items-center justify-center gap-2">
              <Icon name="ArrowLeft" size={14} />
              Назад
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
      <div className="max-w-md w-full text-center animate-fade-in">
        <div className="text-5xl mb-6 animate-pulse">🎬</div>
        <h2 className="font-playfair text-2xl font-bold text-gradient-gold mb-3">
          Создаём комнату...
        </h2>
        <p className="text-gray-500 font-oswald font-light text-sm mb-6">
          Подбираем кадры для викторины
        </p>
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />

        {error && (
          <div className="mt-6 p-3 rounded text-center text-sm font-oswald" style={{
            background: 'rgba(229,62,62,0.1)',
            border: '1px solid rgba(229,62,62,0.3)',
            color: '#e53e3e',
          }}>
            {error}
            <button
              onClick={() => setMode('choose')}
              className="block mx-auto mt-3 text-gray-400 hover:text-gold transition-colors"
            >
              Назад
            </button>
          </div>
        )}
      </div>
    </div>
  );
}