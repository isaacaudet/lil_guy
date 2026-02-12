import { toSvgString } from './render-string';
import type { RenderOptions } from './types';

/**
 * Renders a lil_guy avatar to a PNG data URL.
 * Browser-only — requires canvas and Image APIs.
 */
export async function toPng(input: string, options: RenderOptions = {}): Promise<string> {
  const size = options.size ?? 128;
  const svg = toSvgString(input, { ...options, size });

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.width = size;
    img.height = size;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
