import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const version = '0.148.0';
const root = path.resolve(import.meta.dirname, '..');
const targets = {
  'darwin-arm64': {
    npmVersion: `${version}-darwin-arm64`,
    source: 'package/vendor/aarch64-apple-darwin/bin/codex',
    executable: 'codex',
    integrity: 'sha512-xgBPFiF1fHUlRS7HE6wGB56LjBJh16kGD7b4TTbwdVBZNB4QDkTok+vdkAGrfpVkfKcwGNhPSKDgCw+KMZOVug==',
    sha256: 'b0308517b20543012fa2171aa3d46ce455a7456c4eb2a552ab9468ba4eeb1e50'
  },
  'darwin-x64': {
    npmVersion: `${version}-darwin-x64`,
    source: 'package/vendor/x86_64-apple-darwin/bin/codex',
    executable: 'codex',
    integrity: 'sha512-qepQolhJutfOp+e9i7L3xsi8aoWeCUiiRq274WMWqRj50rKTrXxsuAgkAwDbqEfT3G5VynhYZuQvDsW37JgdNQ==',
    sha256: 'e7c95ea07d51ebda48153b3f2ecc6dda28ac6cdddd2d8523008c63f4e5b5cb17'
  },
  'win32-x64': {
    npmVersion: `${version}-win32-x64`,
    source: 'package/vendor/x86_64-pc-windows-msvc/bin/codex.exe',
    executable: 'codex.exe',
    integrity: 'sha512-/Jg8eYw0BqTGNUpnrzzWlK2kbu29NWg7t6pnUDEfxqpTUf+mK8r3okXQn60Zjbk9InYZ4d8SwSjrtOa+i5hSPw==',
    sha256: '2ad2cf8a732da68b8f141634f92db1a03016c5faf533a7225fbc0fb740130410'
  }
};

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function download(targetName, target) {
  const destinationDirectory = path.join(root, 'vendor', 'codex', targetName);
  const destination = path.join(destinationDirectory, target.executable);
  if (fs.existsSync(destination) && sha256(destination) === target.sha256) return;
  fs.mkdirSync(destinationDirectory, { recursive: true });
  const metadataUrl = `https://registry.npmjs.org/@openai%2Fcodex/${target.npmVersion}`;
  const metadataResponse = await fetch(metadataUrl);
  if (!metadataResponse.ok) throw new Error(`Cannot load ${metadataUrl}: ${metadataResponse.status}`);
  const metadata = await metadataResponse.json();
  if (metadata.dist?.integrity !== target.integrity) throw new Error(`Registry integrity does not match the pinned value for ${targetName}`);
  const tarballUrl = new URL(metadata.dist.tarball);
  if (tarballUrl.protocol !== 'https:' || tarballUrl.hostname !== 'registry.npmjs.org') throw new Error(`Untrusted tarball URL for ${targetName}`);
  const archiveResponse = await fetch(tarballUrl);
  if (!archiveResponse.ok) throw new Error(`Cannot download ${metadata.dist.tarball}: ${archiveResponse.status}`);
  const archive = Buffer.from(await archiveResponse.arrayBuffer());
  const expected = Buffer.from(target.integrity.replace(/^sha512-/, ''), 'base64');
  const actual = crypto.createHash('sha512').update(archive).digest();
  if (expected.length !== actual.length || !crypto.timingSafeEqual(actual, expected)) throw new Error(`Integrity check failed for ${targetName}`);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-bin-'));
  try {
    const archiveFile = path.join(temporary, 'codex.tgz');
    fs.writeFileSync(archiveFile, archive, { mode: 0o600 });
    execFileSync('tar', ['-xzf', archiveFile, '-C', temporary, target.source]);
    const extracted = path.join(temporary, target.source);
    if (!fs.lstatSync(extracted).isFile()) throw new Error(`Extracted Codex is not a regular file for ${targetName}`);
    if (sha256(extracted) !== target.sha256) throw new Error(`Binary SHA-256 check failed for ${targetName}`);
    fs.copyFileSync(extracted, destination);
    if (targetName.startsWith('darwin')) fs.chmodSync(destination, 0o755);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

const requested = process.argv.slice(2);
const selectedTargets = requested.length ? Object.entries(targets).filter(([name]) => requested.includes(name)) : Object.entries(targets);
if (requested.length && selectedTargets.length !== requested.length) throw new Error(`Unknown target. Available: ${Object.keys(targets).join(', ')}`);

for (const [targetName, target] of selectedTargets) {
  process.stdout.write(`Preparing Codex ${targetName}…\n`);
  await download(targetName, target);
}
