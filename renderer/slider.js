(()=>{const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
const K={pl:'KRONIKA · ROK 1 BARIERY',en:'CHRONICLE · YEAR 1 OF THE BARRIER'};
const S=[
{pl:['Kopuła zamknięta','Magowie Kręgu przeliczyli się — nikt już nie wyjdzie z Doliny.'],en:['The Dome Is Sealed','The Circle of Mages miscalculated — no one leaves the Valley now.']},
{pl:['Rudy dla Króla','Rhobar wciąż żąda magicznej rudy. Za Barierą handel trwa.'],en:['Ore for the King','Rhobar still demands magic ore. Beyond the Barrier, trade goes on.']},
{pl:['Trzy obozy','Stary, Nowy i Bractwo Śniącego — każdy szuka własnej drogi.'],en:['Three Camps','Old, New and the Brotherhood of the Sleeper — each seeks its own way.']},
{pl:['Twoja historia','Skazańcy trafiają tu każdego dnia. Co zrobisz ze swoim wyrokiem?'],en:['Your Story','Convicts arrive every day. What will you make of your sentence?']}];
const sl={index:0,ms:7000,paused:false,hover:false,hidden:false,L:'pl',
 render(){$('#slides').innerHTML=S.map((n,i)=>`<div class="slide${i===this.index?' active':''}" data-i=${i}><div class=slide-content><div class=slide-kicker>${K[this.L]}</div><div class=slide-title>${n[this.L][0]}</div><div class=slide-desc>${n[this.L][1]}</div></div></div>`).join('')},
 init(){const h=$('#hero');h.style.setProperty('--slide-ms',this.ms+'ms');this.render();
  $('#indicators').innerHTML=S.map((n,i)=>`<button class=slide-indicator data-i=${i} aria-label="Slajd ${i+1}"><span class=ind-dot><span class=ind-bar></span></span></button>`).join('');
  $$('.slide-indicator').forEach(b=>b.onclick=()=>this.go(+b.dataset.i));
  $('#hero-prev').onclick=()=>this.go(this.index-1);$('#hero-next').onclick=()=>this.go(this.index+1);
  h.onmouseenter=()=>{this.hover=true;this.pause(true)};h.onmouseleave=()=>{this.hover=false;this.pause(this.hidden)};
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.key==='ArrowLeft')this.go(this.index-1);if(e.key==='ArrowRight')this.go(this.index+1)});
  document.addEventListener('visibilitychange',()=>{this.hidden=document.hidden;this.pause(this.hidden||this.hover)});
  this.go(0)},
 setL(l){this.L=l;this.render()},
 go(i){const n=S.length;this.index=(i+n)%n;
  $$('.slide').forEach((s,k)=>s.classList.toggle('active',k===this.index));
  $$('.slide-indicator').forEach((s,k)=>{s.classList.remove('active');if(k===this.index){void s.offsetWidth;s.classList.add('active')}});
  $('#hero-counter').innerHTML=`<b>${String(this.index+1).padStart(2,'0')}</b>/ ${String(n).padStart(2,'0')}`;this.schedule()},
 schedule(){clearTimeout(this.timer);this.started=Date.now();this.remaining=this.ms;if(this.paused)return;this.timer=setTimeout(()=>this.go(this.index+1),this.ms)},
 pause(p){$('#hero').classList.toggle('paused',p);
  if(p&&!this.paused){clearTimeout(this.timer);this.remaining-=Date.now()-this.started}
  if(!p&&this.paused){this.started=Date.now();this.timer=setTimeout(()=>this.go(this.index+1),Math.max(300,this.remaining))}
  this.paused=p}};
sl.init();window.__slider=sl;
const a=$('#lPL'),b=$('#lEN');a&&a.addEventListener('click',()=>sl.setL('pl'));b&&b.addEventListener('click',()=>sl.setL('en'));
(window.bar?window.bar.state():Promise.resolve({cfg:{}})).then(s=>sl.setL((s.cfg&&s.cfg.lang)||'pl')).catch(()=>{});})();
