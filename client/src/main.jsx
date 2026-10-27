import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './lib/theme.jsx';
import { CompaniesProvider } from './lib/companies.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <CompaniesProvider>
          <App />
        </CompaniesProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
