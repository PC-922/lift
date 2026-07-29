import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';
import { registerPwaUpdate } from './services/pwaUpdates';

// Register the service worker. In development this is a no-op.
let updateSWRef: ((reloadPage?: boolean) => Promise<void>) | null = null;
const pwa = registerPwaUpdate((reloadPage) => updateSWRef?.(reloadPage) ?? Promise.resolve());
const updateSW = registerSW({
  onNeedRefresh: pwa.onNeedRefresh,
  onRegistered: pwa.onRegistered,
});
updateSWRef = updateSW;

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
