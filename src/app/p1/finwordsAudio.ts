export type P1AudioSurface =
  | 'loading'
  | 'error'
  | 'home'
  | 'tutorial'
  | 'narrative'
  | 'appearance'
  | 'game'
  | 'results'
  | 'field-review'
  | 'next-chapter-unavailable'
  | 'campaign-complete';

export type FinwordsMusicTrack = 'happy' | 'upbeat';

function publicAudioUrl(filename: string): string {
  return `${import.meta.env.BASE_URL}audio/finwords/${filename}`;
}

export const FINWORDS_AUDIO_URLS = {
  happy: publicAudioUrl('Happy10.ogg'),
  upbeat: publicAudioUrl('UpbeatCalm3.ogg'),
  select001: publicAudioUrl('select_001.ogg'),
  select002: publicAudioUrl('select_002.ogg'),
} as const;

export function musicTrackForSurface(surface: P1AudioSurface): FinwordsMusicTrack | null {
  switch (surface) {
    case 'loading':
    case 'error':
      return null;
    case 'game':
    case 'tutorial':
    case 'narrative':
      return 'upbeat';
    case 'home':
    case 'appearance':
    case 'results':
    case 'field-review':
    case 'next-chapter-unavailable':
    case 'campaign-complete':
      return 'happy';
  }
}

export interface AudioElementLike {
  currentTime: number;
  loop: boolean;
  preload: string;
  play(): Promise<void> | void;
  pause(): void;
}

interface AudioDocumentLike {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: string, listener: EventListener, options?: boolean): void;
  removeEventListener(type: string, listener: EventListener, options?: boolean): void;
}

export interface FinwordsAudioDiagnostic {
  kind: 'play-failed';
  src: string;
  message: string;
}

export interface FinwordsAudioController {
  setSurface(surface: P1AudioSurface): void;
  setSettings(settings: { musicEnabled: boolean; soundEnabled: boolean }): void;
  getDiagnostics(): readonly FinwordsAudioDiagnostic[];
  dispose(): void;
}

interface FinwordsAudioControllerOptions {
  document: AudioDocumentLike;
  createAudio: (src: string) => AudioElementLike;
  random: () => number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createFinwordsAudioController({
  document: lifecycleDocument,
  createAudio,
  random,
}: FinwordsAudioControllerOptions): FinwordsAudioController {
  let desiredTrack: FinwordsMusicTrack | null = null;
  let playingTrack: FinwordsMusicTrack | null = null;
  let gestureReceived = false;
  let musicEnabled = true;
  let soundEnabled = true;
  let disposed = false;
  const music = new Map<FinwordsMusicTrack, AudioElementLike>();
  const diagnostics: FinwordsAudioDiagnostic[] = [];

  const reportPlayFailure = (src: string, error: unknown) => {
    diagnostics.push({ kind: 'play-failed', src, message: errorMessage(error) });
  };

  const pausePlayingMusic = () => {
    if (!playingTrack) return;
    music.get(playingTrack)?.pause();
    playingTrack = null;
  };

  const ensureMusic = (track: FinwordsMusicTrack): AudioElementLike => {
    const existing = music.get(track);
    if (existing) return existing;
    const audio = createAudio(FINWORDS_AUDIO_URLS[track]);
    audio.loop = true;
    audio.preload = 'auto';
    music.set(track, audio);
    return audio;
  };

  const reconcileMusic = () => {
    if (
      disposed
      || !gestureReceived
      || !musicEnabled
      || lifecycleDocument.visibilityState === 'hidden'
      || desiredTrack === null
    ) {
      pausePlayingMusic();
      return;
    }
    const track = desiredTrack;
    if (playingTrack === track) return;
    pausePlayingMusic();
    const audio = ensureMusic(track);
    playingTrack = track;
    try {
      const result = audio.play();
      if (result && typeof result.catch === 'function') {
        void result.catch((error) => {
          if (playingTrack === track) playingTrack = null;
          reportPlayFailure(FINWORDS_AUDIO_URLS[track], error);
        });
      }
    } catch (error) {
      playingTrack = null;
      reportPlayFailure(FINWORDS_AUDIO_URLS[track], error);
    }
  };

  const unlock = () => {
    if (!gestureReceived) gestureReceived = true;
    reconcileMusic();
  };

  const playButtonSfx = () => {
    if (!soundEnabled || disposed) return;
    const src = random() < 0.5
      ? FINWORDS_AUDIO_URLS.select001
      : FINWORDS_AUDIO_URLS.select002;
    const audio = createAudio(src);
    audio.preload = 'auto';
    try {
      const result = audio.play();
      if (result && typeof result.catch === 'function') {
        void result.catch((error) => reportPlayFailure(src, error));
      }
    } catch (error) {
      reportPlayFailure(src, error);
    }
  };

  const onGesture: EventListener = () => unlock();
  const onClick: EventListener = (event) => {
    const target = event.target as { closest?: (selector: string) => Element | null } | null;
    const button = target?.closest?.('button') as HTMLButtonElement | null;
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    unlock();
    playButtonSfx();
  };
  const onVisibilityChange: EventListener = () => reconcileMusic();

  lifecycleDocument.addEventListener('pointerdown', onGesture, true);
  lifecycleDocument.addEventListener('keydown', onGesture, true);
  lifecycleDocument.addEventListener('click', onClick, true);
  lifecycleDocument.addEventListener('visibilitychange', onVisibilityChange);

  return {
    setSurface(surface) {
      desiredTrack = musicTrackForSurface(surface);
      reconcileMusic();
    },
    setSettings(settings) {
      musicEnabled = settings.musicEnabled;
      soundEnabled = settings.soundEnabled;
      reconcileMusic();
    },
    getDiagnostics() {
      return diagnostics;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pausePlayingMusic();
      lifecycleDocument.removeEventListener('pointerdown', onGesture, true);
      lifecycleDocument.removeEventListener('keydown', onGesture, true);
      lifecycleDocument.removeEventListener('click', onClick, true);
      lifecycleDocument.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
