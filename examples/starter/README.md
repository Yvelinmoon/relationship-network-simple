# Relationship Network Simple Starter

Neutral starter project for pure character-to-character relationship networks.

Use this folder when creating a new character network from local Space portraits.

## Create a new character network

```bash
cp -r /workspace/skills/narrative-relationship-graph-space-assets/examples/starter /workspace/<new-character-network>
cd /workspace/<new-character-network>
cp /workspace/skills/narrative-relationship-graph-space-assets/template.html index.html
```

Then:

1. Replace `src/data/story.js` with `src/data/<story>.js`.
2. Keep every node as `type: "character"` and `zone: "character"`.
3. Keep every edge as `relation: "character-character"`.
4. Update `src/main.js` import from `./data/story.js` to `./data/<story>.js`.
5. Update `index.html` title and `aria-label`.
6. Copy selected local portraits into `assets/portraits/` directly.
7. Use the copied portraits in data:

```js
image: "./assets/portraits/<character-id>.<ext>"
```

## Design assumptions

- Layout is character-only and data-driven from `importance`, graph degree, and view root.
- Optional character colors come from `DATASET.characterGroups` and `node.group`.
- `node.image` should point to a local file copied into the project.
- No portrait resizing or compression step is used in this simple starter.
