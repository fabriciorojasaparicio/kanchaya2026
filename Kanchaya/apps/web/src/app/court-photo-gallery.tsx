'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type CourtPhoto = {
  id: string;
  url: string;
  contentType: string;
  byteSize: number;
};
type GalleryState = 'idle' | 'loading' | 'ready' | 'error';

export function CourtPhotoGallery({
  centerId,
  courtId,
  courtName,
}: {
  centerId: string;
  courtId: string;
  courtName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<GalleryState>('idle');
  const [photos, setPhotos] = useState<CourtPhoto[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!isOpen || hasLoaded.current) return;
    const controller = new AbortController();

    async function loadPhotos() {
      setState('loading');
      try {
        const response = await fetch(
          `/api/sports-centers/${encodeURIComponent(centerId)}/courts/${encodeURIComponent(courtId)}/photos`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error('No pudimos cargar las fotos de esta cancha.');
        const payload: unknown = await response.json();
        if (
          !payload ||
          typeof payload !== 'object' ||
          !('photos' in payload) ||
          !Array.isArray(payload.photos) ||
          !payload.photos.every(isCourtPhoto)
        ) {
          throw new Error('La galería no está disponible. Inténtalo de nuevo.');
        }
        setPhotos(payload.photos);
        hasLoaded.current = true;
        setState('ready');
      } catch {
        if (!controller.signal.aborted) setState('error');
      }
    }

    void loadPhotos();
    return () => controller.abort();
  }, [centerId, courtId, isOpen, reloadKey]);

  return (
    <details
      className="court-public-gallery"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>Ver fotos de la cancha</summary>
      {state === 'loading' || state === 'idle' ? (
        <p aria-live="polite" className="court-gallery-message">
          Cargando fotos…
        </p>
      ) : state === 'error' ? (
        <div className="court-gallery-message" role="alert">
          <p>No pudimos cargar las fotos.</p>
          <button
            onClick={() => {
              hasLoaded.current = false;
              setState('idle');
              setReloadKey((key) => key + 1);
            }}
            type="button"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : photos.length ? (
        <ul className="court-public-photo-list">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <Image
                alt={`${courtName}, foto ${index + 1}`}
                decoding="async"
                height={180}
                loading="lazy"
                src={photo.url}
                unoptimized
                width={270}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="court-gallery-message">
          Todavía no hay fotos para esta cancha.
        </p>
      )}
    </details>
  );
}

function isCourtPhoto(value: unknown): value is CourtPhoto {
  if (!value || typeof value !== 'object') return false;
  const photo = value as Record<string, unknown>;
  return (
    typeof photo.id === 'string' &&
    typeof photo.url === 'string' &&
    typeof photo.contentType === 'string' &&
    typeof photo.byteSize === 'number'
  );
}
