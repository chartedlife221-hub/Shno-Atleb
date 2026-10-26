set -e
id=$1; D=/home/claude/shno-atleb/public/media
ffmpeg -v error -y -framerate 24000/1001 -i out_$id/%04d.png -c:v libx264 -preset slow -crf 21 -g 2 -keyint_min 1 -pix_fmt yuv420p -movflags +faststart $D/handoff-$id.mp4
ffmpeg -v error -y -framerate 24000/1001 -i out_$id/%04d.png -c:v libvpx-vp9 -b:v 0 -crf 31 -g 3 -row-mt 1 -deadline good -cpu-used 3 -pix_fmt yuv420p $D/handoff-$id.webm
python3 - <<PY
import cv2
im=cv2.imread('/tmp/seg/peak_$id.png',cv2.IMREAD_UNCHANGED)
cv2.imwrite('$D/handoff-$id-fg.png',im,[cv2.IMWRITE_PNG_COMPRESSION,9])
PY
cp bg_$id.jpg $D/handoff-$id-bg.jpg
ls -la $D | grep handoff-$id
