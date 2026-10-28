import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './theme.css';
import './styles.css';

const theme = getComputedStyle(document.documentElement);
document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  ?.setAttribute('content', theme.getPropertyValue('--bg').trim());
document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
  ?.setAttribute('content', theme.colorScheme);

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
