import { useState } from 'react';
import { ArrowsOutSimple, ImageSquare } from '@phosphor-icons/react';

interface SafeImageProps {
  filename: string;
  alt: string;
  slotTitle: string;
  slotCaption: string;
  aspectRatio?: string;
  phaseTarget?: string;
  className?: string;
  objectFit?: 'cover' | 'contain';
  priority?: boolean;
  onExpandImage?: (src: string, title: string, caption: string) => void;
}

export function SafeImage({
  filename,
  alt,
  slotTitle,
  slotCaption,
  aspectRatio = '16 / 10',
  phaseTarget,
  className = '',
  objectFit = 'cover',
  priority = false,
  onExpandImage,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const src = `/images/${filename}`;

  if (hasError) {
    return (
      <div
        className={`safe-image-frame no-hover-zoom ${className}`}
        style={{
          aspectRatio,
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span
            className="status-pill blue"
            style={{ fontSize: '11.5px', padding: '3px 9px' }}
          >
            <ImageSquare size={14} weight="duotone" />
            <span className="tabular-nums">public/images/{filename}</span>
          </span>
          {phaseTarget ? (
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--ink-muted)',
              }}
            >
              {phaseTarget}
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '15px',
              color: 'var(--ink-primary)',
            }}
          >
            {slotTitle}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
            {slotCaption}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-hairline)',
            fontSize: '12px',
            color: 'var(--ink-muted)',
          }}
        >
          <span>
            Drop <strong>{filename}</strong> into{' '}
            <code>frontend/public/images/</code>
          </span>
          <span className="tabular-nums" style={{ fontWeight: 600 }}>
            {aspectRatio}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`safe-image-frame no-hover-zoom ${className}`}
      style={{
        position: 'relative',
        aspectRatio,
        width: '100%',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-hairline)',
      }}
    >
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          display: 'block',
        }}
      />
      {onExpandImage ? (
        <button
          type="button"
          onClick={() => onExpandImage(src, slotTitle, slotCaption)}
          className="component-expand-badge"
          aria-label={`Expand ${slotTitle} fullscreen`}
        >
          <ArrowsOutSimple size={13} weight="bold" />
          <span>Expand</span>
        </button>
      ) : null}
    </div>
  );
}
