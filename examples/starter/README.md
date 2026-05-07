# Narrative Relationship Graph Starter

Neutral starter project for new narrative relationship graphs.

Use this folder instead of `examples/reference/` when creating a new world.

## Create a new graph

```bash
cp -r /workspace/skills/narrative-relationship-graph/examples/starter /workspace/<new-graph>
cd /workspace/<new-graph>
cp /workspace/skills/narrative-relationship-graph/template.html index.html
```

Then:

1. Replace `src/data/story.js` with `src/data/<story>.js`.
2. Update `src/main.js` import from `./data/story.js` to `./data/<story>.js`.
3. Update `index.html` title and `aria-label`.
4. Add background at `assets/graph-background.webp` or update `src/core/scene.js` / `#graph-root[data-background]`.
5. Add raw portraits under `assets/portraits/`, then run:

```bash
python3 /workspace/skills/narrative-relationship-graph/tools/compress_portraits.py assets/portraits
```

6. Use compressed images in data:

```js
image: "./assets/portraits/thumb/<node-id>.webp",
imageCard: "./assets/portraits/card/<node-id>.webp"
```

## Design assumptions

- Layout is data-driven: `zone`, `type`, `faction`, `importance`, graph degree, and view root.
- Faction colors are dynamic from `DATASET.factions`.
- `node.image` is assumed to be small and always-loaded.
- `node.imageCard` is optional and used by info cards.
