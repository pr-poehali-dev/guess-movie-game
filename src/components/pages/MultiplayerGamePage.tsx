import { useState, useEffect, useRef } from 'react';
import { RoomState } from '@/hooks/useMultiplayer';
import { useAuth } from '@/hooks/useAuth';
import Icon from '@/components/ui/icon';

interface MultiplayerGamePageProps {
  roomState: RoomState;
  onAnswer: (answer: number) => void;
  onReady: () => void;
  onLeave: () => void;
  roomId: string;
}

export default function MultiplayerGamePage({ roomState, onAnswer, onReady, onLeave, roomId }: MultiplayerGamePageProps) {
  const { isAuthenticated, updateStats: updateServerStats, user } = useAuth();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const lastQuestionRef = useRef(-1);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);
  const answerSentRef = useRef(false);
  const [frozenQuestion, setFrozenQuestion] = useState<RoomState['question'] | null>(null);
  const prevQuestionRef = useRef<RoomState['question'] | null>(null);
  const [contentVisible, setContentVisible] = useState(true);
  const statsSentRef = useRef(false);

  useEffect(() => {
    if (roomState.current_question !== lastQuestionRef.current) {
      if (lastQuestionRef.current >= 0 && roomState.last_result) {
        setFrozenQuestion(prevQuestionRef.current);
        setShowResult(true);
        const wasCorrect = roomState.my_player === 1
          ? roomState.last_result.player1_correct
          : roomState.last_result.player2_correct;
        if (!wasCorrect) {
          setShakeCard(true);
          setTimeout(() => setShakeCard(false), 600);
        }
        resultTimerRef.current = setTimeout(() => {
          setContentVisible(false);
          setTimeout(() => {
            setShowResult(false);
            setFrozenQuestion(null);
            setSelectedAnswer(null);
            answerSentRef.current = false;
            setImageLoaded(false);
            setContentVisible(true);
          }, 300);
        }, 1600);
      } else {
        setSelectedAnswer(null);
        answerSentRef.current = false;
        setImageLoaded(false);
        setShowResult(false);
        setFrozenQuestion(null);
        setContentVisible(true);
      }
      lastQuestionRef.current = roomState.current_question;
    }
  }, [roomState.current_question, roomState.last_result, roomState.my_player]);

  useEffect(() => {
    if (roomState.question) {
      prevQuestionRef.current = roomState.question;
      if (showResult && roomState.question.image_url) {
        const img = new Image();
        img.src = roomState.question.image_url;
      }
    }
  }, [roomState.current_question, showResult, roomState.question]);

  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || answerSentRef.current || showResult) return;
    answerSentRef.current = true;
    setSelectedAnswer(index);
    onAnswer(index);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isMe1 = roomState.my_player === 1;
  const myLives = isMe1 ? roomState.player1_lives : roomState.player2_lives;
  const opponentLives = isMe1 ? roomState.player2_lives : roomState.player1_lives;
  const myScore = isMe1 ? roomState.player1_score : roomState.player2_score;
  const opponentScore = isMe1 ? roomState.player2_score : roomState.player1_score;
  const myName = isMe1 ? roomState.player1_name : (roomState.player2_name || 'Игрок 2');
  const opponentName = isMe1 ? (roomState.player2_name || 'Игрок 2') : roomState.player1_name;

  useEffect(() => {
    if (roomState.status === 'finished' && isAuthenticated && !statsSentRef.current) {
      statsSentRef.current = true;
      const iWon = (isMe1 && roomState.winner === 'player1') || (!isMe1 && roomState.winner === 'player2');
      const isDraw = roomState.winner === 'draw';
      const winnerLivesCount = roomState.winner === 'player1'
        ? roomState.player1_lives
        : roomState.winner === 'player2'
          ? roomState.player2_lives
          : 0;
      updateServerStats({
        score: myScore,
        result: isDraw ? 'draw' : iWon ? 'win' : 'loss',
        game_type: 'multiplayer',
        opponent_name: opponentName,
        room_id: roomId,
        winner_lives: roomState.ranked ? winnerLivesCount : 0,
      }).catch(() => {});
    }
  }, [roomState.status, roomState.winner, isAuthenticated, isMe1, myScore, opponentName, roomId, updateServerStats, roomState.player1_lives, roomState.player2_lives, roomState.ranked]);

  if (roomState.status === 'waiting') {
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

  if (roomState.status === 'ready_check') {
    const myReady = isMe1 ? roomState.player1_ready : roomState.player2_ready;
    const opponentReady = isMe1 ? roomState.player2_ready : roomState.player1_ready;

    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center animate-fade-in-up">
          <div className="text-5xl mb-6">⚔️</div>
          <h2 className="font-playfair text-3xl font-bold text-gradient-gold mb-2">
            Соперник найден!
          </h2>
          <p className="text-gray-500 font-oswald font-light text-sm mb-8">
            Подтвердите готовность к игре
          </p>

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

            {roomState.ranked && (
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

  if (roomState.status === 'finished') {
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

  // Playing state — use frozen question during result display to keep previous frame visible
  const question = (showResult && frozenQuestion) ? frozenQuestion : roomState.question;
  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-pulse">🎬</div>
          <p className="text-gold font-oswald tracking-widest text-sm uppercase">Загружаем вопрос...</p>
        </div>
      </div>
    );
  }

  const timePercent = roomState.both_answered ? 0 : (roomState.time_left / 10) * 100;
  const timeUrgent = !roomState.both_answered && roomState.time_left <= 3;

  const progress = ((roomState.current_question) / roomState.total_questions) * 100;

  const lastResult = showResult ? roomState.last_result : null;
  const myLastAnswer = lastResult
    ? (isMe1 ? lastResult.player1_answer : lastResult.player2_answer)
    : null;
  const myLastCorrect = lastResult
    ? (isMe1 ? lastResult.player1_correct : lastResult.player2_correct)
    : null;

  return (
    <div className={`min-h-screen pt-20 pb-24 px-4 ${shakeCard ? 'animate-shake' : ''}`}>
      {/* Scoreboard */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex items-center justify-between gap-2 px-2">
          {/* My info */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1,2,3].map(i => (
                <span key={i} className="text-sm" style={{
                  filter: i <= myLives ? 'none' : 'grayscale(1) opacity(0.2)',
                }}>❤️</span>
              ))}
            </div>
            <span className="text-white text-xs font-oswald">{myName}</span>
            <span className="text-gold font-oswald font-bold">{myScore}</span>
          </div>

          {/* Round */}
          <div className="text-center">
            <span className="text-gray-500 text-xs font-oswald uppercase tracking-wider">
              {roomState.current_question + 1}/{roomState.total_questions}
            </span>
          </div>

          {/* Opponent info */}
          <div className="flex items-center gap-2">
            <span className="text-gold font-oswald font-bold">{opponentScore}</span>
            <span className="text-white text-xs font-oswald">{opponentName}</span>
            <div className="flex gap-0.5">
              {[1,2,3].map(i => (
                <span key={i} className="text-sm" style={{
                  filter: i <= opponentLives ? 'none' : 'grayscale(1) opacity(0.2)',
                }}>❤️</span>
              ))}
            </div>
          </div>
        </div>

        {isAuthenticated && user && roomState.ranked && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="text-[10px] font-oswald uppercase tracking-wider text-gray-500">Рейтинг</span>
            <span className="text-xs font-oswald font-bold" style={{ color: '#a78bfa' }}>{user.online_rating ?? 50}</span>
          </div>
        )}
        {!roomState.ranked && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="text-[10px] font-oswald uppercase tracking-wider text-gray-500">Товарищеская игра</span>
          </div>
        )}

        {/* Timer */}
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${timePercent}%`,
              background: timeUrgent
                ? 'linear-gradient(90deg, #e53e3e, #fc4e4e)'
                : 'linear-gradient(90deg, #d4a843, #f0c050)',
              boxShadow: timeUrgent ? '0 0 8px rgba(229,62,62,0.5)' : '0 0 8px rgba(212,168,67,0.3)',
            }}
          />
        </div>

        {/* Progress dots */}
        <div className="mt-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{
            width: `${progress}%`,
            background: 'rgba(212,168,67,0.3)',
          }} />
        </div>
      </div>

      {/* Result overlay */}
      {showResult && lastResult && (
        <div className="max-w-2xl mx-auto mb-4 animate-fade-in" style={{
          opacity: contentVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}>
          <div className="card-cinema rounded p-3 text-center animate-result-glow" style={{
            borderColor: myLastCorrect ? 'rgba(72,187,120,0.3)' : 'rgba(229,62,62,0.3)',
          }}>
            <div className="text-sm font-oswald">
              <span className={myLastCorrect ? 'text-green-400' : 'text-red-400'}>
                {myLastCorrect ? 'Верно!' : 'Неверно!'}
              </span>
              <span className="text-gray-500 mx-2">|</span>
              <span className="text-gray-400">{lastResult.correct_title}</span>
            </div>
          </div>
        </div>
      )}

      {/* Image */}
      <div className="max-w-2xl mx-auto mb-6" style={{
        opacity: contentVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        <div className="film-strip relative rounded overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-4xl animate-pulse">🎬</span>
            </div>
          )}
          <img
            src={question.image_url}
            alt="Movie frame"
            className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-oswald uppercase tracking-wider" style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#d4a843',
            border: '1px solid rgba(212,168,67,0.2)',
          }}>
            {question.genre}
          </div>
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-oswald uppercase tracking-wider" style={{
            background: question.difficulty === 'easy' ? 'rgba(72,187,120,0.2)' : question.difficulty === 'hard' ? 'rgba(229,62,62,0.2)' : 'rgba(212,168,67,0.2)',
            color: question.difficulty === 'easy' ? '#48bb78' : question.difficulty === 'hard' ? '#e53e3e' : '#d4a843',
            border: `1px solid ${question.difficulty === 'easy' ? 'rgba(72,187,120,0.3)' : question.difficulty === 'hard' ? 'rgba(229,62,62,0.3)' : 'rgba(212,168,67,0.3)'}`,
          }}>
            {question.difficulty === 'easy' ? 'Легко' : question.difficulty === 'hard' ? 'Сложно' : 'Средне'}
          </div>

          {/* Answered overlay */}
          {(answerSentRef.current || selectedAnswer !== null) && !showResult && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 animate-fade-in">
              <div className="text-center">
                {roomState.both_answered ? (
                  <>
                    <Icon name="CheckCheck" size={32} className="text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-oswald text-sm tracking-wider">Оба ответили!</p>
                  </>
                ) : (
                  <>
                    <Icon name="Clock" size={32} className="text-gold mx-auto mb-2" />
                    <p className="text-gold font-oswald text-sm tracking-wider">Ждём ответ соперника...</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="max-w-2xl mx-auto mb-4 text-center" style={{
        opacity: contentVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        <p className="font-playfair text-xl text-white">
          Какой это фильм?
        </p>
      </div>

      {/* Answers */}
      <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3" style={{
        opacity: contentVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        {question.options.map((option, idx) => {
          const letters = ['A', 'B', 'C', 'D'];
          const isSelected = selectedAnswer === idx;
          const isAnswered = answerSentRef.current || selectedAnswer !== null;
          const showResultColor = showResult && lastResult;
          const isCorrectAnswer = showResultColor && idx === lastResult.correct_index;
          const isMyWrong = showResultColor && idx === myLastAnswer && !myLastCorrect;

          let borderColor = 'rgba(255,255,255,0.06)';
          let bgColor = 'rgba(17,17,17,0.8)';
          if (showResultColor && isCorrectAnswer) {
            borderColor = 'rgba(72,187,120,0.5)';
            bgColor = 'rgba(72,187,120,0.1)';
          } else if (showResultColor && isMyWrong) {
            borderColor = 'rgba(229,62,62,0.5)';
            bgColor = 'rgba(229,62,62,0.1)';
          } else if (isSelected) {
            borderColor = 'rgba(212,168,67,0.5)';
            bgColor = 'rgba(212,168,67,0.08)';
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={isAnswered && !showResult}
              className="btn-answer p-4 rounded flex items-center gap-3 text-left transition-all duration-300"
              style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
                opacity: isAnswered && !isSelected && !showResult ? 0.4 : 1,
                transitionDelay: `${idx * 0.05}s`,
              }}
            >
              <span className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-xs font-oswald" style={{
                background: isSelected ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isSelected ? 'rgba(212,168,67,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: isSelected ? '#d4a843' : '#666',
              }}>
                {letters[idx]}
              </span>
              <span className={`font-oswald text-sm ${isSelected ? 'text-gold' : 'text-gray-300'}`}>
                {option}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}