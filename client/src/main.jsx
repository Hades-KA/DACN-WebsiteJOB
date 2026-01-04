import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './routes';
import { AuthProvider } from './contexts/SimpleAuthContext';
import './index.css';

const element = import.meta.env.DEV ? (
  <AuthProvider>
    <App />
  </AuthProvider>
) : (
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')).render(element);