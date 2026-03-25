import { useState, useEffect } from 'react';
import { movies, Movie, TMDB_API, TMDB_IMG, getApiKey } from '@/data/movies';

const imageCache: Record<number, string> = {};

// Случайный элемент из массива с seed по tmdbId (чтобы не менялся при перерендере)
function pickRandom<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

async function fetchStill(tmdbId: number): Promise<string> {
  if (imageCache[tmdbId]) return imageCache[tmdbId];

  // include_image_language=null даёт все backdrops без фильтра по языку
  const res = await fetch(
    `${TMDB_API}/movie/${tmdbId}/images?api_key=${getApiKey()}&include_image_language=en,null`
  );
  const data = await res.json();

  // backdrops — это кадры из фильма (широкоформатные сцены), НЕ постеры
  const backdrops: { file_path: string; vote_average: number }[] = data.backdrops || [];

  let url = '';
  if (backdrops.length > 0) {
    // Сортируем по рейтингу и берём случайный из топ-5 (не первый — часто лого)
    const sorted = [...backdrops].sort((a, b) => b.vote_average - a.vote_average);
    const topPool = sorted.slice(0, Math.min(5, sorted.length));
    const pick = pickRandom(topPool, tmdbId);
    url = `${TMDB_IMG}${pick.file_path}`;
  }

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
            const url = await fetchStill(movie.tmdbId);
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
