---
name: relationship-network-simple
description: Use when the user wants to quickly build or update a pure character-to-character relationship network using pre-provided character portrait assets from the current Cohub Space or workspace files. This simple variant only creates character nodes and character-to-character edges, uses local portraits directly, and does not fetch, generate, or compress images.
metadata:
  short-description: Fast character relationship network from Space portraits
---

# Relationship Network Simple

This skill builds a **pure character relationship network** from local Space/workspace portraits.

It is intentionally narrow and fast:

- character nodes only
- character-to-character relationships only
- user-provided local portraits only
- no external image search
- no generated images
- no image compression step

Use this skill when speed matters and the user has already provided the character materials.

## Use This Skill When

Use this skill when the user asks for a fast character relationship page and has already provided character assets, for example:

- “角色图都在 space 文件夹里，直接用这些做关系网”
- “不要搜图，素材我都给好了”
- “尽快做一个人物关系网，图片从当前 Space 文件里拿”
- “只做角色关系”
- “用本地头像做角色关系图”

The output is an interactive browser page showing characters as nodes and relationships as edges.

## Scope Rules

### Allowed

- Character nodes
- Character portraits from local Space/workspace files
- Character-to-character edges
- Relationship labels such as `朋友`, `亲人`, `师徒`, `敌对`, `竞争`, `保护`, `爱慕`, `同伴`, `利用`, `误解`
- Directional perspectives inside relationship data when the two characters see the relationship differently
- Overview plus smaller character-only subgraphs
- Local/procedural visual theme

### Not Allowed

- Non-character nodes
- Non-character edges
- External image fetching
- External image generation
- Remote portrait hotlinking
- Image compression / resizing workflow

If the user asks for a broader graph, ask whether to switch to a different skill before proceeding.

## Default Size

If the user does not specify scale, build a compact first version:

- 8-16 character nodes
- 12-35 character relationships
- 2-5 character-only views

Use a larger graph only when the user explicitly asks or provides a large structured cast list.

## Local Portrait Rules

Character portraits must come from files already present in the current Space/workspace. To keep generation fast, use the provided image files directly after copying them into the project.

Recommended layout:

```text
/workspace/<assets>/
  portraits/
    character-id.png
    character-id.jpg
  characters/
    another-character.webp
```

Loose layouts are also acceptable:

```text
/workspace/uploads/*
/workspace/assets/*
/workspace/**/*.{png,jpg,jpeg,webp,gif}
```

Before building, scan local images. Avoid large unrelated folders such as `/public`, `.git`, `node_modules`, and build caches.

Create:

```text
reports/local-portrait-pass.json
```

The report should include:

- scanned roots
- each important character id / label
- candidate local files
- selected local file, if any
- decision: `used`, `missing`, `ambiguous`, or `rejected`
- reason
- copied project path used by `node.image`

## Portrait Matching

Match portraits by:

1. exact character id: `character-id.webp`
2. normalized label: `角色名.png`, `character_name.jpg`
3. aliases in node data: `aliases: ["别名", "English Name"]`
4. folder hints: `portraits/`, `characters/`, `头像/`, `角色/`

Normalize Latin filenames by lowercasing and removing spaces, punctuation, hyphens, underscores, and brackets. For Chinese/Japanese names, prefer exact substring matches.

If multiple candidates remain, do not guess silently. Mark the character as `ambiguous` and mention candidates in the final summary.

## Non-Negotiable Gates

Before delivery, pass or explicitly report these gates:

1. **Character data gate**: every node is `type: "character"` and `zone: "character"`, has a stable id, display label, 50-100 Chinese character description, and optional aliases.
2. **Relationship gate**: every edge is `relation: "character-character"`, connects two existing character nodes, and has a meaningful label.
3. **Local portrait gate**: important characters use local portraits or have a `missing/ambiguous/rejected` entry in `reports/local-portrait-pass.json`.
4. **Direct local image gate**: used portraits are copied into the project, usually under `assets/portraits/`, and `node.image` points directly to that local copied file.
5. **Theme cleanup gate**: no previous story names or unrelated UI copy remain visible.
6. **Verification gate**: syntax checks, import validation, layout coverage, initial camera focus, and local HTTP asset checks pass.

Final response must mention:

- project path
- preview/share URL if available
- character count
- relationship count
- view count
- local portrait pass summary
- missing/ambiguous portraits, if any
- verification result

## Default Build Order

1. Create or copy the project folder, usually `/workspace/<story>-character-network`.
2. Copy/adapt `template.html` and `examples/starter/`.
3. Define character nodes and character-to-character edges.
4. Create character-only views.
5. Scan local portraits and write `reports/local-portrait-pass.json`.
6. Copy selected portrait files into `assets/portraits/` without resizing or compression.
7. Wire `image`, `imageSource`, and `imageCredit` into character nodes.
8. Apply a simple visual theme.
9. Update cache-busting versions.
10. Run verification.
11. Publish/share if requested.

## Base Template

Use the bundled `template.html` as the HTML shell and `examples/starter/` as the implementation skeleton.

Default preview URL:

```text
http://127.0.0.1:8824/
```

Start a local server from the project root when needed:

```bash
python3 -m http.server 8824
```

When changing JS or CSS, update cache-busting versions in:

- `index.html`
- `app.js`
- `src/main.js`
- `BUILD_ID` in `src/main.js`

## Data Model

### Character Node

```js
{
  id: "core-character",
  label: "中心角色",
  type: "character",
  zone: "character",
  importance: 100,
  aliases: ["别名", "English Name"],
  description: "关系网的中心人物，连接主要亲友、竞争者和敌对者。简介应说明其性格位置、关系压力与浏览入口作用。",
  image: "./assets/portraits/core-character.png",
  imageSource: "local:/workspace/uploads/core-character.png",
  imageCredit: "User-provided Space portrait"
}
```

Every node must be a character node.

### Character Relationship Edge

```js
{
  source: "core-character",
  target: "friend-character",
  label: "挚友/互相保护",
  relation: "character-character"
}
```

Use direct readable labels. Avoid vague labels like `相关` or `认识` unless that is truly the only known relation.

### Directional Perspectives

Use `perspectives` when each side understands the relationship differently:

```js
{
  source: "character-a",
  target: "character-b",
  label: "非对称情感",
  relation: "character-character",
  perspectives: [
    { from: "character-a", to: "character-b", label: "爱慕并主动靠近" },
    { from: "character-b", to: "character-a", label: "信任但未回应恋情" }
  ]
}
```

Keep one visual edge; show directional detail in the clicked character card.

## Writing Relationships

Build from the center outward:

1. Pick the central character.
2. Add closest allies and family-like ties.
3. Add rivals and enemies.
4. Add mentors, protectors, dependents, admirers, and manipulators.
5. Add secondary characters only if their relationship clarifies the central network.

For each edge, ask:

- Does the label explain the relationship by itself?
- Is this relationship important enough to show visually?
- Does it help users understand loyalty, conflict, affection, dependence, rivalry, or betrayal?

## Views

Use character-only views. Recommended structure:

```text
总览 / 核心人物 / 亲密关系 / 冲突关系
```

Examples:

```js
export const GRAPH_VIEWS = [
  {
    id: "overview",
    label: "总览",
    children: [
      { id: "overview-all", label: "全部角色", rootId: "core-character", include: "all" }
    ]
  },
  {
    id: "characters",
    label: "人物",
    children: [
      { id: "core-circle", label: "核心圈", rootId: "core-character", include: ["core-character", "friend", "rival"] },
      { id: "conflicts", label: "冲突线", rootId: "core-character", include: ["core-character", "rival", "enemy"] }
    ]
  }
];
```

Subgraphs must contain only character nodes and character-character edges.

## Visual Rules

- Node size encodes character importance.
- Node color may encode relationship grouping if useful, but do not create grouping nodes.
- Node position should keep the central character readable.
- Edge labels are hidden by default and appear only on hover/focus/selection for directly highlighted relationships unless the user asks otherwise.
- Clicked character cards should show the portrait, description, relation count, and up to 5-8 representative relationships.
- Keep unrelated nodes faded during focus.

Avoid dense unreadable hairballs. If there are too many characters, create smaller character-only subgraphs.

## Local Image Wiring

Use the selected local portrait files directly. Copy them into the project to make the static page self-contained:

```text
assets/portraits/<character-id>.<ext>
```

Data wiring:

```js
image: "./assets/portraits/<character-id>.<ext>",
imageSource: "local:/workspace/uploads/<original-file>",
imageCredit: "User-provided Space portrait"
```

Use only the copied local portrait file in this simple workflow.

## Verification

Run syntax checks:

```bash
node --check app.js
node --check src/main.js
node --check src/core/graph.js
node --check src/core/state.js
node --check src/data/<story>.js
```

Run import-level validation:

```bash
node --input-type=module <<'JS'
import { DATASET, GRAPH_VIEWS, TYPE_META } from './src/data/<story>.js';
import { createGraphState } from './src/core/state.js';

const ids = new Set(DATASET.nodes.map((node) => node.id));
const nonCharacters = DATASET.nodes.filter((node) => node.type !== 'character' || node.zone !== 'character');
const badEdges = DATASET.edges.filter((edge) => !ids.has(edge.source) || !ids.has(edge.target));
const nonCharacterEdges = DATASET.edges.filter((edge) => edge.relation !== 'character-character');
const emptyDescriptions = DATASET.nodes.filter((node) => !node.description);
if (nonCharacters.length) throw new Error(`Non-character nodes: ${nonCharacters.map((n) => n.id).join(', ')}`);
if (badEdges.length) throw new Error(`Bad edge endpoints: ${JSON.stringify(badEdges.slice(0, 5))}`);
if (nonCharacterEdges.length) throw new Error(`Non-character relationships: ${JSON.stringify(nonCharacterEdges.slice(0, 5))}`);
if (emptyDescriptions.length) throw new Error(`Missing descriptions: ${emptyDescriptions.map((n) => n.id).join(', ')}`);

const state = createGraphState({ ...DATASET, views: GRAPH_VIEWS }, TYPE_META);
for (const section of GRAPH_VIEWS) {
  for (const view of section.children ?? []) {
    state.setActiveView(view.id);
    const nodes = state.getNodes();
    const edges = state.getEdges();
    const missingPositions = nodes.filter((node) => !state.getNodePosition(node.id));
    if (!nodes.length) throw new Error(`Empty view: ${view.id}`);
    if (nodes.some((node) => node.type !== 'character')) throw new Error(`Unexpected node in view: ${view.id}`);
    if (edges.some((edge) => edge.relation !== 'character-character')) throw new Error(`Unexpected edge in view: ${view.id}`);
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
curl -I 'http://127.0.0.1:8824/assets/portraits/<character-id>.<ext>'
```

Verification checklist:

- All nodes are characters.
- All relationships are character-character.
- Local portrait pass exists.
- Used portraits are copied locally and wired directly through `node.image`.
- Missing portraits are reported, not fetched.
- No external image acquisition was used.
- No compression/resizing step was used.
- Initial camera starts at overview distance and immediately focuses on the active root character.
- Local HTTP returns 200 for the page and representative portraits.
- Cache-busting versions changed.

## Common Failure Modes

- **The graph includes non-character nodes**: remove them or switch to another workflow.
- **The page tries to search or generate images**: stop; this skill only uses user-provided local portraits.
- **The workflow starts resizing portraits**: stop; this simple version wires copied local portraits directly.
- **Portrait names are ambiguous**: record candidates and ask for clearer filenames.
- **Initial page feels too close or off-center**: use the starter overview camera and immediately focus the active root after graph build.
- **All relationship labels are visible**: restore hover/focus behavior unless the user requests always-on labels.
- **Character card is too long**: show only the most useful 5-8 direct relationships.

## Final Response Format

Keep final updates concise:

```text
已完成角色关系网：
- 项目：<path>
- 预览：<url>
- 角色：N
- 关系：M
- 视图：K
- 本地头像：used / missing / ambiguous
- 验证：passed
```
