# Reference Relationship Graph

A three.js-based frontend prototype for exploring an interactive narrative relationship network. The bundled data/theme is Harry Potter, but this directory is named `reference` because it is intended to demonstrate implementation patterns, not to define the default story or theme.

This folder is an implementation example, not the default theme. It demonstrates current expected patterns for the skill:

- Modular Three.js graph code
- Subgraph navigation
- Compact clicked-node cards
- Wikimedia-style node images with graceful fallback
- Neta-generated local background asset in `assets/`
- Robust Three.js `scene.background` texture handling so the background is not hidden by the WebGL canvas

When building a different world, reuse the architecture but replace all Harry Potter data, colors, decorative motifs, labels, and generated assets.

## Run

```bash
npm start
```

Then open `http://127.0.0.1:4174/`.
