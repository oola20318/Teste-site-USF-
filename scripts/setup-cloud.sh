#!/usr/bin/env bash
set -euo pipefail

cd /workspace/Teste-site-USF-
node --input-type=module -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 22 || (major === 22 && minor < 12)) { console.error('Use Node.js 24 (mínimo 22.12).'); process.exit(1); }"
npm ci --cache /workspace/.npm-cache --no-fund
npm run build
npm test
