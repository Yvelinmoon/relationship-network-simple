# Narrative Relationship Graph — Space Assets Fast Variant

Fast Cohub skill for building interactive narrative / character relationship graphs from user-provided local Space assets.

This variant intentionally removes external image acquisition:

- no Wikimedia image pass
- no Wikipedia image fallback
- no Neta image generation
- no Neta character avatar search
- no web image search

Character portraits, backgrounds, icons, and object images should come from files already present in the current Space / workspace. Missing assets are reported instead of fetched.

Main skill file: `SKILL.md`
