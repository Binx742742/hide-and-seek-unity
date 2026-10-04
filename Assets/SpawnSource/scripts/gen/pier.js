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
// The wharf: root "pier" stands at world (0,0,-46): local z = world z + 46. Deck top y 0.25, x -26..26, world z -36..-55,
// an apron ramp onto the yard at its shore end, tarred piles to the seabed, seaward kerb, bollards, ladder, tyre fenders.
const BARN="cdn/texture-barnacle-encrusted-wet-tarred-timber.png",IRON="cdn/texture-rusted-cast-iron.png";
const X0=-26,X1=26,ZN=10,ZS=-9,TOP=.25;
const PZ=[9.4,4.8,0,-4.8,-8.6];
const BOL=[[-23,-8.4],[-12,-8.4],[-1,-8.4],[9,-8.4],[23,-8.4],[25.5,4],[25.5,-5]];
const SLOPE=[0,-.23,1.4];
const RAMPS=[[-26,-16.6],[-13.4,2.4],[5.6,26]]; // apron sections, leaving the shore loot spots (-15,-33) and (4,-34) on bare asphalt
function bollard(ctx,x,z,L,coil){paint(ctx,IRON,"oklch(0.93 0.02 50)",.7,.5);const n=L<=1?12:7;
 CYL(ctx,[x,TOP,z],[x,TOP+.06,z],.27,.27,n);CYL(ctx,[x,TOP+.06,z],[x,TOP+.42,z],.16,.13,n);CYL(ctx,[x,TOP+.42,z],[x,TOP+.5,z],.13,.21,n);CYL(ctx,[x,TOP+.5,z],[x,TOP+.56,z],.21,.15,n);
 if(coil&&L<=2){paint(ctx,ROPE_T,"oklch(0.95 0.02 85)",.95,0);TOR(ctx,[x,TOP+.2,z],Y,.17,.035,12,5);TOR(ctx,[x,TOP+.28,z],Y,.165,.035,12,5);}}
export function geometry(ctx){const L=ctx.lod,R=rng(11);
 paint(ctx,TIMBER,"oklch(0.93 0.01 80)",.9,0);
 if(L<=1){for(let z=ZN;z>ZS+.05;z-=.3){const z0=Math.max(ZS,z-.26);let x=X0-R()*3;while(x<X1){const l=2.4+R()*2.6,a=Math.max(X0,x),b=Math.min(X1,x+l-.03);x+=l;if(b-a<.2)continue;if(R()<.015)continue;const dy=(R()-.5)*.012;ctx.color(`oklch(${(.9+R()*.08).toFixed(3)} 0.01 ${(70+R()*20).toFixed(0)})`);BX(ctx,a,.17+dy,z0,b,TOP+dy,z,"-v");}}ctx.color("oklch(0.93 0.01 80)");}
 else if(L<=2){for(let z=ZN;z>ZS+.05;z-=.3)BX(ctx,X0,.17,Math.max(ZS,z-.26),X1,TOP,z,"-v");}
 else BX(ctx,X0,.05,ZS,X1,TOP,ZN);
 // apron ramp down to the yard asphalt
 const d=nrm(SLOPE),v=nrm(crs(d,X)),sl=vlen(SLOPE);
 const strips=L<=2?5:1;for(const[ra,rb]of RAMPS)for(let k=0;k<strips;k++){const s=(k+.5)/strips;OB(ctx,[(ra+rb)/2,TOP-.23*s-.04,ZN+1.4*s],X,v,d,(rb-ra)/2,.04,sl/strips/2-(strips>1?.02:0));}
 if(L<=3){paint(ctx,TAR,"oklch(0.92 0.01 60)",.9,0);
  if(L<=2)for(let x=X0+.3;x<X1;x+=1.3)BX(ctx,x-.08,-.08,ZS+.1,x+.08,.17,ZN-.1,"+v");
  for(const pz of PZ)BX(ctx,X0-.2,-.42,pz-.18,X1+.2,-.08,pz+.18);
  const n=L<=1?10:6;
  for(let i=0;i<=13;i++)for(const pz of PZ)CYL(ctx,[X0+i*4,-1.0,pz],[X0+i*4,-.42,pz],.21,.2,n,false);
  if(L<=2)for(let x=X0+1;x<X1;x+=2.6)CYL(ctx,[x,-5.5,ZS-.28],[x,TOP+.35,ZS-.28],.13,.12,6);
  if(L<=1){for(let i=0;i<13;i++){const x=X0+i*4;BEAM(ctx,[x,-.5,PZ[4]-.25],[x+4,-2.9,PZ[4]-.25],.1,.22);BEAM(ctx,[x+4,-.5,PZ[4]-.25],[x,-2.9,PZ[4]-.25],.1,.22);}
   for(const x of[X0-.25,X1+.25])for(let j=0;j<4;j++){BEAM(ctx,[x,-.5,PZ[j]],[x,-2.9,PZ[j+1]],.1,.22);BEAM(ctx,[x,-.5,PZ[j+1]],[x,-2.9,PZ[j]],.1,.22);}}
  paint(ctx,BARN,"oklch(0.94 0.02 140)",.95,0);
  for(let i=0;i<=13;i++)for(const pz of PZ)CYL(ctx,[X0+i*4,-6.6,pz],[X0+i*4,-1.0,pz],.23,.21,n,false);}
 // kerbs: seaward, west, east (gap at the boat's gangway)
 paint(ctx,TAR,"oklch(0.92 0.01 60)",.9,0);
 BX(ctx,X0,TOP,ZS,X1,TOP+.15,ZS+.25);BX(ctx,X0,TOP,ZS+.25,X0+.25,TOP+.15,ZN);BX(ctx,X1-.25,TOP,ZS+.25,X1,TOP+.15,-2);BX(ctx,X1-.25,TOP,2,X1,TOP+.15,ZN);
 if(L<=3)BOL.forEach(([x,z],i)=>bollard(ctx,x,z,L,i%2===0||i>=5));
 if(L<=2){paint(ctx,ROPE_T,"oklch(0.95 0.02 85)",.95,0);
  rope(ctx,[25.5,TOP+.3,4],[27.2,-.35,4.3],.5,.03,8);rope(ctx,[25.5,TOP+.3,-5],[27.3,-.2,-4.5],.6,.03,8);
  for(const[x,z]of[[-18,-7.6],[4.5,-7.8],[17,7.2]])for(let k=0;k<3;k++)TOR(ctx,[x,TOP+.035+k*.05,z],Y,.32-k*.07,.035,14,5);
  for(const x of[-18,-6,6,18])rope(ctx,[x,TOP+.15,ZS+.1],[x,-.4,ZS-.35],.05,.015,3);
  paint(ctx,IRON,"oklch(0.93 0.02 50)",.7,.5);
  BX(ctx,2.7,-2.6,ZS-.12,2.76,TOP+.9,ZS-.06);BX(ctx,3.24,-2.6,ZS-.12,3.3,TOP+.9,ZS-.06);
  for(let y=-2.4;y<TOP;y+=.3)CYL(ctx,[2.76,y,ZS-.09],[3.24,y,ZS-.09],.016,.016,5,false);
  paint(ctx,null,RUBBER,.85,0);for(const x of[-18,-6,6,18])TOR(ctx,[x,-.75,ZS-.4],Z,.33,.13,L<=1?14:8,L<=1?6:4);}}
export function collider(ctx){BX(ctx,X0,-.25,ZS,X1,TOP,ZN);const d=nrm(SLOPE),v=nrm(crs(d,X));for(const[ra,rb]of RAMPS)OB(ctx,[(ra+rb)/2,(TOP+.02)/2-.1,ZN+.7],X,v,d,(rb-ra)/2,.1,vlen(SLOPE)/2+.02);
 for(const[x,z]of BOL)BX(ctx,x-.22,TOP,z-.22,x+.22,TOP+.56,z+.22);}
