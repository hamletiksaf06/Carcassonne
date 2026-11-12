import * as E from "./engine.js";import fs from "fs";import assert from "assert";
E.setTileData(JSON.parse(fs.readFileSync(new URL("../data/tiledata.json",import.meta.url))));
const sum=Object.values(E.COUNTS).reduce((a,b)=>a+b,0);assert.equal(sum,84);assert.equal(E.shuffledBag().length,83);
const G=()=>E.newGame([]);const pts=ev=>ev.filter(e=>e.type==="score").map(e=>[e.pl,e.pts,e.what]);
// 1. two castle edges: start tile (castle N) + tile 20 rotated 2 above it -> 4 points to player 0
let g=G(),ev=E.playTurn(g,20,0,-1,2,{kind:"c",i:0});
assert.deepEqual(pts(ev),[[0,4,"castle"]]);assert.equal(g.left[0],7);assert.equal(g.fols.length,0);
// 2. path: crossing(5) - straight(10 rot1) - castle edge+path(30 rot1): 3 tiles
g=E.newGame([]);g.board={"0,0":{t:5,k:0}};
E.playTurn(g,10,1,0,1,{kind:"p",i:0});ev=E.playTurn(g,30,2,0,1,null);
assert.deepEqual(pts(ev),[[0,3,"path"]]);
// 3. cannot claim an occupied path
g=E.newGame([]);g.board={"0,0":{t:10,k:1}};E.playTurn(g,10,1,0,1,{kind:"p",i:0});
assert.throws(()=>E.playTurn(g,10,2,0,1,{kind:"p",i:0}));assert.ok(!g.board["2,0"]);
// 4. monastery surrounded = 9
g=E.newGame([]);g.board={"0,0":{t:3,k:0}};g.fols=[{x:0,y:0,kind:"m",i:0,pl:1}];g.left=[7,6];
const ring=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
ring.forEach(([x,y],n)=>{ev=E.playTurn(g,3,x,y,0,null)});
assert.deepEqual(pts(ev),[[1,9,"monastery"]]);assert.equal(g.left[1],7);
// 5. field with 2 finished castles = 6 at the end; cathedral unfinished = 0
g=E.newGame([]);g.board={"0,0":{t:22,k:0}};
E.playTurn(g,20,-1,0,1,null);E.playTurn(g,20,1,0,3,null);
g.fols.push({x:0,y:0,kind:"f",i:0,pl:0});ev=E.finalScoring(g);assert.deepEqual(pts(ev),[[0,6,"field"]]);
g=E.newGame([]);g.board={"0,0":{t:29,k:0}};g.fols=[{x:0,y:0,kind:"c",i:0,pl:0}];assert.deepEqual(pts(E.finalScoring(g)),[[0,0,"unfinished castle"]]);
// 6. majority and tie on a shared path: 24 - 10 - 24 (ends open): tie scores both at end
g=E.newGame([]);g.board={"0,0":{t:10,k:1}};g.board["2,0"]={t:10,k:1};
g.fols=[{x:0,y:0,kind:"p",i:0,pl:0},{x:2,y:0,kind:"p",i:0,pl:1}];g.left=[6,6];
E.playTurn(g,10,1,0,1,null);ev=E.finalScoring(g);assert.deepEqual(pts(ev).sort(),[[0,3,"unfinished path"],[1,3,"unfinished path"]]);
// 7. cathedral castle complete: 29 surrounded by four castle edges = 5 tiles * 3
g=E.newGame([]);g.board={"0,0":{t:29,k:0}};g.fols=[{x:0,y:0,kind:"c",i:0,pl:0}];g.left=[6,7];
E.playTurn(g,20,0,-1,2,null);E.playTurn(g,20,1,0,3,null);E.playTurn(g,20,0,1,0,null);ev=E.playTurn(g,20,-1,0,1,null);
assert.deepEqual(pts(ev),[[0,15,"castle"]]);
// 8. random full games
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let tot=0,maxS=0,disc=0;const N=400;
for(let s=1;s<=N;s++){const r=rng(s);g=E.newGame(E.shuffledBag(r));let t;
  while((t=E.draw(g))!==null){const m=E.randomMove(g,t,r);
    const c=JSON.parse(JSON.stringify(g));c.board[m.x+","+m.y]={t,k:m.k};const sp=E.followerSpots(c,m.x,m.y);
    const f=sp.length&&r()<.6?sp[Math.floor(r()*sp.length)]:null;
    assert.equal(E.previewScore(g,t,m.x,m.y,m.k)>=0,true);
    E.playTurn(g,t,m.x,m.y,m.k,f);
    for(const p of[0,1]){assert.ok(g.left[p]>=0&&g.left[p]<=7);assert.equal(g.left[p]+g.fols.filter(q=>q.pl===p).length,7)}}
  disc+=g.log.filter(l=>l.type==="discard").length;
  assert.equal(Object.keys(g.board).length+g.log.filter(l=>l.type==="discard").length,84);
  E.finalScoring(g);tot+=g.scores[0]+g.scores[1];maxS=Math.max(maxS,...g.scores)}
console.log("all tests passed;",N,"random games, avg score per player",(tot/N/2).toFixed(1),"max",maxS,"discards",disc);
