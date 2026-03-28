import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface MultiplayerWaitingProps {
  roomId: string;
  onLeave: () => void;
}

export default function MultiplayerWaiting({ roomId, onLeave }: MultiplayerWaitingProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
      <div className="max-w-md w-full text-center animate-fade-in-up">
        <div className="text-5xl mb-6 animate-pulse">🎬</div>
        <h2 className="font-playfair text-3xl font-bold text-gradient-gold mb-2">
          Ожидание соперника
        </h2>
        <p className="text-gray-500 font-oswald font-light text-sm mb-8">
          Отправь код другу, чтобы он присоединился
        </p>

        <div className="card-cinema rounded p-6 mb-6">
          <div className="text-gray-500 text-xs uppercase tracking-wider font-oswald mb-3">
            Код комнаты
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-gold font-oswald text-4xl tracking-[0.4em] font-bold">
              {roomId}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded hover:bg-white/5 transition-colors"
              title="Скопировать"
            >
              <Icon name={copied ? 'Check' : 'Copy'} size={20} className={copied ? 'text-green-400' : 'text-gray-500'} />
            </button>
          </div>
          {copied && (
            <div className="text-green-400 text-xs font-oswald mt-2">Скопировано!</div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-gray-500 text-sm font-oswald">Ждём второго игрока...</span>
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        <button
          onClick={onLeave}
          className="py-3 px-8 text-sm text-gray-500 hover:text-gold transition-colors font-oswald tracking-wider border border-white/10 rounded-sm hover:border-gold/30"
        >
          Отменить
        </button>
      </div>
    </div>
  );
}
