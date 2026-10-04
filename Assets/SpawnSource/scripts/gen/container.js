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
// A rusted 20 ft shipping container, 6.06 x 2.59 x 2.44 m, long along X, doors on +X. params: paint 0..2, open (doors swung: aDoorA/aDoorB deg, droop m).
// Open: walk-in, floor 0.16, doorway 2.14 m wide x 2.33 m clear, a tarp heap and crates at the back to hide behind.
const PAINTS=["cdn/texture-rusted-red-shipping-container-corrugated-steel.png","cdn/texture-faded-blue-shipping-container-steel-with-rust-streaks.png","cdn/texture-weathered-green-shipping-container-steel-rust.png"];
const CL=6.06,CW=2.44,CH=2.59,hl=CL/2,hw=CW/2,LW=hw-.1,DY0=.18,DY1=CH-.12;
function corrX(ctx,x0,x1,y0,y1,zc,sg,amp){const pts=[];for(let x=x0;x<x1-.01;x+=.27){pts.push([x,0],[x+.09,0],[x+.135,amp],[x+.225,amp]);}pts.push([x1,0]);
 for(let i=0;i+1<pts.length;i++){const[a,da]=pts[i],[b,db]=pts[i+1];if(b>x1)continue;Q(ctx,[a,y0,zc+sg*da],[b,y0,zc+sg*db],[b,y1,zc+sg*db],[a,y1,zc+sg*da],[0,0,sg]);}}
function corrZ(ctx,z0,z1,y0,y1,xc,sg,amp){const pts=[];for(let z=z0;z<z1-.01;z+=.27){pts.push([z,0],[z+.09,0],[z+.135,amp],[z+.225,amp]);}pts.push([z1,0]);
 for(let i=0;i+1<pts.length;i++){const[a,da]=pts[i],[b,db]=pts[i+1];if(b>z1)continue;Q(ctx,[xc+sg*da,y0,a],[xc+sg*db,y0,b],[xc+sg*db,y1,b],[xc+sg*da,y1,a],[sg,0,0]);}}
function leafFrame(s,a,droop){const h=[hl,0,s*(hw-.06)],e=[Math.sin(a*D2R),0,-s*Math.cos(a*D2R)],n=[Math.cos(a*D2R),0,s*Math.sin(a*D2R)];
 const c=(u,y)=>add(h,add(mul(e,u),[0,y-droop*u/LW,0]));return{e,n,c};}
function leaf(ctx,s,a,droop,L){const{n,c}=leafFrame(s,a,droop),o=mul(n,.025),io=mul(n,-.025);
 Q(ctx,add(c(0,DY0),o),add(c(LW,DY0),o),add(c(LW,DY1),o),add(c(0,DY1),o),n);Q(ctx,add(c(0,DY0),io),add(c(LW,DY0),io),add(c(LW,DY1),io),add(c(0,DY1),io),mul(n,-1));
 Q(ctx,add(c(LW,DY0),o),add(c(LW,DY0),io),add(c(LW,DY1),io),add(c(LW,DY1),o),null);
 if(L<=2){for(const y of[.5,1.05,1.6,2.15])BEAM(ctx,add(c(.05,y),mul(n,.04)),add(c(LW-.05,y),mul(n,.04)),.04,.07);
  for(const u of[.3,.82])CYL(ctx,add(c(u,.25),mul(n,.09)),add(c(u,DY1-.08),mul(n,.09)),.025,.025,6);}}
export function geometry(ctx){const p=ctx.params,L=ctx.lod,open=!!p.open,tex=PAINTS[(p.paint||0)%3];
 paint(ctx,tex,"oklch(0.94 0.01 60)",.8,.3);
 if(L>=4&&!open){BX(ctx,-hl,0,-hw,hl,CH,hw);return;}
 // frame: corner posts, rails, sill and header
 for(const sx of[-1,1])for(const sz of[-1,1])BX(ctx,sx>0?hl-.15:-hl,0,sz>0?hw-.15:-hw,sx>0?hl:-hl+.15,CH,sz>0?hw:-hw+.15);
 for(const sz of[-1,1]){const z0=sz>0?hw-.1:-hw,z1=sz>0?hw:-hw+.1;BX(ctx,-hl+.15,0,z0,hl-.15,.16,z1);BX(ctx,-hl+.15,CH-.12,z0,hl-.15,CH,z1);}
 BX(ctx,-hl,0,-hw+.15,-hl+.1,.16,hw-.15);BX(ctx,-hl,CH-.12,-hw+.15,-hl+.1,CH,hw-.15);BX(ctx,hl-.1,0,-hw+.15,hl,.16,hw-.15);BX(ctx,hl-.1,CH-.1,-hw+.15,hl,CH,hw-.15);
 if(L<=1){corrX(ctx,-hl+.15,hl-.15,.16,CH-.12,-hw+.04,-1,.035);corrX(ctx,-hl+.15,hl-.15,.16,CH-.12,hw-.04,1,.035);corrZ(ctx,-hw+.15,hw-.15,.16,CH-.12,-hl+.04,-1,.035);}
 else{Q(ctx,[-hl+.15,.16,-hw+.04],[hl-.15,.16,-hw+.04],[hl-.15,CH-.12,-hw+.04],[-hl+.15,CH-.12,-hw+.04],[0,0,-1]);Q(ctx,[-hl+.15,.16,hw-.04],[hl-.15,.16,hw-.04],[hl-.15,CH-.12,hw-.04],[-hl+.15,CH-.12,hw-.04],Z);Q(ctx,[-hl+.04,.16,-hw+.15],[-hl+.04,.16,hw-.15],[-hl+.04,CH-.12,hw-.15],[-hl+.04,CH-.12,-hw+.15],[-1,0,0]);}
 BX(ctx,-hl+.15,CH-.07,-hw+.1,hl-.15,CH-.02,hw-.1);
 if(open){leaf(ctx,1,p.aDoorA??95,p.droop??.3,L);leaf(ctx,-1,p.aDoorB??100,0,L);
  paint(ctx,TIMBER,"oklch(0.9 0.02 60)",.9,0);BX(ctx,-hl+.1,.04,-hw+.1,hl-.1,.16,hw-.1,"-v");
  if(L<=2){paint(ctx,"cdn/texture-dirty-grey-canvas-tarpaulin.png","oklch(0.92 0.01 230)",.9,0);ctx.smooth();BLOB(ctx,[-2.25,.16,-.45],.75,1.15,.65,3,L<=1?5:3,L<=1?10:6);ctx.flat();
   paint(ctx,TIMBER,"oklch(0.93 0.01 80)",.9,0);BX(ctx,-2.85,.16,.35,-2.15,.86,1.1);BX(ctx,-2.8,.86,.4,-2.25,1.4,1.0);YB(ctx,-1.7,.16,.75,12,.3,.5,.3);}}
 else{leaf(ctx,1,0,0,L);leaf(ctx,-1,0,0,L);}}
export function collider(ctx){const p=ctx.params;if(!p.open){BX(ctx,-hl,0,-hw,hl,CH,hw);return;}
 BX(ctx,-hl,0,-hw,hl,.16,hw);BX(ctx,-hl,0,-hw,hl,CH,-hw+.1);BX(ctx,-hl,0,hw-.1,hl,CH,hw);BX(ctx,-hl,0,-hw,-hl+.1,CH,hw);BX(ctx,-hl,CH-.1,-hw,hl,CH,hw);
 for(const[s,a,dr]of[[1,p.aDoorA??95,p.droop??.3],[-1,p.aDoorB??100,0]]){const{e,n,c}=leafFrame(s,a,dr);OB(ctx,c(LW/2,(DY0+DY1)/2),e,Y,n,LW/2,(DY1-DY0)/2,.05);}
 BX(ctx,-2.85,.16,.35,-2.15,1.4,1.1);BX(ctx,-2.9,.16,-1.1,-1.6,1.1,.2);}
