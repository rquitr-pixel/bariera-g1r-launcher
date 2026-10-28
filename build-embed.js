// Generuje embedded.js (NIE commitować) z hasłem serwera pobranym przez ssh. Nic nie wypisuje.
const { execFileSync } = require('child_process'), fs = require('fs'), crypto = require('crypto');
const raw = execFileSync('ssh', ['-o', 'BatchMode=yes', 'bariera', "sudo -n sed -n 's/^[[:space:]]*password[[:space:]]*=[[:space:]]*//p' /opt/g1rmp/serverconf.cfg | head -1"], { encoding: 'utf8' });
let pw = raw.replace(/\r?\n$/, '').replace(/^"(.*)"$/, '$1');
// serverconf.cfg może wskazywać zmienną: password=env:NAZWA -> wartość z /opt/g1rmp/g1rmp.env
const m = /^env:([A-Za-z0-9_]+)$/.exec(pw);
if (m) pw = execFileSync('ssh', ['-o', 'BatchMode=yes', 'bariera', `sudo -n sed -n 's/^${m[1]}=//p' /opt/g1rmp/g1rmp.env | head -1`], { encoding: 'utf8' })
  .replace(/\r?\n$/, '').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
if (/^env:/i.test(pw)) { console.error('nie rozwiazano zmiennej hasla'); process.exit(1); }
if (!pw) { console.error('brak hasla'); process.exit(1); }
const buf = Buffer.from(pw, 'utf8'), key = crypto.randomBytes(buf.length), x = Buffer.alloc(buf.length);
for (let i = 0; i < buf.length; i++) x[i] = buf[i] ^ key[i] ^ ((i * 31 + 7) & 255);
const a = x.toString('base64'), k = key.toString('base64'), h = Math.ceil(a.length / 2);
fs.writeFileSync('embedded.js', `module.exports=(()=>{const p=[${JSON.stringify(a.slice(h))},${JSON.stringify(a.slice(0, h))}],q=${JSON.stringify(k.split('').reverse().join(''))};` +
 `const x=Buffer.from(p[1]+p[0],'base64'),k=Buffer.from(q.split('').reverse().join(''),'base64');for(let i=0;i<x.length;i++)x[i]^=k[i]^((i*31+7)&255);return x.toString('utf8')})();\n`);
console.log('embedded.js OK (dlugosc ' + pw.length + ')');
