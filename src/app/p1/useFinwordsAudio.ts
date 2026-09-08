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
        return new Audio(supportsOgg ? src : src.replace(/\.ogg$/, '.mp3'));
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
