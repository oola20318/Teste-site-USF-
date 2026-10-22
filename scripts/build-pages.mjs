import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const output = path.join(root, 'pages');
let html = await readFile(path.join(dist, 'index.html'), 'utf8');
const script = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const style = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
if (!script || !style)
  throw new Error('O build não contém o script e a folha de estilos esperados.');
const asset = (name) => {
  const resolved = path.resolve(dist, name.replace(/^\//, ''));
  if (!resolved.startsWith(path.join(dist, 'assets') + path.sep))
    throw new Error('Caminho de asset inválido.');
  return resolved;
};
let js = await readFile(asset(script[1]), 'utf8');
let css = await readFile(asset(style[1]), 'utf8');
for (const match of css.matchAll(/url\((\/assets\/[^)]+)\)/g)) {
  const bytes = await readFile(asset(match[1]));
  css = css.replaceAll(match[1], `data:font/woff2;base64,${bytes.toString('base64')}`);
}
js = js.replaceAll('/referencias/anexo-coelho-savassi.pdf', './anexo-coelho-savassi.pdf');
if (/<\/script/i.test(js))
  throw new Error('O script requer tratamento antes de ser incorporado ao HTML.');
html = html.replace(script[0], '').replace(style[0], () => `<style>${css}</style>`);
html = html.replace('</body>', () => `<script type="module">${js}</script></body>`);
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'index.html'), html);
await writeFile(path.join(output, '.nojekyll'), '');
await copyFile(
  path.join(dist, 'referencias/anexo-coelho-savassi.pdf'),
  path.join(output, 'anexo-coelho-savassi.pdf'),
);
console.log('GitHub Pages: pages/index.html, PDF e .nojekyll gerados.');
