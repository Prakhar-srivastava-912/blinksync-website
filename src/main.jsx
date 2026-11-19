import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/monitor.css';

const container = document.getElementById('root');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
