const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bar', {
  state: () => ipcRenderer.invoke('state'), probe: () => ipcRenderer.invoke('probe'),
  setCfg: p => ipcRenderer.invoke('set-cfg', p), autostart: on => ipcRenderer.invoke('autostart', on),
  copy: t => ipcRenderer.invoke('copy', t), open: u => ipcRenderer.invoke('open', u),
  pick: () => ipcRenderer.invoke('pick-launcher'), play: () => ipcRenderer.invoke('play'),
  dragStart: o => ipcRenderer.send('drag-start', o), dragEnd: () => ipcRenderer.send('drag-end'),
  through: b => ipcRenderer.send('mouse-through', b), minimize: () => ipcRenderer.send('minimize'), close: () => ipcRenderer.send('close'),
  onAuto: cb => ipcRenderer.on('auto-ev', (_e, m) => cb(m)), onAskPw: cb => ipcRenderer.on('ask-password', () => cb()),
  sendPw: r => ipcRenderer.send('password', r), forgetPw: () => ipcRenderer.invoke('forget-password'),
  onPos: cb => ipcRenderer.on('win-pos', (_e, p) => cb(p))
});
