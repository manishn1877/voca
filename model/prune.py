import json, numpy as np, scipy.sparse as sp, sys
W=np.load('W.npy'); b=np.load('b.npy'); V=json.load(open('vocab.json')); vocab=V['vocab']; cls=V['cls']
thr=float(sys.argv[1]); inv={i:f for f,i in vocab.items()}
Wp=np.where(np.abs(W)>=thr,W,0).round(1)
# eval on dev
Xd=[];Yd=[]
for line in open('dev.jsonl'):
    y,f=json.loads(line); Yd.append(cls.index(y) if y in cls else 0); Xd.append(f)
r=[];c=[]
for i,x in enumerate(Xd):
    for f in x:
        j=vocab.get(f)
        if j is not None: r.append(i);c.append(j)
B=sp.csr_matrix((np.ones(len(r),dtype=np.float32),(r,c)),shape=(len(Xd),len(vocab)))
z=B@Wp.T+b; z-=z.max(1,keepdims=True); P=np.exp(z); P/=P.sum(1,keepdims=True)
yd=np.array(Yd); err=yd>0; e=1-P[:,0]
print('recall@.85',((e>.85)&err).mean()/err.mean(),'FP@.85',((e>.85)&~err).sum()/(~err).sum())
F={}
for j in range(W.shape[1]):
    nz=np.nonzero(Wp[:,j])[0]
    if len(nz): F[inv[j]]=[x for k in nz for x in (int(k),float(Wp[k,j]))]
json.dump({'cls':cls,'B':[round(float(v),2) for v in b],'F':F},open('weights.json','w'),separators=(',',':'))
import os; print(len(F),os.path.getsize('weights.json'))
