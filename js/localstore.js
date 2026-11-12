// Stand-in for Firebase used only for testing (open the page with ?local). Tabs of one browser share it.
export async function makeStore(){
  const bc=new BroadcastChannel("mock"),subs=[],mem={};
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith("mock:"))mem[k.slice(5)]=JSON.parse(localStorage.getItem(k))}
  const read=p=>p in mem?structuredClone(mem[p]):null;
  const fire=p=>subs.slice().forEach(s=>s(p));bc.onmessage=e=>{mem[e.data.p]=e.data.d;fire(e.data.p)};
  const write=(p,d)=>{mem[p]=structuredClone(d);localStorage.setItem("mock:"+p,JSON.stringify(d));fire(p);bc.postMessage({p,d})};
  const uid=sessionStorage.mockUid||(sessionStorage.mockUid="u"+Math.random().toString(36).slice(2,10));
  const sub=f=>{subs.push(f);return()=>subs.splice(subs.indexOf(f),1)};
  return{uid,
    get:async p=>read(p),set:async(p,d)=>write(p,{...(read(p)||{}),...d}),
    watch:(p,cb)=>{setTimeout(()=>cb(read(p)));return sub(q=>{if(q===p)cb(read(p))})},
    query:(coll,field,val,cb)=>{const run=()=>cb(Object.keys(mem).filter(k=>k.startsWith(coll+"/")&&mem[k]&&mem[k][field]===val).map(k=>({id:k.slice(coll.length+1),...structuredClone(mem[k])})));
      setTimeout(run);return sub(q=>{if(q.startsWith(coll+"/"))run()})},
    tx:async(p,fn)=>{const nd=fn(read(p));if(nd===undefined)return false;write(p,nd);return true},
    add:async(coll,d)=>{const id=Math.random().toString(36).slice(2,12);write(coll+"/"+id,d);return id}};
}
