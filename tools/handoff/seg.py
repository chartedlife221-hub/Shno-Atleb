import numpy as np, cv2, onnxruntime as ort, sys, time
sess=ort.InferenceSession('/tmp/models/isnet.onnx', providers=['CPUExecutionProvider'])
def mask(bgr):
    h,w=bgr.shape[:2]
    rgb=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB)
    x=cv2.resize(rgb,(1024,1024),interpolation=cv2.INTER_LINEAR).astype(np.float32)/255.
    x=(x-0.5)/1.0  # rembg isnet: mean .5 std 1
    x=x.transpose(2,0,1)[None]
    y=sess.run(None,{'input_image':x})[0][0,0]
    y=(y-y.min())/(y.max()-y.min()+1e-6)
    return cv2.resize(y,(w,h),interpolation=cv2.INTER_LINEAR)
if __name__=='__main__':
    fr=np.load(sys.argv[1]); idx=[int(v) for v in sys.argv[2].split(',')]
    rows=[]
    for i in idx:
        t=time.time(); m=mask(fr[i]); print(i, round(time.time()-t,2))
        vis=fr[i].copy(); vis[m<0.5]=(vis[m<0.5]*0.25).astype(np.uint8)
        rows.append(np.hstack([vis, cv2.cvtColor((m*255).astype(np.uint8),cv2.COLOR_GRAY2BGR)]))
    cv2.imwrite(sys.argv[3], np.vstack(rows))
