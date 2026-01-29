const express = require('express');
const { Liquid } = require('liquidjs');
const path = require('path');
const fs = require('fs');
const browserSync = require('browser-sync').create();
let open;

(async () => {
  open = (await import('open')).default;
})();

const app = express();

const engine = new Liquid({
  root: [
    path.resolve(__dirname),
    path.resolve(__dirname, '../components')
  ],
  extname: '.liquid',
  fs: {
    readFileSync: (file) => fs.readFileSync(file, 'utf8'),
    existsSync: (file) => fs.existsSync(file),
    exists: (file) => Promise.resolve(fs.existsSync(file)),
    readFile: (file) => Promise.resolve(fs.readFileSync(file, 'utf8')),
    resolve: (root, file, ext) => {
      if(!file.includes('/') && !file.includes('.')) return path.resolve(__dirname, `../components/${file}/${file}.liquid`);
      const resolvedPath = path.resolve(root, file + (file.includes('.') ? '' : ext));
      return resolvedPath;
    }
  }
});

// Serve static assets
app.use('/components', express.static(path.resolve(__dirname, '../components')));
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// Load sample data
const context = process.env.CONTEXT; 
const dataPath = path.resolve(__dirname, `../data/${context}.json`);
const sampleData = fs.existsSync(dataPath) ? require(dataPath) : {};

// Render index.liquid
app.get('/', async (req, res) => {
  let html = await engine.renderFile('index.liquid', sampleData);
  html = html.replace('</body>', '<script id="__bs_script__">document.write("<script async src=\"/browser-sync/browser-sync-client.js\"></script>");</script></body>');
  res.send(html);
});

// Start server
const PORT = 3000;
const BS_PORT = 3001;

const { spawn } = require('child_process');
function startTailwind() {
  console.log(':rocket: Starting Tailwind CSS Watcher...');
  const tailwind = spawn('npx', [
    'tailwindcss',
    '-i', './src/input.css',
    '-o', './dist/output.css',
    '--watch'
  ], {
    shell: true,
    stdio: 'inherit', 
    cwd: path.resolve(__dirname, '../backend') 
  });
  tailwind.on('error', (err) => {
    console.error(':x: Tailwind failed to start:', err.message);
  });
  process.on('exit', () => tailwind.kill());
};

startTailwind();

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  const bsUrl = `http://localhost:${BS_PORT}`;
  console.log(`Express dev server running at ${url}`);
  console.log(`Live reload (BrowserSync) available at ${bsUrl}`);
  // Start browser-sync for live reload
  browserSync.init({
    proxy: url,
    port: BS_PORT,
    files: [
      path.resolve(__dirname, './index.liquid'),
      path.resolve(__dirname, '../components/**/*.{liquid,js,css}'),
      path.resolve(__dirname, '../data/**/*.json')
    ],
    open: true, // Let browser-sync open the browser
    notify: false,
    ui: false
  });
});