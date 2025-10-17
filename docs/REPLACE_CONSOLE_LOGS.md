# Replace Console Logs Script

Detta script erstatter alle console.log/warn/error med logger functions.

## Manuell erstatning nødvendig

Siden det er 100+ console statements, anbefaler jeg at du bruker VS Code's "Find and Replace" funksjon:

### Steg 1: Erstatt console.log
1. Trykk `Ctrl+Shift+H` (Find and Replace)
2. Enable "Use Regular Expression" (.*) knappen
3. I "Find": `console\.log\(`
4. I "Replace": `logDebug(`
5. I "files to include": `src/**/*.{ts,tsx}`
6. I "files to exclude": `**/logger.ts` 
7. Trykk "Replace All"

### Steg 2: Erstatt console.warn  
1. I "Find": `console\.warn\(`
2. I "Replace": `logWarn(`
3. Trykk "Replace All"

### Steg 3: Erstatt console.error
1. I "Find": `console\.error\(`
2. I "Replace": `logError(`
3. Trykk "Replace All"

### Steg 4: Legg til imports
For hver fil som bruker logging, legg til:
```typescript
import { logDebug, logWarn, logError } from '../utils/logger';
// eller
import { logDebug, logWarn, logError } from '../../utils/logger';
// avhengig av fil-plassering
```

## Alternativ: Automatisk script

Kjør dette PowerShell scriptet fra prosjekt root:

```powershell
# VARNING: Test på en branch først!
Get-ChildItem -Path "src" -Include "*.ts","*.tsx" -Recurse | 
Where-Object { $_.Name -ne "logger.ts" } |
ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace 'console\.log\(', 'logDebug('
    $content = $content -replace 'console\.warn\(', 'logWarn('
    $content = $content -replace 'console\.error\(', 'logError('
    Set-Content $_.FullName -Value $content
}
```

## Etter erstatning

Test at appen fungerer:
1. Development: `yarn dev` - skal logge alt
2. Production build: `yarn build && yarn preview` - skal IKKE logge debug/info  
3. Med debug flag: `VITE_DEBUG_LOG=true yarn preview` - skal logge alt

## Produksjon

I produksjon vil:
- ✅ `logDebug()` og `logWarn()` være **skjult**
- ✅ `logError()` alltid vises (for feilrapportering)
- ✅ Kan aktiveres med `VITE_DEBUG_LOG=true` hvis nødvendig
