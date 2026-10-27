import numpy as np, sys
sys.path.insert(0,'/tmp/seg')
from seg2 import M
clip=sys.argv[1]; a,b=int(sys.argv[2]),int(sys.argv[3])
fr=np.load(f'{clip}.npy',mmap_mode='r'); h=M('/tmp/models/u2net_human_seg.onnx',320,'imagenet')
np.save(f'{clip}_human.npy',np.stack([(h(np.array(fr[i]))*255).astype(np.uint8) for i in range(a,b+1)])); print('done',flush=True)
