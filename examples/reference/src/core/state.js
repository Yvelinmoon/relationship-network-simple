import * as THREE from "../../vendor/three/three.module.js";
import { createSemanticZoneLayout } from "./layout.js?v=202604261825";

export function createGraphState(dataset, typeMeta) {
  const nodeLookup = new Map(dataset.nodes.map((node) => [node.id, node]));
  const fullEdges = dataset.edges.map((edge) => ({
    ...edge,
    relation: edge.relation ?? deriveRelation(edge, nodeLookup),
  }));
  const fullNeighbors = buildNeighbors(dataset.nodes, fullEdges);
  const zoneLayout = createSemanticZoneLayout(dataset);
  const views = dataset.views ?? [];
  const firstView = views[0]?.children?.[0] ?? { id: "overview-all", rootId: dataset.rootId, include: "all" };

  const state = {
    datasetKey: dataset.rootId ?? dataset.nodes[0]?.id ?? "graph",
    rootId: dataset.rootId ?? dataset.nodes[0]?.id ?? "graph",
  };

  let activeViewId = firstView.id;
  let activeGraph = buildActiveGraph(firstView);

  function deriveRelation(edge, lookup) {
    const source = lookup.get(edge.source);
    const target = lookup.get(edge.target);
    return `${source?.zone ?? "world"}-${target?.zone ?? "world"}`;
  }

  function buildNeighbors(nodes, edges) {
    const neighbors = new Map(nodes.map((node) => [node.id, new Set()]));

    edges.forEach((edge) => {
      neighbors.get(edge.source)?.add(edge.target);
      neighbors.get(edge.target)?.add(edge.source);
    });

    return neighbors;
  }

  function findView(viewId) {
    for (const section of views) {
      const child = section.children?.find((item) => item.id === viewId);
      if (child) {
        return child;
      }
    }
    return firstView;
  }

  function getViewNodeIds(view) {
    if (!view || view.include === "all") {
      return new Set(dataset.nodes.map((node) => node.id));
    }

    return new Set((view.include ?? []).filter((nodeId) => nodeLookup.has(nodeId)));
  }

  function getViewEdges(nodeIds) {
    return fullEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  }

  function getDepthsFromRoot(rootId, neighbors) {
    const depths = new Map([[rootId, 0]]);
    const queue = [rootId];

    while (queue.length) {
      const current = queue.shift();
      const nextDepth = (depths.get(current) ?? 0) + 1;
      neighbors.get(current)?.forEach((neighborId) => {
        if (depths.has(neighborId)) {
          return;
        }
        depths.set(neighborId, nextDepth);
        queue.push(neighborId);
      });
    }

    return depths;
  }

  function placeRing(nodes, radius, startAngle, spread, positions, metaOffset = 0) {
    if (!nodes.length) {
      return;
    }

    const step = nodes.length === 1 ? 0 : spread / (nodes.length - 1);
    const firstAngle = startAngle + spread / 2;

    nodes.forEach((node, index) => {
      const angle = ((nodes.length === 1 ? startAngle : firstAngle - step * index) * Math.PI) / 180;
      const wave = nodes.length <= 2 ? 0 : index % 2 === 0 ? -18 : 18;
      const ringOffset = Math.floor(index / 4) * 28;
      const meta = typeMeta[node.type];
      positions.set(
        node.id,
        new THREE.Vector3(Math.cos(angle) * (radius + wave + ringOffset), Math.sin(angle) * (radius + wave + ringOffset), meta.depth + metaOffset + ((index % 5) - 2) * 6),
      );
    });
  }

  function buildSubgraphLayout(view, nodes, edges, neighbors) {
    const positions = new Map();
    const nodeLevels = new Map();
    const rootId = nodeLookup.has(view.rootId) && nodes.some((node) => node.id === view.rootId) ? view.rootId : nodes[0]?.id;
    const depths = getDepthsFromRoot(rootId, neighbors);
    const rootNode = nodeLookup.get(rootId);

    if (rootNode) {
      positions.set(rootId, new THREE.Vector3(0, 0, typeMeta[rootNode.type].depth));
      nodeLevels.set(rootId, "root");
    }

    const byDepth = new Map();
    nodes.forEach((node) => {
      if (node.id === rootId) {
        return;
      }
      const depth = Math.min(depths.get(node.id) ?? 3, 3);
      if (!byDepth.has(depth)) {
        byDepth.set(depth, []);
      }
      byDepth.get(depth).push(node);
    });

    const sortForSubgraph = (items) => [...items].sort((left, right) => {
      const zoneOrder = { character: 0, event: 1, world: 2 };
      const zoneDelta = (zoneOrder[left.zone] ?? 3) - (zoneOrder[right.zone] ?? 3);
      if (zoneDelta !== 0) {
        return zoneDelta;
      }
      const leftDegree = neighbors.get(left.id)?.size ?? 0;
      const rightDegree = neighbors.get(right.id)?.size ?? 0;
      if (leftDegree !== rightDegree) {
        return rightDegree - leftDegree;
      }
      return left.label.localeCompare(right.label, "zh-Hans-CN");
    });

    const ringSettings = [
      [1, 178, 112, 210],
      [2, 326, -18, 250],
      [3, 488, -122, 236],
    ];

    ringSettings.forEach(([depth, radius, angle, spread]) => {
      const ringNodes = sortForSubgraph(byDepth.get(depth) ?? []);
      placeRing(ringNodes, radius, angle, spread, positions, depth * -16);
      ringNodes.forEach((node) => {
        if (depth === 1 && node.zone === "character") {
          nodeLevels.set(node.id, "character-core");
        } else if (node.zone === "character") {
          nodeLevels.set(node.id, "character-outer");
        } else if (node.zone === "event") {
          nodeLevels.set(node.id, "event");
        } else {
          nodeLevels.set(node.id, "world");
        }
      });
    });

    return { positions, nodeLevels, rootId };
  }

  function buildOverviewGraph() {
    const positions = new Map();
    dataset.nodes.forEach((node, index) => {
      const layoutPosition = zoneLayout.positions.get(node.id) ?? { x: 0, y: 0 };
      const meta = typeMeta[node.type];
      const offset = ((index % 5) - 2) * 8;
      positions.set(node.id, new THREE.Vector3(layoutPosition.x, layoutPosition.y, meta.depth + offset));
    });

    return {
      rootId: dataset.rootId ?? dataset.nodes[0]?.id ?? "graph",
      nodes: dataset.nodes,
      edges: fullEdges,
      neighbors: fullNeighbors,
      positions,
      nodeLevels: zoneLayout.nodeLevels,
    };
  }

  function buildActiveGraph(view) {
    if (!view || view.include === "all") {
      const graph = buildOverviewGraph();
      state.rootId = graph.rootId;
      return graph;
    }

    const nodeIds = getViewNodeIds(view);
    const nodes = dataset.nodes.filter((node) => nodeIds.has(node.id));
    const edges = getViewEdges(nodeIds);
    const neighbors = buildNeighbors(nodes, edges);
    const layout = buildSubgraphLayout(view, nodes, edges, neighbors);
    state.rootId = layout.rootId;

    return {
      rootId: layout.rootId,
      nodes,
      edges,
      neighbors,
      positions: layout.positions,
      nodeLevels: layout.nodeLevels,
    };
  }

  function setActiveView(viewId) {
    const view = findView(viewId);
    activeViewId = view.id;
    activeGraph = buildActiveGraph(view);
  }

  function getNode(nodeId) {
    return nodeLookup.get(nodeId) ?? null;
  }

  function getNodePosition(nodeId) {
    return activeGraph.positions.get(nodeId);
  }

  function setNodePosition(nodeId, nextPosition) {
    const position = activeGraph.positions.get(nodeId);
    if (!position) {
      return;
    }

    position.copy(nextPosition);
  }

  function translateNodes(nodeIds, delta) {
    nodeIds.forEach((nodeId) => {
      const position = activeGraph.positions.get(nodeId);
      if (!position) {
        return;
      }

      position.x += delta.x;
      position.y += delta.y;
    });
  }

  return Object.assign(state, {
    getActiveViewId: () => activeViewId,
    setActiveView,
    getViews: () => views,
    getNodes: () => activeGraph.nodes,
    getEdges: () => activeGraph.edges,
    getAllEdges: () => fullEdges,
    getNode,
    getNodeZone: (nodeId) => nodeLookup.get(nodeId)?.zone ?? "world",
    getNodeLevel: (nodeId) => activeGraph.nodeLevels.get(nodeId) ?? "world",
    getNodePosition,
    setNodePosition,
    translateNodes,
    getNeighbors: (nodeId) => activeGraph.neighbors.get(nodeId) ?? new Set(),
    getNeighborsMap: () => activeGraph.neighbors,
    getZoneLayout: () => zoneLayout,
  });
}
