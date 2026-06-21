import React, { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function Scanner({ onScan }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (result) onScan(result.getText());
    }).catch(console.error);
    return () => BrowserMultiFormatReader.releaseAllStreams();
  }, [onScan]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 400, margin: '0 auto' }}>
      <video ref={videoRef} style={{ width: '100%', borderRadius: 8 }} />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        border: '2px solid #008060',
        borderRadius: 8,
        width: 200,
        height: 80,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
