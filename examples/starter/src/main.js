// Generic starter entry for narrative relationship graphs.
// Replace STORY_DATA_FILE, BUILD_ID, DATASET_KEY, and labels when creating a project.
import { DATASET, GRAPH_VIEWS, TYPE_META } from "./data/story.js?v=starter";
import { createScene } from "./core/scene.js?v=starter";
import { createGraphController } from "./core/graph.js?v=starter";
import { createInteractionController } from "./core/interaction.js?v=starter";
import { createInfoCardController } from "./core/info-card.js?v=starter";
import { createGraphState } from "./core/state.js?v=starter";

const root = document.getElementById("graph-root");
const BUILD_ID = "build-starter";
const DATASET_KEY = DATASET.key ?? DATASET.rootId ?? "story";
const INDEX_ARIA_LABEL = DATASET.ui?.indexAriaLabel ?? "关系图索引";

function mountBackgroundLayer() {
  if (!root) return;

  const layer = document.createElement("div");
  layer.className = "graph-bg";
  layer.setAttribute("aria-hidden", "true");

  const image = document.createElement("div");
  image.className = "graph-bg-image";

  const overlay = document.createElement("div");
  overlay.className = "graph-bg-overlay";

  layer.append(image, overlay);
  root.prepend(layer);
}

function mountDecorLayer() {
  if (!root) return;

  const layer = document.createElement("div");
  layer.className = "decor-layer";

  ["nw", "ne", "sw", "se"].forEach((corner) => {
    const frame = document.createElement("div");
    frame.className = `decor-corner decor-corner-${corner}`;
    layer.appendChild(frame);
  });

  const sigil = document.createElement("div");
  sigil.className = "decor-sigil";
  sigil.innerHTML = `
    <span class="decor-sigil-triangle"></span>
    <span class="decor-sigil-circle"></span>
    <span class="decor-sigil-line"></span>
  `;
  layer.appendChild(sigil);

  const starField = document.createElement("div");
  starField.className = "decor-stars";
  const stars = [
    ["8%", "14%", "xs"], ["14%", "22%", "sm"], ["22%", "10%", "md"],
    ["72%", "12%", "xs"], ["80%", "18%", "sm"], ["88%", "8%", "md"],
    ["8%", "76%", "xs"], ["16%", "84%", "sm"], ["74%", "80%", "xs"],
    ["82%", "74%", "sm"], ["92%", "82%", "md"],
  ];
  stars.forEach(([left, top, size], index) => {
    const star = document.createElement("span");
    star.className = `decor-star decor-star-${size}`;
    star.style.left = left;
    star.style.top = top;
    star.style.animationDelay = `${index * 0.55}s`;
    starField.appendChild(star);
  });
  layer.appendChild(starField);

  const trail = document.createElement("div");
  trail.className = "decor-trail";
  layer.appendChild(trail);

  root.appendChild(layer);
}

function mountViewIndex(views, onSelect) {
  const panel = document.createElement("nav");
  panel.className = "view-index";
  panel.setAttribute("aria-label", INDEX_ARIA_LABEL);
  panel.addEventListener("pointerdown", (event) => event.stopPropagation());

  const sectionList = document.createElement("div");
  sectionList.className = "view-index-sections";

  const childList = document.createElement("div");
  childList.className = "view-index-children";

  let activeSectionId = views[0]?.id ?? null;
  let activeViewId = views[0]?.children?.[0]?.id ?? null;

  function renderChildren() {
    childList.innerHTML = "";
    const section = views.find((item) => item.id === activeSectionId) ?? views[0];
    const title = document.createElement("div");
    title.className = "view-index-title";
    title.textContent = section?.label ?? "索引";
    childList.appendChild(title);

    section?.children?.forEach((view) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "view-child-button";
      button.classList.toggle("active", view.id === activeViewId);
      button.textContent = view.label;
      button.addEventListener("click", () => {
        activeViewId = view.id;
        renderChildren();
        onSelect(view.id);
      });
      childList.appendChild(button);
    });
  }

  views.forEach((section) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "view-section-button";
    button.classList.toggle("active", section.id === activeSectionId);
    button.textContent = section.label;
    button.addEventListener("click", () => {
      activeSectionId = section.id;
      activeViewId = section.children?.[0]?.id ?? activeViewId;
      [...sectionList.children].forEach((item) => item.classList.toggle("active", item === button));
      renderChildren();
      if (activeViewId) onSelect(activeViewId);
    });
    sectionList.appendChild(button);
  });

  panel.append(sectionList, childList);
  root?.appendChild(panel);
  renderChildren();
}

function mountBuildStamp() {
  const stamp = document.createElement("div");
  stamp.textContent = BUILD_ID;
  stamp.style.position = "absolute";
  stamp.style.left = "14px";
  stamp.style.bottom = "12px";
  stamp.style.padding = "4px 8px";
  stamp.style.borderRadius = "999px";
  stamp.style.font = '10px/1 ui-monospace, "SFMono-Regular", Menlo, monospace';
  stamp.style.letterSpacing = "0.08em";
  stamp.style.color = "rgba(230, 220, 205, 0.55)";
  stamp.style.background = "rgba(12, 12, 14, 0.34)";
  stamp.style.border = "1px solid rgba(210, 205, 190, 0.16)";
  stamp.style.pointerEvents = "none";
  stamp.style.zIndex = "5";
  root?.appendChild(stamp);
}

function showBootError(error) {
  const message = document.createElement("pre");
  message.textContent = `Graph init failed:\n${error?.message ?? error}`;
  message.style.position = "absolute";
  message.style.left = "20px";
  message.style.top = "20px";
  message.style.margin = "0";
  message.style.padding = "12px 14px";
  message.style.maxWidth = "min(720px, calc(100vw - 40px))";
  message.style.whiteSpace = "pre-wrap";
  message.style.font = '12px/1.5 ui-monospace, "SFMono-Regular", Menlo, monospace';
  message.style.color = "#ffe8d8";
  message.style.background = "rgba(38, 18, 18, 0.86)";
  message.style.border = "1px solid rgba(220, 120, 80, 0.35)";
  message.style.borderRadius = "12px";
  message.style.zIndex = "10";
  root?.appendChild(message);
}

try {
  mountBackgroundLayer();
  mountDecorLayer();
  mountBuildStamp();
  const sceneController = createScene(root);
  const graphState = createGraphState({ ...DATASET, views: GRAPH_VIEWS }, TYPE_META);
  const graphController = createGraphController({
    THREE: sceneController.THREE,
    groups: {
      zoneGroup: sceneController.zoneGroup,
      haloGroup: sceneController.haloGroup,
      edgeGroup: sceneController.edgeGroup,
      nodeGroup: sceneController.nodeGroup,
      labelGroup: sceneController.labelGroup,
    },
    controls: sceneController.controls,
    typeMeta: TYPE_META,
    graphState,
  });
  const infoCardController = createInfoCardController({ root, graphState });
  const interactionController = createInteractionController({
    root,
    camera: sceneController.camera,
    renderer: sceneController.renderer,
    controls: sceneController.controls,
    raycaster: sceneController.raycaster,
    graphController,
    graphState,
  });

  function buildCurrentGraph() {
    graphController.buildGraph(`${DATASET_KEY}:${graphState.getActiveViewId()}`);
  }

  function selectView(viewId) {
    graphState.setActiveView(viewId);
    graphController.setHoveredNode(null);
    graphController.setSelectedNode(null);
    buildCurrentGraph();
    const focus = graphController.getNodeWorldPosition(graphState.rootId);
    if (focus) sceneController.controls.target.copy(focus);
    interactionController.markActivity();
  }

  window.addEventListener("resize", () => sceneController.resize());
  interactionController.bind();
  mountViewIndex(GRAPH_VIEWS, selectView);
  buildCurrentGraph();

  const clock = new sceneController.THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    const idle = interactionController.isIdle();
    sceneController.controls.autoRotate = idle;
    if (idle) {
      const rootFocus = graphController.getNodeWorldPosition(graphState.rootId);
      if (rootFocus) sceneController.controls.target.lerp(rootFocus, 0.035);
    }
    if (!interactionController.isDragging()) sceneController.controls.update();
    interactionController.updateHover();
    graphController.step(elapsed, {
      followSelection: !interactionController.isDragging() && !idle,
    });
    graphController.applyVisualState({
      activeNodeIds: interactionController.isDragging() ? interactionController.getActiveNodeIds() : null,
    });
    infoCardController.render(graphController.getSelectedNode()?.userData.node.id ?? null);
    sceneController.render();
  }
  animate();
} catch (error) {
  console.error(error);
  showBootError(error);
}
