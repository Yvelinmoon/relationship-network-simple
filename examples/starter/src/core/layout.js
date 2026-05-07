// Generic data-driven layout — no hardcoded story IDs.
// Uses zone/type/faction/importance metadata for placement.

import * as THREE from "../../vendor/three/three.module.js?v=starter";

const ZONE_RINGS = {
  root: { radius: 68, color: 0xc0a060, accent: 0xe0d0a0, z: -168 },
  character: { innerRadius: 118, outerRadius: 320, color: 0xc0a060, accent: 0xe0c080, z: -174 },
  event: { innerRadius: 370, outerRadius: 520, color: 0x6a6378, accent: 0xb0a0d0, z: -188 },
  world: { innerRadius: 560, outerRadius: 900, color: 0x60706a, accent: 0xc8b880, z: -198 },
};

const WORLD_TYPE_RADIUS = {
  faction: 600,
  place: 720,
  object: 840,
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

function sortNodes(nodes, degrees) {
  return [...nodes].sort((a, b) => {
    const impDelta = (b.importance ?? 0) - (a.importance ?? 0);
    if (impDelta !== 0) return impDelta;
    const degreeDelta = (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0);
    if (degreeDelta !== 0) return degreeDelta;
    return a.label.localeCompare(b.label, "zh-Hans-CN");
  });
}

function placeArcNodes(nodes, { angle, spread, radius, wave = 8, radialStep = 22 }) {
  const positions = new Map();
  if (!nodes.length) return positions;

  const adjustedSpread = Math.min(spread, Math.max(18, 18 + nodes.length * 12));
  const step = nodes.length === 1 ? 0 : adjustedSpread / (nodes.length - 1);
  const start = angle + adjustedSpread / 2;

  nodes.forEach((node, index) => {
    const nodeAngle = nodes.length === 1 ? angle : start - step * index;
    const nodeRadius = radius + (index % 2 === 0 ? -wave : wave) + Math.floor(index / 3) * radialStep;
    positions.set(node.id, angleToPosition(nodeRadius, nodeAngle));
  });
  return positions;
}

function createCharacterPositions(characters, degrees) {
  const positions = new Map();
  const nodeLevels = new Map();
  const sorted = sortNodes(characters, degrees);
  const core = sorted.filter((node) => (node.importance ?? 0) >= 80);
  const outer = sorted.filter((node) => (node.importance ?? 0) < 80);

  placeArcNodes(core, { angle: 0, spread: Math.min(220, 60 + core.length * 30), radius: 160 }).forEach((v, k) => positions.set(k, v));
  core.forEach((node) => nodeLevels.set(node.id, "character-core"));

  placeArcNodes(outer, { angle: 180, spread: Math.min(280, 60 + outer.length * 25), radius: 270 }).forEach((v, k) => positions.set(k, v));
  outer.forEach((node) => nodeLevels.set(node.id, "character-outer"));

  return { positions, nodeLevels };
}

function createEventPositions(events, degrees) {
  const positions = new Map();
  const sorted = sortNodes(events, degrees);
  const radius = 440;
  const totalSpread = Math.min(280, 60 + sorted.length * 30);
  const step = sorted.length === 1 ? 0 : totalSpread / (sorted.length - 1);
  const startAngle = 90 + totalSpread / 2;

  sorted.forEach((event, index) => {
    const angle = sorted.length === 1 ? 90 : startAngle - step * index;
    positions.set(event.id, angleToPosition(radius + (index % 2 === 0 ? -8 : 8), angle));
  });
  return positions;
}

function factionAngles(worldNodes) {
  const factions = [...new Set(worldNodes.map((node) => node.faction).filter(Boolean))];
  if (!factions.length) return new Map();
  const map = new Map();
  const step = 360 / factions.length;
  factions.forEach((faction, index) => map.set(faction, -90 + step * index));
  return map;
}

function createWorldPositions(worldNodes, degrees) {
  const positions = new Map();
  const grouped = new Map();
  const angleByFaction = factionAngles(worldNodes);

  sortNodes(worldNodes, degrees).forEach((node) => {
    const cluster = node.faction ?? node.type ?? "world";
    const key = `${cluster}:${node.type}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(node);
  });

  let fallbackIndex = 0;
  grouped.forEach((nodes, key) => {
    const [cluster, type] = key.split(":");
    const angle = angleByFaction.get(cluster) ?? (-120 + fallbackIndex++ * 48);
    const spread = Math.min(72, 18 + nodes.length * 12);
    const baseRadius = WORLD_TYPE_RADIUS[type] ?? WORLD_TYPE_RADIUS.faction;
    placeArcNodes(nodes, { angle, spread, radius: baseRadius }).forEach((v, k) => positions.set(k, v));
  });

  return positions;
}

export function createSemanticZoneLayout(dataset) {
  const events = dataset.nodes.filter((node) => node.zone === "event");
  const characters = dataset.nodes.filter((node) => node.zone === "character" && node.id !== dataset.rootId);
  const world = dataset.nodes.filter((node) => node.zone === "world");
  const degrees = buildDegreeMap(dataset);

  const { positions: characterPositions, nodeLevels } = createCharacterPositions(characters, degrees);
  const eventPositions = createEventPositions(events, degrees);

  const positions = new Map();
  positions.set(dataset.rootId, { x: 0, y: 0 });
  nodeLevels.set(dataset.rootId, "root");

  characterPositions.forEach((v, k) => positions.set(k, v));
  eventPositions.forEach((v, k) => positions.set(k, v));
  events.forEach((event) => nodeLevels.set(event.id, "event"));
  createWorldPositions(world, degrees).forEach((v, k) => positions.set(k, v));
  world.forEach((node) => nodeLevels.set(node.id, "world"));

  return { zones: ZONE_RINGS, nodeLevels, positions };
}
