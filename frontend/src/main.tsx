import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PassportProvider } from './context/PassportContext';
import './index.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PassportProvider>
      <App />
    </PassportProvider>
  </StrictMode>,
);
