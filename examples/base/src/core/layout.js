// Character-only data-driven layout — no hardcoded story IDs.

import * as THREE from "../../vendor/three/three.module.js?v=character-network-simple";

const CHARACTER_RINGS = {
  root: { radius: 68, color: 0xc0a060, accent: 0xe0d0a0, z: -168 },
  character: { innerRadius: 118, outerRadius: 360, color: 0xc0a060, accent: 0xe0c080, z: -174 },
};

function angleToPosition(radius, angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function buildDegreeMap(dataset) {
  const degrees = new Map(dataset.nodes.map((node) => [node.id, 0]));
  dataset.edges.forEach((edge) => {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  });
  return degrees;
}

function sortCharacters(characters, degrees) {
  return [...characters].sort((a, b) => {
    const impDelta = (b.importance ?? 0) - (a.importance ?? 0);
    if (impDelta !== 0) return impDelta;
    const degreeDelta = (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0);
    if (degreeDelta !== 0) return degreeDelta;
    return a.label.localeCompare(b.label, "zh-Hans-CN");
  });
}

function placeArcCharacters(characters, { angle, spread, radius, wave = 8, radialStep = 22 }) {
  const positions = new Map();
  if (!characters.length) return positions;

  const adjustedSpread = Math.min(spread, Math.max(18, 18 + characters.length * 12));
  const step = characters.length === 1 ? 0 : adjustedSpread / (characters.length - 1);
  const start = angle + adjustedSpread / 2;

  characters.forEach((character, index) => {
    const nodeAngle = characters.length === 1 ? angle : start - step * index;
    const nodeRadius = radius + (index % 2 === 0 ? -wave : wave) + Math.floor(index / 3) * radialStep;
    positions.set(character.id, angleToPosition(nodeRadius, nodeAngle));
  });
  return positions;
}

function createCharacterPositions(characters, degrees) {
  const positions = new Map();
  const nodeLevels = new Map();
  const sorted = sortCharacters(characters, degrees);
  const core = sorted.filter((node) => (node.importance ?? 0) >= 80);
  const outer = sorted.filter((node) => (node.importance ?? 0) < 80);

  placeArcCharacters(core, { angle: 0, spread: Math.min(220, 60 + core.length * 30), radius: 170 }).forEach((v, k) => positions.set(k, v));
  core.forEach((node) => nodeLevels.set(node.id, "character-core"));

  placeArcCharacters(outer, { angle: 180, spread: Math.min(280, 60 + outer.length * 25), radius: 290 }).forEach((v, k) => positions.set(k, v));
  outer.forEach((node) => nodeLevels.set(node.id, "character-outer"));

  return { positions, nodeLevels };
}

export function createSemanticZoneLayout(dataset) {
  const characters = dataset.nodes.filter((node) => node.type === "character" && node.id !== dataset.rootId);
  const degrees = buildDegreeMap(dataset);
  const { positions: characterPositions, nodeLevels } = createCharacterPositions(characters, degrees);

  const positions = new Map();
  positions.set(dataset.rootId, { x: 0, y: 0 });
  nodeLevels.set(dataset.rootId, "root");

  characterPositions.forEach((v, k) => positions.set(k, v));
  return { zones: CHARACTER_RINGS, nodeLevels, positions };
}
