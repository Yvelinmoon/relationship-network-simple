---
name: relationship-network-simple
description: Quickly build a pure character-to-character relationship network from character portraits already provided in the current Space/workspace or as user-provided image URLs. Use provided portraits directly; keep the workflow minimal.
metadata:
  short-description: Simple character relationship network
---

# Relationship Network Simple

Build a simple interactive **character relationship network** as fast as possible.

Use this when the user already provided character portraits in the Space/workspace, or provided direct OSS/CDN image URLs, and wants a browser page showing character nodes and character-to-character links.

## Scope

Keep it simple:

- only character nodes
- only character-to-character edges
- use provided portrait files or OSS/CDN image URLs directly
- do not add extra asset workflows
If a portrait is missing, leave that character without an image and mention it briefly at the end.

## Default Size

If the user does not specify scale, make a compact graph:

- about 8-16 characters
- about 12-35 relationships
- a small overview plus 1-3 useful character subviews

## Fast Workflow

1. Copy `examples/base/` into a new project folder.
2. Replace `src/data/story.js` with the character data.
3. Copy matched local portraits into `assets/portraits/`, or use user-provided OSS/CDN image URLs directly.
4. Set `node.image` to `./assets/portraits/<file>` or the provided image URL.
5. Update page title, aria label, and cache version.
6. Run a quick syntax check and open/serve the page.
7. Share/publish if requested.

## Portrait Matching

Use simple matching:

- exact id filename first, e.g. `luffy.png`
- then character label, e.g. `路飞.png`
- then obvious aliases if present
- if the user provides an OSS/CDN URL for a character, use it directly as `node.image`

If multiple files match, choose the clearest filename or ask the user.

## Data Shape

Character node:

```js
{
  id: "core-character",
  label: "中心角色",
  type: "character",
  zone: "character",
  importance: 100,
  description: "关系网的中心人物，连接主要亲友、竞争者和敌对者。简介说明其在人物关系中的核心作用。",
  image: "./assets/portraits/core-character.png" // or "https://.../core-character.png"
}
```

Relationship edge:

```js
{
  source: "core-character",
  target: "friend-character",
  label: "挚友/互相保护",
  relation: "character-character"
}
```

Optional directional perspective when useful:

```js
perspectives: [
  { from: "character-a", to: "character-b", label: "信任并依赖" },
  { from: "character-b", to: "character-a", label: "保护但有所隐瞒" }
]
```

## Views

Keep views character-only. Common labels:

```text
总览 / 核心圈 / 亲密关系 / 冲突线
```

Subgraphs should just be smaller sets of character IDs.

## Minimal Checks

Before final response, do only the checks needed to avoid a broken page:

```bash
node --check app.js
node --check src/main.js
node --check src/data/<story>.js
```

If practical, start a local server and check the page returns 200:

```bash
python3 -m http.server 8824
curl -I 'http://127.0.0.1:8824/'
```

That is enough for this simple workflow.

## Final Response

Keep final response short:

```text
已完成角色关系网：
- 项目：<path>
- 预览/分享：<url>
- 角色：N
- 关系：M
- 缺失头像：有/无
```
