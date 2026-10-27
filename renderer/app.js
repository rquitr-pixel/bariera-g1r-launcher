(async function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const B=window.bar||{state:async()=>({cfg:{lang:'pl',links:{strona:'https://g1r-mp.com',discord:'https://discord.gg/kfBdN3ZctJ',zasady:'https://g1r-mp.com',lore:'https://g1r-mp.com'}},server:{host:'57.129.157.207',port:7777},launcher:'',fav:'no',autostart:true,hasPw:false}),
 probe:async()=>({online:true,ping:23}),setCfg:async p=>p,autostart:async v=>v,copy:async()=>1,open:async()=>1,pick:async()=>null,play:async()=>({ok:true,auto:true}),
 dragStart(){},dragEnd(){},through(){},minimize(){},close(){},onPos(){},onAuto(){},onAskPw(){},sendPw(){},forgetPw:async()=>1};
let st=await B.state(),cfg=st.cfg,L=cfg.lang||'pl';if(st.texts)for(const k in st.texts)if(I18N[k])Object.assign(I18N[k],st.texts[k]);const tr=k=>(I18N[L]&&I18N[L][k])||I18N.pl[k]||k;
function apply(){$$('[data-i]').forEach(e=>e.textContent=tr(e.dataset.i));$$('[data-t]').forEach(e=>e.title=tr(e.dataset.t));
 $('#lPL').className=L==='pl'?'on':'off';$('#lEN').className=L==='en'?'on':'off';
 $('#lstate').innerHTML=st.launcher?`<span class=ok>✓ ${tr('lfound')}</span>`:`<span class=warn>✗ ${tr('lmiss')}</span>`;
 $('#fstate').innerHTML=st.fav==='yes'?`<span class=ok>${tr('fyes')}</span>`:st.fav==='no'?`<span class=warn>${tr('fno')}</span>`:`<span>${tr('funk')}</span>`;
 $('#auto').classList.toggle('on',!!st.autostart);$('#inPath').value=st.launcher||'';
 $('#pwState').textContent=st.hasPw?tr('pwHas'):tr('pwNone');renderStatus()}
let last=null;function renderStatus(){const el=$('#st');if(!last){$('#stTxt').textContent=tr('checking');return}
 el.className='a glass '+(last.online?'on':'off');$('#stTxt').innerHTML=last.online?`<b style="color:#fff">${tr('online')}</b>`:tr('offline');
 $('#stPing').textContent=last.online?`${tr("ping")} ${last.ping} ms`+(last.players!=null?` · ${last.players}/${last.max}`:''):'—';
 $('#stBar').style.width=last.online?Math.max(8,Math.min(100,100-last.ping/3))+'%':'0%';$('#stBar').style.background=last.online?(last.ping<80?'#4fd36b':'#e8b04a'):'#e04a3a'}
async function poll(){try{last=await B.probe()}catch{last={online:false}}renderStatus()}poll();setInterval(poll,10000);
// restart every 4h from 00:00 Europe/Warsaw
function tick(){const f=new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date());
 const g=t=>+f.find(x=>x.type===t).value;const s=g('hour')*3600+g('minute')*60+g('second');const left=14400-(s%14400);
 const p=n=>String(n).padStart(2,'0');$('#cd').textContent=`${p(left/3600|0)}:${p((left%3600)/60|0)}:${p(left%60)}`;$('#clock').textContent=`${p(g('hour'))}:${p(g('minute'))}`}
tick();setInterval(tick,1000);
$$('.tabs span').forEach(t=>t.onclick=()=>{$$('.tabs span').forEach(x=>x.classList.remove('on'));t.classList.add('on');$$('.tabc').forEach(c=>c.classList.toggle('on',c.dataset.c===t.dataset.tab))});
let tt;function toast(msg,ms=5000){const e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('show'),ms)}
$('#lPL').onclick=async()=>{L='pl';cfg=await B.setCfg({lang:L});apply()};$('#lEN').onclick=async()=>{L='en';cfg=await B.setCfg({lang:L});apply()};
$$('[data-link]').forEach(m=>m.onclick=()=>{const u=(cfg.links||{})[m.dataset.link];if(u)B.open(u);else toast(tr('noLink'))});
$('#gear').onclick=()=>$('#settings').classList.toggle('show');$('#setClose').onclick=()=>$('#settings').classList.remove('show');
$$('[data-sc]').forEach(b=>b.onclick=async()=>{cfg=await B.setCfg({scale:+b.dataset.sc})});
const pick=async()=>{const p=await B.pick();if(p){st=await B.state();apply()}};$('#pickBtn').onclick=pick;$('#pickBtn2').onclick=pick;
$('#bugBtn').onclick=()=>{const u=(cfg.links||{}).discord;if(u)B.open(u);else toast(tr('noLink'))};
$('#copyBtn').onclick=async()=>{await B.copy(`${st.server.host}:${st.server.port}`);toast(tr('copied'),2500)};
$('#auto').onclick=async()=>{st.autostart=!st.autostart;await B.autostart(st.autostart);apply()};
$('#pwForget').onclick=async()=>{await B.forgetPw();st.hasPw=false;apply()};
$('#minBtn').onclick=()=>B.minimize();$('#closeBtn').onclick=()=>B.close();
// password only when the official launcher asks
B.onAskPw(()=>{$('#pwbox').style.display='block';$('#pwIn').value='';$('#pwIn').focus()});
const pwDone=(ok)=>{const pw=ok?$('#pwIn').value:'';B.sendPw({pw,remember:$('#pwRem').classList.contains('on')});$('#pwIn').value='';$('#pwbox').style.display='none';if(ok&&$('#pwRem').classList.contains('on')){st.hasPw=true;apply()}};
$('#pwOk').onclick=()=>pwDone(true);$('#pwNo').onclick=()=>pwDone(false);$('#pwIn').onkeydown=e=>{if(e.key==='Enter')pwDone(true);if(e.key==='Escape')pwDone(false)};
$('#pwRem').onclick=()=>$('#pwRem').classList.toggle('on');
// flask hover + play
const fh=$('#flaskHit');fh.onmouseenter=()=>{$('#graj').classList.add('hot');$('#flaskGlow').classList.add('hot');FLASK.glow=1;FLASK.kick(.6)};
fh.onmouseleave=()=>{$('#graj').classList.remove('hot');$('#flaskGlow').classList.remove('hot');FLASK.glow=0};
function drink(){let t0=performance.now();(function a(n){const k=(n-t0)/1600;FLASK.level=k<.5?k*2*150:Math.max(0,(1-k)*2*150);if(k<1)requestAnimationFrame(a);else FLASK.level=0})(t0);FLASK.kick(-2.5,1.5)}
const EV={LAUNCHED:'aLaunch',ALREADY_RUNNING:'aLaunch',WINDOW:'aWin',SERVER:'aSrv',ADDRESS:'aAddr',CONNECT:'aConn',PASSWORD_SENT:'aPw',GAME:'aGame',DIRECT:'aDirect'};
B.onAuto(m=>{if(EV[m.ev])toast(tr(EV[m.ev]),m.ev==='GAME'?4000:15000);
 if(m.ev==='FAIL'&&m.step==='rejected'){const e=$('#toast');e.textContent=tr('rejected')+' ';const b=document.createElement('button');b.className='toastBtn';b.textContent=tr('clearPw');b.onclick=async()=>{await B.forgetPw();st.hasPw=false;apply();toast(tr('pwCleared'))};e.appendChild(b);e.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('show'),30000);return}
 if(m.ev==='FAIL'||m.ev==='ERROR'){toast(tr('aFail').replace('{s}',m.step||'?'),20000);$('#pwbox').style.display='none'}});
fh.onclick=async()=>{drink();const r=await B.play();
 if(!r.ok){if(r.reason==='nolauncher'){toast(tr('noLauncher'),9000);setTimeout(pick,600)}else if(r.reason==='nopassword')toast(tr('noPassword'));else if(r.reason==='notwin')toast(tr('aNotWin'));else toast(tr('spawnFail'))}
 else if(!r.busy)toast(tr('aLaunch'),15000)};
// drag anywhere opaque that isn't a control; click-through on transparent pixels
const hm=new Image();hm.src='assets/hitmask.png';let hd=null;
hm.onload=()=>{const c=document.createElement('canvas');c.width=640;c.height=360;const x=c.getContext('2d');x.drawImage(hm,0,0);hd=x.getImageData(0,0,640,360).data};
let through=false;document.addEventListener('mousemove',e=>{if(!hd)return;const X=Math.min(639,Math.max(0,e.clientX/2|0)),Y=Math.min(359,Math.max(0,e.clientY/2|0));
 const t=hd[(Y*640+X)*4]<40&&!dragging;if(t!==through){through=t;B.through(t)}});
const isCtl=el=>el.closest('.hit,input,.tabs span,.lg span,#settings,#pwbox');let dragging=false;
document.addEventListener('mousedown',e=>{if(e.button!==0||isCtl(e.target))return;dragging=true;B.dragStart({x:e.screenX-window.screenX,y:e.screenY-window.screenY})});
window.addEventListener('mouseup',()=>{if(dragging){dragging=false;B.dragEnd()}});
B.onPos(p=>FLASK.feed(p.x,p.y,p.t));
apply();
})();
