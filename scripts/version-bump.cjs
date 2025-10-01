#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const type = process.argv[2] || 'patch';
const pkgPath = path.join(process.cwd(), 'package.json');
const raw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(raw);
const parts = (pkg.version || '0.0.0').split('.').map(n => parseInt(n,10)||0);
if (parts.length < 3) while (parts.length < 3) parts.push(0);
if (type === 'major') { parts[0]++; parts[1]=0; parts[2]=0; }
else if (type === 'minor') { parts[1]++; parts[2]=0; }
else { parts[2]++; }
pkg.version = parts.join('.');
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('[version-bump]', type, '->', pkg.version);