// Gullmouth HUD. Reads place.state (phase, clock, winner, feed) and the viewer's own state (role, hp, inv, disguise, prompt).
const RECIPES = [
  { key: "1", act: "craft1", name: "Bear trap", cost: { scrap: 2 }, icon: "trap" },
  { key: "2", act: "craft2", name: "Powder keg", cost: { scrap: 1, powder: 1 }, icon: "keg" },
  { key: "3", act: "craft3", name: "Rattle lure", cost: { wire: 1, scrap: 1 }, icon: "rattle" },
  { key: "4", act: "craft4", name: "Flashbang", cost: { powder: 1, wire: 1 }, icon: "flash" },
  { key: "5", act: "craft5", name: "Tripwire", cost: { wire: 2 }, icon: "wire" },
  { key: "6", act: "craft6", name: "Barricade", cost: { scrap: 2, wire: 1 }, icon: "bar" },
  { key: "7", act: "craft7", name: "Smoke", cost: { powder: 2 }, icon: "smoke" },
  { key: "8", act: "craft8", name: "Scarecrow", cost: { scrap: 1, wire: 1, powder: 1 }, icon: "crow" },
];
const POWERS = [["scent", "C", 1, "scent"], ["lunge", "V", 2, "lunge"], ["wail", "X", 3, "wail"], ["fade", "Z", 4, "fade"], ["frenzy", "", 5, "frenzy"]];
const MAT = { scrap: "scrap", wire: "wire", powder: "powder" };
const FORM = { none: "your own shape", crate: "a wooden crate", barrel: "an oil drum", loot: "a loot crate", fisherman: "a sleepwalking fisherman", locker: "a locker", tarp: "a tarp", dinghy: "a dinghy", dumpster: "a dumpster" };
const clock = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

const IC = {
  trap: "/cdn/value.5b84ea92884f229cfa0756cf7f123b54c88601b412f7f0d1a3531f0597a1f01c.png", keg: "/cdn/value.ecae52e2333bb085e693649652b1649041a2bf027ca680e6faf3b9444214cdb1.png",
  rattle: "/cdn/value.8f266bb460de9b2eb87161c1242c386a8122a40ba1522bc7003822aa0cbfc088.png", flash: "/cdn/value.581a3611664b0c5af4c2919f3085e9a4f516203d3114881efdafda23ebad2daa.png",
  wire: "/cdn/value.14b4666eaeb2c5aa0c581fe2f93bfefaea155372fcd20bfc286e4f414319f04c.png", bar: "/cdn/value.86b9ed4ae0b2249b168182e3fb7a08be64037f9cf108aefdd6c10896ef906c89.png",
  smoke: "/cdn/value.a1013f0b29f3c16bcbecb2e44bd2816610cb07b510ea9453c035e020dc00507c.png", crow: "/cdn/value.459a134359006212dbc10533356a7534b5365d90a1b02add31ce8909711c79f6.png",
  disguise: "/cdn/value.24a276865b62087e6f2ed3553fa11273bdd08ceb0e8d221446abd05b43fec56c.png", fake: "/cdn/value.df4d19daa2f5f21fbb8d66c3801384860b9764fbb84fcfe51006f994c9889a31.png",
  dark: "/cdn/value.9129a4bf7dd8790b3f2315a040545c2d3dc580915cf882c91aa24cdd9e1e186f.png", lie: "/cdn/value.79bb74e288fdb714c1e4f06e08d168f86aa3e04cc4e067b9166c1d186ab08e17.png",
  voice: "/cdn/value.a8652ba6c86b486cb37a0c3709317331443bc7ea78f1c482288bcab7f58757a6.png", snare: "/cdn/value.e7063b29f121ac2629c796d4acac3e5d085ef6c7b49fe36656e7552146761f43.png",
  face: "/cdn/value.ecb4c504d579499996d4f34d6f271bc492e2d40ac2815888011334779f06a04f.png", fish: "/cdn/value.92516eba0282d3b0136abb6905808f87a46d71435a1d0c1975dbeb5b8f34624c.png",
};
const STYLE = `<style>
.g{--ink:#0b0f15;--slate:#151c26;--slate2:#1b2430;--edge:#3a4a56;--rust:#b7410e;--amber:#e8c170;--bone:#d9d4c7;--blood:#c2361f;position:fixed;inset:0;pointer-events:none;font-family:'Geist Pixel Square',ui-monospace,monospace;color:var(--bone);text-shadow:1px 1px 0 var(--ink)}
.plate{background:linear-gradient(180deg,rgba(27,36,48,.92),rgba(16,21,29,.92));border:2px solid var(--edge);box-shadow:3px 3px 0 var(--ink);padding:8px 12px}
.plate.rust{border-color:var(--rust)}
.cap{font-size:11px;letter-spacing:.22em;color:var(--amber);text-transform:uppercase}
.top{position:absolute;top:16px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px}
.top .plate{display:flex;flex-direction:column;align-items:center;min-width:170px;padding:6px 18px 8px;border-bottom:3px solid var(--rust)}
.clock{font-size:38px;line-height:1;letter-spacing:.04em;color:#f2ede2}
.clock.hot{color:#ff6a4a;animation:tick 1s steps(1) infinite}
@keyframes tick{50%{color:#ffb39a}}
.sub{font-size:11px;letter-spacing:.14em;opacity:.75;text-transform:uppercase}
.chips{display:flex;gap:6px}
.chip{font-size:11px;letter-spacing:.12em;padding:3px 9px;background:rgba(16,21,29,.88);border:1px solid var(--edge);box-shadow:2px 2px 0 var(--ink)}
.chip b{font-weight:normal;color:#f2ede2;margin-left:4px}
.chip.blue{color:oklch(0.82 0.1 230);border-color:oklch(0.45 0.07 230)}.chip.gold{color:var(--amber);border-color:#7a5a24}
.feed{position:absolute;top:16px;left:16px;display:flex;flex-direction:column;gap:4px;max-width:min(340px,40vw)}
.feed div{font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:5px 10px 5px 9px;background:rgba(11,15,21,.78);border-left:3px solid var(--rust);animation:fin .25s ease-out}
@keyframes fin{from{opacity:0;transform:translateX(-10px)}}
.dock{position:absolute;left:16px;bottom:16px;display:flex;align-items:flex-end;gap:10px;max-width:calc(100vw - 32px)}
.stat{min-width:210px;display:flex;flex-direction:column;gap:7px}
.stat .cap.red{color:#ff7a5c}
.hp{height:12px;background:var(--ink);border:1px solid var(--edge);position:relative;overflow:hidden}
.hp i{position:absolute;inset:0;right:auto;background:linear-gradient(180deg,#e0623a,#8a2c12);transition:width .3s}
.hp.m i{background:linear-gradient(180deg,#a3241a,#4a0c0c)}
.hp:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 17px,var(--ink) 17px 19px)}
.mats{display:flex;gap:12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.mats span{display:flex;align-items:baseline;gap:5px;opacity:.85}.mats b{font-size:17px;color:#f2ede2;font-weight:normal}
.mats .zero b{color:#6b7782}
.line{font-size:12px;letter-spacing:.06em}
.pips{display:flex;gap:3px;align-items:center}.pips i{width:12px;height:12px;border:1px solid #6e2a1c;background:var(--ink);transform:rotate(45deg);margin:0 2px}.pips i.on{background:#d8452a;border-color:#ff8a6a;box-shadow:0 0 6px #d8452a}
.bar{display:flex;gap:6px;flex-wrap:wrap}
.slot{pointer-events:auto;position:relative;width:58px;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer}
.slot .face{position:relative;width:58px;height:58px;background:var(--slate);border:2px solid var(--edge);box-shadow:3px 3px 0 var(--ink);overflow:hidden}
.slot img{width:100%;height:100%;object-fit:cover;display:block}
.slot.ok .face{border-color:var(--amber)}
.slot.ok:hover .face{transform:translateY(-2px);box-shadow:3px 5px 0 var(--ink)}
.slot.off .face img{filter:grayscale(1) brightness(.45)}
.slot.off{cursor:default}
.slot .k{position:absolute;left:3px;top:2px;font-size:11px;color:var(--amber);text-shadow:1px 1px 0 #000,0 0 3px #000}
.slot .cd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;background:rgba(8,10,14,.62)}
.slot .cd:before{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--p);background:rgba(183,65,14,.35)}
.slot .lock{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#ff8a6a;background:rgba(8,10,14,.7)}
.slot .nm{font-size:9px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;opacity:.85}
.slot .cost{font-size:9px;letter-spacing:.04em;opacity:.6;white-space:nowrap}
.slot.ok .cost{opacity:.9;color:var(--amber)}
.powers{display:flex;gap:5px;flex-wrap:wrap}
.pw{font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:3px 7px;border:1px solid var(--edge);background:rgba(11,15,21,.8)}
.pw.ready{border-color:#d8452a;color:#ffb39a}.pw.lockd{opacity:.35}.pw kbd{font:inherit;color:var(--amber);margin-right:4px}
.hint{font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:.55;line-height:1.6}
.ping{position:relative;width:0;height:0}
.ping i{position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;border:3px solid rgba(183,65,14,.95);box-shadow:0 0 14px rgba(183,65,14,.8),inset 0 0 10px rgba(183,65,14,.5);animation:pg 1.1s ease-out infinite}
.ping i:nth-child(2){animation-delay:.55s}
.ping b{position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:#e8c170;box-shadow:0 0 10px #b7410e}
@keyframes pg{0%{transform:scale(.2);opacity:1}100%{transform:scale(1.6);opacity:0}}
.pbar{pointer-events:auto;margin-left:6px;background:var(--rust);color:#fff;border:0;padding:3px 9px;font:inherit;font-size:11px;letter-spacing:.1em;box-shadow:2px 2px 0 var(--ink)}
.prompt{display:flex;align-items:center;gap:6px;background:rgba(11,15,21,.9);border:1px solid var(--amber);box-shadow:2px 2px 0 var(--ink);padding:4px 9px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;transform:translate(-50%,-140%)}
.prompt kbd{font:inherit;background:var(--amber);color:var(--ink);padding:0 5px;text-shadow:none}
.toast{position:absolute;left:50%;bottom:30%;transform:translateX(-50%);font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:var(--amber);padding:7px 16px;background:rgba(11,15,21,.82);border-top:2px solid var(--rust);border-bottom:2px solid var(--rust);animation:fade 2.6s forwards;white-space:nowrap}
@keyframes fade{0%{opacity:0;transform:translate(-50%,8px)}10%{opacity:1;transform:translate(-50%,0)}75%{opacity:1}100%{opacity:0}}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px}
.big{font-size:clamp(30px,7vw,72px);letter-spacing:.1em;text-shadow:4px 4px 0 #000}
.banner{display:flex;flex-direction:column;align-items:center;gap:8px;padding:22px 48px;background:linear-gradient(90deg,transparent,rgba(8,10,14,.9) 18%,rgba(8,10,14,.9) 82%,transparent);border-top:2px solid var(--rust);border-bottom:2px solid var(--rust);animation:fin .4s ease-out}
.red{color:#ff5a3a}.gold{color:var(--amber)}.blue{color:oklch(0.82 0.1 230)}
.vig{position:absolute;inset:0;box-shadow:inset 0 0 180px 50px rgba(120,0,0,.55);animation:beat .9s infinite}
@keyframes beat{0%,100%{opacity:.35}15%{opacity:.85}}
.hurt{position:absolute;inset:0;box-shadow:inset 0 0 220px 60px rgba(170,0,0,.6);animation:hurt .5s forwards}
@keyframes hurt{to{opacity:0}}
.help{font-size:12px;opacity:.85;line-height:1.6;max-width:420px}
.talk{position:absolute;left:50%;bottom:24%;transform:translateX(-50%);width:min(560px,86vw);text-align:center}
.mtr{position:relative;height:30px;margin:10px 0;background:oklch(0.16 0.02 240 / .9);border:2px solid oklch(0.5 0.05 240);overflow:hidden}
.zone{position:absolute;top:0;bottom:0;background:oklch(0.78 0.13 85 / .75);box-shadow:0 0 18px oklch(0.8 0.14 85)}
.ndl{position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:white;box-shadow:0 0 10px white}
.tpips{font-size:20px;letter-spacing:6px}
.read{position:absolute;left:50%;top:30%;transform:translateX(-50%);max-width:min(440px,80vw);font-size:16px;font-style:italic;text-align:center;animation:fadeo 6s forwards}
@keyframes fadeo{0%{opacity:0}8%{opacity:1}80%{opacity:1}100%{opacity:0}}
.lock-card .clock{font-size:48px}
@media (pointer:coarse),(max-width:760px){
 .dock{flex-direction:column;align-items:flex-start;bottom:auto;top:calc(16px + var(--spawn-safe-area-top,0px));left:calc(12px + var(--spawn-safe-area-left,0px))}
 .feed{top:auto;bottom:45%;left:12px;max-width:60vw}
 .stat{min-width:0;padding:6px 9px;gap:5px}.mats b{font-size:14px}
 .bar{max-width:268px;gap:4px}.slot,.slot .face{width:44px}.slot .face{height:44px}.slot .nm,.slot .cost{display:none}
 .top .plate{min-width:120px;padding:4px 12px 6px}.clock{font-size:26px}.hint{display:none}
}
</style>`;

import CHARS from "./lib/data/characters.yml";
const LOGO = "/cdn/value.206d927e3c8ed2bbe34c1b8f143364fd3a811b2c47c346eacc3669db1a1b40fe.png";
const PHASE = { lobby: "waiting", hide: "hiding", hunt: "hunting", end: "ending" };
export function pick(id) { sendAction("menu", { op: "pick", char: id }); }
export function play() { sendAction("menu", { op: "play" }, { relockPointer: true }); }
export function join(room) { sendAction("menu", { op: "join", room }); }
export function fresh() { sendAction("menu", { op: "new" }); }
export function openMenu() { sendAction("menu", {}); }
export function showTutorial() { sendAction("menu", { op: "tutorial" }); }
export function closeTutorial() { sendAction("menu", { op: "tutordone" }); }
const MSTYLE = `<style>
.mn{position:fixed;inset:0;pointer-events:auto;font-family:'Geist Pixel Square',ui-monospace,monospace;color:#d9d4c7;background:linear-gradient(90deg,rgba(8,11,16,.96) 0%,rgba(8,11,16,.82) 42%,rgba(8,11,16,.2) 78%,rgba(8,11,16,0) 100%);overflow-y:auto;padding:36px calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px) 36px 48px;display:flex;flex-direction:column;gap:22px}
.mn img.logo{width:min(560px,80vw);filter:drop-shadow(0 6px 18px #000)}
.mn .mtag{font-size:15px;opacity:.75;max-width:560px;line-height:1.5;border-left:3px solid #b7410e;padding-left:12px}
.mn h3{font-size:12px;letter-spacing:.3em;color:#e8c170;margin:0 0 10px;text-transform:uppercase;display:flex;align-items:center;gap:10px}
.mn h3:after{content:"";flex:0 0 120px;height:1px;background:linear-gradient(90deg,#b7410e,transparent)}
.chars{display:flex;gap:12px;flex-wrap:wrap}
.ch{width:150px;background:#10151d;border:2px solid #2c3a44;color:inherit;font:inherit;padding:0;cursor:pointer;text-align:left;box-shadow:4px 4px 0 #000;transition:transform .12s,border-color .12s}
.ch:hover{transform:translateY(-3px);border-color:#6b7d8a}
.ch img,.ch .own{width:100%;height:190px;object-fit:cover;display:block;background:#1b2430}
.ch .own{display:flex;align-items:center;justify-content:center;font-size:40px;color:#4a5d6a}
.ch .nm{font-size:14px;letter-spacing:.06em;padding:7px 8px 2px;text-transform:uppercase}.ch .bl2{font-size:11px;opacity:.55;padding:0 8px 8px;min-height:28px;line-height:1.35}
.ch.on{border-color:#e8c170;box-shadow:4px 4px 0 #b7410e}
.ch.on .nm{color:#e8c170}
.mrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.lobbies{display:flex;flex-direction:column;gap:6px;max-width:560px}
.lb{display:flex;align-items:center;gap:12px;background:rgba(16,21,29,.9);border:1px solid #3a4a56;border-left:3px solid #b7410e;padding:8px 10px}
.lb .rn{flex:1;font-size:15px}.lb .pc{font-size:15px;color:#e8c170;width:52px}.lb .ph{font-size:10px;letter-spacing:.15em;text-transform:uppercase;opacity:.6;width:70px}
.mb{font:inherit;font-size:14px;cursor:pointer;background:#b7410e;color:#fff;border:0;padding:9px 16px;letter-spacing:.16em;text-transform:uppercase;box-shadow:4px 4px 0 #000;transition:transform .1s,background .1s}
.mb:hover{background:#d24f14;transform:translate(-1px,-1px);box-shadow:5px 5px 0 #000}
.mb.alt{background:#1b2430;border:1px solid #4a5d6a}.mb.alt:hover{background:#26323f}.mb.big{font-size:22px;padding:14px 44px}
.mb:disabled{opacity:.35;cursor:default}
.here{font-size:11px;letter-spacing:.15em;text-transform:uppercase;opacity:.7}
.here b{color:#e8c170;font-weight:normal}
.menu-btn{position:absolute;top:16px;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);pointer-events:auto;font:inherit;font-size:11px;letter-spacing:.2em;background:rgba(16,21,29,.9);color:#d9d4c7;border:2px solid #3a4a56;box-shadow:3px 3px 0 #000;padding:6px 12px;cursor:pointer}
.menu-btn:hover{border-color:#e8c170;color:#e8c170}
.tut{display:flex;flex-direction:column;gap:6px;max-width:620px;counter-reset:t}
.tut p{margin:0;background:rgba(16,21,29,.9);border:1px solid #3a4a56;border-left:3px solid #b7410e;padding:10px 14px;font-size:14px;line-height:1.5;counter-increment:t}
.tut p:before{content:counter(t,decimal-leading-zero);color:#e8c170;margin-right:10px;font-size:11px}
@media (max-width:600px){.ch{width:78px}.ch img,.ch .own{height:96px}.ch .bl2{display:none}.ch .nm{font-size:10px}.mn{padding-left:16px;gap:16px}.tut p{font-size:13px}.mb.big{font-size:18px;padding:12px 28px}}
</style>`;
function tutorial(coarse) {
  const hide = coarse
    ? `Hiding: sneak. USE searches loot. The craft buttons drop a trap. Hide in a locker, a tarp, a dinghy, or the dumpster — USE in, USE out.`
    : `Hiding: sneak. E searches loot. 1–8 crafts: traps, tripwires, barricades, smoke, scarecrows. Hide in a locker, a tarp, a dinghy, or the dumpster — E in, E out.`;
  const keys = coarse
    ? `The stick moves you. STAB swings. USE uses what's in front of you. MENU opens the menu.`
    : `WASD moves. Left click or F stabs. E uses what's in front of you. M opens the menu.`;
  return MSTYLE + `<div class="mn" data-modal>
    <img class="logo" src="${LOGO}" alt="HIDE AND SEEK">
    <h3>BEFORE YOU PLAY</h3>
    <div class="tut">
      <p>One of you is the monster. They look like a player until they hurt someone, or someone sees it.</p>
      <p>On a human round, their claws stay locked for 30 seconds.</p>
      <p>${hide}</p>
      <p>Win by lasting until dawn, waking the dreamers, or killing every true mimic.</p>
      <p>${keys}</p>
    </div>
    <div><button class="mb big" onclick="closeTutorial()">CONTINUE</button></div>
  </div>`;
}
function menu(ctx, me) {
  const s = ctx.place.state ?? {}, here = s.roomId ?? "", mine = me.character ?? "own";
  const rooms = (s.lobbies ?? []).filter((r) => r.room !== here);
  const n = (ctx.place.players ?? []).length;
  return MSTYLE + `<div class="mn" data-modal>
    <img class="logo" src="${LOGO}" alt="HIDE AND SEEK">
    <div class="mtag">a dead cannery, a dream nobody wakes from, and one of you is not who they look like.</div>
    <div><h3>WAKE UP AS</h3><div class="chars">${CHARS.map((c) => `<button class="ch ${c.id === mine ? "on" : ""}" onclick="pick('${c.id}')">${c.pic ? `<img src="${c.pic}">` : `<div class="own">☺</div>`}<div class="nm">${c.name}</div><div class="bl2">${c.blurb}</div></button>`).join("")}</div></div>
    <div class="mrow"><button class="mb big" onclick="play()">PLAY HERE</button><button class="mb alt" onclick="showTutorial()">TUTORIAL</button><span class="here">this lobby · <b>${n}/10</b> · ${PHASE[s.phase ?? "lobby"]}</span></div>
    <div><h3>OTHER LOBBIES</h3><div class="lobbies">${rooms.length ? rooms.map((r) => `<div class="lb"><span class="rn">${r.room}</span><span class="pc">${r.players}/10</span><span class="ph">${PHASE[r.phase] ?? r.phase}</span><button class="mb" ${r.players >= 10 ? "disabled" : ""} onclick="join('${r.room}')">JOIN</button></div>`).join("") : `<div class="here" style="opacity:.5">no other lobbies right now</div>`}
      <button class="mb alt" onclick="fresh()">+ START A NEW LOBBY</button></div></div>
    ${me.menuMsg && ctx.now() - me.menuMsg.at < 4000 ? `<div class="red" style="font-size:13px">${me.menuMsg.text}</div>` : ""}
    <div style="font-size:11px;opacity:.5">${typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches ? "MENU button reopens this" : "M reopens this menu between rounds"}</div>
  </div>`;
}

const ABBR = { scrap: "S", wire: "W", powder: "P" };
function slot({ icon, key, name, sub, act, ok, cd, total, lock, coarse }) {
  const cdTxt = cd > 0 ? `<div class="cd" style="--p:${Math.round((1 - cd / (total || cd)) * 100)}%">${Math.ceil(cd / 1000)}</div>` : "";
  const lk = lock ? `<div class="lock">🐟${lock}</div>` : "";
  const live = ok && !(cd > 0) && !lock;
  return `<button class="slot ${live ? "ok" : "off"}" ${act && live ? `onclick="sendAction('${act}')"` : "disabled"}><div class="face"><img src="${IC[icon]}" alt="">${cdTxt}${lk}${coarse || !key ? "" : `<span class="k">${key}</span>`}</div><div class="nm">${name}</div>${sub ? `<div class="cost">${sub}</div>` : ""}</button>`;
}
export default function render(ctx, player) {
  const s = ctx.place.state ?? {}, me = player.state ?? {}, now = ctx.now();
  if (me.tutorial) return tutorial(typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
  if (me.menu) return menu(ctx, me);
  const phase = s.phase ?? "lobby", role = me.role ?? "lobby";
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const hiders = (ctx.place.players ?? []).filter((p) => p.state?.role === "hider").length + (s.npcAlive ?? 0);
  let h = STYLE + MSTYLE + `<div class="g">` + ((role === "lobby" || role === "ghost" || phase === "lobby" || phase === "end") ? `<button class="menu-btn" onclick="openMenu()">MENU</button>` : "");

  // the clock
  if (phase === "lobby") {
    const n = (ctx.place.players ?? []).length;
    h += `<div class="top"><div class="plate"><div class="cap">Gullmouth Cannery</div><div class="clock">${s.startAt ? clock(s.startAt - now) : "—"}</div><div class="sub">${n < 2 ? "alone · something else hunts you" : `${n} waiting · one of you is the mimic`}</div></div></div>`;
    h += `<div class="dock"><div class="plate help"><div class="cap" style="margin-bottom:6px">How it goes</div>Everyone looks the same. One is the <span class="red">mimic</span>, revealed when someone sees it hurt someone, or a trap bites it.<br><span class="gold">Hiders</span> search crates for scrap, wire and powder, craft traps, wake the 5 dreamers or survive till dawn.<br><span class="red">Mimic</span> becomes crates and hiding spots, eats fish for powers, lays fake loot, throws its voice, steals faces.<br><span style="opacity:.7">Never trust a still crate.</span></div></div>`;
  } else if (phase === "hide" || phase === "hunt") {
    const left = s.endsAt - now;
    const dream = s.dreamerTotal ? `<div class="chips"><div class="chip blue">CLUES<b>${s.clues ?? 0}/${s.clueTotal}</b></div><div class="chip gold">AWAKE<b>${s.awake ?? 0}/${s.dreamerTotal}</b></div></div>` : "";
    h += `<div class="top"><div class="plate"><div class="cap">${phase === "hide" ? "Hide" : "The Hunt"}</div><div class="clock ${phase === "hunt" && left < 30000 ? "hot" : ""}">${clock(left)}</div></div>${dream}</div>`;
  }

  if (me.read && now - me.read.at < 6000) h += `<div class="read plate blue" id="read-${me.read.at}">${me.read.pic ? `<img src="${me.read.pic}" style="width:180px;height:180px;display:block;margin:0 auto 8px;border:6px solid #eee;transform:rotate(-3deg)">` : ""}${me.read.text}<div style="font-size:11px;font-style:normal;opacity:.7;margin-top:6px">the dreamers will listen easier now</div></div>`;
  if (me.talk) {
    const t = me.talk, x = ((now - t.at) / t.period) % 2, u = x < 1 ? x : 2 - x;
    const fl = t.flash && now - t.flash.at < 300 ? (t.flash.ok ? "box-shadow:0 0 30px oklch(0.8 0.14 85)" : "box-shadow:0 0 30px oklch(0.6 0.2 25)") : "";
    h += `<div class="talk plate"><div class="cap">Wake ${t.name}</div><div style="font-size:12px;opacity:.8;margin-top:4px">say it when the needle's in the gold · ${coarse ? "tap USE" : "E or click"}</div>
      <div class="mtr" style="${fl}"><div class="zone" style="left:${t.zone[0] * 100}%;width:${(t.zone[1] - t.zone[0]) * 100}%"></div><div class="ndl" style="left:${u * 100}%"></div></div>
      <div class="tpips"><span class="gold">${"●".repeat(t.hits)}${"○".repeat(Math.max(0, 3 - t.hits))}</span> <span class="red" style="font-size:14px">${"✕".repeat(t.misses)}</span></div></div>`;
  }

  // feed
  const feed = (s.feed ?? []).filter((f) => now - f.at < 7000);
  if (feed.length && phase !== "lobby") h += `<div class="feed">${feed.map((f) => `<div id="f-${f.at}">${f.text}</div>`).join("")}</div>`;

  // hurt and dread
  if (me.hurtAt && now - me.hurtAt < 500) h += `<div class="hurt" id="hurt-${me.hurtAt}"></div>`;
  if (role === "hider" && me.dread === 2) h += `<div class="vig"></div>`;

  // the viewer's dock
  if (role === "hider") {
    const inv = { scrap: 0, wire: 0, powder: 0, ...(me.inv ?? {}) }, hp = Math.max(0, me.hp ?? 100);
    if (me.hiddenIn) h += `<div class="center" style="justify-content:flex-end;padding-bottom:22%"><div class="toast" style="animation:none;position:static;transform:none">hidden · hold your breath${coarse ? "" : " · E to climb out"}</div></div>`;
    h += `<div class="dock"><div class="plate stat"><div class="cap">Hider${me.smoked ? ' · <span style="color:#9fb3c2">in smoke</span>' : ""}</div><div class="hp"><i style="width:${hp}%"></i></div>
      <div class="mats">${Object.keys(MAT).map((k) => `<span class="${inv[k] ? "" : "zero"}"><b>${inv[k]}</b>${k}</span>`).join("")}</div>
      ${coarse ? "" : `<div class="hint">E search · click stab · 1–8 craft</div>`}</div>
      <div class="bar">${RECIPES.map((r) => {
        const ok = Object.entries(r.cost).every(([k, n]) => inv[k] >= n);
        return slot({ icon: r.icon, key: r.key, name: r.name, sub: Object.entries(r.cost).map(([k, n]) => n + ABBR[k]).join(" "), act: r.act, ok, coarse });
      }).join("")}</div></div>`;
    if (me.prompt) h += `<div data-world-anchor="${me.prompt}" data-anchor-offset="${me.promptDoor ? "0.6 1.4 0" : "0 1.2 0"}"><div class="prompt">${coarse ? "" : "<kbd>E</kbd>"}${me.promptVerb ?? "Search"}${me.promptDoor === "shut" ? (coarse ? `<button class="pbar" onclick="sendAction('plant')">BAR</button>` : " · <kbd>R</kbd>Bar") : ""}</div></div>`;
  } else if (role === "mimic") {
    const hp = Math.max(0, me.hp ?? 200), top = me.risen ? 90 : 200, pw = me.power ?? 0;
    const c = (at) => Math.max(0, (at ?? 0) - now), cdk = (k) => c(me.cd?.[k]);
    h += `<div class="dock"><div class="plate stat rust"><div class="cap red">${me.risen ? "Risen · you hunt now" : me.revealed ? "The mimic · revealed" : "The mimic · hidden"}</div><div class="hp m"><i style="width:${(hp / top) * 100}%"></i></div>
      <div class="line">you are <span class="gold">${FORM[me.disguise ?? "none"]}</span>${me.faceName ? ` · wearing <span class="gold">${me.faceName}</span>` : ""}</div>
      <div class="line" style="display:flex;align-items:center;gap:8px"><img src="${IC.fish}" style="width:20px;height:20px">power <span class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= pw ? "on" : ""}"></i>`).join("")}</span></div>
      <div class="powers">${POWERS.map(([k, key, at, name]) => { const lock = pw < at, cd = cdk(k); return `<span class="pw ${lock ? "lockd" : cd > 0 ? "" : "ready"}">${coarse || !key ? "" : `<kbd>${key}</kbd>`}${name} ${lock ? at : k === "frenzy" ? "on" : cd > 0 ? Math.ceil(cd / 1000) + "s" : ""}</span>`; }).join("")}</div>
      ${coarse ? "" : `<div class="hint">click claw · E eat fish · rings = noise · claw doors to break</div>`}</div>
      <div class="bar">
        ${slot({ icon: "disguise", key: "Q", name: "change form", act: "disguise", ok: true, coarse })}
        ${slot({ icon: "fake", key: "R", name: "fake loot", act: "plant", ok: true, cd: c(me.plantAt), coarse })}
        ${slot({ icon: "dark", key: "T", name: "blackout", act: "blackout", ok: true, cd: c(me.darkAt), coarse })}
        ${slot({ icon: "lie", key: "G", name: "false clue", act: "falseclue", ok: true, cd: c(me.lieAt), coarse })}
        ${slot({ icon: "voice", key: "B", name: "throw voice", act: "echo", ok: true, cd: cdk("echo"), coarse })}
        ${slot({ icon: "snare", key: "H", name: "gut snare", act: "snare", ok: true, cd: cdk("snare"), coarse })}
        ${slot({ icon: "face", key: "J", name: "steal face", act: "steal", ok: true, cd: cdk("steal"), coarse })}
      </div></div>`;
    if ((me.clawReadyAt ?? 0) > now && !me.risen) h += `<div class="center lock-card" style="justify-content:flex-start;padding-top:11%"><div class="banner"><div class="big red">YOU ARE THE MIMIC</div><div class="sub">nobody knows · walk with them</div><div class="clock red">claws in ${clock((me.clawReadyAt ?? 0) - now)}</div><div class="hint" style="display:block;opacity:.7">your first claw kills · if anyone sees it, you're revealed</div></div></div>`;
    else if (!me.revealed && !me.risen) h += `<div style="position:absolute;left:50%;bottom:30%;transform:translateX(-50%);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#e8c170;padding:4px 10px;background:rgba(11,15,21,.7);border-left:3px solid #b7410e">${(me.ambushAt ?? 0) > now ? `killing strike in ${Math.ceil((me.ambushAt - now) / 1000)}s` : `<span class="red">killing strike ready</span>`}</div>`;
    for (const id of me.pings ?? []) h += `<div data-world-anchor="${id}"><div class="ping"><i></i><i></i><b></b></div></div>`;
  } else if (role === "ghost" && phase !== "end") {
    h += `<div class="dock"><div class="plate stat"><div class="cap red">${me.team === "mimic" ? "Put to rest" : "Taken"}</div><div class="line" style="opacity:.8">you drift unseen. watch the others.</div></div></div>`;
  }

  // the toast
  if (me.msg && now - me.msg.at < 2600) h += `<div class="toast" id="t-${me.msg.at}">${me.msg.text}</div>`;

  // the end
  if (phase === "end") {
    const youWon = s.winner === "mimic" ? (role === "mimic" || me.team === "mimic") : (role === "hider" || (role === "ghost" && me.team !== "mimic"));
    h += `<div class="center"><div class="banner"><div class="cap">${youWon ? "You won" : "You lost"}</div><div class="big ${s.winner === "mimic" ? "red" : "gold"}">${s.winner === "mimic" ? "THE MIMIC FEEDS" : "THE HIDERS LIVE"}</div><div class="line" style="opacity:.85">${s.why ?? ""}</div><div class="sub">next round soon</div></div></div>`;
  }
  return h + `</div>`;
}
