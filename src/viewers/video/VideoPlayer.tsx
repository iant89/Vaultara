import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Button } from '../../components/ui/Button';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { createAppError } from '../../models/errors';
import type { ContentViewerProps } from '../../models/viewer';
import { formatPlaybackClock } from '../playbackClock';
import { canPlayVideo, canUseCaption } from './isVideoFile';
import styles from './VideoPlayer.module.css';

const SPEEDS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const PROGRESS_INTERVAL_MS = 4000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * In-app video player (design spec 18.4, roadmap 12.5).
 *
 * Playback is the browser `<video>` element pointing at the provider URL, so it can stream
 * without CORS. Captions are WebVTT files on the same item, loaded as a `<track>` when present.
 */
export function VideoPlayer({
  item,
  files,
  activeFileId,
  initialProgress,
  onSelectFile,
  onProgressChange,
  onDownload,
}: ContentViewerProps) {
  const clips = useMemo(() => files.filter(canPlayVideo), [files]);
  const captions = useMemo(
    () => files.filter((file) => canUseCaption(file) && isSafeDownloadUrl(file.downloadUrl)),
    [files],
  );
  const index = Math.max(
    0,
    clips.findIndex((file) => file.id === activeFileId),
  );
  const file = clips[index];
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReport = useRef(0);
  const seekId = useId();
  const volumeId = useId();
  const speedId = useId();
  const captionId = useId();
  const downloadUrl =
    file !== undefined && isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sessionId, setSessionId] = useState(file?.id ?? '');
  const [captionFileId, setCaptionFileId] = useState(captions[0]?.id ?? '');

  const activeId = file?.id ?? '';

  if (sessionId !== activeId) {
    setSessionId(activeId);
    setPlaying(false);
    setCurrentTime(
      initialProgress?.kind === 'video' ? Math.max(0, initialProgress.positionSeconds) : 0,
    );
    setDuration(0);
  }

  const caption = captions.find((entry) => entry.id === captionFileId);
  const captionUrl =
    caption !== undefined && isSafeDownloadUrl(caption.downloadUrl)
      ? caption.downloadUrl
      : undefined;

  const reportProgress = useCallback(
    (position: number, total: number, force: boolean) => {
      const now = Date.now();

      if (!force && now - lastReport.current < PROGRESS_INTERVAL_MS) {
        return;
      }

      lastReport.current = now;
      onProgressChange?.({
        kind: 'video',
        positionSeconds: position,
        ...(Number.isFinite(total) && total > 0 ? { durationSeconds: total } : {}),
        updatedAt: new Date().toISOString(),
      });
    },
    [onProgressChange],
  );

  useEffect(() => {
    const video = videoRef.current;

    if (video === null) {
      return;
    }

    video.volume = volume;
    video.muted = muted;
    video.playbackRate = speed;
  }, [muted, speed, volume]);

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      video?.pause();
    };
  }, [downloadUrl]);

  const go = useCallback(
    (delta: number) => {
      if (clips.length === 0) {
        return;
      }

      const next = clips[clamp(index + delta, 0, clips.length - 1)];

      if (next !== undefined && next.id !== file?.id) {
        videoRef.current?.pause();
        onSelectFile?.(next.id);
      }
    },
    [clips, file?.id, index, onSelectFile],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;

    if (video === null) {
      return;
    }

    if (playing) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      setPlaying(false);
    });
  }, [playing]);

  const seekTo = useCallback(
    (seconds: number) => {
      const video = videoRef.current;

      if (video === null) {
        return;
      }

      const total = Number.isFinite(video.duration) ? video.duration : duration;
      video.currentTime = clamp(seconds, 0, Number.isFinite(total) ? total : seconds);
      setCurrentTime(video.currentTime);
      reportProgress(video.currentTime, total, true);
    },
    [duration, reportProgress],
  );

  if (file === undefined || downloadUrl === undefined) {
    return (
      <ErrorState
        error={createAppError('unsupported-format', 'No video this app can play.')}
        title="No video to play"
      />
    );
  }

  const total = duration > 0 ? duration : 0;
  const canGoPrevious = index > 0;
  const canGoNext = index < clips.length - 1;

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar} role="toolbar" aria-label="Video player">
        <div className={styles.group}>
          <Button onClick={() => go(-1)} disabled={!canGoPrevious} aria-label="Previous video">
            Previous
          </Button>
          <Button onClick={togglePlay} aria-pressed={playing}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button onClick={() => go(1)} disabled={!canGoNext} aria-label="Next video">
            Next
          </Button>
          <p className={styles.status} aria-live="polite">
            {formatPlaybackClock(currentTime)} / {formatPlaybackClock(total)}
            {clips.length > 1 ? ` · ${String(index + 1)} of ${String(clips.length)}` : ''}
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

        {captions.length > 0 ? (
          <label className={styles.field} htmlFor={captionId}>
            Captions
            <select
              id={captionId}
              className={styles.select}
              value={captionFileId}
              onChange={(event) => setCaptionFileId(event.target.value)}
            >
              <option value="">Off</option>
              {captions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

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
        {/* Captions are provider WebVTT when present; many Archive items have none. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className={styles.video}
          src={downloadUrl}
          preload="metadata"
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            const video = videoRef.current;
            if (video !== null) {
              reportProgress(video.currentTime, video.duration, true);
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
              initialProgress?.kind === 'video' &&
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
        >
          {captionUrl !== undefined ? (
            <track
              key={captionUrl}
              kind="subtitles"
              src={captionUrl}
              srcLang="en"
              label={caption?.name ?? 'Captions'}
              default
            />
          ) : null}
        </video>

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

        <p className={styles.hint}>
          {item.title}. Playback streams from the provider. Captions are WebVTT files on this item
          when the browser can load them; they are not required for watching.
        </p>
      </div>
    </div>
  );
}
