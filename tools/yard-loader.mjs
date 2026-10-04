// Loads scripts/gen so box/tube/quad calls become primitive records instead of mesh faces.
// The generators themselves are not edited.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

function replaceFn(source, name, body) {
  const start = source.indexOf(`export function ${name}(`);
  const start2 = start >= 0 ? start : source.indexOf(`function ${name}(`);
  if (start2 < 0) return source;
  const brace = source.indexOf("{", start2);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        const head = source.slice(start2, brace + 1);
        return source.slice(0, start2) + head + "\n" + body + "\n}\n" + source.slice(i + 1);
      }
    }
  }
  return source;
}

function patchKit(source) {
  source = replaceFn(source, "box", "  ctx.partBox(x0, y0, z0, x1, y1, z1);");
  source = replaceFn(source, "obox", "  ctx.partObox(c, h, yaw, pitch, roll);");
  source = replaceFn(source, "tube", "  ctx.partTube(p0, p1, r0, r1 == null ? r0 : r1);");
  source = replaceFn(source, "hexa", "  ctx.partHexa(P);");
  source = replaceFn(source, "puddle", "  ctx.partTube([x, y, z], [x, y + 0.02, z], r * 0.8, r * 0.8);");
  return source;
}

function patchInline(source) {
  if (!source.includes("function BX(")) return source;
  source = source.replace(
    /^function BX\(ctx,x0,y0,z0,x1,y1,z1,skip\)\{.*\}$/m,
    "function BX(ctx,x0,y0,z0,x1,y1,z1,skip){ctx.partBox(x0,y0,z0,x1,y1,z1);}"
  );
  source = source.replace(
    /^function CYL\(ctx,a,b,r0,r1,n,caps\)\{.*\}$/m,
    "function CYL(ctx,a,b,r0,r1,n,caps){ctx.partTube(a,b,r0,r1==null?r0:r1);}"
  );
  source = source.replace(
    /^function OB\(ctx,c,u,v,w,hu,hv,hw,skip\)\{.*\}$/m,
    "function OB(ctx,c,u,v,w,hu,hv,hw,skip){ctx.partAxes(c,u,v,w,hu,hv,hw);}"
  );
  source = source.replace(
    /^function TOR\(ctx,c,ax,R,r,n,m,fy\)\{.*\}$/m,
    "function TOR(ctx,c,ax,R,r,n,m,fy){const d=nrm(ax),h=r||0.05;ctx.partTube(add(c,mul(d,-h)),add(c,mul(d,h)),R,R);}"
  );
  source = source.replace(
    /function BLOB\(ctx,c,rx,ry,rz,sd,nl,nm\)\{[\s\S]*?\n\}/,
    "function BLOB(ctx,c,rx,ry,rz,sd,nl,nm){ctx.partSphere(c,rx,ry,rz);}"
  );
  return source;
}

export async function load(url, context, nextLoad) {
  if (!url.includes("/scripts/gen/") || !url.endsWith(".js")) return nextLoad(url, context);
  let source = fs.readFileSync(fileURLToPath(url), "utf8");
  if (url.endsWith("/kit.js")) source = patchKit(source);
  else source = patchInline(source);
  return { format: "module", source, shortCircuit: true };
}
