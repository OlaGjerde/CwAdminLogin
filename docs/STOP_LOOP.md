# 🛑 EMERGENCY FIX - STOP LOGIN LOOP

## Quick Fix

Åpne **DevTools Console** og kjør denne koden:

```javascript
sessionStorage.setItem('auth_failed', 'true');
location.reload();
```

Dette stopper loopen umiddelbart!

## Permanent Fix Needed

I `App.tsx` linje 58-87, kommenter ut hele `useEffect` som starter med "Auto-login logic".

Eller bare legg til denne linjen helt først i useEffect:
```typescript
if (sessionStorage.getItem('auth_failed')) return;
```

## How to Test After Fix

1. Clear all storage (Ctrl+Shift+Delete)
2. Reload page
3. You should see error screen with buttons
4. Click "Prøv på nytt" to manually trigger login

NO MORE AUTO-LOGIN LOOP!
