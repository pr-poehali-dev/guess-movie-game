import { useState, useEffect, useRef } from 'react';
import { movies } from '@/data/movies';
import funcUrls from '../../backend/func2url.json';
import Icon from '@/components/ui/icon';

const MOVIE_IMAGES_URL = funcUrls['movie-images'];
const TMDB_API_KEY = 'e789191df94eb3e69769eb98236c09b6';
const IMAGES_PER_MOVIE = 8;

interface MovieImages {
  [movieId: string]: string[];
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function downloadViaWeserv(tmdbPath: string): Promise<string | null> {
  const originalUrl = `https://image.tmdb.org/t/p/w1280${tmdbPath}`;
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&w=1280&output=jpg&q=85`;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = proxyUrl;
  });
}

async function fetchTmdbBackdrops(tmdbId: number): Promise<string[]> {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${TMDB_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  const backdrops = (data.backdrops || [])
    .sort((a: { vote_average?: number }, b: { vote_average?: number }) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, IMAGES_PER_MOVIE);
  return backdrops.map((b: { file_path: string }) => b.file_path);
}

async function uploadToS3(movieId: number, base64: string, filename: string) {
  const resp = await fetch(MOVIE_IMAGES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie_id: movieId, image_base64: base64, filename }),
  });
  return resp.json();
}

async function deleteFromS3(movieId: number, filename: string) {
  const resp = await fetch(MOVIE_IMAGES_URL, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie_id: movieId, filename }),
  });
  return resp.json();
}

export default function AdminUpload() {
  const [allImages, setAllImages] = useState<MovieImages>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [bulkProgress, setBulkProgress] = useState<{
    done: number; total: number; current: string;
    ok: number; fail: number; imagesDone: number;
  } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const stopRef = useRef(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const loadImages = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const resp = await fetch(`${MOVIE_IMAGES_URL}?all=1`);
      const data = await resp.json();
      setAllImages(data.images || {});
    } catch (e) {
      console.error('Failed to load images', e);
    }
    if (showLoader) setLoading(false);
  };

  useEffect(() => { loadImages(true); }, []);

  const handleBulkUpload = async () => {
    const missing = movies.filter(m => (allImages[String(m.id)]?.length || 0) < IMAGES_PER_MOVIE);
    if (missing.length === 0) {
      alert('Все фильмы уже имеют по 8 кадров!');
      return;
    }
    stopRef.current = false;
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: missing.length, current: '', ok: 0, fail: 0, imagesDone: 0 });

    let ok = 0;
    let fail = 0;
    let totalImgs = 0;

    for (let i = 0; i < missing.length; i++) {
      if (stopRef.current) break;
      const m = missing[i];
      setBulkProgress({ done: i, total: missing.length, current: m.title, ok, fail, imagesDone: totalImgs });

      try {
        const paths = await fetchTmdbBackdrops(m.tmdbId);
        if (!paths.length) { fail++; continue; }

        let movieUploaded = 0;
        for (let j = 0; j < paths.length; j++) {
          if (stopRef.current) break;
          setBulkProgress({
            done: i, total: missing.length,
            current: `${m.title} (кадр ${j + 1}/${paths.length})`,
            ok, fail, imagesDone: totalImgs,
          });

          const b64 = await downloadViaWeserv(paths[j]);
          if (!b64) continue;

          const filename = `${j + 1}.jpg`;
          const resp = await uploadToS3(m.id, b64, filename);
          if (resp.url) {
            movieUploaded++;
            totalImgs++;
            setAllImages(prev => ({
              ...prev,
              [String(m.id)]: [...(prev[String(m.id)] || []), resp.url],
            }));
          }
        }
        if (movieUploaded > 0) ok++;
        else fail++;
      } catch (e) {
        console.error(`Error ${m.title}:`, e);
        fail++;
      }
    }

    setBulkProgress(null);
    setBulkRunning(false);
    alert(`Готово! Фильмов обработано: ${ok}, ошибок: ${fail}, кадров загружено: ${totalImgs}`);
  };

  const handleStop = () => { stopRef.current = true; };

  const handleFileUpload = async (movieId: number, files: FileList) => {
    setUploading(prev => ({ ...prev, [movieId]: true }));
    const existing = allImages[String(movieId)] || [];
    let nextNum = existing.length + 1;
    let uploaded = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} слишком большой. Максимум 5 МБ.`);
        continue;
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${nextNum}.${ext}`;
      nextNum++;

      try {
        const b64 = await toBase64(file);
        const resp = await uploadToS3(movieId, b64, filename);
        if (resp.url) {
          setAllImages(prev => ({
            ...prev,
            [String(movieId)]: [...(prev[String(movieId)] || []), resp.url],
          }));
          uploaded++;
        }
      } catch (e) {
        console.error('Upload error:', e);
        alert(`Не удалось загрузить ${file.name}`);
      }
    }
    setUploading(prev => ({ ...prev, [movieId]: false }));
  };

  const handleDelete = async (movieId: number, url: string) => {
    if (!confirm('Удалить этот кадр?')) return;
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    await deleteFromS3(movieId, filename);
    setAllImages(prev => ({
      ...prev,
      [String(movieId)]: (prev[String(movieId)] || []).filter(u => u !== url),
    }));
  };

  const moviesWithCount = movies.map(m => ({
    ...m,
    imageCount: (allImages[String(m.id)] || []).length,
    imagesList: allImages[String(m.id)] || [],
  }));

  const totalImages = Object.values(allImages).reduce((sum, arr) => sum + arr.length, 0);
  const moviesWithImages = Object.keys(allImages).filter(k => allImages[k].length > 0).length;
  const moviesComplete = Object.keys(allImages).filter(k => allImages[k].length >= IMAGES_PER_MOVIE).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎬</div>
          <p className="text-gold">Загружаю данные...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-gold mb-2">Управление кадрами</h1>
            <p className="text-gray-400 text-sm">
              {moviesComplete} из {movies.length} фильмов имеют 8+ кадров | {moviesWithImages} с кадрами | Всего {totalImages} кадров
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Нажмите «Загрузить из TMDB» для автоматической загрузки или перетащите файлы на карточку
            </p>
          </div>
          <a href="/" className="text-gray-400 hover:text-gold transition-colors">
            <Icon name="ArrowLeft" size={20} /> На главную
          </a>
        </div>

        {bulkProgress && (
          <div className="mb-6 p-4 rounded bg-white/5 border border-gold/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="animate-spin"><Icon name="Loader" size={16} /></div>
                <span className="text-gold text-sm">
                  Фильм {bulkProgress.done + 1} / {bulkProgress.total}
                </span>
                <span className="text-green-400 text-xs">{bulkProgress.ok} ok</span>
                {bulkProgress.fail > 0 && <span className="text-red-400 text-xs">{bulkProgress.fail} fail</span>}
                <span className="text-gray-400 text-xs">{bulkProgress.imagesDone} кадров</span>
              </div>
              <button onClick={handleStop} className="px-3 py-1 rounded bg-red-900/30 text-red-400 text-xs hover:bg-red-900/50">
                Стоп
              </button>
            </div>
            <p className="text-gray-400 text-xs">{bulkProgress.current}</p>
            <div className="w-full bg-white/10 rounded h-2 mt-2">
              <div
                className="bg-gold h-2 rounded transition-all"
                style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-8">
          <button
            onClick={handleBulkUpload}
            disabled={bulkRunning}
            className="btn-cinema px-6 py-3 rounded text-sm disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Icon name="Download" size={16} />
              Загрузить из TMDB ({movies.length - moviesComplete} неполных)
            </span>
          </button>
          <button onClick={() => loadImages()} className="px-4 py-3 rounded border border-white/10 text-sm hover:border-gold/30 transition-colors">
            <Icon name="RefreshCw" size={16} />
          </button>
        </div>

        <div className="grid gap-4">
          {moviesWithCount.map(m => (
            <div
              key={m.id}
              className="p-4 rounded bg-white/5 border border-white/10 hover:border-gold/20 transition-colors"
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-gold', 'bg-gold/5'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-gold', 'bg-gold/5'); }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-gold', 'bg-gold/5');
                const files = e.dataTransfer.files;
                if (files.length > 0) handleFileUpload(m.id, files);
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gold text-xs font-mono">#{m.id}</span>
                    <h3 className="font-semibold truncate">{m.title}</h3>
                    <span className="text-gray-500 text-sm">({m.year})</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      m.imageCount >= 8 ? 'bg-green-900/30 text-green-400' :
                      m.imageCount > 0 ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {m.imageCount} / 8
                    </span>
                  </div>

                  {m.imagesList.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {m.imagesList.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`${m.title} кадр ${idx + 1}`}
                            className="h-20 w-32 object-cover rounded border border-white/10"
                          />
                          <button
                            onClick={() => handleDelete(m.id, url)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Icon name="X" size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={el => { fileInputRefs.current[m.id] = el; }}
                    onChange={e => {
                      const files = e.target.files;
                      if (files && files.length > 0) handleFileUpload(m.id, files);
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => fileInputRefs.current[m.id]?.click()}
                    disabled={uploading[m.id]}
                    className="px-3 py-2 rounded border border-white/10 text-sm hover:border-gold/30 hover:text-gold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading[m.id] ? (
                      <><Icon name="Loader" size={14} /> Загрузка...</>
                    ) : (
                      <><Icon name="Upload" size={14} /> Добавить</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}