import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { App } from './app/App';
import './global.css';

async function bootstrap(): Promise<void> {
  const { startMockBrowser } = await import('./mocks/browser');
  await startMockBrowser();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </StrictMode>,
  );
}

void bootstrap();
