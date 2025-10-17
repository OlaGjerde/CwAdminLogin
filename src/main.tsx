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

// Note: Axios interceptors removed - cookie-based auth handles everything automatically

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
