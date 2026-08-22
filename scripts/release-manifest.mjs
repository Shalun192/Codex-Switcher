import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, readdir, readFile, readlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;
const build = packageJson.build?.buildVersion;
const outputDirectory = path.join(projectRoot, 'release-packages');
const outputPath = path.join(outputDirectory, `FILE_MANIFEST_${version}.txt`);

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function collectTree(rootPath) {
  const entries = [];

  async function visit(currentPath, relativePath) {
    const stat = await lstat(currentPath);
    const normalizedPath = relativePath.split(path.sep).join('/');
    if (stat.isSymbolicLink()) {
      const target = await readlink(currentPath);
      entries.push({ hash: sha256Text(`symlink:${target}`), path: `${normalizedPath} -> ${target}` });
      return;
    }
    if (stat.isDirectory()) {
      const children = (await readdir(currentPath)).sort((a, b) => a.localeCompare(b, 'en'));
      for (const child of children) {
        if (child === '.DS_Store') continue;
        await visit(path.join(currentPath, child), path.join(relativePath, child));
      }
      return;
    }
    if (stat.isFile()) entries.push({ hash: await sha256File(currentPath), path: normalizedPath });
  }

  await visit(rootPath, '');
  return entries;
}

async function collectTrackedSource() {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: projectRoot,
    encoding: 'buffer',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString('utf8') || 'git ls-files failed');
  }

  const files = result.stdout.toString('utf8').split('\0').filter(Boolean).sort();
  return Promise.all(files.map(async (relativePath) => ({
    hash: await sha256File(path.join(projectRoot, relativePath)),
    path: relativePath,
  })));
}

const sections = [
  ['TRACKED SOURCE', await collectTrackedSource()],
  ['MACOS APPLICATION', await collectTree(path.join(projectRoot, 'dist', 'mac-universal', 'Codex Switcher Local.app'))],
  ['WINDOWS APPLICATION', await collectTree(path.join(projectRoot, 'dist', 'win-unpacked'))],
];

const lines = [
  '# Codex Switcher release file manifest',
  `version=${version}`,
  `build=${build}`,
  'algorithm=SHA-256',
  'symlinks=SHA-256 of the UTF-8 string "symlink:<target>"',
  '',
];

for (const [name, entries] of sections) {
  lines.push(`## ${name} (${entries.length} entries)`);
  for (const entry of entries) lines.push(`${entry.hash}  ${entry.path}`);
  lines.push('');
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${lines.join('\n')}\n`, { mode: 0o644 });
console.log(path.relative(projectRoot, outputPath));
