import numpy as np, cv2, sys, time, os
sys.path.insert(0,'/tmp/seg')
from seg2 import M
from seg import mask as isnet
clip=sys.argv[1]; a,b=int(sys.argv[2]),int(sys.argv[3])
fr=np.load(f'{clip}.npy',mmap_mode='r')
human=M('/tmp/models/u2net_human_seg.onnx',320,'imagenet') if clip=='hot' else None
out=[]
t0=time.time()
for i in range(a,b+1):
    f=np.array(fr[i])
    m=isnet(f)
    if human is not None:
        hm=human(f)
        m=np.maximum(m, np.clip((hm-0.55)/0.3,0,1))
    out.append((m*255).astype(np.uint8))
    if (i-a)%10==0: print(clip,i,round(time.time()-t0),flush=True)
np.save(f'{clip}_raw.npy',np.stack(out))
print('done',clip,flush=True)
