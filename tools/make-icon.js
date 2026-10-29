// Gera assets/icon.png e assets/icon.ico. Uso: electron tools/make-icon.js
// Tamanhos grandes (48+) vêm de assets/icon.svg (detalhado); os pequenos (16 e 32) vêm de assets/icon-small.svg (traço grosso, legível).
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 64, 128, 256];
const SMALL_MAX = 32;
app.on('window-all-closed', () => {}); // a janela de renderização é destruída entre os dois SVGs; o app só sai no fim

function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = []; const bodies = [];
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); e.writeUInt8(0, 3); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12);
    offset += data.length; entries.push(e); bodies.push(data);
  }
  return Buffer.concat([header, ...entries, ...bodies]);
}

async function render(file) {
  const svg = fs.readFileSync(path.join(__dirname, '..', 'assets', file), 'utf8');
  const win = new BrowserWindow({ width: 256, height: 256, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { backgroundThrottling: false } });
  const html = `<style>html,body{margin:0;background:transparent;overflow:hidden}svg{width:256px;height:256px;display:block}</style>${svg}`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 400));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  win.destroy();
  return img;
}

app.whenReady().then(async () => {
  try {
  const big = await render('icon.svg'), small = await render('icon-small.svg');
  const pngs = SIZES.map((size) => ({ size, data: (size <= SMALL_MAX ? small : big).resize({ width: size, height: size, quality: 'best' }).toPNG() }));
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), pngs[pngs.length - 1].data);
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'icon.ico'), buildIco(pngs));
  if (process.env.ICON_PREVIEW_DIR) for (const p of pngs) fs.writeFileSync(path.join(process.env.ICON_PREVIEW_DIR, `icon-${p.size}.png`), p.data);
  console.log('ok');
  } catch (e) { console.error('ERRO', e && e.stack || e); }
  app.quit();
});
