import { useState, useEffect } from 'react';
import HomePage from '@/components/pages/HomePage';
import GamePage from '@/components/pages/GamePage';
import LeaderboardPage from '@/components/pages/LeaderboardPage';
import SettingsPage from '@/components/pages/SettingsPage';
import Navigation from '@/components/Navigation';

export type Page = 'home' | 'game' | 'leaderboard' | 'settings';

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
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative" style={{ fontFamily: 'Oswald, sans-serif' }}>
      <div className="projector-beam" />
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50" style={{
        background: 'linear-gradient(90deg, transparent, #d4a843 20%, #f0c050 50%, #d4a843 80%, transparent)',
        boxShadow: '0 0 10px rgba(212,168,67,0.5)',
      }} />
      <Navigation currentPage={page} onNavigate={setPage} stats={stats} />
      <main className="relative z-10">
        {page === 'home' && <HomePage onStart={() => setPage('game')} stats={stats} />}
        {page === 'game' && <GamePage onFinish={updateStats} stats={stats} />}
        {page === 'leaderboard' && <LeaderboardPage leaderboard={leaderboard} stats={stats} />}
        {page === 'settings' && <SettingsPage stats={stats} onResetStats={() => setStats(defaultStats)} />}
      </main>
    </div>
  );
}
