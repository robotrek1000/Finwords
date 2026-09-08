import { useEffect, useRef } from 'react';
import type { SettingsResponse } from '../../infra/api/generated/data-contracts';
import {
  createFinwordsAudioController,
  type FinwordsAudioController,
  type P1AudioSurface,
} from './finwordsAudio';

export function useFinwordsAudio(
  surface: P1AudioSurface,
  settings: SettingsResponse | null,
): void {
  const controllerRef = useRef<FinwordsAudioController | null>(null);

  useEffect(() => {
    if (import.meta.env.MODE === 'test' || typeof Audio === 'undefined') return undefined;
    const controller = createFinwordsAudioController({
      document,
      createAudio: (src) => {
        const supportsOgg = document.createElement('audio').canPlayType('audio/ogg; codecs=vorbis');
        const audio = new Audio();
        // Preserve media Range headers when MSW forwards the request through fetch.
        // Browsers strip those headers from rewritten no-cors requests.
        audio.crossOrigin = 'anonymous';
        audio.src = supportsOgg ? src : src.replace(/\.ogg$/, '.mp3');
        return audio;
      },
      random: Math.random,
    });
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setSurface(surface);
  }, [surface]);

  useEffect(() => {
    if (!settings) return;
    controllerRef.current?.setSettings(settings);
  }, [settings]);
}
