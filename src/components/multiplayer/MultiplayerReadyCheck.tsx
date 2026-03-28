import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';

interface MultiplayerReadyCheckProps {
  myName: string;
  opponentName: string;
  myReady: boolean;
  opponentReady: boolean;
  ranked: boolean;
  onReady: () => void;
  onLeave: () => void;
}

export default function MultiplayerReadyCheck({
  myName, opponentName, myReady, opponentReady, ranked, onReady, onLeave,
}: MultiplayerReadyCheckProps) {
  const [readyTimer, setReadyTimer] = useState(30);
  const readyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setReadyTimer(30);
    if (readyTimerRef.current) clearInterval(readyTimerRef.current);
    readyTimerRef.current = setInterval(() => {
      setReadyTimer(prev => {
        if (prev <= 1) {
          if (readyTimerRef.current) clearInterval(readyTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (readyTimerRef.current) clearInterval(readyTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
      <div className="max-w-md w-full text-center animate-fade-in-up">
        <div className="text-5xl mb-6">⚔️</div>
        <h2 className="font-playfair text-3xl font-bold text-gradient-gold mb-2">
          Соперник найден!
        </h2>
        <p className="text-gray-500 font-oswald font-light text-sm mb-2">
          Подтвердите готовность к игре
        </p>
        <div className="mb-6">
          <span className="font-oswald text-sm" style={{ color: readyTimer <= 10 ? '#f87171' : '#666' }}>
            {readyTimer > 0 ? `0:${readyTimer.toString().padStart(2, '0')}` : 'Время вышло'}
          </span>
        </div>

        <div className="card-cinema rounded p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <div className="text-white font-oswald text-sm mb-2 truncate">{myName}</div>
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl transition-all duration-300" style={{
                background: myReady ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${myReady ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.1)'}`,
              }}>
                {myReady ? '✅' : '⏳'}
              </div>
              <div className="text-xs font-oswald mt-2" style={{ color: myReady ? '#4ade80' : '#666' }}>
                {myReady ? 'Готов' : 'Не готов'}
              </div>
            </div>

            <div className="text-center">
              <span className="text-gray-600 font-oswald text-lg">VS</span>
            </div>

            <div className="text-center">
              <div className="text-white font-oswald text-sm mb-2 truncate">{opponentName}</div>
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl transition-all duration-300" style={{
                background: opponentReady ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${opponentReady ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.1)'}`,
              }}>
                {opponentReady ? '✅' : '⏳'}
              </div>
              <div className="text-xs font-oswald mt-2" style={{ color: opponentReady ? '#4ade80' : '#666' }}>
                {opponentReady ? 'Готов' : 'Ожидание...'}
              </div>
            </div>
          </div>

          {ranked && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(147,51,234,0.15)' }}>
              <span className="text-[10px] font-oswald uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                Рейтинговая игра
              </span>
            </div>
          )}
        </div>

        {!myReady ? (
          <button
            onClick={onReady}
            className="w-full py-4 rounded-sm text-sm font-oswald tracking-wider font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.1))',
              border: '1px solid rgba(74,222,128,0.4)',
              color: '#4ade80',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <Icon name="Check" size={18} />
              Готов!
            </span>
          </button>
        ) : (
          <div className="py-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm font-oswald">Ждём соперника...</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        )}

        <button
          onClick={onLeave}
          className="mt-4 py-3 px-8 text-sm text-gray-500 hover:text-red-400 transition-colors font-oswald tracking-wider"
        >
          Отменить
        </button>
      </div>
    </div>
  );
}
