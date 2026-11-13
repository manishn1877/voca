const fs=require('fs'); const M=require('../public/lib/gmodel.js');
const [,, inp, out, aug] = process.argv;
const lf=JSON.parse(fs.readFileSync(__dirname+'/lexfam.json')); M.setData({lex:lf.lex,fam:lf.fam});
const data=JSON.parse(fs.readFileSync(inp));
let seed=12345; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff;};
const syl=['blor','zint','quam','drel','fomp','tuvi','kesh','nabo','wrix','plam','gorv','sith'];
const pseudo=()=>syl[Math.floor(rnd()*12)]+syl[Math.floor(rnd()*12)];
const fd=fs.openSync(out,'w');let cnt=0;
for(const s of data){
  let ws=s.w.slice();
  if(aug==='1'){
    const {tags}=M.tagSeq(ws);
    ws=ws.map((w,i)=>{ if(s.l[i]!=='OK'||rnd()>0.28) return w; const t=tags[i];
      if(t==='N_SG') return pseudo(); if(t==='N_PL') return pseudo()+'s'; if(t==='V_ING') return pseudo()+'ing';
      if(t==='V_PAST') return pseudo()+'ed'; if(t==='V_3SG') return pseudo()+'s'; if(t==='V_BASE') return pseudo(); if(t==='ADJ') return pseudo()+'ful'; return w;});
  }
  const {tags,unk}=M.tagSeq(ws);
  for(let i=0;i<ws.length;i++) {fs.writeSync(fd,JSON.stringify([s.l[i],M.feats(ws,tags,unk,i)])+'\n');cnt++;}
}
fs.closeSync(fd);console.log(cnt,'tokens');
