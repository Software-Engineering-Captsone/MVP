'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2, X } from 'lucide-react';

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void | Promise<void>;
}

/**
 * Square-aspect crop modal. Hands back a new File built from the visible
 * crop region, at the source image's native MIME type and up to 1024×1024
 * so we don't push giant photos into Storage.
 */
export function PhotoCropModal({ file, onCancel, onConfirm }: Props) {
  const imageSrc = useMemo(() => URL.createObjectURL(file), [file]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => URL.revokeObjectURL(imageSrc), [imageSrc]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setArea(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!area || processing) return;
    setProcessing(true);
    setError(null);
    try {
      const cropped = await getCroppedFile(imageSrc, area, file);
      await onConfirm(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not crop image');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-nilink-ink">Crop your photo</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative h-80 w-full bg-gray-900">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Zoom
          </label>
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-nilink-accent"
          />
          {error && <p className="mt-3 text-xs font-medium text-amber-700">{error}</p>}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={processing || !area}
            className="inline-flex items-center gap-2 rounded-lg bg-nilink-accent px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-nilink-accent-hover disabled:opacity-50"
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save photo
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Draws the visible crop region onto a canvas (scaled down if the source
 * is huge) and returns a File with the same MIME type as the source.
 */
async function getCroppedFile(src: string, area: Area, source: File): Promise<File> {
  const img = await loadImage(src);
  const MAX = 1024;
  const scale = Math.min(1, MAX / area.width);
  const outW = Math.round(area.width * scale);
  const outH = Math.round(area.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported in this browser');
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);

  const mime = source.type || 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, 0.92),
  );
  if (!blob) throw new Error('Could not encode cropped image');

  const extFromMime = mime.split('/')[1] ?? 'jpg';
  const base = source.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${base || 'avatar'}.${extFromMime}`, { type: mime });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}
