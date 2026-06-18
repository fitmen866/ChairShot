# AI Game Art Assets

These assets were generated with the built-in image generation tool, then chroma-key cut out locally.

Generated source:

- `ai-sprite-sheet-chromakey.png`: original AI-generated sprite sheet on green chroma-key background.
- `ai-sprite-sheet.png`: transparent sprite sheet after chroma-key removal.

Trimmed transparent sprites used by the game:

- `ai-gamer-chair.png`
- `ai-sitting-gamer-chair.png`
- `ai-spring-chair.png`
- `ai-noodles.png`
- `ai-monitor-desk.png`

Cutout workflow:

```text
Built-in image generation -> green chroma-key sprite sheet -> remove_chroma_key.py -> transparent PNG sprites
```

Final prompt summary:

```text
Create a funny Bilibili-style 2D cartoon game sprite sheet on a perfectly flat #00ff00 chroma-key background. Include separate assets for a goofy gamer stretching backward in an office chair, a springy reclining chair back, a red instant noodles projectile, and a computer monitor target on a desk. Use polished game-ready cartoon art, chunky black outlines, exaggerated expressions, bright colors, generous padding, no text, no logos, no watermark, no shadows, and no #00ff00 in the sprites.
```

Additional transition sprite:

```text
Create a matching new sprite of the same cartoon gamer and same spring office chair, but with the gamer suddenly sitting upright after leaning back. Keep the spiky dark brown hair, yellow T-shirt with the small chest graphic, blue shorts, white socks, black/red chair, bold outlines, and glossy cartoon shading consistent with ai-gamer-chair.png. Generate on a flat #00ff00 chroma-key background for local cutout.
```
