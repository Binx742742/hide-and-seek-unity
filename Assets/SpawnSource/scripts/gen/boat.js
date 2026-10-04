// ── shared mesh kit (prepended to each yard/dock geometry script) ──
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const vlen=(a)=>Math.hypot(a[0],a[1],a[2]);
const nrm=(a)=>{const l=vlen(a)||1;return[a[0]/l,a[1]/l,a[2]/l];};
const D2R=Math.PI/180,X=[1,0,0],Y=[0,1,0],Z=[0,0,1];
// a quad wound CCW as seen from `out`
function Q(ctx,a,b,c,d,out){const n=crs(sub(b,a),sub(c,a));if(out&&dot(n,out)<0)ctx.quad(a[0],a[1],a[2],d[0],d[1],d[2],c[0],c[1],c[2],b[0],b[1],b[2]);else ctx.quad(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2],d[0],d[1],d[2]);}
function T(ctx,a,b,c,out){const n=crs(sub(b,a),sub(c,a));if(out&&dot(n,out)<0)ctx.tri(a[0],a[1],a[2],c[0],c[1],c[2],b[0],b[1],b[2]);else ctx.tri(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);}
// oriented box: centre c, unit axes u v w, half sizes; skip lists faces ("+v" top, "-v" bottom)
function OB(ctx,c,u,v,w,hu,hv,hw,skip){const s=skip||"";
 const P=(a,b,d)=>[c[0]+u[0]*a*hu+v[0]*b*hv+w[0]*d*hw,c[1]+u[1]*a*hu+v[1]*b*hv+w[1]*d*hw,c[2]+u[2]*a*hu+v[2]*b*hv+w[2]*d*hw];
 if(!s.includes("+u"))Q(ctx,P(1,-1,-1),P(1,1,-1),P(1,1,1),P(1,-1,1),u);
 if(!s.includes("-u"))Q(ctx,P(-1,-1,-1),P(-1,1,-1),P(-1,1,1),P(-1,-1,1),mul(u,-1));
 if(!s.includes("+v"))Q(ctx,P(-1,1,-1),P(1,1,-1),P(1,1,1),P(-1,1,1),v);
 if(!s.includes("-v"))Q(ctx,P(-1,-1,-1),P(1,-1,-1),P(1,-1,1),P(-1,-1,1),mul(v,-1));
 if(!s.includes("+w"))Q(ctx,P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1),w);
 if(!s.includes("-w"))Q(ctx,P(-1,-1,-1),P(1,-1,-1),P(1,1,-1),P(-1,1,-1),mul(w,-1));}
function BX(ctx,x0,y0,z0,x1,y1,z1,skip){OB(ctx,[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],X,Y,Z,Math.abs(x1-x0)/2,Math.abs(y1-y0)/2,Math.abs(z1-z0)/2,skip);}
// box turned about Y: centre x,z, bottom y0, half x/z extents, height h
function YB(ctx,cx,y0,cz,yaw,hx,h,hz,skip){const c=Math.cos(yaw*D2R),s=Math.sin(yaw*D2R);OB(ctx,[cx,y0+h/2,cz],[c,0,-s],Y,[s,0,c],hx,h/2,hz,skip);}
function BEAM(ctx,a,b,w,h,up){const L=vlen(sub(b,a)),d=nrm(sub(b,a));let s=crs(d,up||Y);if(vlen(s)<1e-3)s=crs(d,X);s=nrm(s);const v=nrm(crs(s,d));OB(ctx,mul(add(a,b),.5),d,v,s,L/2,h/2,w/2);}
function basis(d){const e1=nrm(crs(d,Math.abs(d[1])<.9?Y:X));return[e1,crs(d,e1)];}
function CYL(ctx,a,b,r0,r1,n,caps){const d=nrm(sub(b,a)),[e1,e2]=basis(d);const dir=(i)=>{const t=i/n*2*Math.PI;return add(mul(e1,Math.cos(t)),mul(e2,Math.sin(t)));};
 for(let i=0;i<n;i++){const p=dir(i),q=dir(i+1);Q(ctx,add(a,mul(p,r0)),add(a,mul(q,r0)),add(b,mul(q,r1)),add(b,mul(p,r1)),add(p,q));
  if(caps!==false){if(r0>0)T(ctx,a,add(a,mul(p,r0)),add(a,mul(q,r0)),mul(d,-1));if(r1>0)T(ctx,b,add(b,mul(p,r1)),add(b,mul(q,r1)),d);}}}
function TOR(ctx,c,ax,R,r,n,m,fy){const d=nrm(ax),[e1,e2]=basis(d);fy=fy||1;
 const E=(t)=>add(mul(e1,Math.cos(t)),mul(e2,Math.sin(t)));
 const P=(i,j)=>{const t=i/n*2*Math.PI,f=j/m*2*Math.PI,e=E(t);return add(add(c,mul(e,R+r*Math.cos(f))),mul(d,r*fy*Math.sin(f)));};
 const N=(i,j)=>{const t=(i+.5)/n*2*Math.PI,f=(j+.5)/m*2*Math.PI;return add(mul(E(t),Math.cos(f)),mul(d,Math.sin(f)));};
 for(let i=0;i<n;i++)for(let j=0;j<m;j++)Q(ctx,P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1),N(i,j));}
// a lumpy dome (tarp, net heap, bin bag), flat on its base
function BLOB(ctx,c,rx,ry,rz,sd,nl,nm){const P=(i,j)=>{const ph=i/nl*Math.PI/2,th=j/nm*2*Math.PI,sp=Math.sin(ph);const k=1+sp*(.16*Math.sin(th*3+sd)*Math.sin(ph*3+sd*1.7)+.07*Math.sin(th*7+sd*2.3));return[c[0]+rx*k*Math.cos(th)*sp,c[1]+ry*Math.cos(ph)*(1+.1*Math.sin(th*2+sd)*sp),c[2]+rz*k*Math.sin(th)*sp];};
 const C=[c[0],c[1]-ry*.2,c[2]];for(let i=0;i<nl;i++)for(let j=0;j<nm;j++)Q(ctx,P(i,j),P(i,j+1),P(i+1,j+1),P(i+1,j),sub(P(i+.5,j+.5),C));}
function paint(ctx,tex,col,rough,metal){ctx.albedo(tex||null);ctx.color(col||"oklch(0.95 0.01 80)");ctx.roughness(rough??.85);ctx.metalness(metal??0);ctx.emissive(null);}
function rng(seed){let s=((seed||1)*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function rope(ctx,a,b,sag,r,n){let prev=a;for(let i=1;i<=n;i++){const t=i/n,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-sag*4*t*(1-t),a[2]+(b[2]-a[2])*t];CYL(ctx,prev,p,r,r,5,false);prev=p;}}
const TAR="cdn/texture-weathered-tar-black-timber-planks.png",TIMBER="cdn/texture-weathered-grey-wharf-timber-planks.png",RUST="cdn/texture-heavily-rusted-steel-plate.png",CONC="cdn/texture-stained-concrete-floor.png",GALV="cdn/texture-weathered-galvanized-steel-with-rust-streaks.png",ROPE_T="cdn/texture-salt-bleached-manila-rope.png",NET="cdn/texture-tangled-old-green-fishing-net.png",RUBBER="oklch(0.24 0.005 250)";
// ── end kit ──
// A half-sunk timber trawler moored at the wharf's east end: origin = keel bottom midships, bow toward −Z, ~11 m.
// Tilt and sink it with the row's rotation (stern down, listing off the wharf). Wheelhouse open aft: 1.94 m x 2.33 m doorway.
const HULL="cdn/texture-peeling-white-paint-on-weathered-wooden-boat-hull.png",BOT="cdn/texture-faded-red-antifouling-paint-with-green-algae.png";
const BL=11,WY=2,WZ0=-.6,WZ1=2.2,WX=1.05,WH=2.45;
const hb=(t)=>1.75*Math.sqrt(Math.max(0,1-Math.pow(t,2.2)))*(.88+.12*Math.sin(Math.PI*Math.min(1,t*1.4)));
const sheer=(t)=>2.3+.8*t*t,keel=(t)=>t>.78?(t-.78)/.22*1.3:0,zt=(t)=>BL/2-BL*t,deckY=(t)=>sheer(t)-.45;
const hp=(t,s,sg)=>[sg*hb(t)*Math.pow(Math.sin(s*Math.PI/2),.55),keel(t)+(sheer(t)-keel(t))*s,zt(t)];
function deck(ctx,n){for(let i=0;i<n;i++){const t0=.02+.86*i/n,t1=.02+.86*(i+1)/n,w0=hb(t0)*.93,w1=hb(t1)*.93;Q(ctx,[-w0,deckY(t0),zt(t0)],[w0,deckY(t0),zt(t0)],[w1,deckY(t1),zt(t1)],[-w1,deckY(t1),zt(t1)],Y);}}
export function geometry(ctx){const L=ctx.lod,NS=L<=1?18:L<=2?10:6,NSEC=L<=1?8:4;
 ctx.smooth();
 for(const pass of[0,1]){paint(ctx,pass?HULL:BOT,"oklch(0.93 0.01 90)",.85,0);
  for(const sg of[-1,1])for(let i=0;i<NS;i++)for(let j=0;j<NSEC;j++){const s0=j/NSEC,s1=(j+1)/NSEC;if((s0<.38?0:1)!==pass)continue;const t0=i/NS,t1=(i+1)/NS;
   Q(ctx,hp(t0,s0,sg),hp(t1,s0,sg),hp(t1,s1,sg),hp(t0,s1,sg),[sg,-(1-s0)*.5,0]);}}
 ctx.flat();paint(ctx,HULL,"oklch(0.93 0.01 90)",.85,0);
 for(let j=0;j<NSEC;j++){const s0=j/NSEC,s1=(j+1)/NSEC;Q(ctx,hp(0,s0,-1),hp(0,s0,1),hp(0,s1,1),hp(0,s1,-1),Z);}
 if(L<=4){
  // wheelhouse: front and sides with broken windows, open aft
  BX(ctx,-WX,WY,WZ0-.03,WX,WY+1.05,WZ0+.03);BX(ctx,-WX,WY+1.85,WZ0-.03,WX,WY+WH,WZ0+.03);
  for(const x of[-WX+.04,0,WX-.04])BX(ctx,x-.04,WY+1.05,WZ0-.03,x+.04,WY+1.85,WZ0+.03);
  for(const sx of[-1,1]){const x=sx*WX;BX(ctx,x-.03,WY,WZ0,x+.03,WY+1.05,WZ1);BX(ctx,x-.03,WY+1.85,WZ0,x+.03,WY+WH,WZ1);for(const z of[WZ0+.04,.8,WZ1-.04])BX(ctx,x-.03,WY+1.05,z-.04,x+.03,WY+1.85,z+.04);}
  BX(ctx,-WX,WY+WH-.12,WZ1-.04,WX,WY+WH,WZ1+.04);
  BX(ctx,-WX-.12,WY+WH,WZ0-.15,WX+.12,WY+WH+.08,WZ1+.25);}
 if(L<=2){paint(ctx,null,"oklch(0.3 0.02 230)",.15,0);ctx.color("oklch(0.3 0.02 230)",.45);
  Q(ctx,[-WX+.08,WY+1.05,WZ0],[-.04,WY+1.05,WZ0],[-.04,WY+1.85,WZ0],[-WX+.08,WY+1.85,WZ0],[0,0,-1]);
  T(ctx,[.04,WY+1.05,WZ0],[.6,WY+1.05,WZ0],[.04,WY+1.4,WZ0],[0,0,-1]);
  Q(ctx,[-WX,WY+1.05,WZ0+.08],[-WX,WY+1.05,.76],[-WX,WY+1.85,.76],[-WX,WY+1.85,WZ0+.08],[-1,0,0]);}
 paint(ctx,TAR,"oklch(0.92 0.01 60)",.9,0);
 if(L<=3)deck(ctx,L<=1?12:6);
 if(L<=3)for(const sg of[-1,1])for(let i=0;i<(L<=1?14:7);i++){const n=L<=1?14:7,t0=i/n*.98,t1=(i+1)/n*.98;BEAM(ctx,add(hp(t0,1,sg),[0,.04,0]),add(hp(t1,1,sg),[0,.04,0]),.12,.08);if(L<=2)BEAM(ctx,add(hp(t0,.82,sg),[sg*.05,0,0]),add(hp(t1,.82,sg),[sg*.05,0,0]),.07,.1);}
 if(L<=2){BX(ctx,-WX+.1,WY,WZ0+.05,WX-.1,WY+.95,WZ0+.5);paint(ctx,TIMBER,"oklch(0.93 0.01 80)",.8,0);TOR(ctx,[0,WY+1.2,WZ0+.62],Z,.28,.025,12,4);for(let k=0;k<4;k++){const a=k*Math.PI/4;BEAM(ctx,[-Math.cos(a)*.34,WY+1.2-Math.sin(a)*.34,WZ0+.62],[Math.cos(a)*.34,WY+1.2+Math.sin(a)*.34,WZ0+.62],.03,.03,Z);}}
 if(L<=3){paint(ctx,TAR,"oklch(0.92 0.01 60)",.9,0);const mb=[0,deckY(.75),zt(.75)],mt=[.5,deckY(.75)+4.6,zt(.75)-.8];CYL(ctx,mb,mt,.1,.07,6);
  if(L<=2){CYL(ctx,add(mb,[.12,1.6,-.28]),[.3,deckY(.4)+1.2,zt(.4)],.06,.05,5);paint(ctx,ROPE_T,"oklch(0.95 0.02 85)",.95,0);rope(ctx,mt,hp(.99,1,1),.4,.015,6);rope(ctx,mt,hp(.2,1,-1),.3,.015,6);}}
 if(L<=2){paint(ctx,null,RUBBER,.85,0);for(const t of[.3,.5,.65])TOR(ctx,[-hb(t)-.14,sheer(t)-.7,zt(t)],X,.3,.11,12,5);
  paint(ctx,NET,"oklch(0.93 0.02 150)",.95,0);ctx.smooth();BLOB(ctx,[.3,deckY(.12),zt(.12)],1.1,.55,.9,2,L<=1?5:3,L<=1?10:6);ctx.flat();}}
export function collider(ctx){deck(ctx,6);
 for(const sg of[-1,1])for(let i=0;i<6;i++){const t0=.02+.86*i/6,t1=.02+.86*(i+1)/6,a=[sg*hb(t0)*.95,deckY(t0),zt(t0)],b=[sg*hb(t1)*.95,deckY(t1),zt(t1)];Q(ctx,a,b,add(b,[0,.6,0]),add(a,[0,.6,0]),[sg,0,0]);}
 BX(ctx,-WX,WY,WZ0-.05,WX,WY+WH,WZ0+.05);BX(ctx,-WX-.05,WY,WZ0,-WX+.05,WY+WH,WZ1);BX(ctx,WX-.05,WY,WZ0,WX+.05,WY+WH,WZ1);BX(ctx,-WX-.12,WY+WH,WZ0-.15,WX+.12,WY+WH+.08,WZ1+.25);}
