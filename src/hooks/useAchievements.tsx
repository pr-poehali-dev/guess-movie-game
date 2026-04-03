import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import funcUrls from '../../backend/func2url.json';

const API_URL = (funcUrls as Record<string, string>)['vk-auth'] || '';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  requirement: number;
  sort_order: number;
  is_active: boolean;
}

interface AchievementsContextValue {
  achievements: AchievementDef[];
  loading: boolean;
}

const AchievementsContext = createContext<AchievementsContextValue>({
  achievements: [],
  loading: true,
});

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const [achievements, setAchievements] = useState<AchievementDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_achievements' }),
    })
      .then(r => r.json())
      .then(data => {
        const active = (data.achievements || []).filter((a: AchievementDef) => a.is_active);
        setAchievements(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AchievementsContext.Provider value={{ achievements, loading }}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  return useContext(AchievementsContext);
}

export default useAchievements;
