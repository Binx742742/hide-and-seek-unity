// Third person over the shoulder: the engine's live orbit around the body, a short arm for tight aisles.
export const camera = {
  behavior: ["scripts/camera.js"],
  kind: "custom",
  orientation: { source: "look" },
  pointerLock: true,
  sensitivity: 2,
  state: { heightOffset: 1.75, desiredDist: 3.4, lateralOffset: 0.55, lookOffsetY: 1.5 },
};
