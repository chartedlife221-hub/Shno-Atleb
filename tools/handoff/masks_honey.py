import numpy as np, sys, time
sys.path.insert(0,'/tmp/seg')
from seg2 import M
from seg import mask as isnet
fr=np.load('honey.npy',mmap_mode='r'); human=M('/tmp/models/u2net_human_seg.onnx',320,'imagenet')
a,b=0,190; raw=[]; hum=[]; t0=time.time()
for i in range(a,b+1):
    f=np.array(fr[i]); raw.append((isnet(f)*255).astype(np.uint8)); hum.append((human(f)*255).astype(np.uint8))
    if (i-a)%10==0: print(i, round(time.time()-t0), flush=True)
np.save('honey_raw.npy',np.stack(raw)); np.save('honey_human.npy',np.stack(hum)); print('done honey',flush=True)
