import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'vendor']);
const textExtensions = new Set(['.js', '.mjs', '.json', '.yaml', '.yml', '.md', '.html', '.css', '.svg', '.txt']);
const findings = [];
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['OpenAI-style secret key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['absolute macOS user path', /\/Users\/[A-Za-z0-9._-]+\//],
  ['absolute Windows user path', /[A-Za-z]:\\Users\\[^\\\s]+\\/],
  ['non-example email', /\b[A-Z0-9._%+-]+@(?!example\.com\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i]
];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) visit(path.join(directory, entry.name));
      continue;
    }
    const file = path.join(directory, entry.name);
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const [name, expression] of rules) {
      if (name === 'non-example email' && entry.name === 'pnpm-lock.yaml') continue;
      if (expression.test(source)) findings.push(`${path.relative(root, file)}: ${name}`);
    }
  }
}

visit(root);
if (findings.length) {
  console.error('Security check failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}
console.log('Security check passed: no common secrets or personal paths found.');
