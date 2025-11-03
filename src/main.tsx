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
import { AuthProvider } from './contexts/auth'
import { AuthTest } from './components/AuthTest'

// Token refresh interceptors are automatically configured in axiosConfig.ts

// TEMPORARY: Use AuthTest to debug the login loop
const USE_AUTH_TEST = false;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {USE_AUTH_TEST ? <AuthTest /> : <App />}
    </AuthProvider>
  </StrictMode>,
)
