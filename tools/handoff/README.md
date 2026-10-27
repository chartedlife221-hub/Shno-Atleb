# Hand-off cut-outs

How `public/media/handoff-*.{mp4,webm}` were made from the source clips. Not part of the site build.

1. Frames to `<clip>.npy` (BGR, native size) with ffmpeg.
2. `masks.py <clip> <first> <last>`: per-frame matte. ISNet (general salient object) finds the cup and hand; for
   the hot clip, U²-Net human segmentation adds the arm (only confident pixels). Models: rembg's
   `isnet-general-use.onnx` and `u2net_human_seg.onnx` (GitHub releases of danielgatis/rembg).
3. `post.py <clip> <first>`: 3-frame temporal median, keep the main subject, fill holes, guided-filter edges,
   then write stacked frames: colour / alpha matte / background with the subject inpainted (8 px gaps).
4. `enc.sh <clip>`: H.264 (Safari/iOS) and VP9 encodes with short keyframe spacing, plus the still fallbacks
   `handoff-<clip>-fg.png` (RGBA at the peak) and `handoff-<clip>-bg.jpg`.

Spanish latte: `human.py` adds the forearm (U²-Net human) so the wrist continues into the arm and fades softly instead of ending in a cut.

Frames used: hot 165–300, iced 70–245, Spanish latte 50–235, caramel frappuccino 0–191 at 540×960 (23.976 fps; thin wisps removed, 24 px black border trimmed). Peak times are in `src/ui/clips.ts`.
