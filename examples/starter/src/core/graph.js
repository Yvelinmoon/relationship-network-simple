import { CSS2DObject } from "../../vendor/three/CSS2DRenderer.js?v=202604261755";

const CURVE_SEGMENTS = 24;
const EDGE_TUBE_RADIUS = 0.18;
const EDGE_GLOW_RADIUS = 0.62;
const EDGE_TUBE_RADIAL_SEGMENTS = 5;
const INTRO_LAYER_STAGGER = 0.34;
const INTRO_SWEEP_DURATION = 0.62;
const INTRO_EDGE_LAG = 0.08;
const INTRO_START_SCALE = 0.18;
const FOCUS_LERP_SPEED = 0.045;
const RELATION_STYLE = {
  "character-character": {
    color: 0x8a6840,
    activeColor: 0xf0c880,
    cssColor: "#f0c880",
    lift: 24,
    bowX: -74,
    bendY: 0.18,
    opacity: [0.065, 0.46, 0.12],
  },
  "character-event": {
    color: 0x7a3a3a,
    activeColor: 0xd86868,
    cssColor: "#d86868",
    lift: 34,
    bowX: -16,
    bendY: 0.1,
    opacity: [0.08, 0.31, 0.7],
  },
  "event-event": {
    color: 0x4a3040,
    activeColor: 0xa86880,
    cssColor: "#a86880",
    lift: 54,
    bowX: 0,
    bendY: 0.04,
    opacity: [0.065, 0.22, 0.84],
  },
  "character-world": {
    color: 0x4a6060,
    activeColor: 0x90b8b8,
    cssColor: "#90b8b8",
    lift: 26,
    bowX: 12,
    bendY: 0.08,
    opacity: [0.08, 0.34, 0.16],
  },
  "event-world": {
    color: 0x5a4030,
    activeColor: 0xa88060,
    cssColor: "#a88060",
    lift: 30,
    bowX: 28,
    bendY: 0.06,
    opacity: [0.065, 0.2, 0.58],
  },
  "world-world": {
    color: 0x7a6a40,
    activeColor: 0xc8a860,
    cssColor: "#c8a860",
    lift: 16,
    bowX: 72,
    bendY: 0.14,
    opacity: [0.18, 0.12, 0.07],
  },
};


const FALLBACK_FACTION_STYLES = {
  core: { color: 0xc0a060, priority: 1 },
  opposition: { color: 0xa05060, priority: 2 },
  neutral: { color: 0x5a6070, priority: 99 },
};

const NEUTRAL_NODE_COLORS = {
  event: 0x6a6378,
  place: 0x60706a,
  object: 0x9a8760,
  faction: 0x5a6070,
};

let FACTION_STYLES = FALLBACK_FACTION_STYLES;
let FACTION_IDS = new Set(Object.keys(FACTION_STYLES));

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value) {
  const t = clamp01(value);
  return 1 - (1 - t) ** 3;
}

function parseColor(value, fallback) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const hex = value.trim().replace(/^#/, "");
    const parsed = Number.parseInt(hex, 16);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeFactionStyles(factions) {
  const entries = Object.entries(factions ?? {});
  if (!entries.length) return FALLBACK_FACTION_STYLES;
  return Object.fromEntries(
    entries.map(([id, value], index) => [
      id,
      {
        color: parseColor(value?.color, NEUTRAL_NODE_COLORS.faction),
        priority: value?.priority ?? index + 1,
      },
    ]),
  );
}

export function createGraphController({ THREE, groups, controls, typeMeta, graphState }) {
  const { haloGroup, edgeGroup, nodeGroup, labelGroup } = groups;
  FACTION_STYLES = normalizeFactionStyles(graphState.getFactions?.() ?? FALLBACK_FACTION_STYLES);
  FACTION_IDS = new Set(Object.keys(FACTION_STYLES));
  const worldTarget = new THREE.Vector3();
  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = "anonymous";
  const orbAlphaTexture = makeCircleAlphaTexture();
  const glintTexture = makeGlintTexture();
  const factionAffiliations = buildFactionAffiliations();

  let graph = null;
  let hoveredNode = null;
  let selectedNode = null;
  let focusNodeId = null;
  let introStartedAt = performance.now();
  let introCompleted = false;

  function clearGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      child.traverse((object) => {
        if (object.isCSS2DObject && object.element?.parentNode) {
          object.element.remove();
        }
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose?.());
        } else {
          object.material?.dispose?.();
        }
      });
      group.remove(child);
    }
  }


  function buildFactionAffiliations() {
    const affiliations = new Map();

    graphState.getAllEdges?.().forEach((edge) => {
      const sourceFaction = FACTION_IDS.has(edge.source);
      const targetFaction = FACTION_IDS.has(edge.target);
      if (sourceFaction === targetFaction) {
        return;
      }

      const nodeId = sourceFaction ? edge.target : edge.source;
      const factionId = sourceFaction ? edge.source : edge.target;
      if (!affiliations.has(nodeId)) {
        affiliations.set(nodeId, []);
      }
      affiliations.get(nodeId).push(factionId);
    });

    affiliations.forEach((ids, nodeId) => {
      affiliations.set(nodeId, [...new Set(ids)].sort((left, right) => FACTION_STYLES[left].priority - FACTION_STYLES[right].priority));
    });

    return affiliations;
  }

  function getFactionIdsForNode(node) {
    if (FACTION_IDS.has(node.id)) {
      return [node.id];
    }
    return factionAffiliations.get(node.id) ?? [];
  }

  function getPrimaryFactionStyle(node) {
    const factionId = getFactionIdsForNode(node)[0];
    return factionId ? FACTION_STYLES[factionId] : null;
  }

  function getNodeVisualMeta(node) {
    const meta = typeMeta[node.type];
    const factionStyle = getPrimaryFactionStyle(node);
    const neutralColor = NEUTRAL_NODE_COLORS[node.type];
    return { ...meta, color: factionStyle?.color ?? neutralColor ?? meta.color };
  }

  function makeNodeLabel(node) {
    const element = document.createElement("div");
    element.className = "node-label";
    element.textContent = node.label;
    const label = new CSS2DObject(element);
    label.userData.kind = "nodeLabel";
    label.position.set(0, 0, typeMeta[node.type].size + 18);
    return label;
  }

  function makeEdgeLabel(edge, start, end) {
    const element = document.createElement("div");
    element.className = "edge-label";
    element.textContent = edge.label;

    const label = new CSS2DObject(element);
    label.position.copy(start).lerp(end, 0.5);
    label.position.z += 10;
    label.visible = false;
    return label;
  }

  function makeCircleAlphaTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(64, 64, 42, 64, 64, 62);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.82, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function makeGlintTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(42, 34, 2, 42, 34, 54);
    gradient.addColorStop(0, "rgba(255,248,222,0.82)");
    gradient.addColorStop(0.32, "rgba(255,248,222,0.28)");
    gradient.addColorStop(1, "rgba(255,248,222,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function makeTopSquareAvatarTexture(sourceTexture) {
    const image = sourceTexture.image;
    const width = image?.naturalWidth || image?.videoWidth || image?.width;
    const height = image?.naturalHeight || image?.videoHeight || image?.height;

    if (!width || !height) {
      return sourceTexture;
    }

    const cropSize = Math.min(width, height);
    const sourceX = Math.max(0, (width - cropSize) / 2);
    const sourceY = 0;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, canvas.width, canvas.height);

    const croppedTexture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) {
      croppedTexture.colorSpace = THREE.SRGBColorSpace;
    }
    croppedTexture.needsUpdate = true;
    return croppedTexture;
  }

  function makeImageSprite(node, meta) {
    if (!node.image) {
      return null;
    }

    const material = new THREE.SpriteMaterial({
      color: 0xffffff,
      alphaMap: orbAlphaTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 0, meta.size * 0.08);
    sprite.scale.set(meta.size * 1.42, meta.size * 1.42, 1);
    sprite.renderOrder = 26;
    sprite.userData.baseOpacity = 0.88;

    textureLoader.load(
      node.image,
      (texture) => {
        try {
          material.map = makeTopSquareAvatarTexture(texture);
        } catch {
          if (THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
          }
          material.map = texture;
        }
        material.needsUpdate = true;
      },
      undefined,
      () => {
        sprite.visible = false;
      },
    );

    return sprite;
  }

  function makeCrystalCore(meta, hasImage) {
    const geometry = new THREE.SphereGeometry(meta.size * (hasImage ? 0.62 : 0.72), 24, 24);
    const material = new THREE.MeshBasicMaterial({
      color: meta.color,
      transparent: true,
      opacity: hasImage ? 0.08 : 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(geometry, material);
    core.renderOrder = 24;
    core.userData.baseOpacity = hasImage ? 0.08 : 0.38;
    return core;
  }

  function makeCrystalRim(meta) {
    const geometry = new THREE.SphereGeometry(meta.size * 1.08, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffc0a0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const rim = new THREE.Mesh(geometry, material);
    rim.renderOrder = 32;
    rim.userData.baseOpacity = 0.26;
    return rim;
  }

  function makeCrystalGlint(meta) {
    const material = new THREE.SpriteMaterial({
      map: glintTexture,
      color: 0xffc890,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glint = new THREE.Sprite(material);
    glint.position.set(-meta.size * 0.28, meta.size * 0.32, meta.size * 0.72);
    glint.scale.set(meta.size * 1.34, meta.size * 1.34, 1);
    glint.renderOrder = 34;
    glint.userData.baseOpacity = 0.46;
    return glint;
  }


  function buildCurvePointsForRelation(relation, start, end) {
    const style = RELATION_STYLE[relation] ?? RELATION_STYLE["world-world"];
    const midpoint = start.clone().lerp(end, 0.5);
    const chord = end.clone().sub(start);
    const control = midpoint.clone();

    const signY = chord.y === 0 ? (relation.startsWith("world") ? 1 : -1) : Math.sign(chord.y);
    const bendY = Math.min(Math.abs(chord.y) * style.bendY + 22, 62);

    if (relation === "character-character") {
      control.x = Math.min(start.x, end.x) + style.bowX;
      control.y += signY * bendY;
    } else if (relation === "character-event") {
      control.x += style.bowX;
      control.y += signY * bendY;
    } else if (relation === "event-event") {
      control.y += signY * Math.min(Math.abs(chord.y) * style.bendY + 10, 24);
    } else if (relation === "character-world") {
      control.y += signY * Math.min(Math.abs(chord.y) * style.bendY + 16, 42);
    } else if (relation === "event-world") {
      control.x += style.bowX;
      control.y += signY * Math.min(Math.abs(chord.y) * style.bendY + 14, 34);
    } else {
      control.x = Math.max(start.x, end.x) + style.bowX;
      control.y += signY * bendY;
    }

    control.z = Math.max(start.z, end.z) + style.lift + chord.length() * 0.022;

    const curve = new THREE.QuadraticBezierCurve3(start.clone(), control, end.clone());
    return {
      curve,
      points: curve.getPoints(CURVE_SEGMENTS),
    };
  }

  function updateEdgeCurve(edgeObject, source, target) {
    const { curve } = buildCurvePointsForRelation(edgeObject.relation, source, target);
    edgeObject.mesh.geometry.dispose();
    edgeObject.mesh.geometry = new THREE.TubeGeometry(
      curve,
      CURVE_SEGMENTS,
      EDGE_TUBE_RADIUS,
      EDGE_TUBE_RADIAL_SEGMENTS,
      false,
    );
    edgeObject.mesh.geometry.computeBoundingSphere();
    if (edgeObject.glowMesh) {
      edgeObject.glowMesh.geometry.dispose();
      edgeObject.glowMesh.geometry = new THREE.TubeGeometry(
        curve,
        CURVE_SEGMENTS,
        EDGE_GLOW_RADIUS,
        EDGE_TUBE_RADIAL_SEGMENTS,
        false,
      );
      edgeObject.glowMesh.geometry.computeBoundingSphere();
    }
    edgeObject.label.position.copy(curve.getPoint(0.5));
    edgeObject.label.position.z += 10;
  }

  function syncGraphGeometry() {
    if (!graph) {
      return;
    }

    graph.nodeMeshes.forEach((mesh) => {
      const basePosition = graphState.getNodePosition(mesh.userData.node.id);
      mesh.position.copy(basePosition);
      mesh.userData.halo.position.copy(basePosition);
      const label = mesh.userData.label;
      if (label) {
        label.position.z = typeMeta[mesh.userData.node.type].size + 18;
      }
    });

    graph.edgeObjects.forEach((edge) => {
      const source = graph.nodeMap.get(edge.source);
      const target = graph.nodeMap.get(edge.target);
      updateEdgeCurve(edge, source.position, target.position);
    });
  }

  function buildGraph(datasetKey) {
    const nodeMap = new Map();
    const nodeMeshes = [];
    const neighbors = graphState.getNeighborsMap();

    clearGroup(edgeGroup);
    clearGroup(haloGroup);
    clearGroup(nodeGroup);
    clearGroup(labelGroup);

    graphState.getNodes().forEach((node) => {
      const meta = getNodeVisualMeta(node);
      const position = graphState.getNodePosition(node.id).clone();

      const haloGeometry = new THREE.SphereGeometry(meta.size * 1.55, 24, 24);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: meta.color,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(position);
      halo.userData.nodeId = node.id;
      halo.renderOrder = 20;
      haloGroup.add(halo);

      const geometry = new THREE.SphereGeometry(meta.size, 28, 28);
      const material = new THREE.MeshPhysicalMaterial({
        color: meta.color,
        emissive: meta.color,
        emissiveIntensity: 0.22,
        roughness: 0.12,
        metalness: 0.02,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        clearcoat: 1,
        clearcoatRoughness: 0.025,
        ior: 1.5,
        reflectivity: 0.86,
        transmission: 0.36,
        thickness: meta.size * 0.62,
        specularIntensity: 1.5,
        specularColor: 0xfff1c8,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData.node = node;
      mesh.userData.baseScale = 1;
      mesh.userData.halo = halo;
      mesh.userData.crystalCore = makeCrystalCore(meta, Boolean(node.image));
      mesh.userData.imageSprite = makeImageSprite(node, meta);
      mesh.userData.crystalRim = makeCrystalRim(meta);
      mesh.userData.glint = makeCrystalGlint(meta);
      mesh.userData.label = makeNodeLabel(node);
      mesh.renderOrder = 30;
      mesh.add(mesh.userData.crystalCore);
      if (mesh.userData.imageSprite) {
        mesh.add(mesh.userData.imageSprite);
      }
      mesh.add(mesh.userData.crystalRim);
      mesh.add(mesh.userData.glint);
      mesh.add(mesh.userData.label);
      nodeGroup.add(mesh);

      nodeMap.set(node.id, mesh);
      nodeMeshes.push(mesh);
    });

    const edgeObjects = graphState.getEdges().map((edge) => {
      const sourceMesh = nodeMap.get(edge.source);
      const targetMesh = nodeMap.get(edge.target);

      const relationStyle = RELATION_STYLE[edge.relation] ?? RELATION_STYLE["world-world"];
      const { curve } = buildCurvePointsForRelation(edge.relation, sourceMesh.position, targetMesh.position);
      const glowGeometry = new THREE.TubeGeometry(curve, CURVE_SEGMENTS, EDGE_GLOW_RADIUS, EDGE_TUBE_RADIAL_SEGMENTS, false);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: relationStyle.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.userData.edge = edge;
      glowMesh.renderOrder = 9;
      glowMesh.frustumCulled = false;
      edgeGroup.add(glowMesh);

      const geometry = new THREE.TubeGeometry(curve, CURVE_SEGMENTS, EDGE_TUBE_RADIUS, EDGE_TUBE_RADIAL_SEGMENTS, false);
      const material = new THREE.MeshBasicMaterial({
        color: relationStyle.color,
        transparent: true,
        opacity: 0.66,
        depthWrite: false,
        depthTest: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.edge = edge;
      mesh.renderOrder = 10;
      mesh.frustumCulled = false;
      edgeGroup.add(mesh);

      const label = makeEdgeLabel(edge, sourceMesh.position, targetMesh.position);
      labelGroup.add(label);

      const edgeObject = { ...edge, mesh, glowMesh, label };
      updateEdgeCurve(edgeObject, sourceMesh.position, targetMesh.position);
      return edgeObject;
    });

    graph = { datasetKey, nodeMap, nodeMeshes, edgeObjects, neighbors };
    selectedNode = null;
    hoveredNode = null;
    focusNodeId = graphState.rootId;
    introStartedAt = performance.now();
    introCompleted = false;
    syncGraphGeometry();
    applyVisualState({ forceFocus: true });
  }

  function resolveActiveIds(overrideActiveIds) {
    if (overrideActiveIds) {
      return new Set(overrideActiveIds);
    }

    const activeIds = new Set();
    const activeNode = hoveredNode ?? selectedNode;
    const activeId = activeNode?.userData.node.id ?? null;
    if (activeId) {
      activeIds.add(activeId);
    }
    return activeIds;
  }

  function createFocusContext(activeIds) {
    const primaryIds = new Set(activeIds);
    const firstHopIds = new Set();
    const secondHopIds = new Set();
    const directEdgeKeys = new Set();
    const secondHopEdgeKeys = new Set();

    primaryIds.forEach((activeId) => {
      graph.neighbors.get(activeId)?.forEach((neighborId) => {
        firstHopIds.add(neighborId);
        directEdgeKeys.add(getEdgeKey(activeId, neighborId));
      });
    });

    firstHopIds.forEach((firstHopId) => {
      graph.neighbors.get(firstHopId)?.forEach((secondHopId) => {
        if (primaryIds.has(secondHopId) || firstHopIds.has(secondHopId)) {
          return;
        }
        secondHopIds.add(secondHopId);
        secondHopEdgeKeys.add(getEdgeKey(firstHopId, secondHopId));
      });
    });

    return {
      primaryIds,
      firstHopIds,
      secondHopIds,
      directEdgeKeys,
      secondHopEdgeKeys,
    };
  }

  function getEdgeKey(source, target) {
    return source < target ? `${source}::${target}` : `${target}::${source}`;
  }

  function getBaseTier(nodeId) {
    const level = graphState.getNodeLevel(nodeId);
    if (level === "root") {
      return 4;
    }
    if (level === "character-core") {
      return 3;
    }
    if (level === "character-outer") {
      return 2;
    }
    if (level === "event") {
      return 1;
    }
    if (FACTION_IDS.has(nodeId)) {
      return 2;
    }
    return 0;
  }

  function getBaseNodeVisual(nodeId) {
    const tier = getBaseTier(nodeId);
    return {
      scale: tier === 4 ? 1.36 : tier === 3 ? 1.16 : tier === 2 ? 0.84 : tier === 1 ? 0.88 : 0.8,
      opacity: tier === 4 ? 1 : tier === 3 ? 0.98 : tier === 2 ? 0.44 : tier === 1 ? 0.46 : 0.22,
      emissive: tier === 4 ? 0.46 : tier === 3 ? 0.28 : tier === 2 ? 0.055 : tier === 1 ? 0.075 : 0.028,
      labelOpacity: tier === 4 ? 1 : tier === 3 ? 0.96 : tier === 2 ? 0.24 : tier === 1 ? 0.36 : 0.14,
      haloOpacity: tier === 4 ? 0.26 : tier === 3 ? 0.14 : tier === 2 ? 0.012 : tier === 1 ? 0.018 : 0.006,
      haloScale: tier >= 3 ? 1.06 : 0.92,
    };
  }


  function isFactionEdge(edge) {
    return FACTION_IDS.has(edge.source) || FACTION_IDS.has(edge.target);
  }

  function getBaseEdgeOpacity(edge) {
    const rootConnected = edge.source === graphState.rootId || edge.target === graphState.rootId;
    const edgeTier = rootConnected ? 2 : Math.max(getBaseTier(edge.source), getBaseTier(edge.target));
    const style = RELATION_STYLE[edge.relation] ?? RELATION_STYLE["world-world"];
    const baseOpacity = edgeTier >= 4
      ? 0.94
      : edgeTier === 3
        ? Math.max(style.opacity[2] ?? 0.18, 0.4)
        : edgeTier === 2
          ? Math.max((style.opacity[1] ?? 0.12) * 0.52, 0.1)
          : style.opacity[0] ?? 0.06;
    return isFactionEdge(edge) ? Math.max(baseOpacity, 0.22) : baseOpacity;
  }

  function getLevelIntroIndex(nodeId) {
    const level = graphState.getNodeLevel(nodeId);
    if (level === "root") {
      return 0;
    }
    if (level === "character-core") {
      return 1;
    }
    if (level === "character-outer") {
      return 2;
    }
    if (level === "event") {
      return 3;
    }
    return 4;
  }

  function getNodeRevealProgress(nodeId, now = performance.now()) {
    if (introCompleted) {
      return 1;
    }

    const position = graphState.getNodePosition(nodeId);
    if (!position) {
      return 1;
    }

    const levelDelay = getLevelIntroIndex(nodeId) * INTRO_LAYER_STAGGER;
    const radius = Math.hypot(position.x, position.y);
    const radiusDelay = getLevelIntroIndex(nodeId) === 0 ? 0 : clamp01(radius / 940) * 0.34;
    const elapsed = (now - introStartedAt) / 1000;
    return easeOutCubic((elapsed - levelDelay - radiusDelay) / INTRO_SWEEP_DURATION);
  }

  function getEdgeRevealProgress(edge, now = performance.now()) {
    if (introCompleted) {
      return 1;
    }

    const sourceReveal = getNodeRevealProgress(edge.source, now);
    const targetReveal = getNodeRevealProgress(edge.target, now);
    return clamp01(Math.min(sourceReveal, targetReveal) - INTRO_EDGE_LAG);
  }

  function getCrystalShellOpacity(opacity) {
    return Math.min(opacity * 0.56, 0.58);
  }

  function applyCrystalLayerState(mesh, opacity, haloOpacity, reveal) {
    const core = mesh.userData.crystalCore;
    const imageSprite = mesh.userData.imageSprite;
    const rim = mesh.userData.crystalRim;
    const glint = mesh.userData.glint;

    if (core) {
      core.material.opacity = core.userData.baseOpacity * Math.min(opacity + 0.18, 1) * reveal;
    }
    if (imageSprite) {
      imageSprite.material.opacity = imageSprite.userData.baseOpacity * Math.min(opacity + 0.08, 1) * reveal;
    }
    if (rim) {
      rim.material.opacity = rim.userData.baseOpacity * Math.min(haloOpacity * 2.4 + opacity * 0.34, 1) * reveal;
    }
    if (glint) {
      glint.material.opacity = glint.userData.baseOpacity * Math.min(haloOpacity * 3.2 + 0.08, 1) * reveal;
    }
  }

  function applyVisualState({ activeNodeIds = null, forceFocus = false } = {}) {
    if (!graph) {
      return;
    }

    const now = performance.now();
    const activeIds = resolveActiveIds(activeNodeIds);
    const focusContext = activeIds.size ? createFocusContext(activeIds) : null;
    const hasIsolatedFocus = activeIds.size > 0;
    graph.nodeMeshes.forEach((mesh) => {
      const nodeId = mesh.userData.node.id;
      const labelElement = mesh.userData.label?.element;
      const baseVisual = getBaseNodeVisual(nodeId);
      const reveal = getNodeRevealProgress(nodeId, now);
      const introScale = introCompleted ? 1 : INTRO_START_SCALE + (1 - INTRO_START_SCALE) * reveal;
      labelElement?.classList.remove("active", "dimmed");

      if (!activeIds.size) {
        mesh.scale.setScalar(baseVisual.scale * introScale);
        mesh.material.emissiveIntensity = baseVisual.emissive + (nodeId === graphState.rootId ? (1 - reveal) * 0.34 : 0);
        mesh.material.opacity = getCrystalShellOpacity(baseVisual.opacity) * reveal;
        mesh.material.transparent = true;
        mesh.userData.halo.material.opacity = baseVisual.haloOpacity * reveal;
        mesh.userData.halo.scale.setScalar(
          baseVisual.haloScale * (0.72 + reveal * 0.28) * (nodeId === graphState.rootId ? 1 + (1 - reveal) * 0.48 : 1),
        );
        applyCrystalLayerState(mesh, baseVisual.opacity, baseVisual.haloOpacity, reveal);
        if (labelElement) {
          labelElement.style.opacity = `${baseVisual.labelOpacity * reveal}`;
        }
        return;
      }

      const isSelected = selectedNode?.userData.node.id === nodeId;
      const isActive = focusContext.primaryIds.has(nodeId);
      const isFirstHop = focusContext.firstHopIds.has(nodeId);
      const isSecondHop = focusContext.secondHopIds.has(nodeId);
      const isContext = !isActive && !isFirstHop && !isSecondHop;
      const scale = isSelected
        ? 1.58
        : isActive
          ? 1.4
          : isFirstHop
            ? 1.02
            : isSecondHop
              ? 0.86
              : baseVisual.scale * 0.9;
      const opacity = isSelected
        ? 1
        : isActive
          ? 0.98
          : isFirstHop
            ? 0.82
            : isSecondHop
              ? (hasIsolatedFocus ? 0.18 : 0.42)
              : hasIsolatedFocus
                ? 0.008
                : 0.08;
      const emissive = isSelected
        ? 1.02
        : isActive
          ? 0.84
          : isFirstHop
            ? 0.28
            : isSecondHop
              ? (hasIsolatedFocus ? 0.035 : 0.08)
              : (hasIsolatedFocus ? 0.004 : baseVisual.emissive * 0.55);
      const haloOpacity = isSelected
        ? 0.5
        : isActive
          ? 0.38
          : isFirstHop
            ? 0.13
            : isSecondHop
              ? (hasIsolatedFocus ? 0.01 : 0.035)
              : (hasIsolatedFocus ? 0 : baseVisual.haloOpacity * 0.36);
      const labelOpacity = isSelected
        ? 1
        : isActive
          ? 0.96
          : isFirstHop
            ? 0.72
            : isSecondHop
              ? (hasIsolatedFocus ? 0.1 : 0.34)
              : (hasIsolatedFocus ? 0 : baseVisual.labelOpacity * 0.48);

      mesh.scale.setScalar(scale * introScale);
      mesh.material.emissiveIntensity = emissive + (nodeId === graphState.rootId ? (1 - reveal) * 0.34 : 0);
      mesh.material.opacity = getCrystalShellOpacity(opacity) * reveal;
      mesh.material.transparent = true;
      mesh.userData.halo.material.opacity = haloOpacity * reveal;
      mesh.userData.halo.scale.setScalar(
        (isSelected ? 1.5 : isActive ? 1.3 : isFirstHop ? 1.12 : isSecondHop ? 1.02 : baseVisual.haloScale) *
          (0.72 + reveal * 0.28) *
          (nodeId === graphState.rootId ? 1 + (1 - reveal) * 0.48 : 1),
      );
      applyCrystalLayerState(mesh, opacity, haloOpacity, reveal);
      if (labelElement) {
        labelElement.style.opacity = `${labelOpacity * reveal}`;
        labelElement.classList.toggle("active", isActive);
        labelElement.classList.toggle("dimmed", isContext);
      }
    });

    graph.edgeObjects.forEach((edge) => {
      const style = RELATION_STYLE[edge.relation] ?? RELATION_STYLE["world-world"];
      const reveal = getEdgeRevealProgress(edge, now);

      if (!activeIds.size) {
        edge.mesh.material.opacity = getBaseEdgeOpacity(edge) * reveal;
        edge.mesh.material.color.setHex(style.color);
        edge.glowMesh.material.opacity = (isFactionEdge(edge) ? 0.028 : 0) * reveal;
        edge.glowMesh.material.color.setHex(style.activeColor);
        edge.label.visible = false;
        edge.label.element.style.setProperty("--edge-accent", style.cssColor);
        edge.label.element.classList.toggle("visible", false);
        edge.label.element.classList.toggle("focus-visible", false);
        edge.label.element.style.opacity = "0";
        return;
      }

      const edgeKey = getEdgeKey(edge.source, edge.target);
      const isDirectEdge = focusContext.directEdgeKeys.has(edgeKey);
      const isSecondHopEdge = focusContext.secondHopEdgeKeys.has(edgeKey);
      const opacity = isDirectEdge
        ? Math.max(style.opacity[2], 0.96)
        : isSecondHopEdge
          ? (hasIsolatedFocus ? Math.max(style.opacity[1] * 0.52, 0.12) : Math.max(style.opacity[1], 0.3))
          : hasIsolatedFocus
            ? Math.max(getBaseEdgeOpacity(edge) * 0.06, 0.004)
            : Math.max(getBaseEdgeOpacity(edge) * 0.42, 0.025);
      edge.mesh.material.opacity = opacity * reveal;
      edge.mesh.material.color.setHex(isDirectEdge ? style.activeColor : style.color);
      edge.glowMesh.material.opacity = (isDirectEdge ? 0.14 : 0) * reveal;
      edge.glowMesh.material.color.setHex(style.activeColor);
      const activeLabelVisible = isDirectEdge && reveal > 0.92;
      edge.label.visible = activeLabelVisible;
      edge.label.element.style.setProperty("--edge-accent", style.cssColor);
      edge.label.element.classList.toggle("visible", activeLabelVisible);
      edge.label.element.classList.toggle("focus-visible", activeLabelVisible);
      edge.label.element.style.opacity = activeLabelVisible ? "0.96" : "0";
    });

    if (forceFocus) {
      focusNodeId = selectedNode?.userData.node.id ?? graphState.rootId;
    }
  }

  function step(_elapsed, { followSelection = true } = {}) {
    if (!graph) {
      return;
    }

    if (!introCompleted) {
      const worldNodesSettled = graph.nodeMeshes.every((mesh) => getNodeRevealProgress(mesh.userData.node.id) >= 0.999);
      if (worldNodesSettled) {
        introCompleted = true;
      }
    }

    if (followSelection && focusNodeId) {
      const focusTarget = getNodeWorldPosition(focusNodeId, worldTarget);
      if (focusTarget) {
        controls.target.lerp(focusTarget, FOCUS_LERP_SPEED);
      }
    }
  }

  function collectNodeMeshesFromIds(nodeIds) {
    return [...nodeIds].map((nodeId) => graph?.nodeMap.get(nodeId)).filter(Boolean);
  }

  function getNeighborIds(nodeId) {
    return graph?.neighbors.get(nodeId) ?? new Set();
  }

  function getNodeWorldPosition(nodeId, target = new THREE.Vector3()) {
    const mesh = graph?.nodeMap.get(nodeId);
    if (!mesh) {
      return null;
    }

    mesh.getWorldPosition(target);
    return target;
  }

  return {
    buildGraph,
    applyVisualState,
    step,
    syncGraphGeometry,
    collectNodeMeshesFromIds,
    getNeighborIds,
    getNodeWorldPosition,
    getGraph: () => graph,
    getHoveredNode: () => hoveredNode,
    setHoveredNode: (node) => {
      hoveredNode = node;
    },
    getSelectedNode: () => selectedNode,
    setSelectedNode: (node) => {
      selectedNode = node;
    },
  };
}
