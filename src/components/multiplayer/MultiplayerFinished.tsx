import { RoomState } from '@/hooks/useMultiplayer';
import Icon from '@/components/ui/icon';

interface MultiplayerFinishedProps {
  roomState: RoomState;
  isMe1: boolean;
  myName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  myLives: number;
  opponentLives: number;
  isAuthenticated: boolean;
  onLeave: () => void;
}

export default function MultiplayerFinished({
  roomState, isMe1, myName, opponentName, myScore, opponentScore,
  myLives, opponentLives, isAuthenticated, onLeave,
}: MultiplayerFinishedProps) {
  if (roomState.winner === 'timeout') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="text-5xl mb-6">⏰</div>
          <h2 className="font-playfair text-3xl font-bold text-gradient-gold mb-2">
            Время вышло
          </h2>
          <p className="text-gray-500 font-oswald font-light text-sm mb-8">
            Не все игроки подтвердили готовность
          </p>
          <button
            onClick={onLeave}
            className="btn-cinema w-full py-3 rounded-sm text-sm"
          >
            <span className="flex items-center justify-center gap-2">
              <Icon name="Home" size={16} />
              В меню
            </span>
          </button>
        </div>
      </div>
    );
  }

  const iWon = (isMe1 && roomState.winner === 'player1') || (!isMe1 && roomState.winner === 'player2');
  const isDraw = roomState.winner === 'draw';
  const winnerLivesCount = roomState.winner === 'player1'
    ? roomState.player1_lives
    : roomState.winner === 'player2'
      ? roomState.player2_lives
      : 0;
  const ratingChange = isDraw ? 0 : iWon ? winnerLivesCount : -winnerLivesCount;

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
      <div className="max-w-md w-full text-center animate-scale-in">
        <div className="text-6xl mb-6">
          {isDraw ? '🤝' : iWon ? '🏆' : '😔'}
        </div>
        <h2 className="font-playfair text-4xl font-bold text-gradient-gold mb-2">
          {isDraw ? 'Ничья!' : iWon ? 'Победа!' : 'Поражение'}
        </h2>
        <p className="text-gray-500 mb-4 font-oswald font-light">
          {isDraw ? 'Достойная битва!' : iWon ? 'Ты настоящий киноман!' : 'В следующий раз повезёт!'}
        </p>

        {isAuthenticated && roomState.ranked && ratingChange !== 0 && (
          <div className="mb-6 py-2 px-4 rounded-sm inline-block font-oswald text-sm tracking-wider" style={{
            background: ratingChange > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${ratingChange > 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: ratingChange > 0 ? '#4ade80' : '#f87171',
          }}>
            Сетевой рейтинг: {ratingChange > 0 ? '+' : ''}{ratingChange}
          </div>
        )}

        <div className="card-cinema rounded p-6 mb-8">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 font-oswald uppercase tracking-wider mb-1">
                {myName}
              </div>
              <div className={`font-playfair font-bold text-2xl ${iWon || isDraw ? 'text-gold' : 'text-gray-400'}`}>
                {myScore}
              </div>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1,2,3].map(i => (
                  <span key={i} className="text-sm" style={{
                    filter: i <= myLives ? 'none' : 'grayscale(1) opacity(0.2)',
                  }}>❤️</span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <span className="text-gray-600 font-oswald text-lg">VS</span>
            </div>

            <div className="text-center">
              <div className="text-xs text-gray-500 font-oswald uppercase tracking-wider mb-1">
                {opponentName}
              </div>
              <div className={`font-playfair font-bold text-2xl ${!iWon && !isDraw ? 'text-gold' : 'text-gray-400'}`}>
                {opponentScore}
              </div>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1,2,3].map(i => (
                  <span key={i} className="text-sm" style={{
                    filter: i <= opponentLives ? 'none' : 'grayscale(1) opacity(0.2)',
                  }}>❤️</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onLeave}
          className="btn-cinema w-full py-3 rounded-sm text-sm"
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="Home" size={16} />
            В меню
          </span>
        </button>
      </div>
    </div>
  );
}
