import { cp, mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const staging = await mkdtemp(join(root, '.build-'));

try {
  await cp(join(root, 'index.html'), join(staging, 'index.html'));
  await cp(join(root, 'src'), join(staging, 'src'), { recursive: true });
  const assets = join(root, 'assets');
  const assetInfo = await stat(assets).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (assetInfo?.isDirectory()) {
    await mkdir(join(staging, 'assets'));
    await cp(assets, join(staging, 'assets'), { recursive: true });
  }
  await rm(output, { recursive: true, force: true });
  await rename(staging, output);
  console.log('Build statica pronta in dist/ (HTML, JavaScript e CSS).');
} catch (error) {
  await rm(staging, { recursive: true, force: true });
  throw error;
}
