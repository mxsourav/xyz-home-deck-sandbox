import { useEffect, useRef } from 'react';

interface PpgWaveformCanvasProps {
  heartRate: number;
  spo2: number;
  statusTone: 'emerald' | 'amber' | 'crimson';
  height?: number;
}

/**
 * Generates a realistic normalized cardiac ECG/PPG waveform sample at phase p in [0, 1).
 */
function sampleCardiacPulse(phase: number): number {
  const pWave = 0.14 * Math.exp(-Math.pow((phase - 0.16) / 0.032, 2));
  const qDip = -0.15 * Math.exp(-Math.pow((phase - 0.27) / 0.012, 2));
  const rSpike = 0.92 * Math.exp(-Math.pow((phase - 0.30) / 0.014, 2));
  const sDip = -0.26 * Math.exp(-Math.pow((phase - 0.335) / 0.014, 2));
  const tWave = 0.28 * Math.exp(-Math.pow((phase - 0.50) / 0.055, 2));
  return pWave + qDip + rSpike + sDip + tWave;
}

const TONE_COLORS: Record<PpgWaveformCanvasProps['statusTone'], string> = {
  emerald: '#15803D',
  amber: '#B45309',
  crimson: '#B91C1C',
};

export function PpgWaveformCanvas({
  heartRate,
  spo2,
  statusTone,
  height = 88,
}: PpgWaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestRef = useRef({ heartRate, spo2, statusTone });
  latestRef.current = { heartRate, spo2, statusTone };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = canvas.clientWidth || 480;
    let dpr = window.devicePixelRatio || 1;
    let headX = 0;
    let phase = 0;
    let lastTs = performance.now();

    const bufferSize = 600;
    const points = new Float32Array(bufferSize);
    points.fill(0);

    const resize = () => {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      width = Math.max(240, canvas.clientWidth || 480);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const { heartRate: bpm, spo2: currentSpo2, statusTone: tone } = latestRef.current;
      const beatsPerSecond = Math.max(0.5, bpm / 60);

      // Advance cardiac phase smoothly according to live BPM
      const sweepSpeedPxPerSec = 115;
      const dx = sweepSpeedPxPerSec * dt;
      const prevBucket = Math.floor((headX / width) * bufferSize);
      headX = (headX + dx) % width;
      const nextBucket = Math.floor((headX / width) * bufferSize);

      phase = (phase + beatsPerSecond * dt) % 1;
      const amplitudeScale = Math.max(0.55, Math.min(1.0, currentSpo2 / 98));
      const val = sampleCardiacPulse(phase) * amplitudeScale;

      if (nextBucket >= prevBucket) {
        for (let i = prevBucket; i <= nextBucket; i++) {
          points[i % bufferSize] = val;
        }
      } else {
        for (let i = prevBucket; i < bufferSize; i++) {
          points[i] = val;
        }
        for (let i = 0; i <= nextBucket; i++) {
          points[i] = val;
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Crisp Light-Mode clinical grid
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 20) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Baseline horizontal rule
      const baselineY = height * 0.68;
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(width, baselineY);
      ctx.stroke();

      // Draw ECG/PPG trace with clean gap ahead of sweep head
      const strokeColor = TONE_COLORS[tone];
      const gapBuckets = 16;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      let drawing = false;
      ctx.beginPath();
      for (let i = 0; i < bufferSize; i++) {
        const distAhead = (i - nextBucket + bufferSize) % bufferSize;
        if (distAhead > 0 && distAhead < gapBuckets) {
          if (drawing) {
            ctx.stroke();
            ctx.beginPath();
            drawing = false;
          }
          continue;
        }
        const x = (i / bufferSize) * width;
        const y = baselineY - points[i] * (height * 0.56);
        if (!drawing) {
          ctx.moveTo(x, y);
          drawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (drawing) {
        ctx.stroke();
      }

      // Sweep cursor dot
      const headY = baselineY - val * (height * 0.56);
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(headX, headY, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`Live 60 FPS PPG heart waveform at ${heartRate} beats per minute`}
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'block',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
      }}
    />
  );
}
