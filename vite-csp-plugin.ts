import type { Plugin } from 'vite';
import { CSP_POLICIES, SECURITY_HEADERS } from './src/config/csp';

/**
 * Vite plugin to add Content Security Policy and security headers during development
 */
export function cspPlugin(): Plugin {
  return {
    name: 'csp-plugin',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        // Add CSP header
        res.setHeader('Content-Security-Policy', CSP_POLICIES.dev);
        
        // Add additional security headers
        Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        next();
      });
    },
  };
}
