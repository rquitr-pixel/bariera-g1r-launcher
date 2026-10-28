const { app, BrowserWindow, ipcMain, screen, shell, clipboard, dialog, safeStorage } = require('electron');
const path = require('path'), fs = require('fs'), net = require('net'), { spawn } = require('child_process');

// port = game/connect port (UDP); probePort = TCP port answering on the VPS, used only for the status check
const SERVER = { host: '57.129.157.207', port: 7777, probePort: 7780, name: 'Bariera' };
// remote config (server address, links, texts) read from the public repo; cached locally for offline
const REMOTE_CFG_URL = 'https://raw.githubusercontent.com/rquitr-pixel/bariera-g1r-launcher/main/config/serwer.json';
let REMOTE_TEXTS = null, REMOTE_PW = '';
// ---- dziennik launchera: %APPDATA%\\Bariera Pierwsze Lata\\launcher.log (bez haseł) ----
function mainLog(msg) { try { const f = path.join(app.getPath('userData'), 'launcher.log'); fs.mkdirSync(path.dirname(f), { recursive: true });
  try { if (fs.statSync(f).size > 2e6) fs.renameSync(f, f + '.old'); } catch {}
  fs.appendFileSync(f, new Date().toISOString() + ' ' + msg + '\n'); } catch {} }
let crashShown = false;
function fatal(where, e) {
  mainLog('BLAD ' + where + ': ' + (e && e.stack || e));
  if (crashShown) return; crashShown = true;
  try { dialog.showErrorBox('Bariera: Pierwsze Lata — błąd launchera',
    'Coś poszło nie tak (' + where + '). Launcher spróbuje działać dalej.\n\nSzczegóły zapisałem w pliku:\n' + path.join(app.getPath('userData'), 'launcher.log') +
    '\n\nJeśli problem wraca, wyślij ten plik na naszym Discordzie: https://discord.gg/kfBdN3ZctJ'); } catch {}
  setTimeout(() => { crashShown = false; }, 30000);
}
process.on('uncaughtException', e => fatal('proces główny', e));
process.on('unhandledRejection', e => fatal('zadanie w tle', e));
// placeholder z publicznej konfiguracji (np. "env:...") to nie jest hasło
const isRealPw = p => typeof p === 'string' && p.trim() !== '' && !/^env:/i.test(p.trim());
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
// ---- built-in links (swap SITE_URL / RULES_URL / LORE_URL when our own site is live) ----
const SITE_URL = 'https://g1r-mp.com';
const RULES_URL = SITE_URL; // TODO: SITE_URL + '/zasady'
const LORE_URL = SITE_URL;  // TODO: SITE_URL + '/fabula'
const DISCORD_URL = 'https://discord.gg/kfBdN3ZctJ';
let LINKS = { strona: SITE_URL, discord: DISCORD_URL, zasady: RULES_URL, lore: LORE_URL };
const W = 1280, H = 720;
let win, cfgPath, cfg = {};

function loadCfg() {
  cfgPath = path.join(app.getPath('userData'), 'config.json');
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch { cfg = {}; }
  cfg = Object.assign({ lang: 'pl', scale: 1, launcherPath: '', links: {
    } }, cfg);
  cfg.links = LINKS; // built-in only, not user-editable
}
function hashPw(p) { return require('crypto').createHash('sha256').update(p).digest('hex').slice(0, 16); }
function applyRemote(r) {
  if (!r || typeof r !== 'object') return;
  if (r.server && r.server.host) Object.assign(SERVER, r.server);
  if (r.links) { LINKS = Object.assign({}, LINKS, r.links); cfg.links = LINKS; }
  if (r.teksty) REMOTE_TEXTS = r.teksty;
  if (isRealPw(r.serverPassword)) {
    // remote password changed since last seen -> drop the manual override so 'Graj' keeps working
    if (cfg.remotePwSeen && cfg.remotePwSeen !== hashPw(r.serverPassword)) { delete cfg.pwEnc; delete cfg.pwManual; }
    cfg.remotePwSeen = hashPw(r.serverPassword); REMOTE_PW = r.serverPassword; saveCfg();
  }
}
function fetchRemote() {
  const cache = path.join(app.getPath('userData'), 'serwer-cache.json');
  try { applyRemote(JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'serwer.json'), 'utf8'))); } catch {}
  try { applyRemote(JSON.parse(fs.readFileSync(cache, 'utf8'))); } catch {}
  return new Promise(res => {
    const req = require('https').get(REMOTE_CFG_URL + '?t=' + Date.now(), { timeout: 5000 }, rs => {
      let b = ''; rs.on('data', d => b += d);
      rs.on('end', () => { try { if (rs.statusCode === 200) { const j = JSON.parse(b); applyRemote(j); fs.writeFileSync(cache, b); mainLog('konfiguracja zdalna OK'); } else mainLog('konfiguracja zdalna HTTP ' + rs.statusCode); } catch (e) { mainLog('konfiguracja zdalna zla: ' + e.message); } res(); });
    });
    req.on('timeout', () => req.destroy()); req.on('error', e => { mainLog('brak konfiguracji zdalnej (uzywam zapisanej): ' + e.message); res(); });
  });
}
// auto-update from GitHub releases (latest.yml), same approach as the DayZ launcher
function setupAutoUpdate() {
  if (!app.isPackaged) return;
  let autoUpdater; try { ({ autoUpdater } = require('electron-updater')); } catch { return; }
  autoUpdater.on('error', e => { log({ ev: 'UPDATE_ERR', msg: String(e && e.message).slice(0, 200) }); mainLog('aktualizacja: ' + String(e && e.message).slice(0, 200)); });
  autoUpdater.on('update-available', i => mainLog('dostepna aktualizacja ' + i.version));
  autoUpdater.on('update-downloaded', async i => {
    const r = await dialog.showMessageBox(win, { type: 'info', buttons: ['Uruchom ponownie teraz', 'Później'], defaultId: 0, cancelId: 1,
      title: 'Aktualizacja launchera', message: `Pobrano nową wersję launchera (${i.version}).`, detail: 'Zainstalować ją teraz? Launcher uruchomi się ponownie. Jeśli wybierzesz „Później”, aktualizacja zainstaluje się przy zamknięciu.' });
    if (r.response === 0) setImmediate(() => { try { autoUpdater.quitAndInstall(true, true); } catch {} setTimeout(() => app.exit(0), 4000); });
  });
  autoUpdater.checkForUpdates().catch(() => {});
}
function saveCfg() { try { fs.mkdirSync(path.dirname(cfgPath), { recursive: true }); fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2)); } catch (e) {} }

// --- find official launcher (read-only search, newest build wins) ---
function findInDir(dir) {
  try {
    const f = fs.readdirSync(dir).filter(n => /^G1RMP-Launcher.*\.exe$/i.test(n)).sort((a, b) => {
      const n = s => +((s.match(/build(\d+)/i) || [0, 0])[1]); return n(b) - n(a); });
    return f.length ? path.join(dir, f[0]) : null;
  } catch { return null; }
}
function remember(p) { if (cfg.launcherPath !== p) { cfg.launcherPath = p; saveCfg(); mainLog('znaleziono klienta: ' + p); } return p; }
function detectLauncher() {
  if (cfg.launcherPath && fs.existsSync(cfg.launcherPath)) return cfg.launcherPath;
  if (process.platform !== 'win32') return null;
  const roots = [];
  for (const d of 'CDEFGHIJKLMN') roots.push(d + ':\\');
  const subs = ['G1RMP_Client', 'G1RMP', 'G1R-MP', 'Games\\G1RMP_Client', 'Gry\\G1RMP_Client', 'Program Files\\G1RMP', 'Program Files (x86)\\G1RMP'];
  const la = process.env.LOCALAPPDATA; if (la) subs.push(path.relative('C:\\', path.join(la, 'G1RMultiplayer')));
  for (const r of roots) { if (!fs.existsSync(r)) continue;
    for (const s of subs) { const hit = findInDir(path.join(r, s)); if (hit) return remember(hit); } }
  // typowe miejsca użytkownika (także z polskimi znakami / spacjami w nazwie konta), jeden poziom w głąb
  const home = process.env.USERPROFILE || '', extra = [la, la && path.join(la, 'Programs'), process.env.APPDATA, home && path.join(home, 'Desktop'),
    home && path.join(home, 'Pulpit'), home && path.join(home, 'Downloads'), home && path.join(home, 'Documents'), home && path.join(home, 'Games'),
    process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean);
  for (const d of extra) { let hit = findInDir(d); if (hit) return remember(hit);
    try { for (const n of fs.readdirSync(d)) { if (!/g1r|gothic/i.test(n)) continue; hit = findInDir(path.join(d, n)); if (hit) return remember(hit); } } catch {} }
  return null;
}

// --- favourites: READ ONLY, never written ---
function favouriteState() {
  const la = process.env.LOCALAPPDATA; if (!la) return 'unknown';
  try { const t = fs.readFileSync(path.join(la, 'G1RMultiplayer', 'launcher.json'), 'utf8');
    return t.includes(SERVER.host) ? 'yes' : 'no'; } catch { return 'unknown'; }
}

// --- server status: TCP connect check + latency ---
function tcpPing() {
  return new Promise(res => {
    const t0 = Date.now(), s = net.connect({ host: SERVER.host, port: SERVER.probePort });
    const done = (ok) => { s.destroy(); res(ok ? Date.now() - t0 : null); };
    s.setTimeout(3000, () => done(false)); s.once('connect', () => done(true)); s.once('error', () => done(false));
  });
}
// read-only VPS endpoint: {online, players, max} (count only, no names)
function liveStatus() {
  return new Promise(res => {
    const r = require('http').get({ host: SERVER.host, port: 7790, path: '/status', timeout: 3000 }, rs => {
      let b = ''; rs.on('data', d => b += d); rs.on('end', () => { try { res(JSON.parse(b)); } catch { res(null); } });
    });
    r.on('timeout', () => r.destroy()); r.on('error', () => res(null));
  });
}
async function probe() {
  const [ping, st] = await Promise.all([tcpPing(), liveStatus()]);
  const online = ping !== null && !(st && st.online === false);
  return { online, ping: online ? ping : null, players: online && st && st.online ? st.players : null, max: st && st.max ? st.max : null };
}

function createWindow() {
  const sc = cfg.scale || 1;
  win = new BrowserWindow({
    width: Math.round(W * sc), height: Math.round(H * sc), frame: false, transparent: true, resizable: false,
    maximizable: false, hasShadow: false, backgroundColor: '#00000000', show: false, title: 'Bariera: Pierwsze Lata',
    icon: path.join(__dirname, 'renderer/assets/icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, zoomFactor: sc }
  });
  win.loadFile(path.join(__dirname, 'renderer/index.html'));
  win.webContents.on('render-process-gone', (_e, d) => { mainLog('okno padlo: ' + d.reason); if (d.reason !== 'clean-exit') setTimeout(() => { try { win.reload(); } catch {} }, 800); });
  app.on('child-process-gone', (_e, d) => { if (d.type === 'GPU') mainLog('GPU padlo: ' + d.reason); });
  win.once('ready-to-show', () => { win.webContents.setZoomFactor(sc); win.show();
    if (process.env.BARIERA_SHOT) setTimeout(async () => { // test hook: screenshot + simulated window moves
      const out = process.env.BARIERA_SHOT; const img = await win.webContents.capturePage(); fs.writeFileSync(out, img.toPNG());
      if (process.env.BARIERA_GIF) { const [x0, y0] = win.getPosition(); let i = 0;
        const iv = setInterval(async () => { const f = i < 10 ? i * 18 : i < 14 ? 180 : 180; if (i < 14) win.setPosition(x0 + f, y0); if (i === 1) win.webContents.executeJavaScript('FLASK.kick(4,0)'); if (i === 12) win.webContents.executeJavaScript('FLASK.kick(-5,1)');
          if (i === 59) console.log('MOVES', await win.webContents.executeJavaScript('FLASK.moves||0')); const im = await win.webContents.capturePage(); fs.writeFileSync(process.env.BARIERA_GIF + String(i).padStart(3, '0') + '.png', im.toPNG());
          if (++i > 60) { clearInterval(iv); app.quit(); } }, 50);
      } else app.quit(); }, 3500); });
  win.on('move', () => { const [x, y] = win.getPosition(); win.webContents.send('win-pos', { x, y, t: Date.now() }); });
}

// manual drag (works together with click-through of transparent pixels)
let dragTimer = null;
ipcMain.on('drag-start', (_e, off) => {
  clearInterval(dragTimer);
  dragTimer = setInterval(() => {
    if (!win) return; const p = screen.getCursorScreenPoint();
    win.setPosition(Math.round(p.x - off.x), Math.round(p.y - off.y));
  }, 8);
});
ipcMain.on('drag-end', () => { clearInterval(dragTimer); dragTimer = null; });
ipcMain.on('mouse-through', (_e, through) => { if (win) win.setIgnoreMouseEvents(through, { forward: true }); });
ipcMain.on('minimize', () => win && win.minimize());
ipcMain.on('close', () => app.quit());
ipcMain.handle('state', () => ({
  cfg, server: SERVER, texts: REMOTE_TEXTS, launcher: detectLauncher(), fav: favouriteState(),
  hasPw: !!(EMBED_PW || cfg.pwEnc || REMOTE_PW), autostart: process.platform === 'win32' ? app.getLoginItemSettings().openAtLogin : false, platform: process.platform
}));
ipcMain.handle('probe', () => probe());
ipcMain.handle('set-cfg', (_e, patch) => { Object.assign(cfg, patch); saveCfg();
  if (patch.scale && win) { win.setSize(Math.round(W * cfg.scale), Math.round(H * cfg.scale)); win.webContents.setZoomFactor(cfg.scale); }
  return cfg; });
ipcMain.handle('autostart', (_e, on) => { app.setLoginItemSettings({ openAtLogin: !!on, path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath }); return on; });
ipcMain.handle('copy', (_e, t) => { clipboard.writeText(t); return true; });
ipcMain.handle('open', (_e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return true; });
ipcMain.handle('pick-launcher', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Wskaż klient gry G1R:MP', properties: ['openFile'],
    filters: [{ name: 'G1R:MP Launcher', extensions: ['exe'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  cfg.launcherPath = r.filePaths[0]; saveCfg(); return cfg.launcherPath;
});
// ---------- start flow ----------
// Strategy order: 1) cfg.directConnect (future official CLI/URI)  2) UI Automation of the official launcher  3) manual hint.
const logFile = () => path.join(app.getPath('userData'), 'automation.log');
function log(o) { try { fs.appendFileSync(logFile(), JSON.stringify(Object.assign({ at: new Date().toISOString() }, o)) + '\n'); } catch {} }
function helperPath() { const p = path.join(process.resourcesPath || '', 'helper', 'automate.ps1');
  return fs.existsSync(p) ? p : path.join(__dirname, 'helper', 'automate.ps1'); }
function savedPw() { try { return cfg.pwEnc && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(cfg.pwEnc, 'base64')) : ''; } catch { return ''; } }
// manual (user-entered) password wins; otherwise the server password from remote config; otherwise any older saved one
let EMBED_PW = ''; try { EMBED_PW = require('./embedded.js') || ''; } catch {}
// hasło wbudowane w launcher wygrywa; ręczne tylko jako awaryjne (gdy wbudowane okaże się złe)
function getPw() { const m = cfg.pwManual ? savedPw() : ''; if (cfg.embedBad !== app.getVersion() && EMBED_PW) return EMBED_PW; return m || REMOTE_PW || savedPw(); }
// one-shot import: %APPDATA%/<app>/import_pw.txt -> encrypted store, file deleted immediately
function importPw() { const f = path.join(app.getPath('userData'), 'import_pw.txt'); if (!fs.existsSync(f)) return;
  try { const pw = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').trim(); if (pw) setPw(pw); log({ ev: 'PW_IMPORTED', ok: !!cfg.pwEnc }); } catch { log({ ev: 'PW_IMPORT_FAIL' }); }
  try { fs.unlinkSync(f); } catch {} }
function setPw(pw) { if (pw && safeStorage.isEncryptionAvailable()) { cfg.pwEnc = safeStorage.encryptString(pw).toString('base64'); cfg.pwManual = true; saveCfg(); } }
let pwResolve = null, running = null;
ipcMain.on('password', (_e, r) => { if (r && r.remember && r.pw) setPw(r.pw); if (pwResolve) { pwResolve(r && r.pw || ''); pwResolve = null; } });
ipcMain.handle('forget-password', () => { delete cfg.pwEnc; delete cfg.pwManual; saveCfg(); return true; });
ipcMain.handle('has-password', () => !!(EMBED_PW || cfg.pwEnc || REMOTE_PW));
const send = (ev, extra) => { log(Object.assign({ ev }, extra)); win && win.webContents.send('auto-ev', Object.assign({ ev }, extra)); };
function directConnect(exe) {
  // Hook for a future official direct-connect: cfg.directConnect = { args: ["--connect","{host}:{port}"] } or { uri: "g1rmp://connect/{host}:{port}" }
  const dc = cfg.directConnect; if (!dc) return false;
  const fill = t => String(t).replace('{host}', SERVER.host).replace('{port}', SERVER.port);
  if (dc.uri) { shell.openExternal(fill(dc.uri)); send('DIRECT', { uri: true }); return true; }
  if (dc.args) { spawn(exe, dc.args.map(fill), { cwd: path.dirname(exe), detached: true, stdio: 'ignore' }).unref(); send('DIRECT', { args: true }); return true; }
  return false;
}
ipcMain.handle('play', async () => {
  const exe = detectLauncher(); const addr = `${SERVER.host}:${SERVER.port}`;
  clipboard.writeText(addr);
  if (!exe) return { ok: false, reason: 'nolauncher' };
  if (running) return { ok: true, busy: true };
  if (directConnect(exe)) return { ok: true, direct: true };
  if (process.platform !== 'win32') return { ok: false, reason: 'notwin' };
  // password first, before the client window exists -> our prompt is never hidden behind it
  let pw = getPw();
  if (!pw) { win.restore(); win.focus(); pw = await new Promise(r => { pwResolve = r; win.webContents.send('ask-password'); }); }
  if (!pw) return { ok: false, reason: 'nopassword' };
  const hp = helperPath();
  if (!fs.existsSync(hp)) { mainLog('brak helper/automate.ps1: ' + hp); return { ok: false, reason: 'nohelper' }; }
  const psExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  mainLog('start: ' + exe);
  let ps; try { ps = spawn(fs.existsSync(psExe) ? psExe : 'powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', hp,
    '-Exe', exe, '-ServerName', cfg.serverName || 'Bariera', '-Address', addr, '-Timeout', '120', '-AfterGame', cfg.afterGame || 'minimize'],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { mainLog('nie moge uruchomic PowerShell: ' + e.message); return { ok: false, reason: 'nops' }; }
  ps.on('error', e => { running = null; mainLog('PowerShell blad: ' + e.message); send('FAIL', { step: 'powershell' }); });
  ps.stdin.on('error', () => {});
  running = ps; let buf = '';
  ps.stdin.write(pw + '\n'); pw = null;
  ps.stdout.on('data', async d => { buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
      let m; try { m = JSON.parse(line); } catch { log({ raw: line }); continue; }
      send(m.ev, m);
      if (m.ev === 'FAIL' && m.step === 'rejected' && win) { if (EMBED_PW) { cfg.embedBad = app.getVersion(); saveCfg(); mainLog('wbudowane haslo odrzucone - nastepnym razem zapytam'); } win.restore(); win.focus(); }
      if (m.ev === 'GAME') setTimeout(() => win && win.minimize(), 1500);
      if (m.ev === 'FAIL' && m.step === 'game-already-running' && win) { win.restore(); win.focus(); }
    } });
  ps.stderr.on('data', d => { log({ stderr: String(d).slice(0, 400) }); mainLog('PS: ' + String(d).slice(0, 400).replace(/\s+/g, ' ')); });
  ps.on('exit', code => { running = null; mainLog('automatyzacja zakonczona, kod ' + code); if (code && ![0, 2, 5, 6, 7, 9].includes(code)) send('FAIL', { step: 'powershell' }); send('EXIT', { code }); });
  return { ok: true, auto: true };
});

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { win.restore(); win.focus(); } });
  app.disableHardwareAcceleration && process.argv.includes('--bez-gpu') && app.disableHardwareAcceleration();
  app.whenReady().then(async () => { mainLog('=== start ' + app.getVersion() + ' | ' + process.platform + ' ' + require('os').release() + ' | ' + (app.isPackaged ? process.execPath : 'dev')); loadCfg(); await fetchRemote(); importPw(); createWindow(); setupAutoUpdate(); });
  app.on('window-all-closed', () => app.quit());
}
