// Carcassonne rules engine. Pure logic, no drawing. Works in the browser and in Node.
export const COUNTS={1:1,2:1,3:4,4:2,5:4,6:3,7:1,8:1,9:2,10:8,11:3,12:2,13:3,14:2,15:9,16:1,17:2,18:3,19:3,20:5,21:2,22:3,23:3,24:4,
  25:1,27:1,28:1,29:2,30:1,31:1,32:1,33:1,34:1,38:1,39:1};
export const START_TILE=24;
const SIDES=["N","E","S","W"],PORTS=["Na","Nb","Ea","Eb","Sa","Sb","Wa","Wb"];
const DX=[0,1,0,-1],DY=[-1,0,1,0];
const oppPort=p=>(p%2===0?p+5:p+3)%8;
let TD=null;
export function setTileData(d){TD=d}
const key=(x,y)=>x+","+y;
// features of a tile at rotation k, with sides/ports as indexes
const cache={};
function feat(t,k){
  const id=t+"."+k;if(cache[id])return cache[id];
  const d=TD[t],rs=s=>(SIDES.indexOf(s)+k)%4,rp=p=>(PORTS.indexOf(p)+2*k)%8;
  return cache[id]={
    c:d.castles.map(c=>({sides:c.sides.map(rs),shield:!!c.shield,cath:!!c.cathedral})),
    p:d.paths.map(p=>p.map(rs)),
    f:d.fields.map(f=>({ports:f.ports.map(rp),castles:f.castles})),
    m:!!d.monastery};
}
export function edgesOf(t,k){const f=feat(t,k),e=["F","F","F","F"];
  f.c.forEach(c=>c.sides.forEach(s=>e[s]="C"));f.p.forEach(p=>p.forEach(s=>e[s]="R"));return e}
export function spotList(t){const d=TD[t],o=[];
  d.castles.forEach((_,i)=>o.push({kind:"c",i}));d.paths.forEach((_,i)=>o.push({kind:"p",i}));
  d.fields.forEach((_,i)=>o.push({kind:"f",i}));if(d.monastery)o.push({kind:"m",i:0});return o}
export function spotPos(t,k,kind,i){const s=TD[t].spots;let p=kind==="m"?s.monastery:s[{c:"castles",p:"paths",f:"fields"}[kind]][i];
  let[x,y]=p;for(let n=0;n<k;n++)[x,y]=[128-y,x];return[x,y]}

export function shuffledBag(rand=Math.random){
  const b=[];for(const t in COUNTS)for(let i=0;i<COUNTS[t]-(+t===START_TILE?1:0);i++)b.push(+t);
  for(let i=b.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}

export function newGame(bag){
  return{board:{[key(0,0)]:{t:START_TILE,k:0}},fols:[],scores:[0,0],left:[7,7],bag:bag.slice(),turn:0,
         best:[{castle:0,path:0},{castle:0,path:0}],over:false,log:[]};
}
export function fits(g,x,y,t,k){
  if(g.board[key(x,y)])return false;const e=edgesOf(t,k);let n=0;
  for(let d=0;d<4;d++){const c=g.board[key(x+DX[d],y+DY[d])];if(!c)continue;n++;if(edgesOf(c.t,c.k)[(d+2)%4]!==e[d])return false}
  return n>0;
}
export function placements(g,t){
  const seen={},out=[];
  for(const kk in g.board){const[x,y]=kk.split(",").map(Number);
    for(let d=0;d<4;d++){const nx=x+DX[d],ny=y+DY[d],id=key(nx,ny);if(seen[id]||g.board[id])continue;seen[id]=1;
      const ks=[0,1,2,3].filter(k=>fits(g,nx,ny,t,k));if(ks.length)out.push({x:nx,y:ny,ks})}}
  return out;
}
// Draw the next tile that can be placed somewhere; unplaceable tiles are discarded. Returns tile id or null (bag empty).
export function draw(g){
  while(g.bag.length){const t=g.bag.shift();if(placements(g,t).length)return t;g.log.push({type:"discard",t})}
  return null;
}
// ---- feature tracing ----
// node = {x,y,kind,i}; returns {nodes,cells(Set),open(number of open edges),shields,cath,castleRefs}
export function trace(g,x,y,kind,i){
  const start=key(x,y)+kind+i,seen=new Set([start]),stack=[{x,y,kind,i}],nodes=[],cells=new Set();
  let open=0,shields=0,cath=false;
  while(stack.length){
    const n=stack.pop();nodes.push(n);cells.add(key(n.x,n.y));
    const c=g.board[key(n.x,n.y)],f=feat(c.t,c.k);
    const push=(nx,ny,k2,i2)=>{const id=key(nx,ny)+k2+i2;if(!seen.has(id)){seen.add(id);stack.push({x:nx,y:ny,kind:k2,i:i2})}};
    if(n.kind==="c"||n.kind==="p"){
      const me=n.kind==="c"?f.c[n.i]:null,sides=n.kind==="c"?me.sides:f.p[n.i];
      if(me){if(me.shield)shields++;if(me.cath)cath=true}
      for(const s of sides){const nx=n.x+DX[s],ny=n.y+DY[s],nb=g.board[key(nx,ny)];
        if(!nb){open++;continue}
        const nf=feat(nb.t,nb.k),os=(s+2)%4;
        const j=n.kind==="c"?nf.c.findIndex(q=>q.sides.includes(os)):nf.p.findIndex(q=>q.includes(os));
        if(j<0)throw new Error("edge mismatch at "+key(nx,ny));
        push(nx,ny,n.kind,j)}
    }else if(n.kind==="f"){
      for(const p of f.f[n.i].ports){const s=p>>1,nx=n.x+DX[s],ny=n.y+DY[s],nb=g.board[key(nx,ny)];
        if(!nb){open++;continue}
        const nf=feat(nb.t,nb.k),op=oppPort(p),j=nf.f.findIndex(q=>q.ports.includes(op));
        if(j<0)throw new Error("field mismatch at "+key(nx,ny));
        push(nx,ny,"f",j)}
    }
  }
  return{kind,nodes,cells,open,shields,cath,complete:kind!=="f"&&open===0};
}
export function monasteryCount(g,x,y){let n=0;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(g.board[key(x+dx,y+dy)])n++;return n}
const folsOn=(g,tr)=>g.fols.filter(f=>tr.nodes.some(n=>n.x===f.x&&n.y===f.y&&n.kind===f.kind&&n.i===f.i));
function winners(fs){const c=[0,0];fs.forEach(f=>c[f.pl]++);if(!c[0]&&!c[1])return[];return c[0]>c[1]?[0]:c[1]>c[0]?[1]:[0,1]}
export function featureValue(tr,final){
  if(tr.kind==="p")return tr.cells.size;
  if(tr.kind==="c"){const n=tr.cells.size+tr.shields;
    if(tr.complete)return n*(tr.cath?3:2);return tr.cath?0:n}
  return 0;
}
// castles a field touches that are complete
export function fieldValue(g,tr){
  const done=new Set();let n=0;
  for(const nd of tr.nodes){const c=g.board[key(nd.x,nd.y)];
    for(const ci of feat(c.t,c.k).f[nd.i].castles){const id=key(nd.x,nd.y)+"c"+ci;if(done.has(id))continue;
      const ct=trace(g,nd.x,nd.y,"c",ci);ct.nodes.forEach(q=>done.add(key(q.x,q.y)+"c"+q.i));if(ct.complete)n++}}
  return n*3;
}
// spots on the tile at x,y where the current player may put a follower
export function followerSpots(g,x,y){
  const c=g.board[key(x,y)];if(g.left[g.turn]<=0)return[];
  return spotList(c.t).filter(s=>{
    if(s.kind==="m")return !g.fols.some(f=>f.x===x&&f.y===y&&f.kind==="m");
    return folsOn(g,trace(g,x,y,s.kind,s.i)).length===0});
}
function award(g,events,pls,pts,what,detail,at){
  pls.forEach(pl=>{g.scores[pl]+=pts;events.push({type:"score",pl,pts,what,detail,x:at.x,y:at.y})});
}
function giveBack(g,fs){fs.forEach(f=>{g.left[f.pl]++;g.fols.splice(g.fols.indexOf(f),1)})}
// score everything the tile at x,y completed
function scoreCompleted(g,x,y,events){
  const c=g.board[key(x,y)],f=feat(c.t,c.k),done=new Set();
  const doFeat=(kind,i)=>{const id=key(x,y)+kind+i;if(done.has(id))return;const tr=trace(g,x,y,kind,i);
    tr.nodes.forEach(n=>done.add(key(n.x,n.y)+n.kind+n.i));if(!tr.complete)return;
    const fs=folsOn(g,tr),w=winners(fs),pts=featureValue(tr);
    const size=tr.cells.size;w.forEach(pl=>{const b=g.best[pl];if(kind==="c")b.castle=Math.max(b.castle,size);else b.path=Math.max(b.path,size)});
    award(g,events,w,pts,kind==="c"?"castle":"path",{tiles:size,shields:tr.shields,cath:tr.cath},{x,y});giveBack(g,fs)};
  f.c.forEach((_,i)=>doFeat("c",i));f.p.forEach((_,i)=>doFeat("p",i));
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const mx=x+dx,my=y+dy,mc=g.board[key(mx,my)];
    if(!mc||!TD[mc.t].monastery||monasteryCount(g,mx,my)<9)continue;
    const fs=g.fols.filter(q=>q.x===mx&&q.y===my&&q.kind==="m");if(!fs.length)continue;
    award(g,events,[fs[0].pl],9,"monastery",{tiles:9},{x:mx,y:my});giveBack(g,fs)}
}
// One full turn. tile t at x,y rotation k; follower = {kind,i} or null. Returns events. Throws on an illegal move.
export function playTurn(g,t,x,y,k,follower){
  if(g.over)throw new Error("game over");
  if(!fits(g,x,y,t,k))throw new Error("tile does not fit");
  const pl=g.turn,events=[{type:"place",pl,t,x,y,k}];
  g.board[key(x,y)]={t,k};
  if(follower){
    if(!followerSpots(g,x,y).some(s=>s.kind===follower.kind&&s.i===follower.i)){delete g.board[key(x,y)];throw new Error("follower not allowed there")}
    g.fols.push({x,y,kind:follower.kind,i:follower.i,pl});g.left[pl]--;events.push({type:"follower",pl,x,y,kind:follower.kind,i:follower.i});
  }
  scoreCompleted(g,x,y,events);
  g.turn=1-pl;g.log.push({type:"turn",pl,t,x,y,k,follower:follower||null,events});
  return events;
}
// points a placement would score right now for the current player (score preview)
export function previewScore(g,t,x,y,k){
  const c=JSON.parse(JSON.stringify(g));const ev=playTurn(c,t,x,y,k,null);
  return ev.filter(e=>e.type==="score"&&e.pl===g.turn).reduce((a,e)=>a+e.pts,0);
}
export function randomMove(g,t,rand=Math.random){
  const ps=placements(g,t),p=ps[Math.floor(rand()*ps.length)];return{x:p.x,y:p.y,k:p.ks[Math.floor(rand()*p.ks.length)]};
}
// End of game: score everything left. Returns events in display order.
export function finalScoring(g){
  const events=[],done=new Set();
  for(const kind of["p","c"])for(const f of g.fols.filter(q=>q.kind===kind)){
    const id=key(f.x,f.y)+kind+f.i;if(done.has(id))continue;const tr=trace(g,f.x,f.y,kind,f.i);
    tr.nodes.forEach(n=>done.add(key(n.x,n.y)+n.kind+n.i));
    award(g,events,winners(folsOn(g,tr)),featureValue(tr,true),kind==="c"?"unfinished castle":"unfinished path",{tiles:tr.cells.size,shields:tr.shields,cath:tr.cath},f)}
  for(const f of g.fols.filter(q=>q.kind==="m"))award(g,events,[f.pl],monasteryCount(g,f.x,f.y),"monastery",{tiles:monasteryCount(g,f.x,f.y)},f);
  for(const f of g.fols.filter(q=>q.kind==="f")){
    const id=key(f.x,f.y)+"f"+f.i;if(done.has(id))continue;const tr=trace(g,f.x,f.y,"f",f.i);
    tr.nodes.forEach(n=>done.add(key(n.x,n.y)+"f"+n.i));const v=fieldValue(g,tr);
    award(g,events,winners(folsOn(g,tr)),v,"field",{castles:v/3},f)}
  g.over=true;g.winner=g.scores[0]>g.scores[1]?0:g.scores[1]>g.scores[0]?1:-1;
  return events;
}
