#!/usr/bin/env node
const { writeFileSync, readFileSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function safeExec(cmd) {
  try { return execSync(cmd, { stdio: ['ignore','pipe','ignore'] }).toString().trim(); } catch { return ''; }
}

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const commit = safeExec('git rev-parse --short HEAD');
const branch = safeExec('git rev-parse --abbrev-ref HEAD');
const timestamp = new Date().toISOString();
const buildNumber = process.env.BUILD_NUMBER || '';

const content = {
  version,
  commit,
  branch,
  timestamp,
  buildNumber,
  node: process.version
};

writeFileSync(path.join(process.cwd(), 'src', 'build-info.json'), JSON.stringify(content, null, 2));
console.log('[build-info] generated', content);