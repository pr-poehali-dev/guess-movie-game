import { useEffect, useRef } from 'react';
import { RoomState } from '@/hooks/useMultiplayer';
import { useAuth } from '@/hooks/useAuth';
import MultiplayerWaiting from '@/components/multiplayer/MultiplayerWaiting';
import MultiplayerReadyCheck from '@/components/multiplayer/MultiplayerReadyCheck';
import MultiplayerFinished from '@/components/multiplayer/MultiplayerFinished';
import MultiplayerPlaying from '@/components/multiplayer/MultiplayerPlaying';

interface MultiplayerGamePageProps {
  roomState: RoomState;
  onAnswer: (answer: number) => void;
  onReady: () => void;
  onLeave: () => void;
  roomId: string;
}

export default function MultiplayerGamePage({ roomState, onAnswer, onReady, onLeave, roomId }: MultiplayerGamePageProps) {
  const { isAuthenticated, updateStats: updateServerStats } = useAuth();
  const statsSentRef = useRef(false);

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
    return <MultiplayerWaiting roomId={roomId} onLeave={onLeave} />;
  }

  if (roomState.status === 'ready_check') {
    const myReady = isMe1 ? roomState.player1_ready : roomState.player2_ready;
    const opponentReady = isMe1 ? roomState.player2_ready : roomState.player1_ready;

    return (
      <MultiplayerReadyCheck
        myName={myName}
        opponentName={opponentName}
        myReady={myReady}
        opponentReady={opponentReady}
        ranked={roomState.ranked}
        onReady={onReady}
        onLeave={onLeave}
      />
    );
  }

  if (roomState.status === 'finished') {
    return (
      <MultiplayerFinished
        roomState={roomState}
        isMe1={isMe1}
        myName={myName}
        opponentName={opponentName}
        myScore={myScore}
        opponentScore={opponentScore}
        myLives={myLives}
        opponentLives={opponentLives}
        isAuthenticated={isAuthenticated}
        onLeave={onLeave}
      />
    );
  }

  return (
    <MultiplayerPlaying
      roomState={roomState}
      isMe1={isMe1}
      myName={myName}
      opponentName={opponentName}
      myScore={myScore}
      opponentScore={opponentScore}
      myLives={myLives}
      opponentLives={opponentLives}
      onAnswer={onAnswer}
    />
  );
}
