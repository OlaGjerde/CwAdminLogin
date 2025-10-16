# Content Security Policy Configuration Examples

## Overview
This document provides CSP header configurations for various production servers.
Use these when deploying your Vite app to production.

---

## 1. Nginx Configuration

Add to your nginx config file (usually `/etc/nginx/sites-available/your-site`):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # CSP Headers
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self';
        style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com;
        img-src 'self' data: https:;
        font-src 'self' data: https://cdn3.devexpress.com;
        connect-src 'self' 
            https://adminapi-dev.calwincloud.com 
            https://auth.calwincloud.com 
            https://calwincloud.auth.eu-north-1.amazoncognito.com
            https://calwinmedia.calwincloud.com
            https://calwinmedia-test.calwincloud.com
            https://calwinmedia-dev.calwincloud.com;
        frame-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self' 
            https://auth.calwincloud.com 
            https://calwincloud.auth.eu-north-1.amazoncognito.com;
        upgrade-insecure-requests;
    " always;

    # Additional Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Your other server config...
    root /var/www/your-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 2. Apache Configuration

Add to your `.htaccess` or Apache config:

```apache
<IfModule mod_headers.c>
    # Content Security Policy
    Header set Content-Security-Policy "\
        default-src 'self'; \
        script-src 'self'; \
        style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com; \
        img-src 'self' data: https:; \
        font-src 'self' data: https://cdn3.devexpress.com; \
        connect-src 'self' \
            https://adminapi-dev.calwincloud.com \
            https://auth.calwincloud.com \
            https://calwincloud.auth.eu-north-1.amazoncognito.com \
            https://calwinmedia.calwincloud.com \
            https://calwinmedia-test.calwincloud.com \
            https://calwinmedia-dev.calwincloud.com; \
        frame-src 'self'; \
        object-src 'none'; \
        base-uri 'self'; \
        form-action 'self' \
            https://auth.calwincloud.com \
            https://calwincloud.auth.eu-north-1.amazoncognito.com; \
        upgrade-insecure-requests;"

    # Additional Security Headers
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

---

## 3. IIS Configuration (web.config)

For IIS servers, add to your `web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <httpProtocol>
            <customHeaders>
                <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com; img-src 'self' data: https:; font-src 'self' data: https://cdn3.devexpress.com; connect-src 'self' https://adminapi-dev.calwincloud.com https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com https://calwinmedia.calwincloud.com https://calwinmedia-test.calwincloud.com https://calwinmedia-dev.calwincloud.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com; upgrade-insecure-requests;" />
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-Frame-Options" value="SAMEORIGIN" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
            </customHeaders>
        </httpProtocol>
        
        <rewrite>
            <rules>
                <!-- SPA fallback to index.html -->
                <rule name="React Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

---

## 4. AWS S3 + CloudFront

### S3 Bucket Configuration
S3 doesn't support custom headers directly. Use CloudFront.

### CloudFront Lambda@Edge Function

Create a Lambda@Edge function to add headers:

```javascript
'use strict';

exports.handler = (event, context, callback) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;

    // CSP Header
    headers['content-security-policy'] = [{
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com; img-src 'self' data: https:; font-src 'self' data: https://cdn3.devexpress.com; connect-src 'self' https://adminapi-dev.calwincloud.com https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com https://calwinmedia.calwincloud.com https://calwinmedia-test.calwincloud.com https://calwinmedia-dev.calwincloud.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com; upgrade-insecure-requests;"
    }];

    // Additional Security Headers
    headers['x-content-type-options'] = [{ key: 'X-Content-Type-Options', value: 'nosniff' }];
    headers['x-frame-options'] = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];
    headers['x-xss-protection'] = [{ key: 'X-XSS-Protection', value: '1; mode=block' }];
    headers['referrer-policy'] = [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }];

    callback(null, response);
};
```

---

## 5. Vercel (vercel.json)

Create `vercel.json` in your project root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com; img-src 'self' data: https:; font-src 'self' data: https://cdn3.devexpress.com; connect-src 'self' https://adminapi-dev.calwincloud.com https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com https://calwinmedia.calwincloud.com https://calwinmedia-test.calwincloud.com https://calwinmedia-dev.calwincloud.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com; upgrade-insecure-requests;"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## 6. Netlify (_headers file)

Create a `_headers` file in your `public/` directory:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn3.devexpress.com; img-src 'self' data: https:; font-src 'self' data: https://cdn3.devexpress.com; connect-src 'self' https://adminapi-dev.calwincloud.com https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com https://calwinmedia.calwincloud.com https://calwinmedia-test.calwincloud.com https://calwinmedia-dev.calwincloud.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://auth.calwincloud.com https://calwincloud.auth.eu-north-1.amazoncognito.com; upgrade-insecure-requests;
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
```

---

## CSP Directive Explanations

### Your Current Policy Breakdown:

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src 'self'` | Only your domain | Default policy for all resources |
| `script-src 'self'` | Only your scripts | Blocks inline scripts (XSS protection) |
| `style-src 'self' 'unsafe-inline'` | Your CSS + inline | Allows inline styles (needed for React/DevExtreme) |
| `img-src 'self' data: https:` | Your images + data URLs + any HTTPS | Flexible image loading |
| `font-src 'self' data:` | Your fonts + data URLs + DevExtreme CDN | Font loading |
| `connect-src 'self' [APIs]` | API endpoints | XHR/Fetch whitelist |
| `frame-src 'self'` | Only your frames | Prevents external iframes |
| `object-src 'none'` | Blocked | No Flash/plugins |
| `base-uri 'self'` | Only your domain | Prevents base tag injection |
| `form-action 'self' [Cognito]` | Your forms + Cognito | Where forms can submit |
| `upgrade-insecure-requests` | - | Upgrades HTTP to HTTPS |

---

## Testing Your CSP

### 1. Browser DevTools
Open Console and look for CSP violations:
```
Refused to load the script 'https://evil.com/bad.js' because it violates the following Content Security Policy directive: "script-src 'self'"
```

### 2. Report-Only Mode (Testing)
Add `-Report-Only` to test without blocking:
```
Content-Security-Policy-Report-Only: default-src 'self'; ...
```

### 3. Online Tools
- https://csp-evaluator.withgoogle.com/
- https://observatory.mozilla.org/

---

## Environment-Specific CSP

You can create different CSP policies for dev/prod:

### Development (Relaxed)
- Allow `'unsafe-inline'` for HMR
- Allow `ws://localhost:5173` for Vite HMR
- Allow localhost APIs

### Production (Strict)
- Remove `'unsafe-inline'` where possible
- Use nonces or hashes for inline scripts
- Only production API domains

---

## Upgrading to Stricter CSP (Future)

### Remove 'unsafe-inline' for scripts:
1. Use nonces: `script-src 'self' 'nonce-{random}'`
2. Or use hashes: `script-src 'self' 'sha256-{hash}'`

### Example with Vite plugin for nonces:
```typescript
// Advanced: Generate nonces per-request
// Requires server-side rendering or build-time generation
```

---

## Notes

- **Development**: Use meta tag or Vite plugin (easier to iterate)
- **Production**: Use server configuration (more secure, proper HTTP headers)
- **Both**: Start with relaxed policy, tighten gradually
- **Monitor**: Check browser console for CSP violations

Update API domains when deploying to different environments!
