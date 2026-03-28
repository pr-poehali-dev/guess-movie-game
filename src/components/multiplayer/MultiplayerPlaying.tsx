import { useState, useEffect, useRef } from 'react';
import { RoomState } from '@/hooks/useMultiplayer';
import { useAuth } from '@/hooks/useAuth';
import Icon from '@/components/ui/icon';

interface MultiplayerPlayingProps {
  roomState: RoomState;
  isMe1: boolean;
  myName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  myLives: number;
  opponentLives: number;
  onAnswer: (answer: number) => void;
}

export default function MultiplayerPlaying({
  roomState, isMe1, myName, opponentName, myScore, opponentScore,
  myLives, opponentLives, onAnswer,
}: MultiplayerPlayingProps) {
  const { isAuthenticated, user } = useAuth();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const lastQuestionRef = useRef(-1);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerSentRef = useRef(false);
  const [frozenQuestion, setFrozenQuestion] = useState<RoomState['question'] | null>(null);
  const prevQuestionRef = useRef<RoomState['question'] | null>(null);
  const [contentVisible, setContentVisible] = useState(true);

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
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex items-center justify-between gap-2 px-2">
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

          <div className="text-center">
            <span className="text-gray-500 text-xs font-oswald uppercase tracking-wider">
              {roomState.current_question + 1}/{roomState.total_questions}
            </span>
          </div>

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

        <div className="mt-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{
            width: `${progress}%`,
            background: 'rgba(212,168,67,0.3)',
          }} />
        </div>
      </div>

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

      <div className="max-w-2xl mx-auto mb-4 text-center" style={{
        opacity: contentVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        <p className="font-playfair text-xl text-white">
          Какой это фильм?
        </p>
      </div>

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
