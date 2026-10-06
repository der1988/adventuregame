import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

let temporaryDirectory;
let server;
let port;

before(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'adventuregame-http-'));
  const site = join(temporaryDirectory, 'site');
  for (const directory of ['scripts', 'src', 'assets', '.git', 'tests']) {
    await mkdir(join(site, directory), { recursive: true });
  }
  await cp(new URL('../scripts/dev-server.mjs', import.meta.url), join(site, 'scripts/dev-server.mjs'));
  const files = {
    'index.html': '<!doctype html><title>Fixture</title>',
    'src/app.js': 'export const value = 1;',
    'src/style.css': 'body { color: white; }',
    'assets/public.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    'assets/data.json': '{"value":1}',
    'assets/.private.json': '{"private":true}',
    'package.json': '{"private":true}',
    '.env': 'EXAMPLE=value',
    '.git/config': '[core]',
    'tests/private.js': 'export {}',
  };
  for (const [path, content] of Object.entries(files)) {
    await writeFile(join(site, path), content);
  }
  const outsideFile = join(temporaryDirectory, 'outside.js');
  await writeFile(outsideFile, 'export const outside = true;');
  await symlink(outsideFile, join(site, 'src/outside.js'));
  await symlink(join(site, 'package.json'), join(site, 'assets/package-link.json'));
  await symlink(join(site, 'assets/.private.json'), join(site, 'assets/private-link.json'));

  server = spawn(process.execPath, [join(site, 'scripts/dev-server.mjs')], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  port = await new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => finish(new Error(`Server startup timed out: ${stderr}`)), 5000);
    function finish(error, actualPort) {
      clearTimeout(timer);
      server.stdout.off('data', readOutput);
      server.off('error', failed);
      server.off('exit', exited);
      if (error) reject(error);
      else resolve(actualPort);
    }
    function readOutput(chunk) {
      stdout += chunk;
      const match = stdout.match(/127\.0\.0\.1:(\d+)/);
      if (match) finish(null, Number(match[1]));
    }
    function failed(error) { finish(error); }
    function exited(code) { finish(new Error(`Server exited with ${code}: ${stderr}`)); }
    server.stdout.on('data', readOutput);
    server.stderr.on('data', (chunk) => { stderr += chunk; });
    server.once('error', failed);
    server.once('exit', exited);
  });
});

after(async () => {
  if (server && server.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

function fetchPath(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves the entry page and public assets with their MIME types', async () => {
  for (const [path, mime] of [
    ['/', 'text/html'],
    ['/index.html', 'text/html'],
    ['/src/app.js', 'text/javascript'],
    ['/src/style.css', 'text/css'],
    ['/assets/public.svg', 'image/svg+xml'],
    ['/assets/data.json', 'application/json'],
  ]) {
    const response = await fetchPath(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers['content-type'].split(';')[0], mime, path);
    assert.ok(response.body.length > 0, path);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
  }
});

test('ignores query parameters when locating files', async () => {
  const plain = await fetchPath('/src/app.js');
  const query = await fetchPath('/src/app.js?version=1&path=../.git/config');
  assert.equal(query.status, 200);
  assert.deepEqual(query.body, plain.body);
});

test('HEAD returns GET metadata without a response body', async () => {
  const get = await fetchPath('/');
  const head = await fetchPath('/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(head.headers['content-length'], get.headers['content-length']);
  assert.equal(head.headers['content-type'], get.headers['content-type']);
  const missing = await fetchPath('/missing', 'HEAD');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.length, 0);
});

test('rejects methods other than GET and HEAD', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await fetchPath('/', method);
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.allow, 'GET, HEAD');
  }
});

test('does not expose repository configuration, tests, scripts or hidden files', async () => {
  for (const path of [
    '/package.json', '/.env', '/.git/config', '/scripts/dev-server.mjs',
    '/tests/private.js', '/assets/.private.json', '/src', '/assets/', '/missing',
  ]) {
    assert.equal((await fetchPath(path)).status, 404, path);
  }
});

test('rejects raw and encoded traversal rather than normalizing it into a public path', async () => {
  for (const path of [
    '/src/../index.html', '/src/%2e%2e/index.html', '/src/..%2findex.html',
    '/src/%5c..%5cpackage.json', '/src/..\\package.json',
  ]) {
    assert.equal((await fetchPath(path)).status, 403, path);
  }
});

test('rejects symlinks to files outside the public routes', async () => {
  for (const path of ['/src/outside.js', '/assets/package-link.json', '/assets/private-link.json']) {
    assert.equal((await fetchPath(path)).status, 403, path);
  }
});

test('responds with 400 for malformed or null-containing paths', async () => {
  for (const path of ['/src/%', '/src/%00', 'http://example.invalid/index.html']) {
    assert.equal((await fetchPath(path)).status, 400, path);
  }
});
