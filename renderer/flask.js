// Potion flask: WebGL liquid re-rendering with spring-damper slosh driven by window acceleration.
(function(){
const cv=document.getElementById('flask'),dpr=Math.max(2,window.devicePixelRatio||1);
const CW=125,CH=175;cv.width=CW*dpr;cv.height=CH*dpr;
const gl=cv.getContext('webgl',{premultipliedAlpha:false,alpha:true,antialias:true});
const S={theta:0,omega:0,amp:0,phase:0,level:0,glow:0,t:0};window.FLASK=S;
if(!gl){const i=new Image();i.src='assets/flask_red.png';i.onload=()=>{const c=cv.getContext('2d');c.drawImage(i,0,0,cv.width,cv.height)};return;}
const vs=`attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0,1);}`;
const fs=`precision highp float;varying vec2 uv;uniform sampler2D img,msk;uniform float th,amp,ph,lev,tm,glow;
const vec2 SZ=vec2(624.,874.);const vec2 C=vec2(312.,522.);const float R=212.;const float S0=381.;
vec4 T(vec2 px){return texture2D(img,px/SZ);}vec4 M(vec2 px){return texture2D(msk,px/SZ);}
void main(){vec2 p=uv*SZ;vec4 o=T(p);vec4 m=M(p);
 if(length(p-C)<R && (m.r>.5||m.g>.5)){
  vec2 d=p-C;float c=cos(-th),s=sin(-th);vec2 q=vec2(c*d.x-s*d.y,s*d.x+c*d.y)+C;
  float surf=S0+lev+amp*sin(q.x*.032+ph)+amp*.45*sin(q.x*.071-ph*1.7);
  vec3 col;
  if(q.y>surf){
   vec2 t=q+vec2(8.*sin(tm*.7+q.y*.02),-lev*.6+6.*cos(tm*.5));
   t.y=clamp(t.y,S0+14.,715.);
   if(M(t).r<.5)t=C+(t-C)*.72;
   col=T(t).rgb*(1.+.12*sin(tm*1.3+t.y*.03));
   float dd=q.y-surf;col+=vec3(1.,.45,.45)*smoothstep(4.,0.,dd)*.55;col*=mix(.82,1.,smoothstep(0.,40.,dd));
  }else{
   vec2 g=vec2(C.x+(p.x-C.x)*.72,300.+mod(p.y-300.,72.));
   if(M(g).g<.5)g=vec2(C.x+(p.x-C.x)*.5,340.);
   col=T(g).rgb;
  }
  float hl=max(o.g-.52,0.)*1.6*step(.5,m.r);col+=vec3(hl);
  col+=vec3(.25,.03,.02)*glow*step(.5,m.r);
  gl_FragColor=vec4(col,o.a);
 }else gl_FragColor=o;}`;
function sh(t,src){const x=gl.createShader(t);gl.shaderSource(x,src);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(x));return x}
const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
const lp=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,2,gl.FLOAT,false,0,0);
function tex(u,unit){return new Promise(r=>{const i=new Image();i.onload=()=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,i);r()};i.src=u})}
const U=n=>gl.getUniformLocation(pr,n);
Promise.all([tex('assets/flask_red.png',0),tex('assets/flask_mask.png',1)]).then(()=>{gl.uniform1i(U('img'),0);gl.uniform1i(U('msk'),1);requestAnimationFrame(loop)});
// physics
let ax=0,ay=0,last=performance.now(),vx=0,vy=0,px=null,py=null,pt=0;
S.kick=(a,b)=>{ax+=a;ay+=b||0};
S.feed=(x,y,t)=>{if(px!==null){const dt=Math.max(1,t-pt)/1000;const nvx=(x-px)/dt,nvy=(y-py)/dt;ax+=(nvx-vx)*.0025;ay+=(nvy-vy)*.0025;S.moves=(S.moves||0)+1;vx=nvx;vy=nvy}px=x;py=y;pt=t};
setInterval(()=>{vx*=.6;vy*=.6},50);
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;S.t+=dt;
 const k=38,c=3.2;S.omega+=(-k*S.theta-c*S.omega-ax*14)*dt;S.theta+=S.omega*dt;S.theta=Math.max(-.6,Math.min(.6,S.theta));
 S.amp+= (Math.min(26,Math.abs(S.omega)*9+Math.abs(ay)*6)-S.amp)*Math.min(1,dt*3);S.amp=Math.max(S.amp,2.2+1.2*Math.sin(S.t*.8));
 S.phase+=dt*(2.4+Math.abs(S.omega)*3);ax*=Math.pow(.02,dt);ay*=Math.pow(.02,dt);
 gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 gl.uniform1f(U('th'),S.theta+.025*Math.sin(S.t*1.1));gl.uniform1f(U('amp'),S.amp);gl.uniform1f(U('ph'),S.phase);gl.uniform1f(U('lev'),S.level);gl.uniform1f(U('tm'),S.t);gl.uniform1f(U('glow'),S.glow);
 gl.drawArrays(gl.TRIANGLE_STRIP,0,4);requestAnimationFrame(loop)}
})();
