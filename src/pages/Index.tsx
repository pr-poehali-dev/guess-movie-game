import { useState, useEffect } from 'react';
import HomePage from '@/components/pages/HomePage';
import ModeSelectPage from '@/components/pages/ModeSelectPage';
import GamePage from '@/components/pages/GamePage';
import LeaderboardPage from '@/components/pages/LeaderboardPage';
import SettingsPage from '@/components/pages/SettingsPage';
import LobbyPage from '@/components/pages/LobbyPage';
import MultiplayerGamePage from '@/components/pages/MultiplayerGamePage';
import ProfilePage from '@/components/pages/ProfilePage';
import Navigation from '@/components/Navigation';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { useAuth } from '@/hooks/useAuth';

export type Page = 'home' | 'mode-select' | 'game' | 'leaderboard' | 'settings' | 'lobby' | 'multiplayer' | 'profile';

export interface GameStats {
  totalScore: number;
  gamesPlayed: number;
  bestScore: number;
  unlockedAchievements: string[];
  perfectRounds: number;
}

const defaultStats: GameStats = {
  totalScore: 0,
  gamesPlayed: 0,
  bestScore: 0,
  unlockedAchievements: [],
  perfectRounds: 0,
};

export default function Index() {
  const [page, setPage] = useState<Page>('home');
  const { user, isAuthenticated, updateStats: updateServerStats } = useAuth();
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem('kinovikto_stats');
      return saved ? JSON.parse(saved) : defaultStats;
    } catch { return defaultStats; }
  });

  const [leaderboard, setLeaderboard] = useState<{name: string; score: number; date: string}[]>(() => {
    try {
      const saved = localStorage.getItem('kinovikto_leaderboard');
      return saved ? JSON.parse(saved) : [
        { name: 'Синефил', score: 28, date: '2024-12-01' },
        { name: 'Кинокритик', score: 22, date: '2024-12-05' },
        { name: 'Мастер кино', score: 18, date: '2024-12-10' },
        { name: 'Любитель', score: 12, date: '2024-12-15' },
        { name: 'Новичок', score: 7, date: '2024-12-20' },
      ];
    } catch { return []; }
  });

  const multiplayer = useMultiplayer();

  useEffect(() => {
    if (isAuthenticated && user) {
      const vkName = `${user.first_name} ${user.last_name}`.trim();
      if (vkName) {
        localStorage.setItem('kinovikto_name', vkName);
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    localStorage.setItem('kinovikto_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('kinovikto_leaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  const updateStats = (newScore: number, perfectRound: boolean, newAchievements: string[]) => {
    setStats(prev => {
      const updated = {
        ...prev,
        totalScore: prev.totalScore + newScore,
        gamesPlayed: prev.gamesPlayed + 1,
        bestScore: Math.max(prev.bestScore, newScore),
        perfectRounds: prev.perfectRounds + (perfectRound ? 1 : 0),
        unlockedAchievements: [...new Set([...prev.unlockedAchievements, ...newAchievements])],
      };
      return updated;
    });

    const playerName = localStorage.getItem('kinovikto_name') || 'Игрок';
    if (newScore > 0) {
      setLeaderboard(prev => {
        const updated = [...prev, { name: playerName, score: newScore, date: new Date().toISOString().split('T')[0] }]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        return updated;
      });
    }

    if (isAuthenticated) {
      updateServerStats({
        score: newScore,
        result: perfectRound ? 'win' : 'draw',
        game_type: 'solo',
      }).catch(() => {});
    }

    setPage('home');
  };

  const handleMultiplayerCreate = async () => {
    const rid = await multiplayer.createRoom();
    if (rid) {
      setPage('multiplayer');
    }
    return rid;
  };

  const handleFindMatch = async () => {
    const rid = await multiplayer.findMatch();
    if (rid) {
      setPage('multiplayer');
    }
    return rid;
  };

  const handleMultiplayerJoin = async (code: string) => {
    const ok = await multiplayer.joinRoom(code);
    if (ok) {
      setPage('multiplayer');
    }
    return ok;
  };

  const handleMultiplayerLeave = () => {
    multiplayer.leaveRoom();
    setPage('mode-select');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative" style={{ fontFamily: 'Oswald, sans-serif' }}>
      <div className="projector-beam" />
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50" style={{
        background: 'linear-gradient(90deg, transparent, #d4a843 20%, #f0c050 50%, #d4a843 80%, transparent)',
        boxShadow: '0 0 10px rgba(212,168,67,0.5)',
      }} />
      <Navigation currentPage={page} onNavigate={(p) => setPage(p as Page)} stats={stats} />
      <main className="relative z-10">
        {page === 'home' && <HomePage onStart={() => setPage('mode-select')} stats={stats} />}
        {page === 'mode-select' && (
          <ModeSelectPage
            onSelectSolo={() => setPage('game')}
            onSelectMultiplayer={() => setPage('lobby')}
          />
        )}
        {page === 'game' && <GamePage onFinish={updateStats} stats={stats} />}
        {page === 'lobby' && (
          <LobbyPage
            onCreateRoom={handleMultiplayerCreate}
            onJoinRoom={handleMultiplayerJoin}
            onFindMatch={handleFindMatch}
            onBack={() => setPage('mode-select')}
            loading={multiplayer.loading}
            error={multiplayer.error}
            isAuthenticated={isAuthenticated}
          />
        )}
        {page === 'multiplayer' && multiplayer.roomState && multiplayer.roomId ? (
          <MultiplayerGamePage
            roomState={multiplayer.roomState}
            onAnswer={multiplayer.submitAnswer}
            onLeave={handleMultiplayerLeave}
            roomId={multiplayer.roomId}
          />
        ) : page === 'multiplayer' && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="text-5xl mb-4 animate-pulse">🎬</div>
              <p className="text-gold font-oswald tracking-widest text-sm uppercase">Подключение...</p>
            </div>
          </div>
        )}
        {page === 'leaderboard' && <LeaderboardPage leaderboard={leaderboard} stats={stats} />}
        {page === 'profile' && <ProfilePage />}
        {page === 'settings' && <SettingsPage stats={stats} onResetStats={() => setStats(defaultStats)} />}
      </main>
    </div>
  );
}