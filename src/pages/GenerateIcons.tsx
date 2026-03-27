import { useEffect, useRef, useState } from "react";

const SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#0a0a0a"/>
  <rect x="120" y="140" width="272" height="200" rx="16" fill="none" stroke="#d4a843" stroke-width="12"/>
  <rect x="120" y="140" width="272" height="40" rx="16" fill="#d4a843"/>
  <line x1="160" y1="140" x2="160" y2="180" stroke="#0a0a0a" stroke-width="6"/>
  <line x1="200" y1="140" x2="200" y2="180" stroke="#0a0a0a" stroke-width="6"/>
  <line x1="312" y1="140" x2="312" y2="180" stroke="#0a0a0a" stroke-width="6"/>
  <line x1="352" y1="140" x2="352" y2="180" stroke="#0a0a0a" stroke-width="6"/>
  <rect x="100" y="340" width="40" height="60" rx="4" fill="#d4a843" opacity="0.3"/>
  <rect x="372" y="340" width="40" height="60" rx="4" fill="#d4a843" opacity="0.3"/>
  <text x="256" y="300" text-anchor="middle" font-family="serif" font-size="80" font-weight="bold" fill="#d4a843">?</text>
  <circle cx="256" cy="410" r="30" fill="none" stroke="#d4a843" stroke-width="6" opacity="0.5"/>
  <polygon points="246,398 246,422 268,410" fill="#d4a843" opacity="0.5"/>
</svg>`;

const SIZES = [192, 512];

function renderToCanvas(canvas: HTMLCanvasElement, size: number): Promise<void> {
  return new Promise((resolve) => {
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    const blob = new Blob([SVG_STRING], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function GenerateIcons() {
  const canvas192Ref = useRef<HTMLCanvasElement>(null);
  const canvas512Ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (canvas192Ref.current && canvas512Ref.current) {
        await renderToCanvas(canvas192Ref.current, 192);
        await renderToCanvas(canvas512Ref.current, 512);
        setReady(true);
      }
    };
    run();
  }, []);

  return (
    <div style={{ background: "#0a0a0a", color: "#fff", minHeight: "100vh", padding: 32 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>PWA Icon Generator</h1>
      <p style={{ marginBottom: 24, color: "#aaa" }}>
        Скачайте PNG иконки и положите их в папку public/
      </p>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {SIZES.map((size) => (
          <div key={size} style={{ textAlign: "center" }}>
            <canvas
              ref={size === 192 ? canvas192Ref : canvas512Ref}
              width={size}
              height={size}
              style={{ border: "1px solid #333", maxWidth: 256 }}
            />
            <br />
            <button
              disabled={!ready}
              onClick={() => {
                const canvas = size === 192 ? canvas192Ref.current : canvas512Ref.current;
                if (canvas) downloadCanvas(canvas, `pwa-${size}x${size}.png`);
              }}
              style={{
                marginTop: 8,
                padding: "8px 16px",
                background: ready ? "#d4a843" : "#555",
                color: "#0a0a0a",
                border: "none",
                borderRadius: 8,
                cursor: ready ? "pointer" : "not-allowed",
                fontWeight: "bold",
              }}
            >
              Скачать {size}x{size} PNG
            </button>
          </div>
        ))}
      </div>

      {ready && (
        <p style={{ marginTop: 24, color: "#4a4" }}>
          ✅ Иконки готовы к скачиванию
        </p>
      )}
    </div>
  );
}
