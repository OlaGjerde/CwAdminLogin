# CSP Testing Guide

## How to Test Your Content Security Policy

### 1. Check Headers in Browser DevTools

**Chrome/Edge:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Reload the page
4. Click on the first request (your HTML document)
5. Go to **Headers** section
6. Look for `Content-Security-Policy` header

**Firefox:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Reload the page
4. Click on the HTML document
5. Go to **Headers** → **Response Headers**
6. Look for `content-security-policy`

---

### 2. Monitor CSP Violations in Console

Open the **Console** tab in DevTools. CSP violations will appear as warnings/errors:

#### Examples of CSP Violations:

```
✅ Good (Allowed):
No errors - everything loads correctly

❌ Bad (Blocked):
Refused to load the script 'https://evil.com/malicious.js' 
because it violates the following Content Security Policy directive: 
"script-src 'self'"

Refused to execute inline script because it violates the following 
Content Security Policy directive: "script-src 'self'"
```

---

### 3. Test Inline Script Blocking (XSS Protection)

Try adding this to your code temporarily:

```typescript
// This should be BLOCKED by CSP in production
const script = document.createElement('script');
script.innerHTML = "alert('XSS Test')";
document.body.appendChild(script);
```

**Expected Result:**
- ❌ **Development:** May work (we allow `unsafe-inline` for HMR)
- ✅ **Production:** Should be blocked with CSP error

---

### 4. Test External Resource Loading

Try loading an unauthorized resource:

```typescript
// This should be BLOCKED by CSP
fetch('https://unauthorized-domain.com/api/data')
  .then(r => r.json())
  .then(console.log)
  .catch(err => console.error('CSP blocked this:', err));
```

**Expected Result:**
```
❌ CSP Error: Refused to connect to 'https://unauthorized-domain.com/api/data' 
because it violates the following Content Security Policy directive: 
"connect-src 'self' https://adminapi-dev.calwincloud.com ..."
```

---

### 5. Verify Allowed Resources Load Correctly

Check these resources load successfully:

#### ✅ Should Work:
- Your own JavaScript files
- Your own CSS files
- DevExtreme CSS from CDN
- Images from your domain
- API calls to whitelisted domains:
  - `https://adminapi-dev.calwincloud.com`
  - `https://auth.calwincloud.com`
  - Cognito domains

#### Test in Console:
```javascript
// Test API connectivity
fetch('https://adminapi-dev.calwincloud.com/api/health')
  .then(r => console.log('✅ API accessible'))
  .catch(e => console.error('❌ API blocked:', e));

// Test Cognito domain
fetch('https://auth.calwincloud.com/.well-known/jwks.json')
  .then(r => console.log('✅ Cognito accessible'))
  .catch(e => console.error('❌ Cognito blocked:', e));
```

---

### 6. Online CSP Evaluators

#### **Google CSP Evaluator**
https://csp-evaluator.withgoogle.com/

Paste your CSP policy and get security recommendations.

#### **Mozilla Observatory**
https://observatory.mozilla.org/

Enter your production URL and get a comprehensive security scan.

---

### 7. Test Report-Only Mode (Safe Testing)

Before enforcing CSP, test in **report-only mode**:

#### In `index.html`, change:
```html
<!-- Enforcement Mode (blocks violations) -->
<meta http-equiv="Content-Security-Policy" content="...">

<!-- Report-Only Mode (logs but doesn't block) -->
<meta http-equiv="Content-Security-Policy-Report-Only" content="...">
```

This way you can:
- ✅ See violations in console
- ✅ Nothing is blocked
- ✅ Safe to test in production

---

### 8. Common Issues & Fixes

#### Issue: "Refused to execute inline script"
**Cause:** `script-src` doesn't allow inline scripts  
**Fix:** 
- Move scripts to external `.js` files
- Or add nonces/hashes (advanced)

#### Issue: "Refused to load the stylesheet"
**Cause:** `style-src` blocking inline styles or external CSS  
**Fix:** 
- Add `'unsafe-inline'` (less secure but needed for some frameworks)
- Or add specific domains

#### Issue: "Refused to connect to..."
**Cause:** API domain not in `connect-src`  
**Fix:** 
- Add the domain to `API_DOMAINS` in `src/config/csp.ts`

#### Issue: DevExtreme styles not loading
**Cause:** CDN domain not whitelisted  
**Fix:** 
- Already added: `https://cdn3.devexpress.com`
- Check if DevExtreme uses different CDN

---

### 9. Development vs Production Testing

#### Development (Current Setup):
```bash
yarn dev
```
- Uses **relaxed** CSP policy
- Allows `unsafe-inline` for HMR
- Includes WebSocket for hot reload

#### Production Build:
```bash
yarn build
yarn preview
```
- Uses **strict** CSP policy  
- No `unsafe-inline` for scripts
- No WebSocket

Test both to ensure production CSP works!

---

### 10. Automated Testing Script

Create a simple test file `csp-test.html` in `public/`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>CSP Test Page</title>
</head>
<body>
  <h1>CSP Test Results</h1>
  <div id="results"></div>
  
  <script>
    const results = [];
    
    // Test 1: Inline script (should work in dev, fail in prod)
    try {
      eval("console.log('eval test')");
      results.push('❌ FAIL: eval() worked (CSP not strict enough)');
    } catch(e) {
      results.push('✅ PASS: eval() blocked by CSP');
    }
    
    // Test 2: External unauthorized domain
    fetch('https://example.com')
      .then(() => results.push('❌ FAIL: Unauthorized domain accessible'))
      .catch(() => results.push('✅ PASS: Unauthorized domain blocked'));
    
    // Test 3: Authorized API
    fetch('https://adminapi-dev.calwincloud.com/api/health')
      .then(() => results.push('✅ PASS: Authorized API accessible'))
      .catch(() => results.push('❌ FAIL: Authorized API blocked'));
    
    // Display results
    setTimeout(() => {
      document.getElementById('results').innerHTML = 
        results.map(r => `<p>${r}</p>`).join('');
    }, 2000);
  </script>
</body>
</html>
```

Visit: `http://localhost:5173/csp-test.html`

---

### 11. Production Deployment Checklist

Before deploying with CSP:

- [ ] Test in report-only mode first
- [ ] Check all resources load correctly
- [ ] Verify no console errors
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test authentication flow completely
- [ ] Test API calls to all endpoints
- [ ] Monitor for CSP violations in production
- [ ] Have rollback plan ready

---

### 12. Monitoring CSP in Production

#### Option A: Browser Reporting (Built-in)
Users' browsers will log CSP violations in console.

#### Option B: CSP Report URI (Advanced)
Add reporting endpoint:

```typescript
// In csp.ts
const prodDirectives = [
  // ... other directives
  "report-uri https://your-reporting-endpoint.com/csp-report",
  "report-to csp-endpoint"
];
```

Create endpoint to receive violation reports.

---

## Quick Reference

### Check CSP is Active:
```javascript
// In browser console
console.log(document.querySelector('meta[http-equiv*="Content-Security-Policy"]'));
```

### View Current Policy:
```javascript
// In browser console (after page load)
fetch(window.location.href)
  .then(r => r.headers.get('content-security-policy'))
  .then(console.log);
```

### Test XSS Protection:
```javascript
// This SHOULD fail in production:
document.body.innerHTML += '<img src=x onerror="alert(\'XSS\')">';
```

---

## Summary

✅ **What CSP Protects Against:**
- XSS (Cross-Site Scripting) attacks
- Unauthorized data exfiltration
- Malicious script injection
- Clickjacking
- Mixed content

❌ **What CSP Does NOT Protect Against:**
- Server-side vulnerabilities
- Leaked credentials
- CSRF (use separate tokens)
- SQL injection
- Authentication bypass

CSP is **one layer** of defense. Use it with other security best practices!
