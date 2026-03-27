import { useState, useEffect, useCallback, useRef } from 'react';
import { movies, Movie } from '@/data/movies';
import funcUrls from '../../backend/func2url.json';

const MOVIE_IMAGES_URL = funcUrls['movie-images'];

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

async function fetchAllImages(): Promise<Record<string, string[]>> {
  try {
    const resp = await fetch(`${MOVIE_IMAGES_URL}?all=1`);
    if (!resp.ok) return {};
    const data = await resp.json();
    return data.images || {};
  } catch {
    return {};
  }
}

function applyImages(movieList: Movie[], s3Images: Record<string, string[]>): Movie[] {
  return movieList.map(m => {
    const s3 = s3Images[String(m.id)] || [];
    if (s3.length > 0) {
      return { ...m, images: s3, imageUrl: pickRandom(s3) };
    }
    return m;
  });
}

export function useTmdbImages() {
  const [loadedMovies, setLoadedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllImages().then(s3Images => {
      const withImages = applyImages(movies, s3Images);
      const selected = shuffle(withImages.filter(m => m.imageUrl)).slice(0, 10);
      setLoadedMovies(selected);
      setLoading(false);
    });
  }, []);

  return { movies: loadedMovies, loading };
}

export function useRoundBasedImages() {
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const usedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    fetchAllImages().then(s3Images => {
      const withImages = applyImages(movies, s3Images).filter(m => m.imageUrl);
      setAllMovies(withImages);
      setLoading(false);
    });
  }, []);

  const getNewBatch = useCallback((count = 10): Movie[] => {
    let available = allMovies.filter(m => !usedIdsRef.current.has(m.id));
    if (available.length < count) {
      usedIdsRef.current.clear();
      available = [...allMovies];
    }
    const batch = shuffle(available).slice(0, count).map(m => {
      const s3 = m.images || [];
      if (s3.length > 0) {
        return { ...m, imageUrl: pickRandom(s3) };
      }
      return m;
    });
    batch.forEach(m => usedIdsRef.current.add(m.id));
    return batch;
  }, [allMovies]);

  const resetUsed = useCallback(() => {
    usedIdsRef.current.clear();
  }, []);

  return { loading, getNewBatch, resetUsed };
}

export function useHomeImages() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    fetchAllImages().then(s3Images => {
      const withImages = applyImages(movies, s3Images);
      const sample = shuffle(withImages.filter(m => m.imageUrl)).slice(0, 6);
      setImages(sample.map(m => m.imageUrl));
    });
  }, []);

  return images;
}
