#!/usr/bin/env node
/*
 * Fails when a Node version pin disagrees with .nvmrc, the one version source.
 *
 *   npm run check:node-version
 *
 * CI's setup-node reads .nvmrc directly. The places it cannot reach are checked
 * here: every `FROM node:` tag in the Dockerfile and `engines.node` in
 * package.json and package-lock.json. A Node bump that misses one fails CI.
 * The Dockerfile also checks the binary inside the image against .nvmrc.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const expected = read('.nvmrc').trim().replace(/^v/, '');
if (!/^\d+\.\d+\.\d+$/.test(expected)) {
  console.error(`.nvmrc must hold one exact version such as 24.22.1, found "${expected}"`);
  process.exit(1);
}

const found = [];
// Matches flags such as --platform, leading spaces, and a registry prefix.
const dockerfile = read('Dockerfile').replace(/\\\r?\n/g, ' ');
for (const match of dockerfile.matchAll(/^\s*FROM\s+(?:--\S+\s+)*(?:\S+\/)?node:(\S+)/gim)) {
  found.push({ where: `Dockerfile FROM node:${match[1]}`, version: match[1].split(/[-@]/)[0] });
}
if (found.length === 0) {
  console.error('Dockerfile has no FROM node: line');
  process.exit(1);
}
found.push({
  where: 'package.json engines.node',
  version: JSON.parse(read('package.json')).engines?.node,
});
found.push({
  where: 'package-lock.json engines.node',
  version: JSON.parse(read('package-lock.json')).packages?.['']?.engines?.node,
});

const mismatches = found.filter(({ version }) => version !== expected);
for (const { where, version } of mismatches) {
  console.error(`${where} declares ${version}, .nvmrc declares ${expected}`);
}
if (mismatches.length > 0) process.exit(1);
console.log(`Node ${expected} everywhere: .nvmrc, ${found.map(({ where }) => where).join(', ')}`);
