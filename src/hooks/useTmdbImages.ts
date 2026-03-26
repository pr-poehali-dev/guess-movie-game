import { useState, useEffect } from 'react';
import { movies, Movie } from '@/data/movies';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useTmdbImages() {
  const [loadedMovies, setLoadedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const selected = shuffle(movies.filter(m => m.imageUrl)).slice(0, 10);
    setLoadedMovies(selected);
    setLoading(false);
  }, []);

  return { movies: loadedMovies, loading };
}

export function useHomeImages() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const sample = shuffle(movies.filter(m => m.imageUrl)).slice(0, 6);
    setImages(sample.map(m => m.imageUrl));
  }, []);

  return images;
}
