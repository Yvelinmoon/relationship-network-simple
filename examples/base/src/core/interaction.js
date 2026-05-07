const IDLE_ROTATE_DELAY_MS = 10_000;

export function createInteractionController({ root, camera, renderer, raycaster, graphController }) {
  const pointer = { x: 0, y: 0 };
  const pointerNdc = { x: 2, y: 2 };
  let lastActivityAt = performance.now();

  function markActivity() {
    lastActivityAt = performance.now();
  }

  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointerNdc.x = (pointer.x / rect.width) * 2 - 1;
    pointerNdc.y = -(pointer.y / rect.height) * 2 + 1;
  }

  function onPointerMove(event) {
    markActivity();
    updatePointer(event);
  }

  function onPointerLeave() {
    pointerNdc.x = 2;
    pointerNdc.y = 2;
    graphController.setHoveredNode(null);
    graphController.applyVisualState();
    root.style.cursor = "grab";
  }

  function onPointerDown(event) {
    markActivity();
    if (event.button !== 0) {
      return;
    }
    updatePointer(event);
    raycaster.setFromCamera(pointerNdc, camera);

    const graph = graphController.getGraph();
    const nodeHits = raycaster.intersectObjects(graph?.nodeMeshes ?? [], false);
    if (nodeHits.length) {
      graphController.setSelectedNode(nodeHits[0].object);
      graphController.applyVisualState({ forceFocus: true });
      return;
    }

    const lineHits = raycaster.intersectObjects(graph?.edgeObjects.map((edge) => edge.mesh) ?? [], false);
    if (lineHits.length) {
      const edge = lineHits[0].object.userData.edge;
      graphController.setSelectedNode(graph?.nodeMap.get(edge.source) ?? null);
      graphController.applyVisualState({ forceFocus: true });
      return;
    }

    graphController.setSelectedNode(null);
    graphController.applyVisualState({ forceFocus: true });
  }

  function updateHover() {
    const graph = graphController.getGraph();
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(graph?.nodeMeshes ?? [], false);
    graphController.setHoveredNode(hits[0]?.object ?? null);
    root.style.cursor = hits.length ? "pointer" : "grab";
  }

  function onWheel() {
    markActivity();
  }

  function onKeyDown() {
    markActivity();
  }

  function onTouchStart() {
    markActivity();
  }

  function bind() {
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("wheel", onWheel, { passive: true });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("keydown", onKeyDown);
  }

  return {
    bind,
    updateHover,
    markActivity,
    isIdle: (now = performance.now()) => now - lastActivityAt >= IDLE_ROTATE_DELAY_MS,
    isDragging: () => false,
    getActiveNodeIds: () => null,
  };
}
