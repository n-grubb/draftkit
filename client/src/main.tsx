import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './app.css'

// Only register service worker in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Register under the app's actual base path (which differs for PR
      // previews served from a subdirectory), so the worker and its scope
      // match the deployment instead of assuming the production base.
      const base = import.meta.env.BASE_URL;
      const registration = await navigator.serviceWorker.register(`${base}sw.js`, {
        scope: base
      });
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, refresh to update
            if (confirm('New content is available! Would you like to refresh?')) {
              window.location.reload();
            }
          }
        });
      });

      console.log('ServiceWorker registration successful');
    } catch (err) {
      console.error('ServiceWorker registration failed: ', err);
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
