import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface ProtectedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export default function ProtectedImage({ src, alt, className }: ProtectedImageProps) {
  const [objectUrl, setObjectUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let nextUrl = '';
    setObjectUrl('');
    setFailed(false);
    if (!src) return;
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) {
      setObjectUrl(src);
      return;
    }
    api.getGalleryImage(src)
      .then(blob => {
        if (!active) return;
        nextUrl = URL.createObjectURL(blob);
        setObjectUrl(nextUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [src]);

  if (failed) {
    return <div className={className} role="img" aria-label={alt}>{alt || '图片无法加载'}</div>;
  }
  if (!objectUrl) return <div className={className} aria-hidden="true" />;
  return <img src={objectUrl} alt={alt} className={className} />;
}
