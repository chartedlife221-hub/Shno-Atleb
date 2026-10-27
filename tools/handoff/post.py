import numpy as np, cv2, sys, os, subprocess
clip=sys.argv[1]; a=int(sys.argv[2])
fr=np.load(f'{clip}.npy',mmap_mode='r')
raw=np.load(f'{clip}_raw.npy').astype(np.float32)/255.
import os
ARM = os.path.exists(f'{clip}_human.npy') and clip=='sl'
if ARM:
    hum=np.load(f'{clip}_human.npy').astype(np.float32)/255.
    obj_only=raw.copy(); ramps=[]
    # wrist/arm continuity: add the forearm (human segmentation) below the top of the glass and left of it,
    # fading out upwards so it blends into the arm left in the background instead of ending in a cut
    yy,xx=np.mgrid[0:raw.shape[1],0:raw.shape[2]]
    K=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25))
    for i in range(len(raw)):
        keep=cv2.dilate(cv2.morphologyEx((raw[i]>0.5).astype(np.uint8),cv2.MORPH_OPEN,K),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))>0
        _ys,_xs=np.nonzero(raw[i]>0.5)
        if len(_xs): keep|=xx>=np.median(_xs)   # wisps only come off the sleeve; keep the straw on the right
        raw[i]*=keep; obj_only[i]=raw[i]
        obj=raw[i]>0.5
        ys,xs=np.nonzero(obj)
        if len(ys)==0: ramps.append(np.ones_like(raw[i])); continue
        top=np.percentile(ys,2); cx=np.median(xs)
        H_=raw.shape[1]
        ramp=np.clip((yy-top)/(0.16*H_),0,1)**1.5*np.clip((cx-xx)/(0.08*raw.shape[2]),0,1)
        ramps.append(ramp)
        arm=np.clip((hum[i]-0.5)/0.3,0,1)*ramp
        raw[i]=np.maximum(raw[i],arm)
n=len(raw); H,W=raw.shape[1:]
out=f'/tmp/seg/out_{clip}'; os.makedirs(out,exist_ok=True)
# temporal median (3) to stop flicker
sm=np.stack([np.median(raw[max(0,i-1):i+2],axis=0) for i in range(n)])
PAD=8
def guided(I,p,r,eps):
    I=cv2.cvtColor(I,cv2.COLOR_BGR2GRAY).astype(np.float32)/255.
    bf=lambda x: cv2.boxFilter(x,-1,(2*r+1,2*r+1))
    mI,mp=bf(I),bf(p); cov=bf(I*p)-mI*mp; var=bf(I*I)-mI*mI
    a=cov/(var+eps); b=mp-a*mI
    return bf(a)*I+bf(b)
for i in range(n):
    f=np.array(fr[a+i])
    m=np.clip((sm[i]-0.3)/0.4,0,1)
    # keep the main subject only
    bw=(m>0.5).astype(np.uint8)
    k,lab,st,_=cv2.connectedComponentsWithStats(bw,8)
    if k>1:
        areas=st[1:,cv2.CC_STAT_AREA]; big=areas.max()
        keep=np.isin(lab,[j+1 for j,ar in enumerate(areas) if ar>=0.15*big])
        reach=cv2.dilate(keep.astype(np.uint8),np.ones((15,15),np.uint8))>0
        m=m*reach
    if clip=='cf':
        # drop thin wisps (stray bits of forearm and the straw) so the cut-out stays one solid hand + glass
        core=cv2.morphologyEx((m>0.5).astype(np.uint8),cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
        m=m*(cv2.dilate(core,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))>0)
    # fill interior holes of the subject
    filled=bw.copy(); cnts,_=cv2.findContours((m>0.5).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    hole=np.zeros_like(bw); cv2.drawContours(hole,cnts,-1,1,-1)
    m=np.maximum(m,cv2.erode(hole,np.ones((5,5),np.uint8)).astype(np.float32))
    # edge-aware refinement guided by the frame
    g=guided(f, m.astype(np.float32), 3, 2e-3)
    m=np.clip((g-0.06)/0.9,0,1)
    if ARM and i < len(ramps):
        # outside the hand+glass the forearm fades softly upward (no hard slab edge, no floating wrist)
        core=cv2.GaussianBlur(np.clip((obj_only[i]-0.3)/0.4,0,1),(0,0),3)
        m=np.minimum(m,np.maximum(core,ramps[i]))
    alpha=(m*255).astype(np.uint8)
    # background with the subject removed (for the in-card window)
    hole=cv2.dilate((m>(0.5 if ARM else 0.06)).astype(np.uint8),np.ones((13,13),np.uint8))
    small=cv2.resize(f,(W//2,H//2)); hs=cv2.resize(hole,(W//2,H//2),interpolation=cv2.INTER_NEAREST)
    bg=cv2.inpaint(small,hs,7,cv2.INPAINT_TELEA)
    bg=cv2.resize(cv2.GaussianBlur(bg,(0,0),1.2),(W,H))
    frame=np.zeros((H*3+PAD*2,W,3),np.uint8)
    frame[:H]=f; frame[H+PAD:2*H+PAD]=cv2.cvtColor(alpha,cv2.COLOR_GRAY2BGR); frame[2*H+2*PAD:]=bg
    cv2.imwrite(f'{out}/{i:04d}.png',frame)
    if i in (0,n//2,n-1):
        chk=np.indices((H,W)).sum(0)//16%2*80+90
        comp=(f*m[...,None]+chk[...,None]*(1-m[...,None])).astype(np.uint8)
        cv2.imwrite(f'/tmp/seg/dbg_{clip}_{i}.png',np.vstack([np.hstack([f,comp]),np.hstack([cv2.cvtColor(alpha,cv2.COLOR_GRAY2BGR),bg])]))
    if i==n-1 or i==int(n*0.85):
        rgba=np.dstack([f,alpha]); cv2.imwrite(f'/tmp/seg/peak_{clip}.png',rgba); cv2.imwrite(f'/tmp/seg/bg_{clip}.jpg',bg,[cv2.IMWRITE_JPEG_QUALITY,80])
print('frames',n)
