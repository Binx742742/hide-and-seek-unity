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
// A 1970s dockside slewing crane, rusted orange: concrete pedestal, lattice tower, cab, lattice boom swung seaward (−Z), hook over the water. ~12 m.
const PAINT="cdn/texture-peeling-faded-orange-paint-on-rusted-steel.png";
const Y0=1.3,Y1=5.6,HB=.8,HT=.6,ANG=28*D2R,BLEN=12;
const P0=[0,Y1+.9,-1.4],BD=[0,Math.sin(ANG),-Math.cos(ANG)],BN=[0,Math.cos(ANG),Math.sin(ANG)];
const corner=(sx,sz,y)=>{const h=HB+(HT-HB)*(y-Y0)/(Y1-Y0);return[sx*h,y,sz*h];};
const bc=(t,a,b)=>{const w=.45-.3*t;return add(add(add(P0,mul(BD,t*BLEN)),mul(BN,a*w)),mul(X,b*w));};
const FACES=[[[-1,-1],[1,-1]],[[1,-1],[1,1]],[[1,1],[-1,1]],[[-1,1],[-1,-1]]];
export function geometry(ctx){const L=ctx.lod,C0=Y1+.2;
 paint(ctx,CONC,"oklch(0.92 0.01 80)",.95,0);BX(ctx,-1.3,0,-1.3,1.3,1,1.3);
 paint(ctx,RUST,"oklch(0.93 0.02 50)",.8,.4);CYL(ctx,[0,1,0],[0,Y0,0],1.15,1.15,L<=1?18:8);
 if(L<=1)for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])CYL(ctx,[sx*1.1,1,sz*1.1],[sx*1.1,1.08,sz*1.1],.05,.05,6);
 BX(ctx,-1.35,Y1,-1.5,1.35,Y1+.2,3.4);
 paint(ctx,PAINT,"oklch(0.94 0.02 50)",.75,.35);
 for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])BEAM(ctx,corner(sx,sz,Y0),corner(sx,sz,Y1),.2,.2);
 if(L<=2)for(let k=0;k<5;k++){const ya=Y0+(Y1-Y0)*k/5,yb=Y0+(Y1-Y0)*(k+1)/5;for(const[a,b]of FACES){BEAM(ctx,corner(a[0],a[1],ya),corner(b[0],b[1],ya),.08,.08);if(k%2)BEAM(ctx,corner(a[0],a[1],ya),corner(b[0],b[1],yb),.07,.07);else BEAM(ctx,corner(b[0],b[1],ya),corner(a[0],a[1],yb),.07,.07);}}
 // cab
 BX(ctx,-1.1,C0,-1.3,1.1,C0+1,.9,"-v");BX(ctx,-1.1,C0+1.9,-1.3,1.1,C0+2.2,.9);BX(ctx,-1.25,C0+2.2,-1.45,1.25,C0+2.3,1.05);BX(ctx,-1.1,C0+1,.82,1.1,C0+1.9,.9);
 for(const[x,z]of[[-1.06,-1.26],[1.06,-1.26],[0,-1.26],[-1.06,.86],[1.06,.86]])BX(ctx,x-.05,C0+1,z-.04,x+.05,C0+1.9,z+.04);
 if(L<=2){paint(ctx,null,"oklch(0.3 0.02 230)",.15,0);ctx.color("oklch(0.3 0.02 230)",.5);
  Q(ctx,[-1.01,C0+1,-1.27],[-.05,C0+1,-1.27],[-.05,C0+1.9,-1.27],[-1.01,C0+1.9,-1.27],[0,0,-1]);
  Q(ctx,[1.08,C0+1,-1.2],[1.08,C0+1,.8],[1.08,C0+1.9,.8],[1.08,C0+1.9,-1.2],X);
  T(ctx,[.05,C0+1,-1.27],[.7,C0+1,-1.27],[.05,C0+1.45,-1.27],[0,0,-1]);T(ctx,[1.01,C0+1.9,-1.27],[.5,C0+1.9,-1.27],[1.01,C0+1.6,-1.27],[0,0,-1]);}
 paint(ctx,RUST,"oklch(0.93 0.02 50)",.8,.4);BX(ctx,-1,C0,.9,1,C0+1.7,2.9);
 paint(ctx,CONC,"oklch(0.92 0.01 80)",.95,0);BX(ctx,-1.15,C0,2.9,1.15,C0+1.3,3.4);
 paint(ctx,PAINT,"oklch(0.94 0.02 50)",.75,.35);
 const apex=[0,C0+3.8,1.6];for(const sx of[-1,1]){BEAM(ctx,[sx*.9,C0+1.7,2.6],apex,.14,.14);BEAM(ctx,[sx*1,C0+2.3,.5],apex,.14,.14);}
 for(const a of[-1,1])for(const b of[-1,1])BEAM(ctx,bc(0,a,b),bc(1,a,b),.12,.12);
 if(L<=2){const NB=12;for(let k=0;k<NB;k++){const t0=k/NB,t1=(k+1)/NB,f=k%2?1:-1;
   BEAM(ctx,bc(t0,1,-f),bc(t1,1,f),.06,.06);BEAM(ctx,bc(t0,-1,-f),bc(t1,-1,f),.06,.06);BEAM(ctx,bc(t0,-f,-1),bc(t1,f,-1),.06,.06);BEAM(ctx,bc(t0,-f,1),bc(t1,f,1),.06,.06);}}
 CYL(ctx,add(P0,[-.6,0,0]),add(P0,[.6,0,0]),.15,.15,8);
 const tip=add(P0,mul(BD,BLEN));CYL(ctx,add(tip,[-.2,0,0]),add(tip,[.2,0,0]),.28,.28,L<=2?12:6);
 paint(ctx,RUST,"oklch(0.93 0.02 50)",.7,.6);
 for(const s of[-.15,.15])CYL(ctx,add(apex,[s,0,0]),add(bc(1,1,0),[s,0,0]),.025,.025,4,false);
 CYL(ctx,tip,[tip[0],3.6,tip[2]],.02,.02,4,false);BX(ctx,tip[0]-.22,3,tip[2]-.12,tip[0]+.22,3.6,tip[2]+.12);
 if(L<=2)TOR(ctx,[tip[0],2.72,tip[2]],X,.18,.045,10,5);}
export function collider(ctx){BX(ctx,-1.3,0,-1.3,1.3,Y0,1.3);BX(ctx,-.85,Y0,-.85,.85,Y1,.85);}
