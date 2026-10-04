// A door: place it at the HINGE, bottom of the opening, yaw0 = the closed leaf's yaw (the leaf runs along its
// local +x from the hinge). swing: degrees it opens (+ opens toward local −z... flip the sign to open the other way).
// kind "panel" slides along its local +x by slide metres instead. Write state.yaw0 = the same yaw as rotation.
export const door = {
  tags: ["door"],
  physics: "kinematic",
  primitive: { kind: "scripted", script: "scripts/gen/door.js", params: { kind: "plank", w: 1.2, h: 2.25 } },
  behavior: "scripts/door.js",
  castShadow: true,
  state: { kind: "plank", open: false, cur: 0, yaw0: 0, swing: 100, barredUntil: 0, hp: 3, broken: false },
};
