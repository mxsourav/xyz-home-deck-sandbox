import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

export interface ExpandedImageData {
  src: string;
  title: string;
  caption: string;
}

interface ImageLightboxModalProps {
  image: ExpandedImageData | null;
  onClose: () => void;
}

export function ImageLightboxModal({ image, onClose }: ImageLightboxModalProps) {
  useEffect(() => {
    if (!image) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-lightbox-title"
      onClick={onClose}
    >
      <div
        className="lightbox-dialog"
        style={{ maxWidth: '980px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '13px 18px',
            borderBottom: '1px solid var(--border-hairline)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div>
            <h2
              id="image-lightbox-title"
              style={{ fontSize: '16px', fontWeight: 700 }}
            >
              {image.title}
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
              {image.caption}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            aria-label="Close expanded render preview"
            style={{ padding: '6px 10px', flexShrink: 0 }}
          >
            <X size={16} weight="bold" />
            <span>Close</span>
          </button>
        </div>

        <div
          className="no-hover-zoom"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            maxHeight: '80vh',
          }}
        >
          <img
            src={image.src}
            alt={image.title}
            style={{
              maxWidth: '100%',
              maxHeight: '72vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
}
