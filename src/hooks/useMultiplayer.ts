import { useState, useEffect, useCallback, useRef } from 'react';
import { movies } from '@/data/movies';
import funcUrls from '../../backend/func2url.json';

const API_URL = funcUrls['game-room'] || '';
const MOVIE_IMAGES_URL = funcUrls['movie-images'] || '';
const POLL_INTERVAL = 2500;
const QUESTIONS_COUNT = 10;

export interface RoomState {
  room_id: string;
  status: 'waiting' | 'playing' | 'finished';
  my_player: 1 | 2;
  player1_name: string;
  player2_name: string | null;
  player1_lives: number;
  player2_lives: number;
  player1_score: number;
  player2_score: number;
  current_question: number;
  total_questions: number;
  time_left: number;
  question: {
    movie_id: number;
    image_url: string;
    options: string[];
    genre: string;
    difficulty: string;
  } | null;
  last_result: {
    correct_index: number;
    correct_title: string;
    player1_answer: number;
    player2_answer: number;
    player1_correct: boolean;
    player2_correct: boolean;
  } | null;
  winner: string | null;
  i_answered: boolean;
  opponent_answered: boolean;
  both_answered: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchS3Images(): Promise<Record<string, string[]>> {
  try {
    const resp = await fetch(`${MOVIE_IMAGES_URL}?all=1`);
    if (!resp.ok) return {};
    const data = await resp.json();
    return data.images || {};
  } catch {
    return {};
  }
}

interface QuestionData {
  movie_id: number;
  title: string;
  image_url: string;
  options: string[];
  correct_index: number;
  genre: string;
  difficulty: string;
}

async function prepareQuestions(): Promise<QuestionData[]> {
  const s3Images = await fetchS3Images();
  const shuffled = shuffle([...movies]).slice(0, QUESTIONS_COUNT);
  return shuffled.map(m => {
    const s3 = s3Images[String(m.id)] || [];
    const imageUrl = s3.length > 0 ? pickRandom(s3) : m.imageUrl;
    return {
      movie_id: m.id,
      title: m.title,
      image_url: imageUrl,
      options: m.options,
      correct_index: m.correctIndex,
      genre: m.genre,
      difficulty: m.difficulty,
    };
  });
}

function getPlayerId(): string {
  let id = localStorage.getItem('kinovikto_player_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('kinovikto_player_id', id);
  }
  return id;
}

export function useMultiplayer() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef(getPlayerId());

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollRoom = useCallback(async (rid: string) => {
    try {
      const resp = await fetch(`${API_URL}?room_id=${rid}&player_id=${playerIdRef.current}`, {
        headers: { 'X-Player-Id': playerIdRef.current },
      });
      if (resp.status === 402) {
        setError('Сервер временно недоступен — лимит запросов. Попробуйте позже.');
        stopPolling();
        return;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || 'Ошибка загрузки');
        return;
      }
      const data = await resp.json();
      setRoomState(data);
      if (data.status === 'finished') {
        stopPolling();
      }
    } catch {
      console.error('Fetch error: Failed to fetch for', API_URL);
    }
  }, [stopPolling]);

  const startPolling = useCallback((rid: string) => {
    stopPolling();
    pollRoom(rid);
    pollingRef.current = setInterval(() => pollRoom(rid), POLL_INTERVAL);
  }, [pollRoom, stopPolling]);

  const createRoom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL) {
        setError('Сервер недоступен, попробуйте позже');
        return null;
      }
      const questions = await prepareQuestions();
      const playerName = localStorage.getItem('kinovikto_name') || 'Игрок 1';

      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          player_name: playerName,
          player_id: playerIdRef.current,
          questions,
        }),
      });
      if (resp.status === 402) {
        setError('Сервер временно недоступен — лимит запросов. Попробуйте позже.');
        return null;
      }
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Ошибка создания');
        return null;
      }
      setRoomId(data.room_id);
      startPolling(data.room_id);
      return data.room_id;
    } catch {
      setError('Ошибка сети');
      return null;
    } finally {
      setLoading(false);
    }
  }, [startPolling]);

  const joinRoom = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const playerName = localStorage.getItem('kinovikto_name') || 'Игрок 2';

      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          room_id: code.toUpperCase().trim(),
          player_name: playerName,
          player_id: playerIdRef.current,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Ошибка подключения');
        return false;
      }
      setRoomId(data.room_id);
      startPolling(data.room_id);
      return true;
    } catch {
      setError('Ошибка сети');
      return false;
    } finally {
      setLoading(false);
    }
  }, [startPolling]);

  const submitAnswer = useCallback(async (answer: number) => {
    if (!roomId) return;
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Player-Id': playerIdRef.current,
        },
        body: JSON.stringify({
          action: 'answer',
          room_id: roomId,
          answer,
          player_id: playerIdRef.current,
        }),
      });
      if (roomId) {
        pollRoom(roomId);
      }
    } catch {
      // silent
    }
  }, [roomId, pollRoom]);

  const findMatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_URL) {
        setError('Сервер недоступен, попробуйте позже');
        return null;
      }
      const questions = await prepareQuestions();
      const playerName = localStorage.getItem('kinovikto_name') || 'Игрок';

      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'matchmaking',
          player_name: playerName,
          player_id: playerIdRef.current,
          questions,
        }),
      });
      if (resp.status === 402) {
        setError('Сервер временно недоступен — лимит запросов. Попробуйте позже.');
        return null;
      }
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Ошибка поиска');
        return null;
      }
      setRoomId(data.room_id);
      startPolling(data.room_id);
      return data.room_id;
    } catch {
      setError('Ошибка сети');
      return null;
    } finally {
      setLoading(false);
    }
  }, [startPolling]);

  const leaveRoom = useCallback(() => {
    stopPolling();
    setRoomState(null);
    setRoomId(null);
    setError(null);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    roomState,
    loading,
    error,
    roomId,
    createRoom,
    joinRoom,
    findMatch,
    submitAnswer,
    leaveRoom,
    setError,
  };
}

export default useMultiplayer;