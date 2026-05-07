---
name: narrative-relationship-graph-space-assets
description: Use when the user wants to quickly build or update an interactive narrative / character relationship graph using pre-provided assets from the current Cohub Space or workspace files. This fast variant removes Wikimedia/Neta image acquisition and requires character portraits, faction icons, backgrounds, and other images to come from local Space files supplied by the user.
metadata:
  short-description: Fast relationship graphs from Space-provided assets
---

# Narrative Relationship Graph — Space Assets Fast Variant

This is a fast-build variant of `narrative-relationship-graph` for users who pre-provide visual assets in the current Cohub Space / workspace. It prioritizes generation speed and deterministic local files over external image search or generated media.

## Use This Skill When

Use this skill when the user asks to create, rebuild, or update a relationship-network frontend and explicitly wants to provide assets themselves, for example:

- “角色图都在 space 文件夹里，直接用这些做关系网”
- “不要搜图，素材我都给好了”
- “尽快做一个人物关系网，图片从当前 Space 文件里拿”
- “用本地素材生成三国 / 动漫 / 游戏 / 小说角色关系图”
- “制作角色关系网 / 人物关系图 / 事件关系网 / 世界观图，并复用用户上传图片”

Good targets:

- 角色关系网、阵营关系图、事件关系图、地点/物件关系图
- 二次元、动画、漫画、游戏、小说、历史、OC 世界、TRPG 世界
- Any story where local portraits/backgrounds are already provided

Do **not** use this fast variant when the user expects the assistant to search Wikimedia, generate Neta images, fetch official art, or create new visual assets. Use the full `narrative-relationship-graph` skill for that.

## Core Principle

Optimize for speed and predictable local rendering:

1. **Images must come from Space/workspace files.**
2. **Do not call Wikimedia, Wikipedia, Neta, web search, or arbitrary remote image URLs for image acquisition.**
3. **If a needed image is missing, continue with a non-image fallback and report the missing local asset.**
4. **Compress every local portrait before wiring it into graph data.**
5. **Keep the graph readable: relationship clarity beats decoration.**

## Local Space Asset Rules

The user will provide assets in the current Space / workspace. In Cohub, inspect local files through the filesystem first, normally under `/workspace` or the current working directory.

Recommended user-provided asset layout:

```text
/workspace/<project-or-assets>/
  portraits/
    ichigo-kurosaki.png
    rukia-kuchiki.jpg
  backgrounds/
    graph-background.webp
  factions/
    gotei-13.webp
  objects/
    hogyoku.png
  data/
    characters.csv|json|md  optional
```

Also support looser layouts because users may upload files without structure:

```text
/workspace/assets/*.png
/workspace/uploads/*
/workspace/<space-name>/**/*.{png,jpg,jpeg,webp,gif}
```

### Asset Discovery Order

Before editing the graph, scan the current workspace for local images:

```bash
find /workspace -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' \)
```

Prefer specialized file tools when available. Do not scan `/public`, `.git`, `node_modules`, huge build outputs, or unrelated dependency folders unless the user specifically points there.

For each project, create a machine-readable report:

```text
reports/local-asset-pass.json
```

The report should include:

- `assetRootsScanned`
- each important node id / label
- candidate local files considered
- selected local file, if any
- decision: `used`, `missing`, `ambiguous`, `rejected`
- reason
- raw local path
- compressed thumb/card output paths

### Filename Matching

Use stable node IDs and match assets by:

1. exact node id: `ichigo-kurosaki.webp`
2. normalized label: `黑崎一护.png`, `ichigo_kurosaki.jpg`
3. aliases provided by user or added in data: `aliases: ["一护", "Ichigo Kurosaki"]`
4. folder hints: `portraits/`, `characters/`, `头像/`, `角色/`

Normalize by lowercasing Latin text and removing spaces, punctuation, hyphens, underscores, and common brackets. For Chinese/Japanese labels, prefer exact substring match.

If multiple plausible images exist, choose the most specific path first:

```text
portraits/<id>.* > characters/<id>.* > any exact <id>.* > label/alias match > folder-level guess
```

If still ambiguous, do not guess silently. Pick no image, record `ambiguous`, and mention the candidates in the final summary.

## Non-Negotiable Gates

Before final delivery, explicitly pass these gates or state the blocker.

1. **Data gate**: every node has a stable ID, type, zone, 50-100 Chinese character `description`, and meaningful relation labels.
2. **Local asset gate**: scan Space/workspace asset folders. Important characters must either use a selected local image or have a `missing/ambiguous/rejected` entry in `reports/local-asset-pass.json`. No Wikimedia/Neta/web image acquisition is allowed.
3. **Portrait compression gate**: every used portrait must be compressed into `assets/portraits/thumb/` and preferably `assets/portraits/card/`. `node.image` must point to `thumb/`, not to the raw uploaded image.
4. **Background gate**: use a user-provided local background when available. If missing, use CSS/Three.js procedural dark background or existing neutral starter background; do not generate or fetch one remotely.
5. **Theme reset gate**: remove prior-world text, colors, decorative motifs, and hardcoded IDs unless continuing that exact world.
6. **Verification gate**: check syntax, data import, local serving, asset URLs, view/subgraph layout coverage, and at least one visible route where local node images/background assets load.

Final updates should mention the local asset pass, portrait compression pass, background source, and verification status. If any image is missing, say which local assets were not found or were ambiguous.

## Forbidden In This Fast Variant

Do not do any of the following unless the user explicitly switches to the full asset-acquisition workflow:

- Wikimedia Commons API search
- Wikipedia PageImages fallback
- Neta image generation
- Neta character avatar search
- Web search for images
- Hotlinking remote CDN images
- Downloading random fan art, official art, posters, screenshots, covers, cosplay, merchandise, or logo images
- Asking the user to authenticate Neta just to build this graph

If the user asks for missing images to be generated or searched, say this fast skill intentionally avoids external image acquisition and ask whether to switch to the full `narrative-relationship-graph` workflow.

## Default Execution Order

Use this order for new fast builds:

1. Identify or create the project folder, usually `/workspace/<story>-relationship-graph`.
2. Copy/adapt `template.html` and `examples/starter/` as the implementation skeleton.
3. Scan local Space/workspace assets and write `reports/local-asset-pass.json`.
4. Build the node/edge/view data with descriptions and meaningful relations.
5. Match local portraits/backgrounds/icons to nodes.
6. Compress every used portrait into `assets/portraits/thumb/` and `assets/portraits/card/`.
7. Wire compressed local assets into data: `node.image = "./assets/portraits/thumb/<id>.webp"` and `node.imageCard = "./assets/portraits/card/<id>.webp"`.
8. Reset the visual theme using CSS/Three.js tokens and local background if available.
9. Update cache-busting versions in `index.html`, `app.js`, `src/main.js`, and `BUILD_ID`.
10. Run syntax, import-level data, layout, and local HTTP asset checks.
11. Share/publish only after verifying local assets return 200.

## Base Template

Use the standalone HTML shell bundled with this skill as the entry template:

```text
template.html
```

Use `examples/starter/` as the default project skeleton for new worlds. Replace only dataset, title, copy, colors, local assets, and theme CSS needed for the new world.

Do not copy story-specific content from `examples/reference/` into unrelated worlds.

Default preview URL:

```text
http://127.0.0.1:8824/
```

If the server is not running, start it from the project root:

```bash
python3 -m http.server 8824
```

When changing JS or CSS, update cache-busting versions in:

- `index.html`
- `app.js`
- `src/main.js`
- `BUILD_ID` in `src/main.js`

## Data Model

Represent a narrative world with nodes, edges, and views.

### Nodes

Use stable lowercase IDs. Prefer short semantic IDs over display labels.

```js
{
  id: "core-character",
  label: "中心角色",
  type: "character",
  zone: "character",
  faction: "main-camp",
  importance: 100,
  aliases: ["别名", "English Name"],
  description: "关系网的叙事中心，连接主要人物、关键事件和核心阵营。简介说明该角色为什么是理解全图的入口。",
  image: "./assets/portraits/thumb/core-character.webp",
  imageCard: "./assets/portraits/card/core-character.webp",
  imageSource: "local:/workspace/uploads/core-character.png",
  imageCredit: "User-provided Space asset"
}
```

Every node should include a 50-100 Chinese character `description` explaining why the node matters in the graph: role, faction/camp, event function, symbolic meaning, or key conflict.

Recommended node types:

- `character`: people or intelligent roles
- `event`: plot events, battles, turning points, incidents
- `faction`: organizations, families, political groups, schools, houses, camps
- `place`: geography, cities, buildings, regions
- `object`: artifacts, weapons, documents, clues, heirlooms

Recommended zones:

- `character`: characters
- `event`: events or timeline nodes
- `world`: factions, places, objects, institutions, geography

### Edges

Use relation labels as readable verbs or short phrases. Do not use vague labels like “related”.

```js
{ source: "core-character", target: "core-faction", label: "归属", relation: "character-world" }
```

Supported relation classes:

- `character-character`: friendship, rivalry, kinship, mentorship, romance, protection
- `character-event`: participation, victim, witness, planner, betrayer, killer, defender
- `event-event`: timeline, escalation, cause/effect, foreshadowing, consequence
- `character-world`: faction, family, school, office, object ownership, place association
- `event-world`: event location, participating organization, contested object
- `world-world`: institution hierarchy, family alliance, geography containment, artifact category

### Directional Perspectives

When A's view of B differs from B's view of A, keep one visual edge but add `perspectives`:

```js
{
  source: "character-a",
  target: "character-b",
  label: "非对称关系",
  relation: "character-character",
  perspectives: [
    { from: "character-a", to: "character-b", label: "信任/保护" },
    { from: "character-b", to: "character-a", label: "怀疑/利用" }
  ]
}
```

Show perspectives in clicked-node cards, not as always-on visual clutter.

## Relationship Writing Rules

Follow this sequence:

1. Start with the root character/faction/event.
2. Add core characters directly related to the root.
3. Add faction/family/school affiliations early.
4. Add major events only after the character/faction skeleton is clear.
5. Add places and objects as supporting context.
6. Add event-event timeline edges last.

For each edge, ask:

- Can the user understand the relation from the label alone?
- Is the relation important enough to show visually?
- Does it explain faction, conflict, timeline, or causality?

Use faction edges heavily:

```js
{ source: "character", target: "faction", label: "归属", relation: "character-world" }
{ source: "event", target: "faction", label: "参战", relation: "event-world" }
```

## Views And Subgraphs

Always prefer a default overview plus independent subgraphs over one giant graph.

Recommended top-level sections:

```text
总览 / 人物 / 阵营 / 事件 / 世界
```

A subgraph should have:

- `id`: stable view ID
- `label`: UI label
- `rootId`: subgraph center
- `include`: explicit node IDs or `all`

Each subgraph should answer a clear question:

- Who belongs to this camp?
- What happened in this event?
- How does this family connect?
- Which objects drive the plot?

## Visual Encoding Rules

Use visual channels consistently:

- Node color: primary faction / force / camp
- Node size: importance and layer
- Node position: narrative structure and subgraph layout
- Edge color: relationship class, low-saturation by default
- Edge labels: hidden by default; show only on hover/focus/selection for direct highlighted relationships unless user requests otherwise
- Highlighting: related nodes/edges stay readable; unrelated graph fades hard

Avoid:

- Dumping every node into one unreadable graph
- Showing all edge labels by default
- Random rainbow colors
- Decorative UI that competes with the graph
- Info cards that exceed viewport without scroll protection

## Theme Rules For Fast Builds

Because no remote generation is allowed, build the theme from:

1. user-provided background if available;
2. CSS gradients / procedural atmosphere;
3. faction colors from data;
4. small non-interfering decorative elements.

Theme brief should include:

- Narrative mood
- Palette: 3-5 colors tied to the world/factions
- Typography direction
- Background atmosphere
- Node material metaphor
- Decorative elements

Update at least:

- HTML title and `aria-label`
- Dataset key/imports/root ID/view labels
- Node/faction color palette
- Background and decorative CSS
- Card tone, image treatment, label style
- Any hardcoded prior-world text or IDs

## Portrait Compression Workflow

Do not point graph nodes at raw uploaded images. Compress used portraits into two tiers:

- `assets/portraits/thumb/<node-id>.webp`: 256×256, WebP quality around 75, used by `node.image`
- `assets/portraits/card/<node-id>.webp`: 512×512, WebP quality around 80, used by `node.imageCard`

Use the bundled helper from the graph project root:

```bash
python3 /workspace/skills/narrative-relationship-graph-space-assets/tools/compress_portraits.py assets/portraits
```

If running from the original full-skill path, adjust the helper path accordingly. The compression crop should be top-center square to preserve heads.

After compression, update data like this:

```js
{
  id: "core-character",
  image: "./assets/portraits/thumb/core-character.webp",
  imageCard: "./assets/portraits/card/core-character.webp",
  imageSource: "local:/workspace/uploads/core-character.png",
  imageCredit: "User-provided Space asset"
}
```

Verification must include checking representative `thumb/` and `card/` files return 200 locally.

## Local Asset Matching Helper Pattern

For fast builds, you may create a small script under `tools/` or run inline Python to generate `reports/local-asset-pass.json` and copy selected raw portraits into `assets/portraits/` before compression.

Recommended matching output shape:

```json
{
  "assetRootsScanned": ["/workspace/uploads", "/workspace/assets"],
  "summary": { "used": 12, "missing": 3, "ambiguous": 1, "rejected": 0 },
  "items": [
    {
      "nodeId": "core-character",
      "label": "中心角色",
      "aliases": ["别名"],
      "candidates": ["/workspace/uploads/core-character.png"],
      "selected": "/workspace/uploads/core-character.png",
      "decision": "used",
      "reason": "exact node id match in portraits folder",
      "rawLocalPath": "assets/portraits/core-character.png",
      "thumbPath": "assets/portraits/thumb/core-character.webp",
      "cardPath": "assets/portraits/card/core-character.webp"
    }
  ]
}
```

## Verification

After edits, run syntax checks:

```bash
node --check src/main.js
node --check src/core/graph.js
node --check src/core/state.js
node --check src/data/<story>.js
node --check app.js
```

Run an import-level data validation pass:

```bash
node --input-type=module <<'JS'
import { DATASET, GRAPH_VIEWS, TYPE_META } from './src/data/<story>.js';
import { createGraphState } from './src/core/state.js';

const ids = new Set(DATASET.nodes.map((node) => node.id));
const badEdges = DATASET.edges.filter((edge) => !ids.has(edge.source) || !ids.has(edge.target));
const emptyDescriptions = DATASET.nodes.filter((node) => !node.description);
if (badEdges.length) throw new Error(`Bad edge endpoints: ${JSON.stringify(badEdges.slice(0, 5))}`);
if (emptyDescriptions.length) throw new Error(`Missing descriptions: ${emptyDescriptions.map((n) => n.id).join(', ')}`);

const state = createGraphState({ ...DATASET, views: GRAPH_VIEWS }, TYPE_META);
for (const section of GRAPH_VIEWS) {
  for (const view of section.children ?? []) {
    state.setActiveView(view.id);
    const nodes = state.getNodes();
    const edges = state.getEdges();
    const missingPositions = nodes.filter((node) => !state.getNodePosition(node.id));
    if (!nodes.length) throw new Error(`Empty view: ${view.id}`);
    if (!edges.length) throw new Error(`Empty edges in view: ${view.id}`);
    if (missingPositions.length) throw new Error(`${view.id} missing positions: ${missingPositions.map((n) => n.id).join(', ')}`);
  }
}
console.log('VALIDATED', DATASET.nodes.length, DATASET.edges.length);
JS
```

Check local serving:

```bash
python3 -m http.server 8824
curl -I 'http://127.0.0.1:8824/?v=<cache-version>'
curl -I 'http://127.0.0.1:8824/assets/portraits/thumb/<node-id>.webp'
```

Asset verification checklist:

- Local asset pass completed and stored in `reports/local-asset-pass.json`.
- Important character portraits are selected from local Space/workspace files or recorded as missing/ambiguous.
- No Wikimedia/Neta/web image acquisition was used.
- Every used portrait is compressed and `node.image` points to `assets/portraits/thumb/`.
- `imageSource` uses `local:<original path>` or an equivalent local provenance string.
- Background is local or procedural; no generated/remote background.
- Syntax checks pass.
- Import-level validator passes.
- Layout coverage passes: every node has a position and no non-root node stacks at `(0,0)`/root.
- Local HTTP returns 200 for page, background if used, and representative portraits.
- Cache-busting versions changed.

## Common Failure Modes

- **Missing user images**: do not search externally. Record missing local asset and keep node visible without image.
- **Ambiguous filenames**: do not guess silently. Record candidates and ask user for clearer naming if needed.
- **Raw images wired directly**: wrong. Copy to `assets/portraits/`, compress, and point data to `thumb/`.
- **Large uploaded images slow the graph**: compression is mandatory.
- **Old theme remains**: search for prior story names and replace visible text/decor.
- **Many nodes stack on root**: run layout coverage validation and fix zones/layout.
- **All edge labels visible**: restore hover/focus behavior unless user requested always-on labels.
- **Info card shows QA logs**: keep provenance and QA in report files, not normal user-facing cards.
- **Background not visible**: if using local background, load it through Three.js `scene.background` or ensure CSS background is not hidden by WebGL canvas.

## Final Response Format

When delivering a fast graph, keep the final update concise and include:

- Project path
- Preview/share URL if available
- Node/edge/view counts
- Local asset pass summary: used / missing / ambiguous
- Portrait compression summary
- Background source: local file or procedural
- Verification summary
- Any missing/ambiguous asset names the user may want to add later
