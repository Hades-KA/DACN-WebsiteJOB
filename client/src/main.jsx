import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './routes';
import { AuthProvider } from './contexts/SimpleAuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);