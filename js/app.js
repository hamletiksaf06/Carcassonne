import * as E from "./engine.js";
import{settings,saveSettings,sfx}from"./audio.js";
import{PAGES}from"./rulebook.js";
const LOCAL=new URLSearchParams(location.search).has("local");
const $=id=>document.getElementById(id);
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const iconBtn=(src,label,fn,small)=>{const b=el("button","pb px ib"+(small?" sm":""));b.setAttribute("aria-label",label);b.innerHTML=`<img src="img/${src}.png" alt="">`;b.onclick=fn;return b};
const face=ic=>"img/"+(ic==="girl"?"i_girl":"i_boy")+".png";
const COLORS=["blue","yellow","red","purple"];
const CHALLENGE_MS=20*60*1000;
let toastT;function toast(m){const t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),2200)}
const show=(id,on=true)=>$(id).classList.toggle("on",on);
if("serviceWorker"in navigator&&!LOCAL)navigator.serviceWorker.register("sw.js").catch(()=>{});

/* ---------------- start-up ---------------- */
let S,uid,me=null,started=false;
const profCache={};
async function prof(id){if(id===uid&&me)return me;if(!profCache[id])profCache[id]=await S.get("profiles/"+id);return profCache[id]||{name:"Someone",icon:"boy",code:""}}
(async()=>{
  try{
    E.setTileData(await(await fetch("data/tiledata.json")).json());
    S=await(await import(LOCAL?"./localstore.js":"./firebase.js")).makeStore();uid=S.uid;
  }catch(e){toast("Could not connect. Check your internet and reopen the app.");console.error(e);return}
  S.watch("profiles/"+uid,p=>{
    const before=me;me=p;
    if(!p){openWho();return}
    $("bImg").src=face(p.icon);$("bName").textContent=p.name;$("bCode").textContent=p.code;$("badge").classList.remove("hide");$("bCode").classList.remove("hide");
    if(!started){started=true;watchChallenges()}
    // a game just started for me (my challenge was accepted, or I accepted one): go in
    if(p.currentGame&&(!before||before.currentGame!==p.currentGame)&&before&&!gameId)enterGame(p.currentGame);
    renderTitle();
  },e=>{toast("The database refused access.");console.error(e)});
})();

/* ---------------- profile ---------------- */
let whoIcon=null;
function openWho(){whoIcon=me?me.icon:null;$("whoName").value=me?me.name:"";paintWho();show("mWho")}
function paintWho(){document.querySelectorAll("#mWho .card").forEach(c=>c.classList.toggle("sel",c.dataset.g===whoIcon));$("whoOk").disabled=!(whoIcon&&$("whoName").value.trim())}
document.querySelectorAll("#mWho .card").forEach(c=>c.onclick=()=>{whoIcon=c.dataset.g;paintWho()});
$("whoName").oninput=paintWho;$("badge").onclick=openWho;
async function newCode(name){
  const pre=(name.toUpperCase().replace(/[^A-Z]/g,"")+"XXX").slice(0,3);
  for(let i=0;i<30;i++){const code=pre+"-"+(1000+Math.floor(Math.random()*9000));if(await S.tx("codes/"+code,d=>d?undefined:{uid}))return code}
  throw new Error("no code");
}
$("whoOk").onclick=async()=>{
  $("whoOk").disabled=true;const name=$("whoName").value.trim();
  try{const code=me&&me.code?me.code:await newCode(name);
    await S.tx("profiles/"+uid,d=>({friends:[],currentGame:null,stats:{},...(d||{}),name,icon:whoIcon,code}));show("mWho",false)}
  catch(e){toast("Could not save. Try again.");console.error(e);$("whoOk").disabled=false}
};

/* ---------------- title screen ---------------- */
const bg=$("bg");let bgScale=1,bgX=0,bgY=0,moving=true;
try{moving=localStorage.getItem("bgMotion")!=="off"}catch(e){}
function layoutBg(){const W=bg.naturalWidth,H=bg.naturalHeight;if(!W)return;const dpr=devicePixelRatio||1,need=Math.max(innerWidth/W,(innerHeight+16)/H),t=Math.max(need,.6);
  let s=Math.ceil(t*dpr-1e-6)/dpr;if(s>t*1.25)s=t;bgScale=s;bg.style.width=W*s+"px";bg.style.height=H*s+"px";bgX=Math.round((innerWidth-W*s)/2);bgY=Math.round((innerHeight-H*s)/2);lastY=null}
let lastY=null;bg.onload=layoutBg;if(bg.complete)layoutBg();
(function floatBg(t){const y=moving?Math.round(Math.sin(t/4000*2*Math.PI)*6):0;if(y!==lastY&&$("vTitle").classList.contains("on")){bg.style.transform=`translate(${bgX}px,${bgY+y}px)`;lastY=y}requestAnimationFrame(floatBg)})(0);
function paintMotion(){$("motionImg").src="img/"+(moving?"i_animations":"i_animations_off")+".png"}
$("btnMotion").onclick=()=>{moving=!moving;try{localStorage.setItem("bgMotion",moving?"on":"off")}catch(e){};paintMotion()};paintMotion();
$("btnRules").onclick=()=>openRules();$("btnStats").onclick=()=>openStats();$("btnSettings").onclick=()=>openSettings();
function renderTitle(){
  const inGame=!!(me&&me.currentGame);
  $("btnNew").disabled=!me||inGame||outgoing.some(c=>c.status==="pending"&&!expired(c));$("btnCont").disabled=!inGame;renderChal();
}
$("btnCont").onclick=()=>me&&me.currentGame&&enterGame(me.currentGame);

/* ---------------- new game + friends ---------------- */
let ng={timer:60,color:"blue",to:null};
const TIMERS=[[30,"30 sec"],[60,"1 min"],[300,"5 min"],[0,"No timer"]];
function colorButtons(box,taken,sel,cb){box.innerHTML="";COLORS.forEach(c=>{const b=el("button","pb px"+(c===sel?" sel":"")+(c===taken?" taken":""));b.innerHTML=`<img src="f/${c}.png" alt="">`;b.setAttribute("aria-label",c);if(c!==taken)b.onclick=()=>cb(c);box.append(b)})}
async function paintNew(){
  const t=$("timers");t.innerHTML="";TIMERS.forEach(([v,l])=>{const b=el("button","pb px"+(v===ng.timer?" sel":""),l);b.onclick=()=>{ng.timer=v;paintNew()};t.append(b)});
  colorButtons($("myCols"),null,ng.color,c=>{ng.color=c;paintNew()});
  const f=$("friends"),ids=(me&&me.friends)||[];f.innerHTML="";
  if(!ids.length)f.append(el("div","sub","No friends yet. Add one with their friend code."));
  for(const id of ids){const p=await prof(id),b=el("button","pb px"+(id===ng.to?" sel":""),p.name);b.onclick=()=>{ng.to=id;paintNew()};f.append(b)}
  $("send").disabled=!ng.to;
}
$("btnNew").onclick=()=>{ng={timer:60,color:"blue",to:(me.friends||[])[0]||null};$("gName").value="";$("newErr").textContent="";$("fCode").value="";paintNew();show("mNew")};
$("cancelNew").onclick=()=>show("mNew",false);
$("fAdd").onclick=async()=>{
  const code=$("fCode").value.trim().toUpperCase(),err=$("newErr");err.textContent="";if(!code)return;
  try{const c=await S.get("codes/"+code);
    if(!c){err.textContent="No player has that code. Check it and try again.";return}
    if(c.uid===uid){err.textContent="That's your own code.";return}
    await S.tx("profiles/"+uid,d=>d&&!(d.friends||[]).includes(c.uid)?{...d,friends:[...(d.friends||[]),c.uid]}:undefined);
    await S.tx("profiles/"+c.uid,d=>d&&!(d.friends||[]).includes(uid)?{...d,friends:[...(d.friends||[]),uid]}:undefined);
    ng.to=c.uid;$("fCode").value="";me={...me,friends:[...new Set([...(me.friends||[]),c.uid])]};paintNew();
  }catch(e){err.textContent="Could not add that friend. Try again.";console.error(e)}
};
$("send").onclick=async()=>{
  if(!ng.to)return;$("send").disabled=true;
  try{const to=await prof(ng.to);
    await S.add("challenges",{from:uid,to:ng.to,fromName:me.name,fromIcon:me.icon,toName:to.name,gameName:$("gName").value.trim()||"Carcassonne",timer:ng.timer,color:ng.color,created:Date.now(),status:"pending",gameId:null});
    show("mNew",false)}catch(e){$("newErr").textContent="Could not send. Try again.";console.error(e);$("send").disabled=false}
};

/* ---------------- challenges ---------------- */
let incoming=[],outgoing=[],notes=[];
const expired=c=>Date.now()-c.created>CHALLENGE_MS;
const setStatus=(c,from,to,extra={})=>S.tx("challenges/"+c.id,d=>d&&d.status===from?{...d,status:to,...extra}:undefined);
function watchChallenges(){
  S.query("challenges","to",uid,l=>{if(l.some(c=>c.status==="pending"&&!expired(c)&&!incoming.some(o=>o.id===c.id))&&!(me&&me.currentGame))sfx("challenge");incoming=l;renderTitle()});
  S.query("challenges","from",uid,l=>{
    l.forEach(c=>{const old=outgoing.find(o=>o.id===c.id);
      if(old&&old.status==="pending"&&c.status==="declined"){const n={t:c.toName+" declined"};notes.push(n);setTimeout(()=>{notes.splice(notes.indexOf(n),1);renderChal()},5000)}});
    outgoing=l;renderTitle()});
  setInterval(()=>{[...incoming,...outgoing].filter(c=>c.status==="pending"&&expired(c)).forEach(c=>setStatus(c,"pending","declined"));renderTitle()},20000);
}
function renderChal(){
  const box=$("chal");box.innerHTML="";if(!me)return;
  const row=(t,btns=[])=>{const d=el("div","ch px");d.append(el("span",null,t));btns.forEach(b=>d.append(b));box.append(d)};
  notes.forEach(n=>row(n.t));
  outgoing.filter(c=>c.status==="pending"&&!expired(c)).forEach(c=>row("Waiting for "+c.toName+"...",[iconBtn("i_close","Cancel challenge",()=>setStatus(c,"pending","cancelled"),true)]));
  if(!me.currentGame)incoming.filter(c=>c.status==="pending"&&!expired(c)).sort((a,b)=>a.created-b.created).forEach(c=>
    row(c.fromName+" challenged you",[iconBtn("i_confirm","Accept",()=>accept(c),true),iconBtn("i_close","Decline",()=>setStatus(c,"pending","declined"),true)]));
}
async function accept(c){
  try{
    if(!await setStatus(c,"pending","accepting"))return;
    const id=await S.add("games",{name:c.gameName,timer:c.timer,players:[c.from,uid],names:{[c.from]:c.fromName,[uid]:me.name},icons:{[c.from]:c.fromIcon,[uid]:me.icon},
      colors:{[c.from]:c.color},status:"color",moves:[],bag:[],order:[],roll:null,deadline:0,created:Date.now(),startedAt:0,ended:null,result:null});
    await setStatus(c,"accepting","accepted",{gameId:id});
    await S.tx("profiles/"+c.from,d=>d?{...d,currentGame:id}:undefined);
    await S.tx("profiles/"+uid,d=>d?{...d,currentGame:id}:undefined);
    if(!gameId)enterGame(id);
  }catch(e){toast("Could not start the game. Try again.");console.error(e)}
}

/* ---------------- game: sync ---------------- */
let gameId=null,unsub=null,gd=null,G=null,cur=null,myIdx=-1,phase="wait",ghost=null,pick=null,sim=null,spots=[],hintList=[];
let warned=false,popKey=null,popT=0,unsubChat=null,chatMsgs=[],chatSeenInit=false;
let seenMoves=null,finalDone=false,finalEvents=null,preScores=null,busy=false,rollPlaying=false,needFit=true;
function enterGame(id){
  leaveGame();gameId=id;seenMoves=null;finalDone=false;needFit=true;
  $("vTitle").classList.remove("on");$("vGame").classList.add("on");resize();
  chatMsgs=[];openChat(false);unsubChat=S.watch("chats/"+id,d=>onChat(d?d.msgs||[]:[]));
  unsub=S.watch("games/"+id,d=>{if(!d){if(!gd){toast("That game no longer exists.");backToStart(true)}return}gd=d;onGame()},e=>console.error(e));
}
function leaveGame(){if(unsub)unsub();unsub=null;if(unsubChat)unsubChat();unsubChat=null;chatSeenInit=false;gameId=null;gd=null;G=null;show("vs",false);["mMenu","mConfirm","mWin","mColor"].forEach(m=>show(m,false));$("final").classList.remove("on");
  $("vGame").classList.remove("on");$("vTitle").classList.add("on");lastY=null}
async function backToStart(clear){const over=gd&&gd.status==="over",id=gameId,hadRematch=over&&gd.rematch&&gd.rematch[uid]&&!gd.nextGame;leaveGame();
  if(hadRematch)S.tx("games/"+id,d=>d&&!d.nextGame?{...d,rematch:{...d.rematch,[uid]:false}}:undefined).catch(()=>{});
  if(clear||over)try{await S.tx("profiles/"+uid,d=>d&&d.currentGame===id?{...d,currentGame:null}:undefined)}catch(e){}}
const other=id=>gd.players.find(p=>p!==id);
function replay(d){const g=E.newGame(d.bag);for(const m of d.moves){E.draw(g);E.playTurn(g,m.t,m.x,m.y,m.k,m.fk?{kind:m.fk,i:m.fi}:null)}return g}
function onGame(){
  const d=gd;
  if(d.nextGame){enterGame(d.nextGame);return}
  if(d.status==="color"){G=null;showVs();return}
  G=replay(d);myIdx=d.order.indexOf(uid);cur=d.status==="over"&&d.ended?null:E.draw(G);
  hintList=cur!=null?E.placements(G,cur):[];
  showVs();
  // score banners for moves that arrived while watching
  if(seenMoves!=null&&d.moves.length>seenMoves){G.log.filter(l=>l.type==="turn").slice(seenMoves).forEach(l=>l.events.filter(e=>e.type==="score").forEach(queueBanner))}
  const seenBefore=seenMoves,newMoves=seenMoves==null||d.moves.length!==seenMoves;seenMoves=d.moves.length;
  if(newMoves){ghost=null;pick=null;sim=null;warned=false;
    if(d.moves.length){const m=d.moves[d.moves.length-1];if(seenBefore!=null){popKey=m.x+","+m.y;popT=performance.now();if(d.order[1-G.turn]!==uid||m.auto)sfx("place")}}}
  if(cur==null){phase="over";if(!d.ended){preScores=G.scores.slice();finalEvents=E.finalScoring(G)}finish()}
  else if(G.turn===myIdx){if(phase!=="follower"||newMoves){phase="place";if(newMoves&&seenBefore!=null)sfx("turn")}}else phase="wait";
  if(d.status==="over"){paintRematch();maybeRematch()}
  renderHud();renderPanel();if(needFit||newMoves){fitView();needFit=false}
}
function mulberry(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
async function submit(move){
  if(busy)return;busy=true;const n=gd.moves.length,id=gameId;
  try{const ok=await S.tx("games/"+id,d=>d&&d.status==="playing"&&d.moves.length===n?{...d,moves:[...d.moves,move],deadline:d.timer?Date.now()+d.timer*1000:0}:undefined);
    if(!ok&&gameId===id)toast("That turn was already played.")}
  catch(e){toast("Could not send your move. Check your connection.");console.error(e)}
  busy=false;
}
// timer + automatic move
setInterval(()=>{
  if(!gd||gd.status!=="playing"||!G||cur==null||rollPlaying)return;
  const t=$("timer");if(!gd.timer){if(t)t.classList.add("hide");return}
  const left=gd.deadline-Date.now(),s=Math.max(0,Math.ceil(left/1000));
  if(t){t.lastChild.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0");t.classList.toggle("low",s<=10)}
  if(s<=10&&s>0&&G.turn===myIdx&&!warned){warned=true;sfx("warn")}
  if(left<=(G.turn===myIdx?0:-4000)&&!busy){
    let h=0;for(const ch of gameId)h=(h*31+ch.charCodeAt(0))|0;
    const m=E.randomMove(G,cur,mulberry(h+gd.moves.length*7919));
    submit({t:cur,x:m.x,y:m.y,k:m.k,fk:null,fi:0,auto:true});
  }
},500);
// results and stats, written once
async function recordResult(result){
  const id=gameId,d0=gd;
  const ok=await S.tx("games/"+id,d=>d&&d.status!=="over"?{...d,status:"over",result,ended:result.endedBy?{by:result.endedBy}:null}:undefined);
  if(!ok)return;
  const mins=d0.startedAt?Math.max(1,Math.round((Date.now()-d0.startedAt)/60000)):0;
  for(const p of d0.players){const i=d0.order.indexOf(p),o=d0.players.find(q=>q!==p),won=result.winner===p,tie=result.winner===null;
    await S.tx("profiles/"+p,d=>{if(!d)return undefined;const s={wins:0,losses:0,ties:0,games:0,best:0,castle:0,path:0,vs:{},...(d.stats||{})},v={w:0,l:0,t:0,games:0,mins:0,...(s.vs[o]||{})};
      s.games++;v.games++;v.mins+=mins;if(tie){s.ties++;v.t++}else if(won){s.wins++;v.w++}else{s.losses++;v.l++}
      s.best=Math.max(s.best,result.scores[i]||0);s.castle=Math.max(s.castle,result.best[i]?.castle||0);s.path=Math.max(s.path,result.best[i]?.path||0);
      return{...d,stats:{...s,vs:{...s.vs,[o]:v}}}}).catch(e=>console.error(e))}
}

/* ---------------- VS screen ---------------- */
let pickColor=null;
function showVs(){
  const d=gd,[a,b]=d.players;
  $("vsIconA").src=face(d.icons[a]);$("vsIconB").src=face(d.icons[b]);$("vsA").textContent=d.names[a];$("vsB").textContent=d.names[b];
  if(d.status==="color"){
    show("vs");$("numA").textContent="";$("numB").textContent="";$("vsA").className="nm";$("vsB").className="nm";$("vsMsg").className="";
    if(uid===b){$("vsMsg").textContent="";if(!$("mColor").classList.contains("on")){pickColor=null;paintPick();show("mColor")}}
    else $("vsMsg").textContent=d.names[b]+" is choosing a colour...";
    return;
  }
  show("mColor",false);
  let seen=false;try{seen=localStorage.getItem("roll:"+gameId)==="1"}catch(e){}
  if(seen||d.status==="over"||d.moves.length>0){if(!rollPlaying)show("vs",false);return}
  if(rollPlaying)return;rollPlaying=true;show("vs");$("vsMsg").textContent="";$("vsMsg").className="";
  const pop=(e,n)=>{e.textContent=n;e.classList.remove("pop");void e.offsetWidth;e.classList.add("pop")},id=gameId;
  setTimeout(()=>{pop($("numA"),d.roll[a]);sfx("roll")},500);setTimeout(()=>{pop($("numB"),d.roll[b]);sfx("roll")},1600);
  setTimeout(()=>{const w=d.order[0];$(w===a?"vsA":"vsB").className="nm win bounce";$("vsMsg").textContent=d.names[w]+" starts!";$("vsMsg").className="gold"},2700);
  setTimeout(()=>{rollPlaying=false;try{localStorage.setItem("roll:"+id,"1")}catch(e){};if(gameId===id)show("vs",false)},5200);
}
function paintPick(){colorButtons($("pickCols"),gd.colors[gd.players[0]],pickColor,c=>{pickColor=c;paintPick()});$("colorOk").disabled=!pickColor}
$("colorOk").onclick=async()=>{
  $("colorOk").disabled=true;const[a,b]=gd.players,first=Math.random()<.5?a:b,ra=1+Math.floor(Math.random()*6);
  let rb;if(ra===6)rb=1+Math.floor(Math.random()*5);else if(ra===1)rb=2+Math.floor(Math.random()*5);
  else rb=first===a?1+Math.floor(Math.random()*(ra-1)):ra+1+Math.floor(Math.random()*(6-ra));
  const order=ra>rb?[a,b]:[b,a],bag=E.shuffledBag(),c=pickColor;
  try{await S.tx("games/"+gameId,d=>d&&d.status==="color"?{...d,colors:{...d.colors,[b]:c},roll:{[a]:ra,[b]:rb},order,bag,status:"playing",startedAt:Date.now(),deadline:d.timer?Date.now()+d.timer*1000+6000:0}:undefined);show("mColor",false)}
  catch(e){toast("Could not start. Try again.");console.error(e);$("colorOk").disabled=false}
};

/* ---------------- game: HUD and panel ---------------- */
const colorOf=i=>gd.colors[gd.order[i]],nameOf=i=>gd.names[gd.order[i]];
function renderHud(){
  const box=$("scores");box.innerHTML="";
  for(const i of[0,1]){const p=el("div","pl"+(cur!=null&&G.turn===i?" active":""));
    p.innerHTML=`<img class="face" src="${face(gd.icons[gd.order[i]])}" alt=""><div><div class="nm"></div><div class="pts">${G.scores[i]}</div></div><div class="fl"><img src="f/${colorOf(i)}.png" alt="Followers left"><span>${G.left[i]}</span></div>`;
    p.querySelector(".nm").textContent=nameOf(i);box.append(p)}
  $("tilesLeft").textContent=G.bag.length+(cur!=null?1:0);
}
function tileCanvas(){const c=el("canvas"),dpr=devicePixelRatio||1,n=Math.max(1,Math.round(96*dpr/128)),sz=n*128/dpr;c.width=n*128;c.height=n*128;c.style.width=sz+"px";c.style.height=sz+"px";
  const x=c.getContext("2d");x.imageSmoothingEnabled=false;x.translate(c.width/2,c.height/2);x.rotate((ghost?ghost.k:0)*Math.PI/2);x.drawImage(IMG[cur],-c.width/2,-c.height/2,c.width,c.height);return c}
function renderPanel(){
  const p=$("panel");p.innerHTML="";if(!G)return;
  if(phase==="over"){p.classList.add("hide");return}p.classList.remove("hide");
  const tm=el("div","timer"+(gd.timer?"":" hide"));tm.id="timer";tm.innerHTML=`<img src="img/i_end_turn.png" alt="">`;tm.append(document.createTextNode(""));p.append(tm);
  const btn=(t,fn,dis)=>{const b=el("button","pb px tb",t);b.onclick=fn;b.disabled=!!dis;return b};
  if(phase==="wait"){p.append(el("div","msg",nameOf(G.turn)+"'s turn"));return}
  if(phase==="place"){
    const box=el("div","tilebox"),col=el("div","col"),r=iconBtn("i_rotate","Rotate tile",rotateGhost),u=iconBtn("i_undo","Undo",()=>{ghost=null;renderPanel()});
    r.disabled=u.disabled=!ghost;col.append(r,u);box.append(col,tileCanvas());p.append(box);
    if(ghost&&settings.preview){let pv=0;try{pv=E.previewScore(G,cur,ghost.x,ghost.y,ghost.k)}catch(e){}if(pv>0)p.append(el("div","preview","This scores +"+pv))}
    p.append(btn("Confirm tile",confirmTile,!ghost));
  }else{
    p.append(el("div","msg",pick?"Follower placed. Tap it again to take it back.":spots.length?"Tap a marker to place a follower":"No follower can be placed here"));
    p.append(btn("Skip follower",()=>endTurn(false),!!pick||!spots.length),btn("End turn",()=>endTurn(true),!pick&&spots.length>0));
  }
}
function rotateGhost(){if(!ghost)return;sfx("rotate");ghost.k=ghost.ks[(ghost.ks.indexOf(ghost.k)+1)%ghost.ks.length];renderPanel()}
function confirmTile(){if(!ghost)return;sfx("place");sim=structuredClone(G);sim.board[ghost.x+","+ghost.y]={t:cur,k:ghost.k};spots=E.followerSpots(sim,ghost.x,ghost.y);pick=null;phase="follower";renderPanel()}
function endTurn(withPick){const f=withPick&&pick;phase="wait";renderPanel();submit({t:cur,x:ghost.x,y:ghost.y,k:ghost.k,fk:f?pick.kind:null,fi:f?pick.i:0,auto:false})}
// score messages
const bq=[];let bBusy=false;
function describe(e){const d=e.detail,tiles=n=>n+(n===1?" tile":" tiles");
  if(e.what.includes("castle"))return`${e.what} (${tiles(d.tiles)}${d.shields?", "+d.shields+(d.shields===1?" shield":" shields"):""}${d.cath?", cathedral":""})`;
  if(e.what.includes("path"))return`${e.what} (${tiles(d.tiles)})`;if(e.what==="field")return`field (${d.castles} ${d.castles===1?"castle":"castles"})`;return e.what}
function queueBanner(e){bq.push(e);if(!bBusy)nextBanner()}
function nextBanner(){
  const e=bq.shift();if(!e||!gd){bBusy=false;$("banner").classList.remove("on");return}bBusy=true;sfx("score");
  const b=$("banner");b.innerHTML="";b.append(document.createTextNode(nameOf(e.pl)+" "),el("b",null,"+"+e.pts),document.createTextNode(": "+describe(e)));b.classList.add("on");
  const f=$("float"),x=V.offX+(e.x*STEP+64)*V.scale,y=V.offY+(e.y*STEP+40)*V.scale;f.textContent="+"+e.pts;f.style.display=settings.anim?"block":"none";let t0=null;
  (function an(t){if(!t0)t0=t;const p=(t-t0)/1100;f.style.left=Math.round(x-14)+"px";f.style.top=Math.round(y-p*40)+"px";f.style.opacity=p<.7?1:Math.max(0,1-(p-.7)/.3);if(p<1)requestAnimationFrame(an);else f.style.display="none"})(performance.now());
  setTimeout(nextBanner,2200);
}

/* ---------------- game: end ---------------- */
function finish(){
  const d=gd;
  if(d.ended){if(d.status==="over")showWinner();return}
  if(d.status!=="over"){const w=G.winner;recordResult({scores:G.scores.slice(),winner:w<0?null:d.order[w],best:G.best,endedBy:null}).catch(e=>console.error(e))}
  if(finalDone)return;finalDone=true;
  for(const i of[0,1]){$("fIcon"+i).src=face(d.icons[d.order[i]]);$("fName"+i).textContent=nameOf(i);$("fTot"+i).textContent=preScores[i]}
  const tot=preScores.slice(),lines=$("lines");lines.innerHTML="";$("btnShowWin").classList.add("hide");$("final").classList.add("on");fitView();
  const evs=finalEvents.filter(e=>e.pts>0),id=gameId;
  evs.forEach((e,n)=>setTimeout(()=>{if(gameId!==id)return;const l=el("div","ln");const ds=describe(e);l.append(el("span",null,ds[0].toUpperCase()+ds.slice(1)));const r=el("span",null,nameOf(e.pl)+" ");r.append(el("b",null,"+"+e.pts));l.append(r);lines.append(l);lines.scrollTop=1e6;
    tot[e.pl]+=e.pts;$("fTot"+e.pl).textContent=tot[e.pl]},600+n*750));
  setTimeout(()=>{if(gameId!==id)return;$("btnShowWin").classList.remove("hide");showWinner()},900+evs.length*750);
}
function showWinner(){
  const d=gd,r=d.result;let w,title;
  if(d.ended){w=other(d.ended.by);title=d.names[d.ended.by]+" ended the game. "+d.names[w]+" wins!"}
  else{const wi=G.winner;w=wi<0?null:d.order[wi];title=w?d.names[w]+" wins!":"You share the victory!"}
  $("wFace").src=face(d.icons[w||uid]);$("wCrown").style.visibility=w?"visible":"hidden";$("wTitle").textContent=title;
  $("wScore").textContent=`${nameOf(0)} ${G.scores[0]} - ${G.scores[1]} ${nameOf(1)}`;if(!$("mWin").classList.contains("on"))sfx("win");paintRematch();show("mWin");
}
$("wBoard").onclick=()=>show("mWin",false);$("btnShowWin").onclick=showWinner;$("wBack").onclick=()=>backToStart(true);
$("btnMenu").onclick=()=>{$("menuTitle").textContent=gd?gd.name:"Menu";$("menuEnd").classList.toggle("hide",!gd||gd.status!=="playing");show("mMenu")};
$("menuClose").onclick=()=>show("mMenu",false);$("menuRules").onclick=()=>{show("mMenu",false);openRules()};$("menuStats").onclick=()=>{show("mMenu",false);openStats()};$("menuSet").onclick=()=>{show("mMenu",false);openSettings()};$("menuBack").onclick=()=>backToStart(false);
$("menuEnd").onclick=()=>{show("mMenu",false);show("mConfirm")};$("endNo").onclick=()=>show("mConfirm",false);
$("endYes").onclick=async()=>{show("mConfirm",false);if(!gd||gd.status!=="playing"||!G)return;
  try{await recordResult({scores:G.scores.slice(),winner:other(uid),best:G.best,endedBy:uid})}catch(e){toast("Could not end the game. Try again.");console.error(e)}};

/* ---------------- game: board view ---------------- */
const STEP=130,TS=128,GAP=2,IMG={},FOL={};
Object.keys(E.COUNTS).forEach(t=>{const i=new Image();i.src=`t/${String(t).padStart(2,"0")}.png`;IMG[t]=i});
COLORS.forEach(c=>{const i=new Image();i.src=`f/${c}.png`;FOL[c]=i});
const cv=$("cv"),ctx=cv.getContext("2d"),V={dpr:1,vw:0,vh:0,scale:1,offX:0,offY:0,levels:[1]};
function resize(){V.dpr=devicePixelRatio||1;V.vw=innerWidth;V.vh=innerHeight;cv.width=Math.round(V.vw*V.dpr);cv.height=Math.round(V.vh*V.dpr);cv.style.width=V.vw+"px";cv.style.height=V.vh+"px";
  V.levels=[.5/V.dpr];for(let n=1;n<=Math.ceil(2*V.dpr);n++)V.levels.push(n/V.dpr);if(!V.levels.includes(V.scale))V.scale=V.levels[0]}
addEventListener("resize",()=>{layoutBg();if(gameId){resize();if(G){fitView();renderPanel()}}});
const snap=v=>Math.round(v*V.dpr)/V.dpr;
function fitView(){
  if(!G)return;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const add=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)};
  for(const k in G.board){const[x,y]=k.split(",").map(Number);add(x,y)}if(phase==="place")hintList.forEach(h=>add(h.x,h.y));
  const W=(x1-x0+1)*STEP+GAP,H=(y1-y0+1)*STEP+GAP,L=12,R=phase==="over"?($("final").classList.contains("on")?324:44):232,T=60,B=58,aw=V.vw-L-R,ah=V.vh-T-B;
  let s=V.levels[0];for(const l of V.levels)if(W*l<=aw&&H*l<=ah)s=l;
  V.scale=s;V.offX=snap(L+(aw-W*s)/2-x0*STEP*s);V.offY=snap(T+(ah-H*s)/2-y0*STEP*s);
}
function zoomBy(dir,cx=V.vw/2,cy=V.vh/2){let i=V.levels.indexOf(V.scale);if(i<0)i=0;const ni=Math.max(0,Math.min(V.levels.length-1,i+dir));if(ni===i)return;
  const ns=V.levels[ni],wx=(cx-V.offX)/V.scale,wy=(cy-V.offY)/V.scale;V.scale=ns;V.offX=snap(cx-wx*ns);V.offY=snap(cy-wy*ns)}
$("btnZi").onclick=()=>zoomBy(1);$("btnZo").onclick=()=>zoomBy(-1);$("btnRec").onclick=fitView;
const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
const frame=(x,y,s,t,c)=>{rect(x,y,s,t,c);rect(x,y+s-t,s,t,c);rect(x,y,t,s,c);rect(x+s-t,y,t,s,c)};
const cellPx=(x,y)=>{const s=V.scale*V.dpr;return[Math.round(V.offX*V.dpr)+x*STEP*s+GAP*s,Math.round(V.offY*V.dpr)+y*STEP*s+GAP*s,s]};
function drawTile(t,x,y,k,alpha=1,zoom=1){const[px,py,s]=cellPx(x,y),img=IMG[t];if(!img.complete||!img.naturalWidth)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(px+TS*s/2,py+TS*s/2);ctx.rotate(k*Math.PI/2);ctx.scale(zoom,zoom);ctx.drawImage(img,-TS*s/2,-TS*s/2,TS*s,TS*s);ctx.restore()}
function drawFollower(color,t,k,x,y,kind,i){const img=FOL[color];if(!img.complete||!img.naturalWidth)return;const[px,py,s]=cellPx(x,y),p=E.spotPos(t,k,kind,i);
  ctx.save();ctx.translate(Math.round(px+p[0]*s),Math.round(py+p[1]*s));if(kind==="f")ctx.rotate(-Math.PI/2);ctx.drawImage(img,Math.round(-img.width*s/2),Math.round(-img.height*s/2),img.width*s,img.height*s);ctx.restore()}
(function loop(now){
  requestAnimationFrame(loop);if(!gameId||!G||!$("vGame").classList.contains("on"))return;
  ctx.imageSmoothingEnabled=false;rect(0,0,cv.width,cv.height,"#17110c");const s=V.scale*V.dpr,on=Math.floor(now/500)%2===0;
  for(const key in G.board){const[x,y]=key.split(",").map(Number),[px,py]=cellPx(x,y);rect(px-GAP*s,py-GAP*s,(STEP+GAP)*s,(STEP+GAP)*s,"#2E2219")}
  if(phase==="follower"&&ghost){const[px,py]=cellPx(ghost.x,ghost.y);rect(px-GAP*s,py-GAP*s,(STEP+GAP)*s,(STEP+GAP)*s,"#2E2219")}
  for(const key in G.board){const[x,y]=key.split(",").map(Number),c=G.board[key];
    if(key===popKey&&settings.anim&&now-popT<220){const q=(now-popT)/220;drawTile(c.t,x,y,c.k,q,1.3-.3*q)}else drawTile(c.t,x,y,c.k)}
  if(phase==="place"){
    if(settings.hints)hintList.forEach(h=>{if(ghost&&ghost.x===h.x&&ghost.y===h.y)return;const[px,py]=cellPx(h.x,h.y),size=TS*s,t=Math.max(2,Math.round(3*s)),dash=Math.round(12*s);
      rect(px,py,size,size,on?"rgba(224,180,74,.22)":"rgba(224,180,74,.12)");ctx.fillStyle=on?"#E0B44A":"#b8892f";
      for(let i=0;i<size;i+=dash*2){const l=Math.min(dash,size-i);ctx.fillRect(px+i,py,l,t);ctx.fillRect(px+i,py+size-t,l,t);ctx.fillRect(px,py+i,t,l);ctx.fillRect(px+size-t,py+i,t,l)}});
    if(ghost){drawTile(cur,ghost.x,ghost.y,ghost.k,.8);const[px,py]=cellPx(ghost.x,ghost.y);frame(px,py,TS*s,Math.max(2,Math.round(3*s)),"#F4EFE3")}
  }
  if(phase==="follower"&&ghost)drawTile(cur,ghost.x,ghost.y,ghost.k);
  G.fols.forEach(f=>{const c=G.board[f.x+","+f.y];drawFollower(colorOf(f.pl),c.t,c.k,f.x,f.y,f.kind,f.i)});
  if(phase==="follower"&&ghost){
    const[px,py]=cellPx(ghost.x,ghost.y);frame(px,py,TS*s,Math.max(2,Math.round(2*s)),"#E0B44A");
    spots.forEach(o=>{if(pick&&pick.kind===o.kind&&pick.i===o.i)return;const p=E.spotPos(cur,ghost.k,o.kind,o.i),cx=Math.round(px+p[0]*s),cy=Math.round(py+p[1]*s),r=Math.round(6*s),u=Math.max(1,Math.round(2*s));
      rect(cx-r,cy-r,r*2,r*2,"#2E2219");rect(cx-r+u,cy-r+u,r*2-2*u,r*2-2*u,"#F4EFE3");rect(cx-r+2*u,cy-r+2*u,r*2-4*u,r*2-4*u,on?"#2E2219":"#E0B44A")});
    if(pick)drawFollower(colorOf(myIdx),cur,ghost.k,ghost.x,ghost.y,pick.kind,pick.i);
  }
})(0);
// input
const ptrs=new Map();let drag=null,pinch=null;
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===1)drag={x:e.clientX,y:e.clientY,ox:V.offX,oy:V.offY,moved:false};
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)};drag=null}});
cv.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&ptrs.size===2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),r=d/pinch.d;
    if(r>1.35){zoomBy(1,(a.x+b.x)/2,(a.y+b.y)/2);pinch.d=d}else if(r<.74){zoomBy(-1,(a.x+b.x)/2,(a.y+b.y)/2);pinch.d=d}return}
  if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>8)drag.moved=true;if(drag.moved){V.offX=snap(drag.ox+dx);V.offY=snap(drag.oy+dy)}}});
cv.addEventListener("pointerup",e=>{const wasTap=drag&&!drag.moved&&ptrs.size===1;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(wasTap)tap(e.clientX,e.clientY);if(!ptrs.size)drag=null});
cv.addEventListener("pointercancel",e=>{ptrs.delete(e.pointerId);drag=null;pinch=null});
cv.addEventListener("wheel",e=>{e.preventDefault();zoomBy(e.deltaY<0?1:-1,e.clientX,e.clientY)},{passive:false});
function tap(cx,cy){
  if(!G)return;const wx=(cx-V.offX)/V.scale,wy=(cy-V.offY)/V.scale,x=Math.floor(wx/STEP),y=Math.floor(wy/STEP);
  if(phase==="place"){const h=hintList.find(h=>h.x===x&&h.y===y);if(!h)return;
    if(ghost&&ghost.x===x&&ghost.y===y){rotateGhost();return}ghost={x,y,k:h.ks[0],ks:h.ks};renderPanel()}
  else if(phase==="follower"){const lx=wx-ghost.x*STEP-GAP,ly=wy-ghost.y*STEP-GAP;let best=null,bd=24;
    spots.forEach(o=>{const p=E.spotPos(cur,ghost.k,o.kind,o.i),d=Math.hypot(p[0]-lx,p[1]-ly);if(d<bd){bd=d;best=o}});if(!best)return;
    pick=pick&&pick.kind===best.kind&&pick.i===best.i?null:{kind:best.kind,i:best.i};sfx(pick?"follower":"back");renderPanel()}
}
/* ---------------- rematch ---------------- */
let rematchBusy=false;
function paintRematch(){
  const b=$("wRematch");if(!gd)return;const r=gd.rematch||{},o=other(uid);
  if(r[uid]){b.disabled=true;b.textContent="Waiting for "+gd.names[o]+"..."}else{b.disabled=false;b.textContent=r[o]?"Rematch ("+gd.names[o]+" is ready)":"Rematch"}
}
$("wRematch").onclick=()=>{const id=gameId;S.tx("games/"+id,d=>d&&d.status==="over"&&!d.nextGame?{...d,rematch:{...(d.rematch||{}),[uid]:true}}:undefined).catch(e=>{toast("Could not send. Try again.");console.error(e)})};
$("wStats").onclick=()=>openStats(gd?other(uid):null);
async function maybeRematch(){
  const d=gd,r=d.rematch||{},[a,b]=d.players;
  if(rematchBusy||d.nextGame||!r[a]||!r[b]||uid!==a)return;rematchBusy=true;
  try{
    const first=Math.random()<.5?a:b,ra=1+Math.floor(Math.random()*6);let rb;
    if(ra===6)rb=1+Math.floor(Math.random()*5);else if(ra===1)rb=2+Math.floor(Math.random()*5);else rb=first===a?1+Math.floor(Math.random()*(ra-1)):ra+1+Math.floor(Math.random()*(6-ra));
    const id=await S.add("games",{name:d.name,timer:d.timer,players:d.players,names:d.names,icons:d.icons,colors:d.colors,status:"playing",moves:[],bag:E.shuffledBag(),order:ra>rb?[a,b]:[b,a],
      roll:{[a]:ra,[b]:rb},deadline:d.timer?Date.now()+d.timer*1000+6000:0,created:Date.now(),startedAt:Date.now(),ended:null,result:null});
    for(const p of d.players)await S.tx("profiles/"+p,q=>q?{...q,currentGame:id}:undefined);
    await S.tx("games/"+gameId,q=>q?{...q,nextGame:id}:undefined);
  }catch(e){console.error(e);toast("Could not start the rematch.")}
  rematchBusy=false;
}

/* ---------------- chat ---------------- */
const chat=$("chat");
const chatKey=()=>"chatSeen:"+uid+":"+gameId;
function onChat(msgs){
  const had=chatMsgs.length;chatMsgs=msgs;const box=$("msgs");box.innerHTML="";
  msgs.forEach(m=>{const mine=m.u===uid,b=el("div","bub "+(mine?"me":"her")+" c-"+((gd&&gd.colors[m.u])||"blue"));b.append(el("small",null,gd?gd.names[m.u]:""),document.createTextNode(m.t));box.append(b)});
  box.scrollTop=1e6;
  if(chatSeenInit&&msgs.length>had&&msgs[msgs.length-1].u!==uid)sfx("chat");chatSeenInit=true;
  if(chat.classList.contains("on"))markChatSeen();else paintDot();
}
function markChatSeen(){try{localStorage.setItem(chatKey(),chatMsgs.length)}catch(e){};paintDot()}
function paintDot(){let seen=0;try{seen=+localStorage.getItem(chatKey())||0}catch(e){}
  $("chatDot").classList.toggle("on",!chat.classList.contains("on")&&chatMsgs.length>seen&&chatMsgs[chatMsgs.length-1].u!==uid)}
function openChat(o){chat.classList.toggle("on",o);$("chatTab").setAttribute("aria-label",o?"Close chat":"Open chat");if(gd)$("chatHd").textContent="Chat with "+gd.names[other(uid)];
  if(o){markChatSeen();$("msgs").scrollTop=1e6}else{$("chatIn").blur();paintDot()}}
$("chatTab").onclick=()=>openChat(!chat.classList.contains("on"));
$("chatForm").onsubmit=e=>{e.preventDefault();const v=$("chatIn").value.trim();if(!v||!gameId)return;$("chatIn").value="";
  S.tx("chats/"+gameId,d=>({msgs:[...((d&&d.msgs)||[]).slice(-199),{u:uid,t:v,ts:Date.now()}]})).catch(e=>{toast("Message not sent. Check your connection.");console.error(e)})};
// keep the text box above the on-screen keyboard
if(window.visualViewport){const fitChat=()=>{chat.style.height=visualViewport.height+"px";chat.style.top=visualViewport.offsetTop+"px";$("msgs").scrollTop=1e6};visualViewport.addEventListener("resize",fitChat);visualViewport.addEventListener("scroll",fitChat)}

/* ---------------- settings ---------------- */
function openSettings(){
  const g=$("sgrid");g.innerHTML="";
  [["Effects","fx","click"],["Chat","chat","chat"],["Music","music",null]].forEach(([l,k,test])=>{
    const sl=el("div","slider"),v=el("div","val");sl.setAttribute("role","slider");sl.setAttribute("aria-label",l+" volume");for(let i=0;i<10;i++)sl.append(el("i"));
    const paint=()=>{[...sl.children].forEach((b,i)=>b.classList.toggle("on",i<settings[k]/10));v.textContent=settings[k]};
    const setX=e=>{const r=sl.getBoundingClientRect(),n=Math.max(0,Math.min(10,Math.round((e.clientX-r.left)/r.width*10)))*10;if(n!==settings[k]){settings[k]=n;saveSettings();paint();if(test)sfx(test)}};
    sl.onpointerdown=e=>{sl.setPointerCapture(e.pointerId);setX(e)};sl.onpointermove=e=>{if(e.buttons)setX(e)};paint();g.append(el("div","l",l),sl,v)});
  g.append(el("div","sep"));
  [["Animations","anim"],["Score preview","preview"],["Placement hints","hints"]].forEach(([l,k])=>{
    const b=el("button","pb px sw"),paint=()=>{b.classList.toggle("on",settings[k]);b.textContent=settings[k]?"On":"Off"};
    b.onclick=()=>{settings[k]=!settings[k];saveSettings();paint();if(G)renderPanel()};paint();g.append(el("div","l",l),el("div"),b)});
  show("mSet");
}
$("setClose").onclick=()=>show("mSet",false);

/* ---------------- rulebook ---------------- */
let rbI=0;
function bookMode(m,title){$("bookTitle").textContent=title;$("rbPage").classList.toggle("hide",m!=="rules");$("rbFoot").classList.toggle("hide",m!=="rules");$("stPage").classList.toggle("hide",m!=="stats");$("book").classList.add("on")}
$("bookClose").onclick=()=>$("book").classList.remove("on");
function fitRb(){const im=$("rbPic").querySelector(".frame > img");if(!im||!im.naturalWidth)return;const fr=im.parentNode,dpr=devicePixelRatio||1,s=Math.min(fr.clientWidth/im.naturalWidth,fr.clientHeight/im.naturalHeight);
  let n=Math.floor(s*dpr);if(n<1)n=s*dpr;im.style.width=im.naturalWidth*n/dpr+"px";im.style.height=im.naturalHeight*n/dpr+"px"}
function showRb(){
  const p=PAGES[rbI],pic=$("rbPic");bookMode("rules",p.t);pic.innerHTML="";const fr=el("div","frame");
  if(p.img){const im=new Image();im.alt="";im.onload=fitRb;im.src="img/rb/"+p.img+".png";fr.append(im)}
  else{const ic=el("div","icons");p.icons.forEach(([s,l])=>{const d=el("div");d.innerHTML=`<img src="img/${s}.png" alt="">`;d.append(document.createTextNode(l));ic.append(d)});fr.append(ic)}
  pic.append(fr,el("div","cap",p.cap));$("rbTxt").innerHTML=p.html;$("rbTxt").scrollTop=0;
  $("rbCount").textContent=(rbI+1)+" / "+PAGES.length;$("rbPrev").disabled=rbI===0;$("rbNext").disabled=rbI===PAGES.length-1;
}
function openRules(){rbI=0;showRb()}
$("rbPrev").onclick=()=>{if(rbI>0){rbI--;showRb()}};$("rbNext").onclick=()=>{if(rbI<PAGES.length-1){rbI++;showRb()}};
addEventListener("resize",fitRb);

/* ---------------- stats ---------------- */
async function openStats(opp){
  if(!me)return;bookMode("stats","Stats");
  const ms={wins:0,losses:0,ties:0,games:0,best:0,castle:0,path:0,vs:{},...(me.stats||{})},ids=[...new Set([...Object.keys(ms.vs),...(me.friends||[])])];
  if(!opp||!ids.includes(opp))opp=Object.keys(ms.vs)[0]||ids[0]||null;
  const box=$("stOpp");box.innerHTML="";
  for(const id of ids){const p=await prof(id),b=el("button","pb px"+(id===opp?" sel":""),p.name);b.onclick=()=>openStats(id);box.append(b)}
  const vs=$("stVs"),tbl=$("stTbl");vs.innerHTML="";tbl.innerHTML="";
  const tiles=n=>n+(n===1?" tile":" tiles"),time=m=>m<60?m+" min":Math.floor(m/60)+" h "+(m%60)+" min";
  const side=(p,lead,right)=>{const d=el("div","p"+(right?" r":"")),ic=el("div","ic");ic.innerHTML=`<img class="f" src="${face(p.icon)}" alt="">`+(lead?`<img class="c" src="img/i_crown.png" alt="Leader">`:"");const n=el("span",null,p.name);right?d.append(n,ic):d.append(ic,n);return d};
  const row=(l,a,b,f=String,cmp=true)=>{const tr=el("tr");tr.append(el("td",null,l));const A=el("td",cmp&&a>b?"best":"",f(a));tr.append(A);if(b!==undefined)tr.append(el("td",cmp&&b>a?"best":"",f(b)));tbl.append(tr)};
  if(!opp){vs.append(side(me,false),el("div","sc","-"),el("div","p r","No games yet"));
    tbl.innerHTML="<tr><th></th><th>You</th></tr>";[["Wins",ms.wins],["Losses",ms.losses],["Games played",ms.games]].forEach(([l,v])=>{const tr=el("tr");tr.append(el("td",null,l),el("td",null,String(v)));tbl.append(tr)});return}
  delete profCache[opp];const op=await prof(opp),os={wins:0,losses:0,ties:0,games:0,best:0,castle:0,path:0,...(op.stats||{})},v={w:0,l:0,t:0,games:0,mins:0,...(ms.vs[opp]||{})};
  const sc=el("div","sc");const a=el("span",v.w>v.l?"lead":"",String(v.w)),b=el("span",v.l>v.w?"lead":"",String(v.l));sc.append(a,el("span",null,"-"),b);
  vs.append(side(me,v.w>v.l),sc,side(op,v.l>v.w,true));
  const hd=el("tr");hd.append(el("th"),el("th",null,me.name),el("th",null,op.name));tbl.append(hd);
  row("Wins against each other",v.w,v.l);row("All wins",ms.wins,os.wins);row("Highest score",ms.best,os.best,n=>n+" pts");row("Biggest castle",ms.castle,os.castle,tiles);row("Longest path",ms.path,os.path,tiles);
  const sh=(l,val)=>{const tr=el("tr","shared");tr.append(el("td",null,l));const td=el("td",null,val);td.colSpan=2;tr.append(td);tbl.append(tr)};
  sh("Games played together",String(v.games)+(v.t?" ("+v.t+" tied)":""));sh("Time played together",time(v.mins));
}

// test hooks
window.__app={openStats,openRules,openSettings,get S(){return S},get state(){return{gd,G,cur,phase,myIdx,hintList,spots,me,uid,gameId,incoming,outgoing}},E,V,tap,confirmTile,endTurn,submit,
  setGhost(h){ghost={x:h.x,y:h.y,k:h.ks[0],ks:h.ks};renderPanel()}};
