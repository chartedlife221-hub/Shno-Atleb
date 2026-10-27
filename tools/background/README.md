# The wall

`make.py` generates the background: a seamless lime-plaster texture (multiplied over the theme's `--wall`
colour), the patch of window light on it, and two layers of plant-leaf shadows that sway gently.
Everything is procedural (numpy/OpenCV), so it is original, sharp at any resolution (the plaster tile is
1536 px shown at 768 CSS px) and small (~400 KB total).

Run: `python3 tools/background/make.py public/media`

The image URLs live in `public/env.css` (served as files; the bundler would inline them as data: URIs,
which the CSP blocks). Layering and motion are in `src/styles/main.css` under "the room".
