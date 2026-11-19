import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const outPath = path.join(rootDir, 'Sunken-Chime.html');

const indexHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  throw new Error('dist/index.html not found. Run vite build first.');
}

let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Inline stylesheets
html = html.replace(
  /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
  (full, href) => {
    const cleanRel = href.replace(/^\/+/, '');
    const cssPath = path.join(distDir, cleanRel);
    if (!fs.existsSync(cssPath)) return full;
    const css = fs.readFileSync(cssPath, 'utf8').replace(/<\/style/gi, '<\\/style');
    return `<style>\n${css}\n</style>`;
  }
);

// Inline module script(s)
html = html.replace(
  /<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
  (full, src) => {
    const cleanRel = src.replace(/^\/+/, '');
    const jsPath = path.join(distDir, cleanRel);
    if (!fs.existsSync(jsPath)) return full;
    const js = fs.readFileSync(jsPath, 'utf8').replace(/<\/script/gi, '<\\/script');
    // Place inline module script at the end of body if currently in head, or keep inline
    return `<script type="module">\n${js}\n</script>`;
  }
);

// Move inlined module script right before </body> so #root exists reliably even offline
const scriptMatches = [];
html = html.replace(/<script type="module">\n[\s\S]*?<\/script>/g, (match) => {
  scriptMatches.push(match);
  return '';
});
if (scriptMatches.length > 0) {
  html = html.replace('</body>', () => `${scriptMatches.join('\n')}\n</body>`);
}

fs.writeFileSync(outPath, html, 'utf8');
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`Built self-contained single-file HTML: ${outPath} (${sizeKb} KB)`);
