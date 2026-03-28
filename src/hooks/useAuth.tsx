import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import funcUrls from '../../backend/func2url.json';

const API_URL = (funcUrls as Record<string, string>)['vk-auth'] || '';
const SESSION_KEY = 'kinovikto_session';
const VK_APP_ID = 54512733;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    VKIDSDK?: any;
  }
}

let vkidInitialized = false;

function getVKID() {
  return window.VKIDSDK;
}

function initVKID() {
  if (vkidInitialized) return;
  const VKID = getVKID();
  if (!VKID) return;
  vkidInitialized = true;
  VKID.Config.init({
    app: VK_APP_ID,
    redirectUrl: window.location.origin,
    responseMode: VKID.ConfigResponseMode.Redirect,
    source: VKID.ConfigSource.LOWCODE,
    scope: '',
  });
}

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
  solo_rating: number;
  online_rating: number;
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
  winner_lives?: number;
}

interface AuthContextValue {
  user: VkUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
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
  updateStats: async () => {},
  fetchFriends: async () => [],
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VkUser | null>(null);
  const [loading, setLoading] = useState(true);
  const processingRef = useRef(false);

  const getSessionToken = () => localStorage.getItem(SESSION_KEY);

  const loginWithToken = useCallback(async (accessToken: string, vkUserId?: number) => {
    const data = await apiCall('login_with_token', {
      access_token: accessToken,
      vk_user_id: vkUserId,
    });
    localStorage.setItem(SESSION_KEY, data.session_token);
    setUser(data.user);
  }, []);

  const handleVKCallback = useCallback(async () => {
    if (processingRef.current) return false;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const deviceId = params.get('device_id');

    if (!code || !deviceId) return false;

    processingRef.current = true;
    const VKID = getVKID();

    try {
      if (!VKID) throw new Error('VK ID SDK not loaded');
      initVKID();
      const tokenData = await VKID.Auth.exchangeCode(code, deviceId);
      await loginWithToken(tokenData.access_token, tokenData.user_id);
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      window.history.replaceState({}, '', window.location.pathname);
      return false;
    } finally {
      processingRef.current = false;
    }
  }, [loginWithToken]);

  useEffect(() => {
    initVKID();

    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const deviceId = params.get('device_id');

      if (code && deviceId) {
        await handleVKCallback();
        setLoading(false);
        return;
      }

      if (code && !deviceId) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      const token = getSessionToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiCall('me', { session_token: token });
        setUser(data.user);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
      setLoading(false);
    };

    init();
  }, [handleVKCallback]);

  const login = useCallback(() => {
    const VKID = getVKID();
    if (!VKID) return;
    initVKID();
    VKID.Auth.login();
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