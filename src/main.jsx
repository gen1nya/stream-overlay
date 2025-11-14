import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { initI18n } from './i18n';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

initI18n()
  .catch((error) => {
    console.error('Failed to initialize i18n. Rendering with default locale.', error);
  })
  .finally(() => {
    root.render(<App />);
  });
