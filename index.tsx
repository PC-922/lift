import { composeApplication } from './src/composition';
import { ApplicationProvider } from './src/UI/ApplicationProvider';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import './src/UI/styles.css';
import { registerPwaUpdate } from './src/infrastructure/pwaUpdates';

let updateSWRef: ((reloadPage?: boolean) => Promise<void>) | null = null;
const pwa = registerPwaUpdate((reloadPage) => updateSWRef?.(reloadPage) ?? Promise.resolve());
const updateSW = registerSW({
  onNeedRefresh: pwa.onNeedRefresh,
  onRegistered: pwa.onRegistered,
});
updateSWRef = updateSW;

async function renderApplication(): Promise<void> {
  const services = composeApplication();
  const { default: App } = await import('./src/UI/App');
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Failed to find the root element');

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ApplicationProvider services={services}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ApplicationProvider>
    </React.StrictMode>
  );
}

void renderApplication();
