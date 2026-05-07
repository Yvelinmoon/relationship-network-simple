const ZONE_RINGS = {
  root: {
    radius: 68,
    color: 0xd2a35b,
    accent: 0xf4dfb1,
    z: -168,
  },
  characterCore: {
    innerRadius: 118,
    outerRadius: 218,
    color: 0xd2a35b,
    accent: 0xf0c87d,
    z: -174,
  },
  characterExtended: {
    innerRadius: 236,
    outerRadius: 366,
    color: 0xd2a35b,
    accent: 0x7a2134,
    z: -178,
  },
  event: {
    innerRadius: 432,
    outerRadius: 566,
    color: 0x8d73c9,
    accent: 0xe7c7ff,
    z: -188,
  },
  world: {
    innerRadius: 642,
    outerRadius: 940,
    color: 0x2f6f53,
    accent: 0xcfb78f,
    z: -198,
  },
};

const CHARACTER_CORE_SECTORS = [
  {
    angle: 154,
    spread: 54,
    radius: 156,
    ids: ["hermione", "ron", "ginny"],
  },
  {
    angle: -146,
    spread: 66,
    radius: 166,
    ids: ["dumbledore", "sirius", "hagrid"],
  },
  {
    angle: 18,
    spread: 74,
    radius: 164,
    ids: ["voldemort", "snape", "draco"],
  },
];

const CHARACTER_OUTER_SECTORS = [
  {
    angle: 148,
    spread: 102,
    radius: 274,
    ids: ["luna", "neville", "cho", "cedric", "fred", "george"],
  },
  {
    angle: -148,
    spread: 108,
    radius: 286,
    ids: ["lupin", "mcgonagall", "tonks", "dobby", "molly", "arthur", "james", "lily"],
  },
  {
    angle: 18,
    spread: 108,
    radius: 282,
    ids: ["bellatrix", "lucius", "narcissa", "pettigrew", "umbridge"],
  },
];

const FALLBACK_CHARACTER_SECTOR = {
  angle: 78,
  spread: 60,
  radius: 292,
};

const EVENT_RING_RADIUS = 492;
const WORLD_TYPE_RADIUS = {
  faction: 704,
  place: 792,
  object: 880,
};
const WORLD_CLUSTER_LAYOUT = {
  school: { angle: 144, spread: 54 },
  institutions: { angle: 38, spread: 58 },
  artifacts: { angle: -34, spread: 62 },
  families: { angle: -126, spread: 48 },
  frontier: { angle: 176, spread: 42 },
};
const WORLD_CLUSTER_IDS = {
  school: new Set([
    "hogwarts",
    "gryffindor",
    "slytherin",
    "ravenclaw",
    "hufflepuff",
    "da",
    "castle",
    "great-hall",
    "room-requirement",
    "astronomy-tower",
    "chamber-secrets",
    "platform-93-4",
    "sorting-hat",
    "forbidden-forest",
  ]),
  institutions: new Set([
    "order",
    "death-eaters",
    "ministry",
    "azkaban",
    "ministry-place",
    "department-mysteries",
  ]),
  artifacts: new Set([
    "elder-wand",
    "prophecy",
    "horcruxes",
    "marauders-map",
    "cloak",
    "philosopher-stone",
    "diary",
    "goblet-fire",
    "resurrection-stone",
    "gryffindor-sword",
    "time-turner",
    "half-blood-book",
  ]),
  families: new Set([
    "weasleys",
    "malfoys",
    "black-family",
    "privet-drive",
    "godrics-hollow",
  ]),
  frontier: new Set([
    "diagon-alley",
    "little-hangleton",
  ]),
};

function angleToPosition(radius, angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function buildNeighbors(dataset) {
  const neighbors = new Map();

  dataset.nodes.forEach((node) => {
    neighbors.set(node.id, new Set());
  });

  dataset.edges.forEach((edge) => {
    neighbors.get(edge.source)?.add(edge.target);
    neighbors.get(edge.target)?.add(edge.source);
  });

  return neighbors;
}

function buildDegreeMap(dataset) {
  const degrees = new Map(dataset.nodes.map((node) => [node.id, 0]));

  dataset.edges.forEach((edge) => {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  });

  return degrees;
}

function sortEventsByNarrativeOrder(events, dataset) {
  const eventIndex = new Map(events.map((event, index) => [event.id, index]));
  const incoming = new Map(events.map((event) => [event.id, 0]));
  const outgoing = new Map(events.map((event) => [event.id, []]));

  dataset.edges.forEach((edge) => {
    if (!eventIndex.has(edge.source) || !eventIndex.has(edge.target)) {
      return;
    }

    outgoing.get(edge.source)?.push(edge.target);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  });

  const queue = events
    .filter((event) => (incoming.get(event.id) ?? 0) === 0)
    .sort((left, right) => (eventIndex.get(left.id) ?? 0) - (eventIndex.get(right.id) ?? 0));
  const ordered = [];

  while (queue.length) {
    const current = queue.shift();
    ordered.push(current);

    outgoing.get(current.id)?.forEach((nextId) => {
      incoming.set(nextId, (incoming.get(nextId) ?? 0) - 1);
      if ((incoming.get(nextId) ?? 0) === 0) {
        queue.push(events[eventIndex.get(nextId) ?? 0]);
        queue.sort((left, right) => (eventIndex.get(left.id) ?? 0) - (eventIndex.get(right.id) ?? 0));
      }
    });
  }

  return ordered.length === events.length ? ordered : events;
}

function sortByImportance(nodes, degrees) {
  return [...nodes].sort((left, right) => {
    const degreeDelta = (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0);
    if (degreeDelta !== 0) {
      return degreeDelta;
    }
    return left.label.localeCompare(right.label, "zh-Hans-CN");
  });
}

function placeArcNodes(nodes, { angle, spread, radius, wave = 8, radialStep = 18 }) {
  const positions = new Map();
  if (!nodes.length) {
    return positions;
  }

  const step = nodes.length === 1 ? 0 : spread / (nodes.length - 1);
  const start = angle + spread / 2;

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
  const lookup = new Map(characters.map((node) => [node.id, node]));
  const placed = new Set();

  CHARACTER_CORE_SECTORS.forEach((sector) => {
    const sectorNodes = sector.ids.map((nodeId) => lookup.get(nodeId)).filter(Boolean);
    sectorNodes.forEach((node) => placed.add(node.id));
    placeArcNodes(sectorNodes, sector).forEach((value, key) => positions.set(key, value));
    sectorNodes.forEach((node) => nodeLevels.set(node.id, "character-core"));
  });

  CHARACTER_OUTER_SECTORS.forEach((sector) => {
    const sectorNodes = sector.ids.map((nodeId) => lookup.get(nodeId)).filter(Boolean);
    sectorNodes.forEach((node) => placed.add(node.id));
    placeArcNodes(sectorNodes, sector).forEach((value, key) => positions.set(key, value));
    sectorNodes.forEach((node) => nodeLevels.set(node.id, "character-outer"));
  });

  const fallbackNodes = sortByImportance(
    characters.filter((node) => !placed.has(node.id)),
    degrees,
  );

  placeArcNodes(fallbackNodes, FALLBACK_CHARACTER_SECTOR).forEach((value, key) => positions.set(key, value));
  fallbackNodes.forEach((node) => nodeLevels.set(node.id, "character-outer"));

  return {
    positions,
    nodeLevels,
  };
}

function createEventPositions(events) {
  const positions = new Map();
  const angles =
    events.length === 1
      ? [0]
      : events.map((_, index) => 126 - (252 / (events.length - 1)) * index);

  events.forEach((event, index) => {
    const radius = EVENT_RING_RADIUS + (index % 2 === 0 ? -8 : 8);
    positions.set(event.id, angleToPosition(radius, angles[index]));
  });

  return {
    positions,
    angles: new Map(events.map((event, index) => [event.id, angles[index]])),
  };
}

function computeDistancesFrom(startId, neighbors) {
  const distances = new Map([[startId, 0]]);
  const queue = [startId];

  while (queue.length) {
    const current = queue.shift();
    const currentDistance = distances.get(current) ?? 0;

    neighbors.get(current)?.forEach((nextId) => {
      if (distances.has(nextId)) {
        return;
      }

      distances.set(nextId, currentDistance + 1);
      queue.push(nextId);
    });
  }

  return distances;
}

function createEventAssignment(dataset, events, neighbors) {
  const eventIds = events.map((event) => event.id);
  const distanceByEvent = new Map(eventIds.map((eventId) => [eventId, computeDistancesFrom(eventId, neighbors)]));
  const assignment = new Map();

  dataset.nodes.forEach((node) => {
    if (node.zone === "event") {
      assignment.set(node.id, node.id);
      return;
    }

    let bestEventId = eventIds[0] ?? null;
    let bestDistance = Number.POSITIVE_INFINITY;

    eventIds.forEach((eventId) => {
      const distance = distanceByEvent.get(eventId)?.get(node.id) ?? Number.POSITIVE_INFINITY;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestEventId = eventId;
      }
    });

    assignment.set(node.id, bestEventId);
  });

  return assignment;
}

function resolveWorldCluster(node) {
  for (const [cluster, ids] of Object.entries(WORLD_CLUSTER_IDS)) {
    if (ids.has(node.id)) {
      return cluster;
    }
  }

  if (node.type === "object") {
    return "artifacts";
  }
  if (node.type === "place") {
    return "frontier";
  }
  return "institutions";
}

function createWorldPositions(worldNodes, _eventAssignment, _eventAngles, degrees) {
  const positions = new Map();
  const grouped = new Map();

  sortByImportance(worldNodes, degrees).forEach((node) => {
    const cluster = resolveWorldCluster(node);
    const key = `${cluster}:${node.type}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(node);
  });

  grouped.forEach((nodes, key) => {
    const [cluster, type] = key.split(":");
    const clusterLayout = WORLD_CLUSTER_LAYOUT[cluster] ?? WORLD_CLUSTER_LAYOUT.frontier;
    const spread = Math.min(clusterLayout.spread, 18 + nodes.length * 9);
    const start = clusterLayout.angle + spread / 2;
    const step = nodes.length === 1 ? 0 : spread / (nodes.length - 1);
    const baseRadius = WORLD_TYPE_RADIUS[type] ?? WORLD_TYPE_RADIUS.faction;

    nodes.forEach((node, index) => {
      const nodeAngle = nodes.length === 1 ? clusterLayout.angle : start - step * index;
      const nodeRadius = baseRadius + (index % 2 === 0 ? -10 : 10) + Math.floor(index / 4) * 22;
      positions.set(node.id, angleToPosition(nodeRadius, nodeAngle));
    });
  });

  return positions;
}

export function createSemanticZoneLayout(dataset) {
  const events = sortEventsByNarrativeOrder(
    dataset.nodes.filter((node) => node.zone === "event"),
    dataset,
  );
  const characters = dataset.nodes.filter((node) => node.zone === "character" && node.id !== dataset.rootId);
  const world = dataset.nodes.filter((node) => node.zone === "world");
  const neighbors = buildNeighbors(dataset);
  const degrees = buildDegreeMap(dataset);
  const eventAssignment = createEventAssignment(dataset, events, neighbors);
  const { positions: eventPositions, angles: eventAngles } = createEventPositions(events);
  const { positions: characterPositions, nodeLevels } = createCharacterPositions(characters, degrees);

  const positions = new Map();
  positions.set(dataset.rootId, { x: 0, y: 0 });
  nodeLevels.set(dataset.rootId, "root");

  characterPositions.forEach((value, key) => positions.set(key, value));
  eventPositions.forEach((value, key) => positions.set(key, value));
  events.forEach((event) => nodeLevels.set(event.id, "event"));
  createWorldPositions(world, eventAssignment, eventAngles, degrees).forEach((value, key) => positions.set(key, value));
  world.forEach((node) => nodeLevels.set(node.id, "world"));

  return {
    zones: ZONE_RINGS,
    eventAngles,
    eventAssignment,
    nodeLevels,
    positions,
  };
}
