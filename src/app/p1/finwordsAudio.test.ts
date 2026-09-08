import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FINWORDS_AUDIO_URLS,
  createFinwordsAudioController,
  musicTrackForSurface,
  type AudioElementLike,
} from './finwordsAudio';

class FakeAudio implements AudioElementLike {
  currentTime = 0;
  loop = false;
  preload = '';
  readonly pause = vi.fn();
  readonly play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

  constructor(readonly src: string) {}
}

const controllers: Array<{ dispose: () => void }> = [];

afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.dispose());
  document.body.replaceChildren();
  delete (document as unknown as { visibilityState?: DocumentVisibilityState }).visibilityState;
});

describe('Finwords audio routing', () => {
  it.each([
    ['loading', null],
    ['error', null],
    ['home', 'happy'],
    ['appearance', 'happy'],
    ['results', 'happy'],
    ['field-review', 'happy'],
    ['campaign-complete', 'happy'],
    ['next-chapter-unavailable', 'happy'],
    ['game', 'upbeat'],
    ['narrative', 'upbeat'],
    ['tutorial', 'upbeat'],
  ] as const)('maps %s to %s without consulting overlays', (surface, expected) => {
    expect(musicTrackForSurface(surface)).toBe(expected);
  });

  it('starts only after the first gesture, changes loops without duplicate playback, and pauses Error', () => {
    const audios: FakeAudio[] = [];
    const controller = createFinwordsAudioController({
      document,
      createAudio: (src) => {
        const audio = new FakeAudio(src);
        audios.push(audio);
        return audio;
      },
      random: () => 0,
    });
    controllers.push(controller);

    controller.setSurface('home');
    expect(audios).toHaveLength(0);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(audios.map((audio) => audio.src)).toEqual([FINWORDS_AUDIO_URLS.happy]);
    expect(audios[0].loop).toBe(true);
    expect(audios[0].play).toHaveBeenCalledTimes(1);

    controller.setSurface('home');
    expect(audios[0].play).toHaveBeenCalledTimes(1);

    controller.setSurface('game');
    expect(audios[0].pause).toHaveBeenCalledTimes(1);
    expect(audios[1].src).toBe(FINWORDS_AUDIO_URLS.upbeat);
    expect(audios[1].play).toHaveBeenCalledTimes(1);

    controller.setSurface('error');
    expect(audios[1].pause).toHaveBeenCalledTimes(1);
  });

  it('uses deterministic random SFX only for enabled buttons and honors the separate sound toggle', () => {
    const audios: FakeAudio[] = [];
    const controller = createFinwordsAudioController({
      document,
      createAudio: (src) => {
        const audio = new FakeAudio(src);
        audios.push(audio);
        return audio;
      },
      random: () => 0.999,
    });
    controllers.push(controller);
    controller.setSurface('home');

    const enabled = document.createElement('button');
    const disabled = document.createElement('button');
    disabled.disabled = true;
    document.body.append(enabled, disabled);

    enabled.click();
    expect(audios.some((audio) => audio.src === FINWORDS_AUDIO_URLS.select002)).toBe(true);
    expect(audios.filter((audio) => audio.src === FINWORDS_AUDIO_URLS.select001)).toHaveLength(0);

    const sfxCount = audios.filter((audio) => !audio.loop).length;
    disabled.click();
    expect(audios.filter((audio) => !audio.loop)).toHaveLength(sfxCount);

    controller.setSettings({ musicEnabled: true, soundEnabled: false });
    enabled.click();
    expect(audios.filter((audio) => !audio.loop)).toHaveLength(sfxCount);
  });

  it('pauses while hidden and resumes the same loop at its saved position when visible', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    const audios: FakeAudio[] = [];
    const controller = createFinwordsAudioController({
      document,
      createAudio: (src) => {
        const audio = new FakeAudio(src);
        audios.push(audio);
        return audio;
      },
      random: () => 0,
    });
    controllers.push(controller);
    controller.setSurface('home');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    audios[0].currentTime = 17;

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(audios[0].pause).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(audios[0].currentTime).toBe(17);
    expect(audios[0].play).toHaveBeenCalledTimes(2);
  });

  it('degrades silently on play failure and exposes only an internal diagnostic', async () => {
    const controller = createFinwordsAudioController({
      document,
      createAudio: (src) => {
        const audio = new FakeAudio(src);
        audio.play.mockRejectedValue(new Error('decode failed'));
        return audio;
      },
      random: () => 0,
    });
    controllers.push(controller);
    controller.setSurface('home');

    expect(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
      .not.toThrow();
    await Promise.resolve();

    expect(controller.getDiagnostics()).toEqual([
      expect.objectContaining({ kind: 'play-failed', src: FINWORDS_AUDIO_URLS.happy }),
    ]);
    expect('finwordsAudio' in window).toBe(false);
  });
});
