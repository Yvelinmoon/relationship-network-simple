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
6. Add raw portraits under `assets/portraits/`, then run:

```bash
python3 /workspace/skills/narrative-relationship-graph-space-assets/tools/compress_portraits.py assets/portraits
```

7. Use compressed portraits in data:

```js
image: "./assets/portraits/thumb/<character-id>.webp",
imageCard: "./assets/portraits/card/<character-id>.webp"
```

## Design assumptions

- Layout is character-only and data-driven from `importance`, graph degree, and view root.
- Optional character colors come from `DATASET.characterGroups` and `node.group`.
- `node.image` should point to a compressed thumb file.
- `node.imageCard` is optional and used by clicked character cards.
