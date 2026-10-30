'use strict';
// Navegador embutido (TASK-022): uma WebContentsView por aba web e uma vista pequena só com o alternador Terminais / Web.
// A vista nativa fica por cima do HTML, por isso o alternador é outra vista (adicionada depois, logo acima) e, com menu/modal aberto,
// a interface troca a vista do navegador por uma imagem dela (web:snapshot).
const { WebContentsView, session } = require('electron');
const path = require('path');

const PARTITION = 'persist:termix-web'; // perfil próprio e persistente: cookies e logins ficam entre aberturas, separados da interface do app
const isWeb = (u) => /^https?:\/\//i.test(u);

function setupWeb({ ipcMain, getWin }) {
  const views = new Map(); // id da aba web -> WebContentsView
  let dock = null;
  let dockState = null;
  let active = null;

  const win = () => { const w = getWin(); return w && !w.isDestroyed() ? w : null; };
  const send = (ch, m) => { const w = win(); if (w) w.webContents.send(ch, m); };
  const rectOf = (r) => ({ x: Math.round(r.x), y: Math.round(r.y), width: Math.max(0, Math.round(r.width)), height: Math.max(0, Math.round(r.height)) });
  const onTop = () => { const w = win(); if (w && dock) w.contentView.addChildView(dock); }; // adicionar de novo uma vista já presente a leva para o topo

  let permsSet = false;
  function setupSession() {
    if (permsSet) return;
    permsSet = true;
    // MVP: o navegador é para ver e testar sistemas; sem câmera, microfone, localização nem notificações
    session.fromPartition(PARTITION).setPermissionRequestHandler((_wc, perm, cb) => cb(['clipboard-sanitized-write', 'fullscreen'].includes(perm)));
  }

  function create(id) {
    setupSession();
    const view = new WebContentsView({ webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    view.setBackgroundColor('#ffffff');
    const wc = view.webContents;
    const state = () => ({ id, url: wc.getURL(), title: wc.getTitle(), loading: wc.isLoading(), canBack: wc.navigationHistory.canGoBack(), canForward: wc.navigationHistory.canGoForward() });
    const upd = () => { if (!wc.isDestroyed()) send('web:update', state()); };
    for (const ev of ['did-navigate', 'did-navigate-in-page', 'page-title-updated', 'did-start-loading', 'did-stop-loading']) wc.on(ev, upd);
    wc.setWindowOpenHandler(({ url }) => { if (isWeb(url)) send('web:newtab', { from: id, url }); return { action: 'deny' }; }); // target=_blank vira aba web
    wc.on('will-navigate', (e, url) => { if (!isWeb(url) && !/^about:blank$/i.test(url)) e.preventDefault(); });
    wc.on('before-input-event', (e, input) => {
      if (input.type !== 'keyDown' || !input.control) return;
      if (input.key === '`') { e.preventDefault(); send('web:toggle'); }
      else if (input.key.toLowerCase() === 'l') { e.preventDefault(); send('web:focusurl'); }
    });
    views.set(id, view);
    const w = win();
    if (w) w.contentView.addChildView(view);
    onTop();
    return view;
  }

  function hideAll() { for (const v of views.values()) v.setVisible(false); active = null; }

  ipcMain.on('web:show', (_e, m) => {
    if (!m || !m.id) { hideAll(); return; }
    let view = views.get(m.id);
    if (!view) { view = create(m.id); if (m.url && isWeb(m.url)) view.webContents.loadURL(m.url).catch(() => {}); }
    for (const [id, v] of views) if (id !== m.id) v.setVisible(false);
    view.setBounds(rectOf(m.rect));
    view.setVisible(true);
    active = m.id;
    if (m.focus) view.webContents.focus();
  });
  ipcMain.on('web:go', (_e, { id, url }) => {
    const view = views.get(id);
    if (!view) return;
    if (isWeb(url)) { view.webContents.loadURL(url).catch(() => {}); view.webContents.focus(); }
  });
  ipcMain.on('web:nav', (_e, { id, cmd }) => {
    const view = views.get(id);
    if (!view) return;
    const wc = view.webContents;
    if (cmd === 'back' && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
    else if (cmd === 'forward' && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
    else if (cmd === 'reload') wc.reload();
    else if (cmd === 'hardreload') wc.reloadIgnoringCache();
    else if (cmd === 'stop') wc.stop();
    else if (cmd === 'devtools') { if (wc.isDevToolsOpened()) wc.closeDevTools(); else wc.openDevTools({ mode: 'detach' }); }
  });
  ipcMain.on('web:close', (_e, { id }) => {
    const view = views.get(id);
    if (!view) return;
    views.delete(id);
    if (active === id) active = null;
    const w = win();
    try { if (w) w.contentView.removeChildView(view); } catch { /* já removida */ }
    try { view.webContents.close(); } catch { /* já fechada */ }
  });
  ipcMain.handle('web:snapshot', async () => {
    const view = active && views.get(active);
    if (!view) return null;
    try { return (await view.webContents.capturePage()).toDataURL(); } catch { return null; }
  });

  /* ---------- alternador (vista própria, por cima da vista do navegador) ---------- */
  function createDock() {
    const w = win();
    if (!w || dock) return;
    dock = new WebContentsView({ webPreferences: { preload: path.join(__dirname, 'dock-preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
    dock.setBackgroundColor('#00000000');
    dock.setVisible(false);
    dock.webContents.on('did-finish-load', () => { if (dockState) dock.webContents.send('dock:render', dockState); });
    dock.webContents.loadFile(path.join(__dirname, 'dock.html'));
    w.contentView.addChildView(dock);
  }
  ipcMain.on('dock:state', (_e, st) => {
    if (!dock) return;
    dockState = st;
    if (st.rect) dock.setBounds(rectOf(st.rect));
    dock.setVisible(!!st.visible);
    if (!dock.webContents.isLoading()) dock.webContents.send('dock:render', st);
  });
  ipcMain.on('dock:click', (e, mode) => {
    if (!dock || e.sender !== dock.webContents) return;
    const w = win();
    if (!w) return;
    w.webContents.focus(); // o clique deu o foco à vista do alternador; devolve à interface
    send('dock:action', mode);
  });

  return {
    attach() { createDock(); },
    destroy() {
      for (const v of views.values()) { try { v.webContents.close(); } catch { /* já fechada */ } }
      views.clear();
      if (dock) { try { dock.webContents.close(); } catch { /* já fechada */ } dock = null; }
    },
  };
}

module.exports = { setupWeb };
