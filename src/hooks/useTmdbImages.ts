import { useState, useEffect } from 'react';
import { movies, Movie, TMDB_API, TMDB_IMG, getApiKey } from '@/data/movies';

const imageCache: Record<number, string> = {};

async function fetchBackdrop(tmdbId: number): Promise<string> {
  if (imageCache[tmdbId]) return imageCache[tmdbId];

  const res = await fetch(
    `${TMDB_API}/movie/${tmdbId}/images?api_key=${getApiKey()}`
  );
  const data = await res.json();
  const backdrops: { file_path: string }[] = data.backdrops || [];
  const pick = backdrops[1] ?? backdrops[0];
  const url = pick ? `${TMDB_IMG}${pick.file_path}` : '';
  imageCache[tmdbId] = url;
  return url;
}

export function useTmdbImages() {
  const [loadedMovies, setLoadedMovies] = useState<Movie[]>(movies);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const results = await Promise.all(
        movies.map(async (movie) => {
          try {
            const url = await fetchBackdrop(movie.tmdbId);
            return { ...movie, imageUrl: url };
          } catch {
            return movie;
          }
        })
      );
      if (!cancelled) {
        setLoadedMovies(results);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { movies: loadedMovies, loading };
}
