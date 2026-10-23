const M=PressMath,$=id=>document.getElementById(id),D=M.DENOMS,KEY='poc_dice_v3',BET=d=>M.betFor(d);
const rand=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/2**32;};
const money=v=>'$'+v.toLocaleString(undefined,{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});
const fresh=()=>({bals:D.map(d=>BET(d)*M.SPINS_PER_DENOM),di:0,muted:false});
let st=JSON.parse(localStorage.getItem(KEY)||'null')||fresh();const save=()=>localStorage.setItem(KEY,JSON.stringify(st));
// game: phase idle|won|busy ; row = index of last played row
let g={phase:'idle',row:-1,pot:0,denom:D[st.di]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const FAST=new URLSearchParams(location.search).has('fast');const T=ms=>FAST?1:ms;
// ---- sound ----
let ac;function tone(f,d,type='square',v=.06,delay=0,slide){if(st.muted)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();}catch(e){return}
 const o=ac.createOscillator(),gn=ac.createGain();o.type=type;const t=ac.currentTime+delay;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);
 gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn);gn.connect(ac.destination);o.start(t);o.stop(t+d);}
function noise(d){if(st.muted||!ac)return;const b=ac.createBuffer(1,ac.sampleRate*d,ac.sampleRate),x=b.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/x.length,2);
 const s=ac.createBufferSource(),gn=ac.createGain();gn.gain.value=.5;s.buffer=b;s.connect(gn);gn.connect(ac.destination);s.start();}
const sfx={flip:()=>tone(320,.08,'triangle',.08,0,640),coin:()=>{tone(988,.08,'square',.05);tone(1319,.25,'square',.05,.08)},
 boom:()=>{tone(160,.6,'sawtooth',.2,0,30);noise(.7)},collect:()=>[784,988,1175,1568].forEach((f,i)=>tone(f,.15,'square',.05,i*.07)),blank:()=>tone(200,.08,'triangle',.05),stop:()=>tone(240,.07,'triangle',.1)};
// ---- board ----
const board=$('board');
board.innerHTML=[0,1,2,3].map(r=>`<div class="row" id="row${r}">${[0,1,2,3].map(c=>`<div class="cell" id="c${r}${c}"><div class="tile idle"></div></div>`).join('')}</div>`).join('');
const SYM={blank:'<div class="tile blank"></div>',bomb:'<div class="tile bomb">💣</div>',door:'<div class="tile doorimg"><span class="knob"></span></div>'};
const RANDS=['blank','door','door','blank','door','door'];
function clearBoard(){for(let r=0;r<4;r++){$('row'+r).className='row';for(let c=0;c<4;c++){const e=$('c'+r+c);e.className='cell';e.innerHTML='<div class="tile idle"></div>';}}}
function kind(cell){return cell.bomb?'bomb':cell.pay?'door':'blank';}
const DOOR_FLIP_MS=200;
async function revealRow(r){const x=M.rollRow(rand,g.pot,r,g.denom);$('row'+r).classList.add('active');
 for(let c=0;c<4;c++){const e=$('c'+r+c);e.className='cell';const strip=[...Array(12)].map((_,i)=>SYM[RANDS[(i+c*2)%RANDS.length]]).join('');
  e.innerHTML=`<div class="spinwin"><div class="strip" style="animation-duration:${.25+c*.03}s">${strip}${strip}</div></div>`;}
 await sleep(T(500));
 // land: coins AND bombs land as identical closed doors; blanks stay blank
 for(let c=0;c<4;c++){const cell=x.cells[c],k=kind(cell),e=$('c'+r+c);
  e.innerHTML=k==='blank'?SYM.blank:`<div class="flip"><div class="face front">${SYM.door}</div><div class="face back">${k==='bomb'?SYM.bomb:`<div class="coin">${money(cell.pay)}</div>`}</div></div>`;
  e.classList.add('landed');setTimeout(()=>e.classList.remove('landed'),300);
  if(k!=='blank')window.__landedDoors=(window.__landedDoors||0)+1;sfx.stop();await sleep(T(300));}
 // test hook: no door may be open before every reel in the row has stopped
 if([...$('row'+r).querySelectorAll('.cell')].some(e=>e.classList.contains('open')))window.__doorViolations=(window.__doorViolations||0)+1;
 // Kyle: pause half the row's spin length (initial spin + 4 staggered stops) before doors open
 window.__landed=true;await sleep((T(500)+4*T(300))/2*0.3); // Kyle: reveal at 30% (850ms -> 255ms)window.__landed=false;
 for(let c=0;c<4;c++){const e=$('c'+r+c);if(!e.querySelector('.flip'))continue;e.classList.add('open');sfx.flip();await sleep(T(42));
  if(x.cells[c].bomb){sfx.boom();navigator.vibrate&&navigator.vibrate([200,60,200]);}else sfx.coin();await sleep(T(DOOR_FLIP_MS-42));} // next door starts only after this flip (200ms) finishes
 $('row'+r).classList.remove('active');return x;}
// ---- game flow ----
function canBet(){return st.bals[st.di]+1e-9>=BET(D[st.di]);}
async function startGame(){g={phase:'busy',row:-1,pot:BET(D[st.di]),denom:D[st.di]};st.bals[st.di]=r2(st.bals[st.di]-BET(g.denom));save();clearBoard();$('msg').textContent='';ui();}
const r2=v=>Math.round(v*100)/100;
async function playRow(){g.phase='busy';ui();const r=g.row+1;const x=await revealRow(r);g.row=r;
 if(x.bomb){$('row'+r).classList.add('dead');for(let i=0;i<r;i++)$('row'+i).classList.add('lost');board.classList.add('shake');setTimeout(()=>board.classList.remove('shake'),400);
  $('msg').textContent=`💥 Bomb! Lost ${money(g.pot)}`;g.pot=0;g.phase='idle';ui();return false;}
 const riding=g.pot;g.pot=r2(g.pot+x.win);$('row'+r).classList.add('won');
 $('msg').textContent=x.win?`Row ${r+1} won ${money(x.win)} · ${money(g.pot)} riding`:`Row ${r+1}: no coins · ${money(g.pot)} riding`;
 if(r===M.ROWS-1){collect();return false;}g.phase=g.auto?'busy':'won';ui();return true;}
function collect(){if(g.pot>0){st.bals[st.di]=r2(st.bals[st.di]+g.pot);save();celebrate(g.pot);$('msg').textContent=`Collected ${money(g.pot)}!`;}g.pot=0;g.phase='idle';ui();}
async function onSpin(){if(g.phase==='busy')return;if(g.phase==='won')collect();if(!canBet()){$('msg').textContent='Out of spins at this denom — tap Reset all';return;}
 await startGame();await playRow();}
async function onPress(){if(g.phase!=='won')return;await playRow();}
async function onMax(){if(g.phase!=='idle'||!canBet())return;await startGame();g.auto=true;while(await playRow()){await sleep(T(350));}}
function celebrate(amt){const big=amt>=BET(g.denom)*5;$('big').textContent=(big?'BIG WIN! ':'')+'+'+money(amt);$('big').classList.remove('show');void $('big').offsetWidth;$('big').classList.add('show');sfx.collect();
 for(let i=0;i<(big?70:20);i++){const c=document.createElement('div');c.className='confetti';c.style.left=Math.random()*100+'vw';c.style.background=`hsl(${Math.random()*360},90%,60%)`;c.style.animationDuration=1.5+Math.random()*1.5+'s';document.body.appendChild(c);setTimeout(()=>c.remove(),3200);}}
// ---- ui ----
$('dens').innerHTML=D.map(d=>`<button class="den">${money(d)}<b class=bt>bet $${BET(d)}</b><i></i></button>`).join('');
const dens=[...document.querySelectorAll('.den')];
dens.forEach((b,i)=>b.onclick=()=>{if(g.phase!=='idle')return;st.di=i;save();clearBoard();$('msg').textContent=`${money(D[i])} denom · bet $${BET(D[i])} per game`;tone(600,.05);ui();});
function ui(){const b=st.bals[st.di],idle=g.phase==='idle';$('bal').textContent=money(b);$('pot').textContent=money(g.pot);
 $('mute').textContent=st.muted?'🔇':'🔊';dens.forEach((e,i)=>{e.classList.toggle('on',i===st.di);e.disabled=!idle;e.querySelector('i').textContent=money(st.bals[i]);});
 $('spin').disabled=g.phase==='busy'||(idle&&!canBet());$('spin').textContent=g.phase==='won'?'COLLECT & SPIN':`SPIN $${BET(D[st.di])}`;$('max').textContent=`MAX PRESS $${BET(D[st.di])}`;$('betlbl').textContent=money(BET(D[st.di]));
 $('press').disabled=g.phase!=='won';$('press').textContent=g.phase==='won'?'PRESS':'PRESS';$('max').disabled=!idle||!canBet();
 $('reset').disabled=g.phase==='busy';}
$('spin').onclick=onSpin;$('press').onclick=onPress;$('max').onclick=onMax;
$('mute').onclick=()=>{st.muted=!st.muted;save();ui();};
$('reset').onclick=()=>{if(g.phase==='busy')return;if(confirm('Reset all four bankrolls to 100 spins each?')){st.bals=fresh().bals;g={phase:'idle',row:-1,pot:0,denom:D[st.di]};clearBoard();save();ui();$('msg').textContent='Bankrolls restored';}};
$('helpBtn').onclick=()=>{const d=D[st.di];$('helpbet').textContent=`${money(d)} denom: each game costs $${BET(d)} (four times the denom).`;$('help').classList.add('show');};
document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();onSpin();}});
if('serviceWorker' in navigator&&!FAST)navigator.serviceWorker.register('sw.js');
window.__game={get st(){return st},get g(){return g},onSpin,onPress,onMax,collect};
ui();
