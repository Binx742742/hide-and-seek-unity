// Gullmouth HUD. Reads place.state (phase, clock, winner, feed) and the viewer's own state (role, hp, inv, disguise, prompt).
const RECIPES = [
  { key: "1", act: "craft1", name: "Bear trap", cost: { scrap: 2 }, icon: "⟁" },
  { key: "2", act: "craft2", name: "Powder keg", cost: { scrap: 1, powder: 1 }, icon: "▣" },
  { key: "3", act: "craft3", name: "Rattle lure", cost: { wire: 1, scrap: 1 }, icon: "♫" },
  { key: "4", act: "craft4", name: "Flashbang", cost: { powder: 1, wire: 1 }, icon: "✸" },
];
const POWERS = [["scent", "C", 1, "scent"], ["lunge", "V", 2, "lunge"], ["wail", "X", 3, "wail"], ["fade", "Z", 4, "fade"], ["frenzy", "", 5, "frenzy"]];
const MAT = { scrap: "scrap", wire: "wire", powder: "powder" };
const FORM = { none: "your own shape", crate: "a wooden crate", barrel: "an oil drum", loot: "a loot crate", fisherman: "a sleepwalking fisherman", locker: "a locker", tarp: "a tarp", dinghy: "a dinghy", dumpster: "a dumpster" };
const clock = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

const STYLE = `<style>
.g{position:fixed;inset:0;pointer-events:none;font-family:'Geist Pixel Square',ui-monospace,monospace;color:#d9d4c7;text-shadow:0 1px 2px #000}
.top{position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px}
.phase{font-size:13px;letter-spacing:.25em;color:#e8c170}
.clock{font-size:34px;line-height:1}
.clock.hot{color:#ff6a4a}
.sub{font-size:12px;opacity:.75}
.plate{background:rgba(16,20,27,.72);border:1px solid #4a5d6a;padding:8px 10px}
.bl{position:absolute;left:14px;bottom:14px;display:flex;flex-direction:column;gap:8px;max-width:min(380px,calc(100vw - 28px))}
.hp{width:220px;height:14px;background:#10141b;border:2px solid #4a5d6a;position:relative}
.hp i{position:absolute;inset:0;right:auto;background:linear-gradient(#c8562a,#7a2c12)}
.hp.m i{background:linear-gradient(#7a1f1f,#3b0d0d)}
.lab{font-size:11px;letter-spacing:.15em;color:#e8c170;margin-bottom:3px}
.inv{display:flex;gap:10px;font-size:15px}
.inv b{color:#e8c170}
.crafts{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.cr{pointer-events:auto;background:rgba(16,20,27,.8);border:1px solid #4a5d6a;color:#d9d4c7;font:inherit;padding:5px 4px;text-align:center;cursor:pointer;min-width:74px}
.cr.ok{border-color:#b7410e;background:rgba(80,30,12,.75)}
.cr:disabled{opacity:.4}
.cr .n{font-size:12px}.cr .c{font-size:10px;opacity:.75}.cr .k{font-size:10px;color:#e8c170}
.ping{position:relative;width:0;height:0}
.ping i{position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;border:3px solid rgba(183,65,14,.95);box-shadow:0 0 14px rgba(183,65,14,.8),inset 0 0 10px rgba(183,65,14,.5);animation:pg 1.1s ease-out infinite}
.ping i:nth-child(2){animation-delay:.55s}
.ping b{position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:#e8c170;box-shadow:0 0 10px #b7410e}
@keyframes pg{0%{transform:scale(.2);opacity:1}100%{transform:scale(1.6);opacity:0}}
.pbar{pointer-events:auto;margin-left:6px;background:#b7410e;color:#fff;border:0;padding:2px 8px;font:inherit;font-size:12px}
.prompt{background:rgba(16,20,27,.8);border:1px solid #e8c170;padding:3px 8px;font-size:13px;white-space:nowrap;transform:translate(-50%,-140%)}
.toast{position:absolute;left:50%;bottom:30%;transform:translateX(-50%);font-size:18px;color:#e8c170;animation:fade 2.6s forwards}
@keyframes fade{0%{opacity:0;transform:translate(-50%,8px)}10%{opacity:1;transform:translate(-50%,0)}75%{opacity:1}100%{opacity:0}}
.feed{position:absolute;top:14px;left:14px;display:flex;flex-direction:column;gap:3px;font-size:12px;opacity:.85}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px}
.big{font-size:clamp(28px,7vw,64px);letter-spacing:.08em}
.cage{background:radial-gradient(circle,rgba(20,0,0,.86),#000)}
.red{color:#ff5a3a}.gold{color:#e8c170}
.vig{position:absolute;inset:0;box-shadow:inset 0 0 160px 40px rgba(120,0,0,.55);animation:beat .9s infinite}
@keyframes beat{0%,100%{opacity:.35}15%{opacity:.85}}
.hurt{position:absolute;inset:0;background:rgba(150,0,0,.28);animation:hurt .5s forwards}
@keyframes hurt{to{opacity:0}}
.help{font-size:11px;opacity:.7;line-height:1.5}
.dream{position:absolute;top:96px;left:50%;transform:translateX(-50%);display:flex;gap:10px;font-size:13px;letter-spacing:.08em}
.dream .plate{padding:5px 10px}.blue{color:oklch(0.82 0.1 230)}
.talk{position:absolute;left:50%;bottom:24%;transform:translateX(-50%);width:min(560px,86vw);text-align:center}
.bar{position:relative;height:30px;margin:10px 0;border-radius:6px;background:oklch(0.18 0.02 240 / .85);border:2px solid oklch(0.5 0.05 240);overflow:hidden}
.zone{position:absolute;top:0;bottom:0;background:oklch(0.78 0.13 85 / .75);box-shadow:0 0 18px oklch(0.8 0.14 85)}
.ndl{position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:white;box-shadow:0 0 10px white}
.pips{font-size:20px;letter-spacing:6px}
.read{position:absolute;left:50%;top:30%;transform:translateX(-50%);max-width:min(440px,80vw);font-size:17px;font-style:italic;text-align:center;animation:fadeo 6s forwards}
@keyframes fadeo{0%{opacity:0}8%{opacity:1}80%{opacity:1}100%{opacity:0}}
@media (pointer:coarse),(max-width:700px){.bl{bottom:auto;top:150px;max-width:min(300px,calc(100vw - 80px))}.crafts{grid-template-columns:repeat(2,1fr)}.cr{min-width:0}}
@media (max-width:600px){.clock{font-size:26px}.hp{width:160px}.cr{min-width:62px}.help{display:none}}
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
.mn{position:fixed;inset:0;pointer-events:auto;font-family:'Geist Pixel Square',ui-monospace,monospace;color:#d9d4c7;background:linear-gradient(90deg,rgba(10,13,18,.92) 0%,rgba(10,13,18,.7) 55%,rgba(10,13,18,.25) 100%);overflow-y:auto;padding:28px calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px) 28px 32px;display:flex;flex-direction:column;gap:18px}
.mn img.logo{width:min(720px,80vw);filter:drop-shadow(0 4px 12px #000)}
.mn h3{font-size:16px;letter-spacing:.25em;color:#e8c170;margin:0 0 8px}
.chars{display:flex;gap:10px;flex-wrap:wrap}
.ch{width:160px;background:#10141b;border:2px solid #2c3a44;color:inherit;font:inherit;padding:0;cursor:pointer;text-align:left;box-shadow:3px 3px 0 #000}
.ch img,.ch .own{width:100%;height:200px;object-fit:cover;display:block;background:#1b2430}
.ch .own{display:flex;align-items:center;justify-content:center;font-size:40px;color:#4a5d6a}
.ch .nm{font-size:15px;padding:5px 6px 1px}.ch .bl2{font-size:12px;opacity:.6;padding:0 6px 6px;min-height:22px}
.ch.on{border-color:#e8c170;box-shadow:3px 3px 0 #b7410e}
.lobbies{display:flex;flex-direction:column;gap:8px;max-width:560px}
.lb{display:flex;align-items:center;gap:10px;background:rgba(16,20,27,.85);border:1px solid #4a5d6a;padding:8px 10px}
.lb .rn{flex:1;font-size:18px}.lb .pc{font-size:17px;color:#e8c170;width:48px}.lb .ph{font-size:11px;opacity:.65;width:64px}
.mb{font:inherit;font-size:16px;cursor:pointer;background:#b7410e;color:#fff;border:0;padding:8px 14px;letter-spacing:.12em;box-shadow:3px 3px 0 #000}
.mb.alt{background:#1b2430;border:1px solid #4a5d6a}.mb.big{font-size:26px;padding:14px 40px}
.mb:disabled{opacity:.35;cursor:default}
.menu-btn{position:absolute;top:14px;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);pointer-events:auto;font:inherit;font-size:11px;letter-spacing:.15em;background:rgba(16,20,27,.8);color:#d9d4c7;border:1px solid #4a5d6a;padding:5px 9px;cursor:pointer}
.tut{display:flex;flex-direction:column;gap:8px;max-width:640px}
.tut p{margin:0;background:rgba(16,20,27,.85);border:1px solid #4a5d6a;padding:10px 12px;font-size:15px;line-height:1.45}
@media (max-width:600px){.ch{width:76px}.ch img,.ch .own{height:92px}.ch .bl2{display:none}.mn{padding-left:16px}.tut p{font-size:14px}}
</style>`;
function tutorial(coarse) {
  const hide = coarse
    ? `Hiding: sneak. USE searches loot. The craft buttons drop a trap. Hide in a locker, a tarp, a dinghy, or the dumpster — USE in, USE out.`
    : `Hiding: sneak. E searches loot. 1–4 crafts a trap. Hide in a locker, a tarp, a dinghy, or the dumpster — E in, E out.`;
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
    <div style="font-size:17px;opacity:.8;max-width:620px">a dead cannery, a dream nobody wakes from, and one of you is not who they look like.</div>
    <div><h3>WAKE UP AS</h3><div class="chars">${CHARS.map((c) => `<button class="ch ${c.id === mine ? "on" : ""}" onclick="pick('${c.id}')">${c.pic ? `<img src="${c.pic}">` : `<div class="own">☺</div>`}<div class="nm">${c.name}</div><div class="bl2">${c.blurb}</div></button>`).join("")}</div></div>
    <div><button class="mb big" onclick="play()">PLAY HERE</button> <button class="mb alt" onclick="showTutorial()">TUTORIAL</button> <span style="font-size:16px;opacity:.75;margin-left:10px">this lobby · ${n}/10 · ${PHASE[s.phase ?? "lobby"]}</span></div>
    <div><h3>OTHER LOBBIES</h3><div class="lobbies">${rooms.length ? rooms.map((r) => `<div class="lb"><span class="rn">${r.room}</span><span class="pc">${r.players}/10</span><span class="ph">${PHASE[r.phase] ?? r.phase}</span><button class="mb" ${r.players >= 10 ? "disabled" : ""} onclick="join('${r.room}')">JOIN</button></div>`).join("") : `<div style="font-size:12px;opacity:.6">no other lobbies right now</div>`}
      <button class="mb alt" onclick="fresh()">+ START A NEW LOBBY</button></div></div>
    ${me.menuMsg && ctx.now() - me.menuMsg.at < 4000 ? `<div class="red" style="font-size:13px">${me.menuMsg.text}</div>` : ""}
    <div style="font-size:11px;opacity:.5">${typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches ? "MENU button reopens this" : "M reopens this menu between rounds"}</div>
  </div>`;
}

export default function render(ctx, player) {
  const s = ctx.place.state ?? {}, me = player.state ?? {}, now = ctx.now();
  if (me.tutorial) return tutorial(typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
  if (me.menu) return menu(ctx, me);
  const phase = s.phase ?? "lobby", role = me.role ?? "lobby";
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const hiders = (ctx.place.players ?? []).filter((p) => p.state?.role === "hider").length;
  let h = STYLE + MSTYLE + `<div class="g">` + ((role === "lobby" || role === "ghost" || phase === "lobby" || phase === "end") ? `<button class="menu-btn" onclick="openMenu()">MENU</button>` : "");

  // the clock
  if (phase === "lobby") {
    h += `<div class="top"><div class="phase">GULLMOUTH CANNERY</div><div class="clock">${s.startAt ? clock(s.startAt - now) : "—"}</div><div class="sub">${(ctx.place.players ?? []).length < 2 ? "alone: something else will hunt you" : "one of you will be the mimic. nobody will know who"}</div></div>`;
    h += `<div class="bl plate help"><div class="lab">HOW IT GOES</div>everyone looks the same. one is the <span class="red">mimic</span>, revealed only when someone sees it hurt someone, or a trap bites it.<br>Hiders: search loot crates for scrap, wire, powder · craft traps 1–4 · survive till dawn or kill it.<br>Mimic: Q becomes a crate, drum or loot crate · E eats fish: each one wakes a power (scent, lunge, wail, fade, frenzy) · R fake loot · T kills the lamps · G hangs a false clue · click claws.<br>Hiders: wake 5 dreamers or kill it. craft 2 = rigged fish.<br>Hiders: a stab splits a fake open.<br>Never trust a still crate.</div>`;
  } else if (phase === "hide" || phase === "hunt") {
    const left = s.endsAt - now;
    h += `<div class="top"><div class="phase">${phase === "hide" ? "HIDE" : "THE HUNT"}</div><div class="clock ${phase === "hunt" && left < 30000 ? "hot" : ""}">${clock(left)}</div><div class="sub">${hiders} hider${hiders === 1 ? "" : "s"} alive</div></div>`;
  }

  // the dream: how close everyone is to waking
  if ((phase === "hide" || phase === "hunt") && s.dreamerTotal) h += `<div class="dream"><div class="plate blue">clues ${s.clues ?? 0}/${s.clueTotal}</div><div class="plate gold">awake ${s.awake ?? 0}/${s.dreamerTotal}</div></div>`;
  if (me.read && now - me.read.at < 6000) h += `<div class="read plate blue" id="read-${me.read.at}">${me.read.pic ? `<img src="${me.read.pic}" style="width:180px;height:180px;display:block;margin:0 auto 8px;border:6px solid #eee;transform:rotate(-3deg)">` : ""}${me.read.text}<div style="font-size:11px;font-style:normal;opacity:.7;margin-top:6px">the dreamers will listen easier now</div></div>`;
  if (me.talk) {
    const t = me.talk, x = ((now - t.at) / t.period) % 2, u = x < 1 ? x : 2 - x;
    const fl = t.flash && now - t.flash.at < 300 ? (t.flash.ok ? "box-shadow:0 0 30px oklch(0.8 0.14 85)" : "box-shadow:0 0 30px oklch(0.6 0.2 25)") : "";
    h += `<div class="talk plate"><div class="lab">WAKE ${t.name.toUpperCase()}</div><div style="font-size:13px;opacity:.8">say it when the needle's in the gold. ${coarse ? "tap USE" : "E or click"}</div>
      <div class="bar" style="${fl}"><div class="zone" style="left:${t.zone[0] * 100}%;width:${(t.zone[1] - t.zone[0]) * 100}%"></div><div class="ndl" style="left:${u * 100}%"></div></div>
      <div class="pips"><span class="gold">${"●".repeat(t.hits)}${"○".repeat(Math.max(0, 3 - t.hits))}</span> <span class="red" style="font-size:14px">${"✕".repeat(t.misses)}</span></div></div>`;
  }

  // feed
  const feed = (s.feed ?? []).filter((f) => now - f.at < 7000);
  if (feed.length && phase !== "lobby") h += `<div class="feed">${feed.map((f) => `<div class="plate">${f.text}</div>`).join("")}</div>`;

  // hurt and dread
  if (me.hurtAt && now - me.hurtAt < 500) h += `<div class="hurt" id="hurt-${me.hurtAt}"></div>`;
  if (role === "hider" && me.dread === 2) h += `<div class="vig"></div>`;

  // the viewer's panel
  if (role === "hider") {
    const inv = { scrap: 0, wire: 0, powder: 0, ...(me.inv ?? {}) }, hp = Math.max(0, me.hp ?? 100);
    if (me.hiddenIn) h += `<div class="center" style="justify-content:flex-end;padding-bottom:22%"><div class="plate gold">hidden · hold your breath${coarse ? "" : " · E to climb out"}</div></div>`;
    h += `<div class="bl"><div class="plate"><div class="lab">HIDER · ${hp} HP</div><div class="hp"><i style="width:${hp}%"></i></div>
      <div class="inv" style="margin-top:6px">${Object.keys(MAT).map((k) => `<span><b>${inv[k]}</b> ${k}</span>`).join("")}</div></div>
      <div class="crafts">${RECIPES.map((r) => {
        const ok = Object.entries(r.cost).every(([k, n]) => inv[k] >= n);
        return `<button class="cr ${ok ? "ok" : ""}" ${ok ? "" : "disabled"} onclick="sendAction('${r.act}')"><div class="n">${r.icon} ${r.name}</div><div class="c">${Object.entries(r.cost).map(([k, n]) => n + " " + k).join(" + ")}</div>${coarse ? "" : `<div class="k">[${r.key}]</div>`}</button>`;
      }).join("")}</div>
      ${coarse ? "" : `<div class="help">E search · click stab · 1–4 craft and drop at your feet</div>`}</div>`;
    if (me.prompt) h += `<div data-world-anchor="${me.prompt}" data-anchor-offset="${me.promptDoor ? "0.6 1.4 0" : "0 1.2 0"}"><div class="prompt">${coarse ? "" : "E "}${me.promptVerb ?? "Search"}${me.promptDoor === "shut" ? (coarse ? `<button class="pbar" onclick="sendAction('plant')">BAR</button>` : " · R Bar") : ""}</div></div>`;
  } else if (role === "mimic") {
    const hp = Math.max(0, me.hp ?? 200), top = me.risen ? 90 : 200;
    h += `<div class="bl"><div class="plate"><div class="lab red">${me.risen ? "RISEN · YOU HUNT NOW" : me.revealed ? "THE MIMIC · REVEALED" : "THE MIMIC · HIDDEN"} · ${hp} HP</div><div class="hp m"><i style="width:${(hp / top) * 100}%"></i></div>
      <div style="margin-top:6px;font-size:14px">you are <span class="gold">${FORM[me.disguise ?? "none"]}</span></div>
      <div style="font-size:13px;margin-top:4px">power <span class="red">${"◆".repeat(me.power ?? 0)}</span><span style="opacity:.35">${"◇".repeat(Math.max(0, 5 - (me.power ?? 0)))}</span></div>
      <div style="font-size:13px">dark: ${(me.darkAt ?? 0) > now ? `<span style="opacity:.6">${Math.ceil((me.darkAt - now) / 1000)}s</span>` : `<span class="gold">ready</span>`} · lie: ${(me.lieAt ?? 0) > now ? `<span style="opacity:.6">${Math.ceil((me.lieAt - now) / 1000)}s</span>` : `<span class="gold">ready</span>`}</div>
      <div style="font-size:12px;margin-top:4px;display:flex;flex-wrap:wrap;gap:4px 8px">${POWERS.map(([k, key, at, name]) => { const lock = (me.power ?? 0) < at, cd = (me.cd?.[k] ?? 0) - now; return `<span style="${lock ? "opacity:.3" : ""}">${coarse ? "" : `<span class="gold">${key}</span> `}${name} ${lock ? `🔒${at}` : k === "frenzy" ? "<span class='red'>on</span>" : cd > 0 ? `<span style="opacity:.6">${Math.ceil(cd / 1000)}s</span>` : "<span class='gold'>ready</span>"}</span>`; }).join("")}</div>
      <div style="font-size:13px">fake loot: ${(me.plantAt ?? 0) > now ? `<span style="opacity:.6">${Math.ceil((me.plantAt - now) / 1000)}s</span>` : `<span class="gold">ready</span>`}</div>
      ${coarse ? "" : `<div class="help">rings = something made noise · claw a shut door to break it</div>`}
      ${coarse ? "" : `<div class="help">Q change form · E eat fish · R fake loot · T blackout · G false clue · click claw · fish unlock C V X Z</div>`}</div></div>`;
    // the lock card rides the hunt HUD too: human rounds never enter hide, and claws stay shut for startLock
    if ((me.clawReadyAt ?? 0) > now && !me.risen) h += `<div class="center" style="justify-content:flex-start;padding-top:12%"><div class="big red">YOU ARE THE MIMIC</div><div>nobody knows. walk with them.</div><div class="clock red">claws in ${clock((me.clawReadyAt ?? 0) - now)}</div><div class="help" style="display:block">your first claw kills. if anyone sees it, you're revealed.</div></div>`;
    else if (!me.revealed && !me.risen) h += `<div style="position:absolute;left:50%;bottom:32%;transform:translateX(-50%);font-size:14px;color:#e8c170;text-shadow:2px 2px 0 #000;opacity:.85">hidden · ${(me.ambushAt ?? 0) > now ? `killing strike in ${Math.ceil((me.ambushAt - now) / 1000)}s` : `<span class="red">killing strike ready</span>`}</div>`;
    for (const id of me.pings ?? []) h += `<div data-world-anchor="${id}"><div class="ping"><i></i><i></i><b></b></div></div>`;
  } else if (role === "ghost" && phase !== "end") {
    h += `<div class="bl plate"><div class="lab red">${me.team === "mimic" ? "PUT TO REST" : "TAKEN"}</div><div style="font-size:13px">you drift unseen. watch the others.</div></div>`;
  }

  // the toast
  if (me.msg && now - me.msg.at < 2600) h += `<div class="toast" id="t-${me.msg.at}">${me.msg.text}</div>`;

  // the end
  if (phase === "end") {
    const youWon = s.winner === "mimic" ? (role === "mimic" || me.team === "mimic") : (role === "hider" || (role === "ghost" && me.team !== "mimic"));
    h += `<div class="center"><div class="big ${s.winner === "mimic" ? "red" : "gold"}">${s.winner === "mimic" ? "THE MIMIC FEEDS" : "THE HIDERS LIVE"}</div><div>${s.why ?? ""}</div><div class="phase">${youWon ? "YOU WON" : "YOU LOST"}</div><div class="sub">next round soon</div></div>`;
  }
  return h + `</div>`;
}
