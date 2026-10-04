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
// A tarred drying rack with an old net hung over its bar to the deck, floats along the head rope and a heap of net at its foot. params w, seed. Rack along X.
export function geometry(ctx){const p=ctx.params,L=ctx.lod,w=p.w||4,sd=p.seed||1;
 paint(ctx,TAR,"oklch(0.92 0.01 60)",.9,0);
 BX(ctx,-w/2-.08,0,-.08,-w/2+.08,2.55,.08);BX(ctx,w/2-.08,0,-.08,w/2+.08,2.55,.08);BX(ctx,-w/2-.2,2.38,-.07,w/2+.2,2.52,.07);
 if(L<=2)for(const sx of[-1,1])for(const sz of[-1,1])BEAM(ctx,[sx*w/2,0,sz*.7],[sx*w/2,1.2,sz*.06],.1,.1);
 paint(ctx,NET,"oklch(0.93 0.02 150)",.95,0);ctx.smooth();
 const nu=L<=1?20:L<=2?10:4,nv=L<=1?10:L<=2?5:2;
 const S=(u,v)=>[-w/2+.12+u*(w-.24),2.38-v*2.33,Math.sin(u*w*2.6+v*1.7+sd)*.09*(.3+v)+Math.pow(v,3)*.35+.1];
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++)Q(ctx,S(i/nu,j/nv),S((i+1)/nu,j/nv),S((i+1)/nu,(j+1)/nv),S(i/nu,(j+1)/nv),[0,0,-1]);
 if(L<=3)BLOB(ctx,[w/2-.7,0,.75],.8,.5,.6,sd,L<=1?5:3,L<=1?10:6);
 ctx.flat();
 if(L<=2){paint(ctx,null,"oklch(0.55 0.13 45)",.6,0);for(let x=-w/2+.3;x<w/2-.2;x+=.45)CYL(ctx,[x-.05,2.3,.12],[x+.05,2.3,.12],.06,.06,6);}}
export function collider(ctx){const w=ctx.params.w||4;BX(ctx,-w/2-.08,0,-.1,w/2+.08,2.52,.45);BX(ctx,w/2-1.5,0,.2,w/2,.5,1.35);}
