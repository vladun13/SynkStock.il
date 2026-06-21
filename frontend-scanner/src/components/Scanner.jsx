import React, { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { t } from '../lib/i18n';

export default function Scanner({ onScan }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    const ctrl = new AbortController();
    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) onScan(result.getText());
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) console.error('Scanner error:', err);
      });
    return () => {
      ctrl.abort();
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, [onScan]);

  return (
    <div className="relative flex w-full max-w-[320px] flex-col items-center justify-center">
      {/* Camera feed */}
      <div className="relative aspect-square w-[75vw] max-w-[320px] overflow-hidden rounded-lg bg-inverse-surface">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        {/* Vignette */}
        <div className="absolute inset-0 camera-overlay" />
        {/* Corner markers */}
        <div className="absolute right-0 top-0 h-10 w-10 rounded-tr-xl border-r-4 border-t-4 border-success" />
        <div className="absolute left-0 top-0 h-10 w-10 rounded-tl-xl border-l-4 border-t-4 border-success" />
        <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-xl border-b-4 border-r-4 border-success" />
        <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-xl border-b-4 border-l-4 border-success" />
        {/* Animated scanning line */}
        <div className="absolute left-0 z-20 h-[2px] w-full animate-scan bg-success shadow-scan" />
      </div>
      {/* Instruction text */}
      <div className="mt-md rounded-full border border-outline-variant/30 bg-inverse-surface/60 px-md py-2 backdrop-blur-sm">
        <p className="font-headline text-headline-sm text-white drop-shadow-lg tracking-wide">{t('scanPrompt')}</p>
      </div>
    </div>
  );
}
