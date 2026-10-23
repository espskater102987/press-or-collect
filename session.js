// ---- Session tracking. Set SESSION_ENDPOINT to your Apps Script web-app URL (write-only). Empty = local only.
const SESSION_ENDPOINT='https://script.google.com/macros/s/AKfycbzdO8_9QW4J9Mq7sSuqB7YOsjEkN6PMYmawnyBvn-blZw4EgaCyjzB4HKigx5WP3-oD/exec';
const SK='poc_sessions_v1',SC='poc_session_cur',SN='poc_player';
const S={cur:null,
 name(){return localStorage.getItem(SN)||''},
 hist(){try{return JSON.parse(localStorage.getItem(SK))||[]}catch(e){return[]}},
 persist(){if(S.cur)localStorage.setItem(SC,JSON.stringify(S.cur));else localStorage.removeItem(SC);},
 start(name){S.cur={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,start:new Date().toISOString(),end:null,coinSizes:[],games:0,totalCoinIn:0,initialCoinIn:0,won:0,net:0};S.persist();},
 ensure(){if(!S.cur&&S.name())S.start(S.name());return S.cur;},
 bet(denom,amt){const c=S.ensure();if(!c)return;c.games++;c.initialCoinIn=Math.round((c.initialCoinIn+amt)*100)/100;if(!c.coinSizes.includes(denom))c.coinSizes.push(denom);c.coinSizes.sort((a,b)=>a-b);c.net=Math.round((c.won-c.initialCoinIn)*100)/100;S.persist();},
 ride(amt){const c=S.ensure();if(!c)return;c.totalCoinIn=Math.round((c.totalCoinIn+amt)*100)/100;S.persist();},// riding on each row spun
 win(amt){const c=S.ensure();if(!c)return;c.won=Math.round((c.won+amt)*100)/100;c.net=Math.round((c.won-c.initialCoinIn)*100)/100;S.persist();},
 end(reason){const c=S.cur;if(!c)return null;S.cur=null;S.persist();if(!c.games)return null;// skip empty sessions
  c.end=new Date().toISOString();c.reason=reason;c.ua=navigator.userAgent.slice(0,120);
  const h=S.hist();h.push(c);localStorage.setItem(SK,JSON.stringify(h.slice(-200)));
  const body=JSON.stringify(c);window.__beacons&&window.__beacons.push(body);
  if(SESSION_ENDPOINT){try{if(!(navigator.sendBeacon&&navigator.sendBeacon(SESSION_ENDPOINT,new Blob([body],{type:'text/plain'}))))fetch(SESSION_ENDPOINT,{method:'POST',mode:'no-cors',keepalive:true,body});}catch(e){}}
  return c;}};
// recover a session left open by a crash/kill: close it with its last saved values
try{const old=JSON.parse(localStorage.getItem(SC));if(old){S.cur=old;S.end('recovered');}}catch(e){}
function askName(cb){const m=document.getElementById('nameModal'),i=document.getElementById('nameIn');i.value=S.name();m.classList.add('show');setTimeout(()=>i.focus(),50);
 document.getElementById('nameOk').onclick=()=>{const v=i.value.trim().slice(0,30);if(!v){i.focus();return;}const changed=v!==S.name();if(changed||!S.cur){S.end('name change');localStorage.setItem(SN,v);S.start(v);}m.classList.remove('show');cb&&cb();};
 i.onkeydown=e=>{if(e.key==='Enter')document.getElementById('nameOk').click();};}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')S.end('hidden');});
addEventListener('pagehide',()=>S.end('pagehide'));
window.__session=S;
