import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles.css';

// Register the service worker. In development this is a no-op.
const updateSW = registerSW({
  onNeedRefresh() {
    // Apply the update transparently and reload the client so the new code
    // takes effect without requiring the user to close the app manually.
    updateSW(true).catch(() => {
      // If the immediate reload fails, the next navigation will pick up the new SW.
    });
  },
  onRegistered(r) {
    if (r) {
      // Check for updates every hour while the app is open.
      setInterval(() => {
        r.update();
      }, 60 * 60 * 1000);
    }
  },
});

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
