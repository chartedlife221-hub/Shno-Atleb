import numpy as np, cv2, onnxruntime as ort, sys, time
MEAN=np.array([0.485,0.456,0.406],np.float32); STD=np.array([0.229,0.224,0.225],np.float32)
class M:
    def __init__(s,path,size,norm):
        s.sess=ort.InferenceSession(path,providers=['CPUExecutionProvider']); s.size=size; s.norm=norm
        s.inp=s.sess.get_inputs()[0].name
    def __call__(s,bgr):
        h,w=bgr.shape[:2]
        x=cv2.resize(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB),(s.size,s.size)).astype(np.float32)/255.
        if s.norm=='imagenet': x=(x-MEAN)/STD
        else: x=x-0.5
        y=s.sess.run(None,{s.inp:x.transpose(2,0,1)[None]})[0][0,0]
        if s.norm=='imagenet' and (y.min()<0 or y.max()>1): y=1/(1+np.exp(-y))
        y=(y-y.min())/(y.max()-y.min()+1e-6)
        return cv2.resize(y,(w,h))
if __name__=='__main__':
    fr=np.load(sys.argv[1],mmap_mode='r'); idx=[int(v) for v in sys.argv[2].split(',')]
    import os
    models={'human':M('/tmp/models/u2net_human_seg.onnx',320,'imagenet')} if os.environ.get('ONLY')=='human' else {'biref':M('/tmp/models/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx',int(os.environ.get('SZ','1024')),'imagenet')}
    rows=[]
    for i in idx:
        cols=[np.array(fr[i])]
        for k,m in models.items():
            t=time.time(); a=m(np.array(fr[i])); print(i,k,round(time.time()-t,2))
            cols.append(cv2.cvtColor((a*255).astype(np.uint8),cv2.COLOR_GRAY2BGR))
        rows.append(np.hstack(cols))
    cv2.imwrite(sys.argv[3],np.vstack(rows))
