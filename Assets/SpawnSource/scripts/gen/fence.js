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
// The yard's perimeter: 3 m chain-link on galvanised posts every ~3 m with outward barbed-wire arms, along x=±44 (z -36..34) and z=34,
// a chained, padlocked double gate at (0,34). Stands at the world origin: every coordinate is world. Collider: a 4.5 m wall per run.
const H=3;
const GZ=100;
const RUNS=[{a:[-120,-34],b:[-120,GZ],o:[-1,0,0],y:4},{a:[96,-36],b:[96,GZ],o:[1,0,0]},{a:[-120,GZ],b:[-47.6,GZ],o:[0,0,1],y:4},{a:[-44,GZ],b:[-2.75,GZ],o:[0,0,1]},
 // the old west fence at the foot of the Saltgate bluff: open at the road ramp (z -20..-12), the drain mouth (z 24.4..27.6) and the hidden gully (z 60..62)
 {a:[-44,-36],b:[-44,-20],o:[-1,0,0]},{a:[-44,-12],b:[-44,24.4],o:[-1,0,0]},{a:[-44,27.6],b:[-44,60],o:[-1,0,0]},{a:[-44,62],b:[-44,GZ],o:[-1,0,0]},{a:[2.75,GZ],b:[96,GZ],o:[0,0,1]},
 // the old east fence at x 44: cut open at z -6..0 and z 50..56 into the Rail Siding
 {a:[44,-36],b:[44,-6],o:[1,0,0]},{a:[44,0],b:[44,50],o:[1,0,0]},{a:[44,56],b:[44,GZ],o:[1,0,0]},
 // the old inner fence at z 34: torn open in the middle and at the west end, so the yard bleeds into Fishermen's Row
 {a:[-44,34],b:[-31,34],o:[0,0,1]},{a:[-25,34],b:[-5,34],o:[0,0,1]},{a:[5,34],b:[44,34],o:[0,0,1]}];
// chain-link diamonds as wire ribbons in the panel plane: A origin (y 0), t along, from s 0..len, heights y0..y1
function mesh(ctx,A,t,o,len,y0,y1,sp,w){const at=(s,y)=>[A[0]+t[0]*s,y+A[1],A[2]+t[2]*s],hh=y1-y0;
 for(let s0=-hh;s0<len;s0+=sp)for(const dir of[1,-1]){const s1=dir>0?s0:s0+hh,s2=dir>0?s0+hh:s0;let lo=0,hi=1;const ds=s2-s1;const la=(0-s1)/ds,lb=(len-s1)/ds;lo=Math.max(0,Math.min(la,lb));hi=Math.min(1,Math.max(la,lb));if(hi-lo<1e-3)continue;
  const sa=s1+ds*lo,ya=y0+hh*lo,sb=s1+ds*hi,yb=y0+hh*hi;const k=Math.SQRT1_2*w/2;const off=[-t[0]*k*Math.sign(ds),k,-t[2]*k*Math.sign(ds)];
  const P=at(sa,ya),Pb=at(sb,yb);Q(ctx,sub(P,off),sub(Pb,off),add(Pb,off),add(P,off),o);}}
function barbed(ctx,a,b,o,L){const t=nrm(sub(b,a)),ln=vlen(sub(b,a));const up=nrm(crs(t,o));
 for(const v of[up,o]){const k=mul(v,.006);Q(ctx,sub(a,k),sub(b,k),add(b,k),add(a,k),crs(t,v));}
 if(L<=1)for(let s=.15;s<ln;s+=.3){const p=add(a,mul(t,s)),d1=nrm(add(up,o)),d2=nrm(sub(up,o));for(const d of[d1,d2]){const e=mul(d,.035),k=mul(t,.004);Q(ctx,add(sub(p,e),k),add(add(p,e),k),sub(add(p,e),k),sub(sub(p,e),k),crs(d,t));}}}
export function geometry(ctx){const L=ctx.lod;
 for(const r of RUNS){const A=[r.a[0],r.y||0,r.a[1]],B=[r.b[0],r.y||0,r.b[1]],ln=vlen(sub(B,A)),t=nrm(sub(B,A)),at=(s,y)=>[A[0]+t[0]*s,y+(r.y||0),A[2]+t[2]*s],n=Math.ceil(ln/3);
  paint(ctx,GALV,"oklch(0.92 0.01 240)",.6,.6);
  for(let i=0;i<=n;i++){const s=i/n*ln;CYL(ctx,at(s,0),at(s,H),.045,.04,L<=1?8:5);if(L<=3){const top=at(s,H);BEAM(ctx,top,add(top,add(mul(r.o,.42),[0,.42,0])),.035,.035);}}
  CYL(ctx,at(0,H-.05),at(ln,H-.05),.025,.025,5,false);
  paint(ctx,null,"oklch(0.6 0.01 240)",.5,.7);
  if(L<=2)mesh(ctx,A,t,r.o,ln,.05,H-.05,L<=1?.2:.5,L<=1?.012:.03);
  ctx.color("oklch(0.55 0.01 240)",L<=1?.1:.22);Q(ctx,at(0,.05),at(ln,.05),at(ln,H-.05),at(0,H-.05),r.o);
  if(L<=3){paint(ctx,null,"oklch(0.5 0.01 240)",.6,.6);for(const k of[.33,.66,1]){const off=add(mul(r.o,.42*k),[0,.42*k,0]);barbed(ctx,add(at(0,H),off),add(at(ln,H),off),r.o,L);}}}
 // the gate: heavy posts, two framed leaves, a chain and padlock at the meeting stiles
 paint(ctx,GALV,"oklch(0.92 0.01 240)",.6,.6);
 for(const x of[-2.75,2.75]){CYL(ctx,[x,0,GZ],[x,3.3,GZ],.08,.08,L<=1?10:6);if(L<=3)BEAM(ctx,[x,3.1,GZ],[x,3.52,GZ+.42],.05,.05);}
 for(const sx of[-1,1]){const x0=sx*.05,x1=sx*2.65,fr=[[x0,.08],[x1,.08],[x1,2.9],[x0,2.9]];
  for(let k=0;k<4;k++){const a=fr[k],b=fr[(k+1)%4];CYL(ctx,[a[0],a[1],GZ],[b[0],b[1],GZ],.03,.03,6,false);}
  CYL(ctx,[x0,1.45,GZ],[x1,1.45,GZ],.025,.025,6,false);if(L<=2)CYL(ctx,[x0,.1,GZ],[x1,2.85,GZ],.025,.025,6,false);
  if(L<=2){paint(ctx,null,"oklch(0.6 0.01 240)",.5,.7);mesh(ctx,[Math.min(x0,x1),0,GZ],X,Z,Math.abs(x1-x0),.12,2.86,L<=1?.2:.5,L<=1?.012:.03);paint(ctx,GALV,"oklch(0.92 0.01 240)",.6,.6);}
  ctx.color("oklch(0.55 0.01 240)",L<=1?.1:.22);Q(ctx,[x0,.1,GZ],[x1,.1,GZ],[x1,2.88,GZ],[x0,2.88,GZ],Z);paint(ctx,GALV,"oklch(0.92 0.01 240)",.6,.6);}
 if(L<=3){paint(ctx,null,"oklch(0.5 0.01 240)",.6,.6);for(const k of[.33,.66,1]){const off=[0,3.1+.42*k,GZ+.42*k];barbed(ctx,[-2.75,off[1],off[2]],[2.75,off[1],off[2]],Z,L);}}
 if(L<=2){paint(ctx,RUST,"oklch(0.93 0.02 50)",.6,.6);for(let i=0;i<12;i++){const a=i/12*2*Math.PI;TOR(ctx,[Math.cos(a)*.15,1.35,GZ+Math.sin(a)*.08],i%2?X:Z,.035,.009,8,4);}
  for(let i=0;i<4;i++)TOR(ctx,[0,1.24-i*.07,GZ-.08],i%2?X:Z,.035,.009,8,4);BX(ctx,-.045,.88,GZ-.11,.045,.98,GZ-.05);TOR(ctx,[0,1.0,GZ-.08],Z,.03,.008,8,4);}}
export function collider(ctx){for(const r of RUNS){const A=[r.a[0],0,r.a[1]],B=[r.b[0],0,r.b[1]],ln=vlen(sub(B,A)),t=nrm(sub(B,A));OB(ctx,[(A[0]+B[0])/2,1.75+(r.y||0),(A[2]+B[2])/2],t,Y,r.o,ln/2+.1,2.25,.1);}
 BX(ctx,-2.85,-.5,GZ-.1,2.85,4,GZ+.1);}
