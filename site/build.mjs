#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(__dirname, 'cases.json');
const PORTAL_INDEX = path.join(__dirname, 'index.html');

const SKIP_NAMES = new Set([
  '.DS_Store',
  'node_modules',
  '.git',
  '.venv',
  '__pycache__',
  'Thumbs.db',
]);

function parseOutArg(argv) {
  let outArg = '.pages-dist';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      outArg = argv[i + 1];
      i++;
    } else if (argv[i].startsWith('--out=')) {
      outArg = argv[i].slice('--out='.length);
    }
  }
  return path.isAbsolute(outArg) ? outArg : path.resolve(REPO_ROOT, outArg);
}

function copyDirFiltered(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function assertInsideRepo(resolvedPath, label) {
  const rel = path.relative(REPO_ROOT, resolvedPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`${label} resolves outside repository root: ${resolvedPath}`);
  }
}

function buildRedirectHtml(targetEntry, title) {
  const safeTarget = targetEntry.replace(/"/g, '&quot;');
  const safeTitle = String(title || 'Redirecting').replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=./${safeTarget}">
  <title>${safeTitle}</title>
</head>
<body>
  <p>正在前往 <a href="./${safeTarget}">${safeTitle}</a>…</p>
</body>
</html>
`;
}

function main() {
  const outDir = parseOutArg(process.argv.slice(2));

  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing manifest: ${MANIFEST_PATH}`);
  }
  if (!fs.existsSync(PORTAL_INDEX)) {
    throw new Error(`Missing portal index: ${PORTAL_INDEX}`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (!manifest || !Array.isArray(manifest.cases)) {
    throw new Error('site/cases.json must contain a "cases" array.');
  }

  const seenSlugs = new Set();
  const slugPattern = /^[a-z0-9-]+$/;

  for (const item of manifest.cases) {
    if (!item.slug || typeof item.slug !== 'string' || !slugPattern.test(item.slug)) {
      throw new Error(`Invalid case slug "${item.slug}" (must match ^[a-z0-9-]+$).`);
    }
    if (seenSlugs.has(item.slug)) {
      throw new Error(`Duplicate case slug "${item.slug}" in site/cases.json.`);
    }
    seenSlugs.add(item.slug);

    if (!item.source || typeof item.source !== 'string') {
      throw new Error(`Case "${item.slug}" is missing a valid "source" path.`);
    }
    const srcAbs = path.resolve(REPO_ROOT, item.source);
    assertInsideRepo(srcAbs, `Case "${item.slug}" source`);
    if (!fs.existsSync(srcAbs)) {
      throw new Error(`Case "${item.slug}" source does not exist: ${item.source}`);
    }
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // GitHub Pages .nojekyll + portal assets
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
  fs.copyFileSync(PORTAL_INDEX, path.join(outDir, 'index.html'));
  fs.copyFileSync(MANIFEST_PATH, path.join(outDir, 'cases.json'));

  const summaryRows = [];

  for (const item of manifest.cases) {
    const mode = item.mode || 'static';
    const entry = item.entry || 'index.html';
    const srcAbs = path.resolve(REPO_ROOT, item.source);
    const destCaseDir = path.join(outDir, 'cases', item.slug);
    const stat = fs.statSync(srcAbs);

    if (mode === 'build') {
      if (!item.buildCommand || !item.distDir) {
        throw new Error(`Case "${item.slug}" with mode="build" requires "buildCommand" and "distDir".`);
      }
      execSync(item.buildCommand, { cwd: srcAbs, stdio: 'inherit' });
      const distAbs = path.resolve(srcAbs, item.distDir);
      assertInsideRepo(distAbs, `Case "${item.slug}" distDir`);
      if (!fs.existsSync(distAbs)) {
        throw new Error(`Case "${item.slug}" distDir not found after build: ${distAbs}`);
      }
      copyDirFiltered(distAbs, destCaseDir);
    } else if (stat.isDirectory()) {
      copyDirFiltered(srcAbs, destCaseDir);
    } else if (stat.isFile() && srcAbs.toLowerCase().endsWith('.html')) {
      fs.mkdirSync(destCaseDir, { recursive: true });
      fs.copyFileSync(srcAbs, path.join(destCaseDir, 'index.html'));
    } else {
      throw new Error(`Unsupported source for case "${item.slug}": ${item.source}`);
    }

    const expectedEntryPath = stat.isFile()
      ? path.join(destCaseDir, 'index.html')
      : path.join(destCaseDir, entry);

    if (!fs.existsSync(expectedEntryPath)) {
      throw new Error(`Entry file "${entry}" missing in built output for case "${item.slug}".`);
    }

    if (!stat.isFile() && entry !== 'index.html' && !fs.existsSync(path.join(destCaseDir, 'index.html'))) {
      fs.writeFileSync(
        path.join(destCaseDir, 'index.html'),
        buildRedirectHtml(entry, item.title || item.slug)
      );
    }

    summaryRows.push({
      slug: item.slug,
      mode,
      source: item.source,
      url: `./cases/${item.slug}/`,
    });
  }

  console.log(`\nBuilt GitHub Pages showcase -> ${outDir}`);
  console.table(summaryRows);
}

main();
