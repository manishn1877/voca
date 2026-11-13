import json, numpy as np, scipy.sparse as sp, collections, sys
from sklearn.linear_model import SGDClassifier
def load(p):
    X=[];Y=[]
    for line in open(p):
        y,f=json.loads(line); Y.append(y); X.append(f)
    return X,Y
Xt,Yt=load('train.jsonl'); Xd,Yd=load('dev.jsonl')
cnt=collections.Counter(f for x in Xt for f in x)
vocab={f:i for i,f in enumerate(sorted(f for f,c in cnt.items() if c>=4))}
cls=['OK']+sorted(set(Yt)-{'OK'}); ci={c:i for i,c in enumerate(cls)}
def mat(X):
    r=[];c=[]
    for i,x in enumerate(X):
        for f in x:
            j=vocab.get(f)
            if j is not None: r.append(i);c.append(j)
    return sp.csr_matrix((np.ones(len(r),dtype=np.float32),(r,c)),shape=(len(X),len(vocab)))
A=mat(Xt);B=mat(Xd);yt=np.array([ci[y] for y in Yt]);yd=np.array([ci.get(y,0) for y in Yd])
print(A.shape,cls)
m=SGDClassifier(loss='log_loss',alpha=2e-7,max_iter=25,tol=None,random_state=0,average=True)
m.fit(A,yt)
P=m.predict_proba(B)
pred=P.argmax(1); print('token acc',(pred==yd).mean())
err=yd>0
print('err recall@0.5',((1-P[:,0]>0.5)&err).sum()/err.sum(),'FP rate @0.5',((1-P[:,0]>0.5)&~err).sum()/(~err).sum(), 'FP@0.85',((1-P[:,0]>0.85)&~err).sum()/(~err).sum(),'recall@.85',((1-P[:,0]>0.85)&err).sum()/err.sum())
W=m.coef_; b=m.intercept_; np.save('W.npy',W); np.save('b.npy',b); json.dump({'vocab':vocab,'cls':cls},open('vocab.json','w'))
keep=np.abs(W).max(0)>float(sys.argv[1]) if len(sys.argv)>1 else np.ones(W.shape[1],bool)
inv={i:f for f,i in vocab.items()}
F={inv[j]:[round(float(v),2) for v in W[:,j]] for j in np.where(keep)[0]}
json.dump({'cls':cls,'B':[round(float(v),2) for v in b],'F':F},open('weights.json','w'),separators=(',',':'))
print('features kept',len(F),'of',len(vocab))
