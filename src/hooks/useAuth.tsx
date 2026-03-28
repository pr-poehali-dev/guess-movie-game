import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import funcUrls from '../../backend/func2url.json';

const API_URL = (funcUrls as Record<string, string>)['vk-auth'] || '';
const SESSION_KEY = 'kinovikto_session';

export interface VkUser {
  id: number;
  vk_id: number;
  first_name: string;
  last_name: string;
  photo_url: string;
  total_score: number;
  games_played: number;
  best_score: number;
  wins: number;
  losses: number;
  draws: number;
  perfect_rounds: number;
}

export interface VkFriend {
  vk_id: number;
  first_name: string;
  last_name: string;
  photo_url: string;
  is_player: boolean;
  stats: {
    total_score: number;
    games_played: number;
    best_score: number;
    wins: number;
    losses: number;
    draws: number;
    perfect_rounds: number;
  } | null;
}

interface UpdateStatsData {
  score: number;
  result: string;
  game_type: string;
  opponent_name?: string;
  room_id?: string;
}

interface AuthContextValue {
  user: VkUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  handleCallback: (code: string) => Promise<boolean>;
  updateStats: (data: UpdateStatsData) => Promise<void>;
  fetchFriends: () => Promise<VkFriend[]>;
  isAuthenticated: boolean;
}

async function apiCall(action: string, data: Record<string, unknown> = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Request failed');
  }
  return json;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  handleCallback: async () => false,
  updateStats: async () => {},
  fetchFriends: async () => [],
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VkUser | null>(null);
  const [loading, setLoading] = useState(true);

  const getSessionToken = () => localStorage.getItem(SESSION_KEY);

  const handleCallback = useCallback(async (code: string): Promise<boolean> => {
    const data = await apiCall('callback', {
      code,
      redirect_uri: window.location.origin,
    });
    localStorage.setItem(SESSION_KEY, data.session_token);
    setUser(data.user);
    return true;
  }, []);

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        try {
          await handleCallback(code);
          window.history.replaceState({}, '', window.location.pathname);
        } catch (_) {
          localStorage.removeItem(SESSION_KEY);
        }
        setLoading(false);
        return;
      }

      const token = getSessionToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiCall('me', { session_token: token });
        setUser(data.user);
      } catch (_) {
        localStorage.removeItem(SESSION_KEY);
      }
      setLoading(false);
    };

    init();
  }, [handleCallback]);

  const login = useCallback(() => {
    apiCall('get_auth_url', {
      redirect_uri: window.location.origin,
    }).then((data) => {
      window.location.href = data.auth_url;
    });
  }, []);

  const logout = useCallback(async () => {
    const token = getSessionToken();
    if (token) {
      await apiCall('logout', { session_token: token });
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const updateStats = useCallback(async (data: UpdateStatsData) => {
    const token = getSessionToken();
    if (!token) return;
    const response = await apiCall('update_stats', {
      session_token: token,
      ...data,
    });
    setUser(response.user);
  }, []);

  const fetchFriends = useCallback(async (): Promise<VkFriend[]> => {
    const token = getSessionToken();
    if (!token) return [];
    const data = await apiCall('friends', { session_token: token });
    return data.friends;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    handleCallback,
    updateStats,
    fetchFriends,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default useAuth;
