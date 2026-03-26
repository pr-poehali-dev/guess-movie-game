import { useState, useEffect, useRef } from 'react';
import { movies } from '@/data/movies';
import funcUrls from '../../backend/func2url.json';
import Icon from '@/components/ui/icon';

const MOVIE_IMAGES_URL = funcUrls['movie-images'];

interface MovieImages {
  [movieId: string]: string[];
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImageViaCanvas(url: string): Promise<string | null> {
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl.split(',')[1]);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function loadImageViaProxy(url: string): Promise<string | null> {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => resolve(null);
    img.src = proxyUrl;
  });
}

function loadImageViaWeserv(url: string): Promise<string | null> {
  const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=1280&output=jpg&q=90`;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl.split(',')[1]);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = weservUrl;
  });
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  let b64 = await loadImageViaCanvas(url);
  if (b64) return b64;
  console.log('Direct failed, trying weserv proxy...');
  b64 = await loadImageViaWeserv(url);
  if (b64) return b64;
  console.log('Weserv failed, trying corsproxy...');
  b64 = await loadImageViaProxy(url);
  return b64;
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
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const loadImages = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${MOVIE_IMAGES_URL}?all=1`);
      const data = await resp.json();
      setAllImages(data.images || {});
    } catch (e) {
      console.error('Failed to load images', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadImages(); }, []);

  const handleBulkUpload = async () => {
    const missing = movies.filter(m => !(allImages[String(m.id)]?.length > 0));
    if (missing.length === 0) {
      alert('Все фильмы уже имеют кадры!');
      return;
    }
    setBulkProgress({ done: 0, total: missing.length, current: '' });
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < missing.length; i++) {
      const m = missing[i];
      setBulkProgress({ done: i, total: missing.length, current: `${m.title} (${ok} ok, ${fail} fail)` });
      try {
        const b64 = await fetchImageAsBase64(m.imageUrl);
        if (b64) {
          await uploadToS3(m.id, b64, '1.jpg');
          ok++;
        } else {
          console.error(`No image data for ${m.id} ${m.title}`);
          fail++;
        }
      } catch (e) {
        console.error(`Upload error for ${m.id} ${m.title}:`, e);
        fail++;
      }
    }

    setBulkProgress(null);
    alert(`Готово! Загружено: ${ok}, ошибок: ${fail}`);
    await loadImages();
  };

  const handleFileUpload = async (movieId: number, file: File) => {
    setUploading(prev => ({ ...prev, [movieId]: true }));
    const existing = allImages[String(movieId)] || [];
    const nextNum = existing.length + 1;
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${nextNum}.${ext}`;

    const b64 = await toBase64(file);
    await uploadToS3(movieId, b64, filename);
    await loadImages();
    setUploading(prev => ({ ...prev, [movieId]: false }));
  };

  const handleDelete = async (movieId: number, url: string) => {
    if (!confirm('Удалить этот кадр?')) return;
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    await deleteFromS3(movieId, filename);
    await loadImages();
  };

  const moviesWithCount = movies.map(m => ({
    ...m,
    imageCount: (allImages[String(m.id)] || []).length,
    imagesList: allImages[String(m.id)] || [],
  }));

  const totalImages = Object.values(allImages).reduce((sum, arr) => sum + arr.length, 0);
  const moviesWithImages = Object.keys(allImages).filter(k => allImages[k].length > 0).length;

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
              {moviesWithImages} из {movies.length} фильмов имеют кадры | Всего {totalImages} кадров
            </p>
          </div>
          <a href="/" className="text-gray-400 hover:text-gold transition-colors">
            <Icon name="ArrowLeft" size={20} /> На главную
          </a>
        </div>

        {bulkProgress && (
          <div className="mb-6 p-4 rounded bg-white/5 border border-gold/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin"><Icon name="Loader" size={16} /></div>
              <span className="text-gold text-sm">
                Загрузка {bulkProgress.done + 1} / {bulkProgress.total}
              </span>
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
            disabled={!!bulkProgress}
            className="btn-cinema px-6 py-3 rounded text-sm disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Icon name="Download" size={16} />
              Загрузить с TMDB ({movies.length - moviesWithImages} без кадров)
            </span>
          </button>
          <button onClick={loadImages} className="px-4 py-3 rounded border border-white/10 text-sm hover:border-gold/30 transition-colors">
            <Icon name="RefreshCw" size={16} />
          </button>
        </div>

        <div className="grid gap-4">
          {moviesWithCount.map(m => (
            <div key={m.id} className="p-4 rounded bg-white/5 border border-white/10 hover:border-gold/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gold text-xs font-mono">#{m.id}</span>
                    <h3 className="font-semibold truncate">{m.title}</h3>
                    <span className="text-gray-500 text-sm">({m.year})</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${m.imageCount > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {m.imageCount} кадров
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
                    className="hidden"
                    ref={el => { fileInputRefs.current[m.id] = el; }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(m.id, file);
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
                      <><Icon name="Upload" size={14} /> Добавить кадр</>
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