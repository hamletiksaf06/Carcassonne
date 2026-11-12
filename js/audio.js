// Settings, 8-bit sound effects made in code, and the looping music.
const DEF={fx:70,chat:60,music:40,anim:true,preview:true,hints:true};
export const settings={...DEF};
try{Object.assign(settings,JSON.parse(localStorage.getItem("settings")||"{}"))}catch(e){}
export function saveSettings(){try{localStorage.setItem("settings",JSON.stringify(settings))}catch(e){};if(musicGain)musicGain.gain.value=settings.music/100*.5}
let ctx=null,musicGain=null,musicStarted=false;
function ensure(){if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C()}if(ctx.state==="suspended")ctx.resume();return ctx}
function tone(f,dur,{type="square",vol=1,at=0,to=null,group="fx"}={}){
  const c=ensure(),v=settings[group]/100;if(!c||v<=0)return;
  const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+at;o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.16*vol*v,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(c.destination);o.start(t);o.stop(t+dur+.02);
}
const seq=(notes,step,dur,o={})=>notes.forEach((f,i)=>tone(f,dur,{...o,at:i*step}));
const SFX={
  click:()=>tone(620,.05,{vol:.6}),
  rotate:()=>seq([440,560],.045,.05,{vol:.6}),
  place:()=>{tone(170,.14,{type:"triangle",to:80,vol:1.6});tone(90,.08,{type:"square",vol:.5,at:.01})},
  follower:()=>seq([520,780],.06,.08),
  back:()=>seq([780,520],.06,.08,{vol:.7}),
  score:()=>seq([660,880,1320],.07,.12),
  turn:()=>seq([784,1047],.1,.14,{type:"triangle",vol:1.4}),
  warn:()=>tone(220,.1,{vol:.8}),
  challenge:()=>seq([523,659,784,1047],.09,.14),
  chat:()=>seq([880,1175],.07,.1,{type:"sine",vol:1.5,group:"chat"}),
  win:()=>seq([523,659,784,1047,784,1047,1319],.11,.2),
  roll:()=>tone(300,.18,{to:900,vol:.8}),
};
export function sfx(n){try{SFX[n]&&SFX[n]()}catch(e){}}
async function startMusic(){
  if(musicStarted)return;const c=ensure();if(!c)return;musicStarted=true;
  try{
    const ogg=new Audio().canPlayType('audio/ogg; codecs="vorbis"');
    const buf=await c.decodeAudioData(await(await fetch(ogg?"audio/music.ogg":"audio/music.m4a")).arrayBuffer());
    const src=c.createBufferSource();src.buffer=buf;src.loop=true;musicGain=c.createGain();musicGain.gain.value=settings.music/100*.5;src.connect(musicGain).connect(c.destination);src.start();
  }catch(e){musicStarted=false}
}
// browsers only allow sound after the first tap
addEventListener("pointerdown",e=>{startMusic();const b=e.target.closest&&e.target.closest(".pb");if(b&&!b.disabled)sfx("click")},true);
document.addEventListener("visibilitychange",()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else ctx.resume()});
