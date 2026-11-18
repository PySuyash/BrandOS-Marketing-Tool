import fs from 'fs';
import path from 'path';
import { transform } from 'esbuild';

const ROOTS = ['server.js', 'vite.config.js', 'server', 'src', 'scripts'];
const EXTENSIONS = new Set(['.js', '.jsx']);

function collectFiles(entry, acc) {
  if (!fs.existsSync(entry)) return;
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(entry)) {
      if (name === 'node_modules' || name === 'dist' || name === 'assets') continue;
      collectFiles(path.join(entry, name), acc);
    }
  } else if (EXTENSIONS.has(path.extname(entry))) {
    acc.push(entry);
  }
}

async function run() {
  const files = [];
  for (const root of ROOTS) {
    collectFiles(path.resolve(process.cwd(), root), files);
  }

  let hasError = false;
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const loader = file.endsWith('.jsx') ? 'jsx' : 'js';
    try {
      await transform(code, {
        loader,
        sourcefile: file,
        format: 'esm',
        jsx: 'automatic',
      });
    } catch (err) {
      hasError = true;
      console.error(`Lint syntax error in ${path.relative(process.cwd(), file)}:`);
      console.error(err.message || err);
    }
  }

  if (hasError) {
    process.exit(1);
  }
  console.log(`Checked ${files.length} JS/JSX files with 0 syntax errors.`);
}

run();
