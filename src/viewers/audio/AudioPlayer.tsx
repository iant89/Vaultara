import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Button } from '../../components/ui/Button';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { createAppError } from '../../models/errors';
import type { ContentViewerProps } from '../../models/viewer';
import { canPlayAudio } from './isAudioFile';
import { describeWaveformFailure, loadWaveformPeaks } from './loadWaveform';
import { canFetchWaveform, formatPlaybackClock } from './waveform';
import styles from './AudioPlayer.module.css';

const SPEEDS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const WAVEFORM_BARS = 192;
const PROGRESS_INTERVAL_MS = 4000;

export interface AudioPlayerProps extends ContentViewerProps {
  readonly loadWaveform?: (
    url: string,
    barCount: number,
    signal: AbortSignal,
  ) => Promise<Float32Array>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function drawWaveform(canvas: HTMLCanvasElement, peaks: Float32Array, progress: number): void {
  let context: CanvasRenderingContext2D | null;

  try {
    context = canvas.getContext('2d');
  } catch {
    return;
  }

  if (context === null) {
    return;
  }

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(width * ratio));
  canvas.height = Math.max(1, Math.floor(height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const root = getComputedStyle(document.documentElement);
  const played = root.getPropertyValue('--color-accent').trim() || '#7cb0ff';
  const rest = root.getPropertyValue('--color-border-strong').trim() || '#6b7686';
  const mid = height / 2;
  const gap = 1;
  const barWidth = Math.max(1, width / peaks.length - gap);
  const playedBars = clamp(progress, 0, 1) * peaks.length;

  for (let index = 0; index < peaks.length; index += 1) {
    const peak = peaks[index] ?? 0;
    const barHeight = Math.max(2, peak * (height - 8));
    context.fillStyle = index < playedBars ? played : rest;
    context.fillRect(index * (barWidth + gap), mid - barHeight / 2, barWidth, barHeight);
  }
}

/**
 * In-app audio player (design spec 18.3, roadmap 12.4).
 *
 * Playback is the browser `<audio>` element pointing at the provider URL, so it can stream
 * without CORS. The waveform is decoded PCM from a CORS fetch, and only for files small enough
 * that drawing them would not download a lecture-length track just to paint bars.
 */
export function AudioPlayer({
  item,
  files,
  activeFileId,
  initialProgress,
  onSelectFile,
  onProgressChange,
  onDownload,
  loadWaveform = loadWaveformPeaks,
}: AudioPlayerProps) {
  const tracks = useMemo(() => files.filter(canPlayAudio), [files]);
  const index = Math.max(
    0,
    tracks.findIndex((file) => file.id === activeFileId),
  );
  const file = tracks[index];
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastReport = useRef(0);
  const seekId = useId();
  const volumeId = useId();
  const speedId = useId();
  const downloadUrl =
    file !== undefined && isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [wave, setWave] = useState<{
    readonly id: string;
    readonly status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'skipped';
    readonly peaks?: Float32Array;
    readonly detail?: string;
  }>({ id: '', status: 'idle' });

  const activeId = file?.id ?? '';

  if (wave.id !== activeId) {
    setWave({
      id: activeId,
      status: file !== undefined && canFetchWaveform(file) ? 'loading' : 'skipped',
      ...(file !== undefined && !canFetchWaveform(file)
        ? {
            detail:
              'Waveform is skipped for large or unsized files so this app does not download the whole track just to draw it. Playback still streams.',
          }
        : {}),
    });
    setPlaying(false);
    setCurrentTime(
      initialProgress?.kind === 'audio' ? Math.max(0, initialProgress.positionSeconds) : 0,
    );
    setDuration(0);
  }

  const reportProgress = useCallback(
    (position: number, total: number, force: boolean) => {
      const now = Date.now();

      if (!force && now - lastReport.current < PROGRESS_INTERVAL_MS) {
        return;
      }

      lastReport.current = now;
      onProgressChange?.({
        kind: 'audio',
        positionSeconds: position,
        ...(Number.isFinite(total) && total > 0 ? { durationSeconds: total } : {}),
        updatedAt: new Date().toISOString(),
      });
    },
    [onProgressChange],
  );

  useEffect(() => {
    if (file === undefined || downloadUrl === undefined || !canFetchWaveform(file)) {
      return;
    }

    const controller = new AbortController();

    void loadWaveform(downloadUrl, WAVEFORM_BARS, controller.signal).then(
      (peaks) => {
        if (!controller.signal.aborted) {
          setWave({ id: file.id, status: 'ready', peaks });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setWave({
          id: file.id,
          status: 'unavailable',
          detail: describeWaveformFailure(error),
        });
      },
    );

    return () => controller.abort();
  }, [downloadUrl, file, loadWaveform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const peaks = wave.peaks;

    if (canvas === null || peaks === undefined || wave.status !== 'ready') {
      return;
    }

    const progress = duration > 0 ? currentTime / duration : 0;
    drawWaveform(canvas, peaks, progress);
  }, [currentTime, duration, wave.peaks, wave.status]);

  useEffect(() => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    audio.volume = volume;
    audio.muted = muted;
    audio.playbackRate = speed;
  }, [muted, speed, volume]);

  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      audio?.pause();
    };
  }, [downloadUrl]);

  const go = useCallback(
    (delta: number) => {
      if (tracks.length === 0) {
        return;
      }

      const next = tracks[clamp(index + delta, 0, tracks.length - 1)];

      if (next !== undefined && next.id !== file?.id) {
        audioRef.current?.pause();
        onSelectFile?.(next.id);
      }
    },
    [file?.id, index, onSelectFile, tracks],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    if (playing) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => {
      setPlaying(false);
    });
  }, [playing]);

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;

      if (audio === null) {
        return;
      }

      const total = Number.isFinite(audio.duration) ? audio.duration : duration;
      audio.currentTime = clamp(seconds, 0, Number.isFinite(total) ? total : seconds);
      setCurrentTime(audio.currentTime);
      reportProgress(audio.currentTime, total, true);
    },
    [duration, reportProgress],
  );

  if (file === undefined || downloadUrl === undefined) {
    return (
      <ErrorState
        error={createAppError('unsupported-format', 'No audio this app can play.')}
        title="No audio to play"
      />
    );
  }

  const total = duration > 0 ? duration : 0;
  const canGoPrevious = index > 0;
  const canGoNext = index < tracks.length - 1;
  const peaks = wave.status === 'ready' ? wave.peaks : undefined;

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar} role="toolbar" aria-label="Audio player">
        <div className={styles.group}>
          <Button onClick={() => go(-1)} disabled={!canGoPrevious} aria-label="Previous track">
            Previous
          </Button>
          <Button onClick={togglePlay} aria-pressed={playing}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button onClick={() => go(1)} disabled={!canGoNext} aria-label="Next track">
            Next
          </Button>
          <p className={styles.status} aria-live="polite">
            {formatPlaybackClock(currentTime)} / {formatPlaybackClock(total)}
            {tracks.length > 1 ? ` · ${String(index + 1)} of ${String(tracks.length)}` : ''}
            {` · ${file.name}`}
          </p>
        </div>

        <label className={styles.field} htmlFor={speedId}>
          Speed
          <select
            id={speedId}
            className={styles.select}
            value={String(speed)}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            {SPEEDS.map((rate) => (
              <option key={rate} value={String(rate)}>
                {rate === 1 ? '1×' : `${String(rate)}×`}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.group}>
          <Button
            pressed={muted}
            aria-pressed={muted}
            onClick={() => setMuted((current) => !current)}
          >
            {muted ? 'Unmute' : 'Mute'}
          </Button>
          <label className={styles.field} htmlFor={volumeId}>
            Volume
            <input
              id={volumeId}
              className={styles.slider}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                if (next > 0) {
                  setMuted(false);
                }
              }}
            />
          </label>
        </div>

        <a
          className={styles.download}
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${file.name}`}
          onClick={() => onDownload?.(file)}
        >
          Download
        </a>
      </div>

      <div className={styles.stage}>
        {/* Provider audio does not include captions; playback is driven by the controls above. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          ref={audioRef}
          className={styles.media}
          src={downloadUrl}
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            const audio = audioRef.current;
            if (audio !== null) {
              reportProgress(audio.currentTime, audio.duration, true);
            }
          }}
          onEnded={() => {
            setPlaying(false);
            reportProgress(total, total, true);
          }}
          onLoadedMetadata={(event) => {
            const media = event.currentTarget;
            const mediaDuration = Number.isFinite(media.duration) ? media.duration : 0;
            setDuration(mediaDuration);

            if (
              initialProgress?.kind === 'audio' &&
              initialProgress.positionSeconds > 0 &&
              mediaDuration > 0
            ) {
              media.currentTime = clamp(initialProgress.positionSeconds, 0, mediaDuration);
              setCurrentTime(media.currentTime);
            }
          }}
          onTimeUpdate={(event) => {
            const media = event.currentTarget;
            setCurrentTime(media.currentTime);
            reportProgress(media.currentTime, media.duration, false);
          }}
        />

        <div className={styles.waveform}>
          {peaks !== undefined ? (
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          ) : null}
          <label className={styles.seekLabel} htmlFor={seekId}>
            Seek
            <input
              id={seekId}
              className={styles.seek}
              type="range"
              min={0}
              max={Math.max(total, 0.01)}
              step={0.01}
              value={clamp(currentTime, 0, Math.max(total, 0.01))}
              disabled={total <= 0}
              onChange={(event) => seekTo(Number(event.target.value))}
            />
          </label>
        </div>

        <p className={styles.hint}>
          {item.title}. Playback streams from the provider. The waveform is decoded samples from
          this file when the provider allows this site to fetch it and the file is small enough.
          {wave.status === 'loading' ? ' Reading waveform…' : ''}
          {wave.detail !== undefined ? ` ${wave.detail}` : ''}
        </p>
      </div>
    </div>
  );
}
