'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';

interface QrCodeProps {
  url: string;
  staffSlug: string;
}

export function QrCode({ url, staffSlug }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useTranslations('dashboard.links');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, url, {
      width: 256,
      color: { dark: '#6D64FB', light: '#FFFFFF' },
    });
  }, [url]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `klyro-qr-${staffSlug}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={256} height={256} className="rounded-lg" />
      <button
        onClick={handleDownload}
        aria-label={t('downloadQr')}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--color-violet-soft)] hover:bg-[var(--color-violet)]/10"
      >
        <Download className="h-4 w-4" />
        {t('downloadQr')}
      </button>
    </div>
  );
}
