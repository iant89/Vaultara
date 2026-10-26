import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { Button } from '../../components/ui/Button';
import { isSafeDownloadUrl } from '../../downloads/describe';
import { createAppError } from '../../models/errors';
import type { ContentViewerProps } from '../../models/viewer';
import { EMULATOR_BUTTONS, type EmulatorButton, type EmulatorEngine } from './adapter';
import { canPlayGameBoy } from './isGameBoyFile';
import { describeRomLoadFailure, loadRom } from './loadRom';
import { decodeSaveRam, encodeSaveRam } from './saveState';
import {
  DEFAULT_EMULATOR_SETTINGS,
  PALETTE_IDS,
  buttonLabel,
  paletteColors,
  readEmulatorSettings,
  writeEmulatorSettings,
  type EmulatorSettings,
  type PaletteId,
} from './settings';
import styles from './GameBoyViewer.module.css';

export interface GameBoyViewerProps extends ContentViewerProps {
  readonly load?: (url: string, signal: AbortSignal) => Promise<Uint8Array>;
  readonly createEngine?: () => Promise<EmulatorEngine>;
}

const DPAD: readonly EmulatorButton[] = ['up', 'left', 'right', 'down'];
const FACE: readonly EmulatorButton[] = ['b', 'a'];
const SYSTEM: readonly EmulatorButton[] = ['select', 'start'];

async function defaultEngine(): Promise<EmulatorEngine> {
  const { createGameBoyEngine } = await import('./gameboyEngine');
  return createGameBoyEngine();
}

function boundButton(keys: EmulatorSettings['keys'], code: string): EmulatorButton | undefined {
  return EMULATOR_BUTTONS.find((button) => keys[button] === code);
}

/**
 * In-app Game Boy emulator (design spec 18.6, roadmap Phase 14).
 *
 * The ROM is fetched (CORS, size-capped) and handed to an adapter. Pause, keyboard, touch,
 * palette, and battery RAM live here. Fullscreen is the shared viewer chrome.
 */
export function GameBoyViewer({
  item,
  files,
  activeFileId,
  initialProgress,
  onProgressChange,
  onDownload,
  load = loadRom,
  createEngine = defaultEngine,
}: GameBoyViewerProps) {
  const roms = useMemo(() => files.filter(canPlayGameBoy), [files]);
  const file = roms.find((entry) => entry.id === activeFileId) ?? roms[0];
  const downloadUrl =
    file !== undefined && isSafeDownloadUrl(file.downloadUrl) ? file.downloadUrl : undefined;
  const [session, setSession] = useState<{
    readonly id: string;
    readonly status: 'loading' | 'ready' | 'error';
    readonly rom?: Uint8Array;
    readonly error?: unknown;
  }>({ id: file?.id ?? '', status: 'loading' });

  const activeId = file?.id ?? '';

  if (session.id !== activeId) {
    setSession({ id: activeId, status: 'loading' });
  }

  useEffect(() => {
    if (downloadUrl === undefined) {
      return;
    }

    const controller = new AbortController();

    void load(downloadUrl, controller.signal)
      .then((rom) => {
        if (!controller.signal.aborted) {
          setSession({ id: activeId, status: 'ready', rom });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSession({ id: activeId, status: 'error', error });
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeId, downloadUrl, load]);

  if (file === undefined || downloadUrl === undefined) {
    return (
      <ErrorState
        error={createAppError('unsupported-format', 'No Game Boy ROM this app can play.')}
        title="This ROM cannot be opened"
      />
    );
  }

  if (session.status === 'loading') {
    return <LoadingState label="Loading ROM…" />;
  }

  if (session.status === 'error' || session.rom === undefined) {
    return (
      <div className={styles.failed}>
        <ErrorState
          error={createAppError('invalid-response', describeRomLoadFailure(session.error))}
          title="This ROM could not be opened"
        />
        <a
          className={styles.download}
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${file.name}`}
          onClick={() => onDownload?.(file)}
        >
          Download original
        </a>
      </div>
    );
  }

  return (
    <GameBoySession
      itemTitle={item.title}
      fileName={file.name}
      downloadUrl={downloadUrl}
      rom={session.rom}
      initialSave={
        initialProgress?.kind === 'emulator' && initialProgress.system === 'gb'
          ? initialProgress.saveState
          : undefined
      }
      createEngine={createEngine}
      onProgressChange={onProgressChange}
      onDownload={() => onDownload?.(file)}
    />
  );
}

function GameBoySession({
  itemTitle,
  fileName,
  downloadUrl,
  rom,
  initialSave,
  createEngine,
  onProgressChange,
  onDownload,
}: {
  readonly itemTitle: string;
  readonly fileName: string;
  readonly downloadUrl: string;
  readonly rom: Uint8Array;
  readonly initialSave?: string;
  readonly createEngine: () => Promise<EmulatorEngine>;
  readonly onProgressChange?: ContentViewerProps['onProgressChange'];
  readonly onDownload: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EmulatorEngine | undefined>(undefined);
  const settingsRef = useRef<EmulatorSettings>(DEFAULT_EMULATOR_SETTINGS);
  const [settings, setSettings] = useState<EmulatorSettings>(() => readEmulatorSettings());
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<unknown>();
  const [capturing, setCapturing] = useState<EmulatorButton | undefined>();
  const capturingRef = useRef<EmulatorButton | undefined>(undefined);
  const [hasBattery, setHasBattery] = useState(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    capturingRef.current = capturing;
  }, [capturing]);

  function applySettings(engine: EmulatorEngine, next: EmulatorSettings) {
    engine.setPalette(paletteColors(next.palette));
    engine.setFrameRate(next.frameRate);

    for (const button of EMULATOR_BUTTONS) {
      engine.setKeyBinding(button, next.keys[button]);
    }
  }

  function reportSave(engine: EmulatorEngine) {
    const ram = engine.getSaveRam();
    const encoded = ram === undefined ? undefined : encodeSaveRam(ram);

    onProgressChange?.({
      kind: 'emulator',
      system: 'gb',
      ...(encoded !== undefined ? { saveState: encoded } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    let cancelled = false;
    let engine: EmulatorEngine | undefined;

    void createEngine()
      .then((created) => {
        if (cancelled) {
          created.dispose();
          return;
        }

        engine = created;
        engineRef.current = created;
        created.attach(canvas);
        created.load(rom);
        applySettings(created, settingsRef.current);

        if (initialSave !== undefined) {
          const ram = decodeSaveRam(initialSave);

          if (ram !== undefined) {
            created.setSaveRam(ram);
          }
        }

        setHasBattery(created.getSaveRam() !== undefined);
        created.start();
        setRunning(true);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBootError(error);
        }
      });

    return () => {
      cancelled = true;

      if (engine !== undefined) {
        reportSave(engine);
        engine.dispose();
      }

      engineRef.current = undefined;
    };
    // ROM identity is the session; settings are applied live.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once per ROM buffer
  }, [createEngine, rom]);

  useEffect(() => {
    function onKey(event: KeyboardEvent, pressed: boolean) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const remap = capturingRef.current;

      if (remap !== undefined) {
        if (pressed) {
          event.preventDefault();
          const next: EmulatorSettings = {
            ...settingsRef.current,
            keys: { ...settingsRef.current.keys, [remap]: event.code },
          };
          setSettings(next);
          writeEmulatorSettings(next);
          const engine = engineRef.current;

          if (engine !== undefined) {
            applySettings(engine, next);
          }

          setCapturing(undefined);
        }

        return;
      }

      const button = boundButton(settingsRef.current.keys, event.code);

      if (button === undefined) {
        return;
      }

      event.preventDefault();
      engineRef.current?.setButton(button, pressed);
    }

    function onDown(event: KeyboardEvent) {
      onKey(event, true);
    }

    function onUp(event: KeyboardEvent) {
      onKey(event, false);
    }

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  function updateSettings(next: EmulatorSettings) {
    setSettings(next);
    writeEmulatorSettings(next);
    const engine = engineRef.current;

    if (engine !== undefined) {
      applySettings(engine, next);
    }
  }

  function toggleRunning() {
    const engine = engineRef.current;

    if (engine === undefined) {
      return;
    }

    if (running) {
      engine.pause();
      reportSave(engine);
      setRunning(false);
      return;
    }

    engine.resume();
    setRunning(true);
  }

  function handlePointer(button: EmulatorButton, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    engineRef.current?.setButton(button, true);
  }

  function handlePointerEnd(button: EmulatorButton, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    engineRef.current?.setButton(button, false);
  }

  if (bootError !== undefined) {
    return (
      <ErrorState
        error={createAppError('invalid-response', describeRomLoadFailure(bootError))}
        title="The emulator could not start"
      />
    );
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar} role="toolbar" aria-label="Game Boy emulator">
        <div className={styles.group}>
          <Button onClick={toggleRunning} aria-pressed={running} disabled={!ready}>
            {running ? 'Pause' : 'Resume'}
          </Button>
          <p className={styles.status} aria-live="polite">
            {ready ? (running ? 'Running' : 'Paused') : 'Starting…'} · {fileName}
          </p>
        </div>

        <label className={styles.field}>
          Palette
          <select
            className={styles.select}
            value={settings.palette}
            onChange={(event) => {
              updateSettings({ ...settings, palette: event.target.value as PaletteId });
            }}
          >
            {PALETTE_IDS.map((id) => (
              <option key={id} value={id}>
                {id === 'lcd-green'
                  ? 'LCD green'
                  : id === 'high-contrast'
                    ? 'High contrast'
                    : 'Greyscale'}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Speed
          <select
            className={styles.select}
            value={String(settings.frameRate)}
            onChange={(event) => {
              updateSettings({
                ...settings,
                frameRate: event.target.value === '30' ? 30 : 60,
              });
            }}
          >
            <option value="60">60 fps</option>
            <option value="30">30 fps</option>
          </select>
        </label>

        <a
          className={styles.download}
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${fileName}`}
          onClick={onDownload}
        >
          Download
        </a>
      </div>

      <div className={styles.playfield}>
        <div className={styles.stage}>
          <canvas
            ref={canvasRef}
            className={styles.screen}
            width={160}
            height={144}
            aria-label={`${itemTitle} Game Boy display`}
          />
        </div>

        <div className={styles.controls}>
          <div className={styles.dpad} role="group" aria-label="D-pad">
            {DPAD.map((button) => (
              <Button
                key={button}
                className={styles[button]}
                aria-label={buttonLabel(button)}
                onPointerDown={(event) => handlePointer(button, event)}
                onPointerUp={(event) => handlePointerEnd(button, event)}
                onPointerCancel={(event) => handlePointerEnd(button, event)}
              >
                {button === 'up' ? '↑' : button === 'down' ? '↓' : button === 'left' ? '←' : '→'}
              </Button>
            ))}
          </div>

          <div className={styles.face} role="group" aria-label="Action buttons">
            {FACE.map((button) => (
              <Button
                key={button}
                aria-label={buttonLabel(button)}
                onPointerDown={(event) => handlePointer(button, event)}
                onPointerUp={(event) => handlePointerEnd(button, event)}
                onPointerCancel={(event) => handlePointerEnd(button, event)}
              >
                {buttonLabel(button)}
              </Button>
            ))}
          </div>

          <div className={styles.system} role="group" aria-label="System buttons">
            {SYSTEM.map((button) => (
              <Button
                key={button}
                aria-label={buttonLabel(button)}
                onPointerDown={(event) => handlePointer(button, event)}
                onPointerUp={(event) => handlePointerEnd(button, event)}
                onPointerCancel={(event) => handlePointerEnd(button, event)}
              >
                {buttonLabel(button)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.bindings} aria-label="Keyboard controls">
        <h2 className={styles.heading}>Keyboard</h2>
        <ul className={styles.keyList}>
          {EMULATOR_BUTTONS.map((button) => (
            <li key={button}>
              <Button
                pressed={capturing === button}
                aria-pressed={capturing === button}
                onClick={() => {
                  capturingRef.current = button;
                  setCapturing(button);
                }}
              >
                {buttonLabel(button)}:{' '}
                {capturing === button ? 'press a key' : settings.keys[button]}
              </Button>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>
          {itemTitle}. ROMs are treated as untrusted machine code and are never run as JavaScript.
          {hasBattery
            ? ' Battery save RAM is stored with your progress when you pause.'
            : ' This cartridge has no battery save.'}{' '}
          Audio is off: it would require isolation headers that break other providers’ media.
        </p>
      </section>
    </div>
  );
}
