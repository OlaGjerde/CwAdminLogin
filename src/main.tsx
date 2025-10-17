declare global {
  interface Window {
    global: unknown;
  }
}
window.global = window;
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import config from 'devextreme/core/config'; 
import { licenseKey } from './devextreme-license.ts'; 
 
config({ licenseKey });   

import './index.css'
import App from './App.tsx'
import { setupAxiosInterceptors } from './api/axiosInterceptors.ts';

// Setup automatic token refresh on 401 errors
setupAxiosInterceptors();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
