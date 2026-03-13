import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Import theme CSS (loaded externally)
import '@themes/default/tokens.css';
import '@themes/dark/tokens.css';

// Import base styles
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
