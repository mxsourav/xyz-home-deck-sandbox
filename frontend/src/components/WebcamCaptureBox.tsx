import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle,
  Trash,
  UploadSimple,
  UserCircle,
  VideoCameraSlash,
} from '@phosphor-icons/react';

interface WebcamCaptureBoxProps {
  avatarDataUrl?: string | null;
  elderName: string;
  elderAge: number;
  onCaptureAvatar: (dataUrl: string | null) => void;
}

export function buildSamplePortraitDataUrl(name: string, age: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const isSenior = age >= 65;
  ctx.fillStyle = isSenior ? '#F2F2F4' : '#EBEBEE';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle concentric monochrome face-framing ring
  ctx.strokeStyle = isSenior ? '#3A3A3E' : '#6E6E73';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();

  // Clean vector silhouette bust
  ctx.fillStyle = isSenior ? '#1D1D1F' : '#48484D';
  ctx.beginPath();
  ctx.arc(128, 102, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(128, 224, 72, Math.PI, Math.PI * 2);
  ctx.fill();

  // Initials badge in corner
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'ED';

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 28px "Plus Jakarta Sans", Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 128, 104);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function WebcamCaptureBox({
  avatarDataUrl,
  elderName,
  elderAge,
  onCaptureAvatar,
}: WebcamCaptureBoxProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleOpenCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Webcam API unavailable in this browser context. Use Upload Photo or Sample Portrait below.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 320 },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraError(
        'Camera permission blocked or no webcam detected. Use Upload Photo or Sample Portrait.'
      );
      stopStream();
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, 256, 256);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    onCaptureAvatar(dataUrl);
    stopStream();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawUrl) return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 256, 256);
        onCaptureAvatar(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className="clinical-subtle-panel"
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Camera size={16} weight="regular" color="var(--ink-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-primary)' }}>
            OV5647 Local Face Recognition Enrollment
          </span>
        </div>

        <span
          className={`status-pill ${avatarDataUrl ? 'emerald' : 'blue'}`}
          style={{
            filter: 'grayscale(1)',
          }}
        >
          <CheckCircle size={12} weight={avatarDataUrl ? 'fill' : 'regular'} />
          <span>{avatarDataUrl ? 'Face Token Enrolled' : 'Ready to Capture'}</span>
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Circular Camera / Avatar Frame */}
        <div
          style={{
            width: '104px',
            height: '104px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: cameraActive
              ? '2px solid var(--ink-primary)'
              : avatarDataUrl
                ? '2px solid var(--ink-secondary)'
                : '1px solid var(--border-strong)',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />
          ) : avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              alt={`${elderName} enrolled face portrait`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <UserCircle size={56} weight="regular" color="var(--ink-muted)" />
          )}
        </div>

        {/* Camera & Offline Fallback Buttons */}
        <div style={{ flex: 1, minWidth: '210px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.45 }}>
            Capture or assign a face photo displayed in the 7-inch HUD bar for
            local family recognition (zero cloud upload).
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {cameraActive ? (
              <>
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  className="btn-primary"
                  style={{ padding: '6px 11px', fontSize: '12px' }}
                >
                  <Camera size={14} weight="fill" />
                  <span>Capture Face Photo</span>
                </button>
                <button
                  type="button"
                  onClick={stopStream}
                  className="btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                >
                  <VideoCameraSlash size={14} weight="regular" />
                  <span>Close Cam</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleOpenCamera()}
                className="btn-primary"
                style={{ padding: '6px 11px', fontSize: '12px' }}
              >
                <Camera size={14} weight="regular" />
                <span>Open Camera</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              <UploadSimple size={14} weight="regular" />
              <span>Upload Photo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopStream();
                setCameraError(null);
                onCaptureAvatar(buildSamplePortraitDataUrl(elderName, elderAge));
              }}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              <UserCircle size={14} weight="regular" />
              <span>Use Sample Portrait</span>
            </button>

            {avatarDataUrl ? (
              <button
                type="button"
                onClick={() => onCaptureAvatar(null)}
                className="btn-secondary"
                style={{ padding: '6px 9px', fontSize: '12px', color: 'var(--ink-muted)' }}
                title="Remove enrolled portrait"
              >
                <Trash size={14} weight="regular" />
              </button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {cameraError ? (
        <div
          style={{
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--ink-secondary)',
            fontSize: '11.5px',
          }}
        >
          {cameraError}
        </div>
      ) : null}
    </div>
  );
}
