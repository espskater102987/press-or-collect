// Press or Collect — 4x4 dice game math. Shared by browser (window.PressMath) and node (require).
(function(g){
const DENOMS=[0.25,0.5,1,2], BET_PER_DENOM=4, SPINS_PER_DENOM=100, ROWS=4, COLS=4;
// Door coins scale with the amount RIDING on the row (row 1 = the bet; later rows = the pot = bet + all coins so far).
// coin = floorNickel(riding/4 * craps ratio * K[row]). Ratios: 4/10 9:5, 5/9 7:5, 6/8 7:6. 7 = bomb, 2/3/11/12 = blank.
// No hidden multipliers: a row's win is exactly the sum of its coins. Tuned by sim.js.
// K[denom] = [row1, row2, row3, row4]. Rows 2-4 share one value. Per-denom because nickel rounding costs
// small coins (25c) proportionally more than big ones; one K for all denoms can't keep every strategy in 95-98%.
const K={0.25:[0.889,0.991,0.991,0.991],0.5:[0.929,0.976,0.976,0.976],1:[0.9,0.962,0.962,0.962],2:[0.9,0.956,0.956,0.956]};
const RATIO={4:9/5,10:9/5,5:7/5,9:7/5,6:7/6,8:7/6};
const nickel=v=>Math.round(Math.floor(v/0.05+1e-9)*5)/100;
function cellPay(total,riding,row,denom){const r=RATIO[total];return r?nickel(riding/4*r*K[denom][row]):0;}
function roll(rand){const a=1+Math.floor(rand()*6),b=1+Math.floor(rand()*6);return {d:[a,b],t:a+b};}
function rollRow(rand,riding,rowIdx,denom){const cells=[];let sum=0,bomb=false;
 for(let c=0;c<COLS;c++){const r=roll(rand);r.bomb=r.t===7;r.pay=r.bomb?0:cellPay(r.t,riding,rowIdx,denom);if(r.bomb)bomb=true;sum=Math.round((sum+r.pay)*100)/100;cells.push(r);}
 return {cells,sum,bomb,win:bomb?0:sum};}
// Full game for sim/tests: bet rides on row 1; pot = bet + coins so far rides on each pressed row; bomb => 0. Collect pays the pot.
function playGame(rand,denom,collectAfter){let pot=betFor(denom);for(let r=0;r<collectAfter;r++){const x=rollRow(rand,pot,r,denom);if(x.bomb)return 0;pot=Math.round((pot+x.sum)*100)/100;}return pot;}
const betFor=d=>d*BET_PER_DENOM;
const setK=(d,k)=>{K[d]=k;};
const API={setK,DENOMS,BET_PER_DENOM,betFor,SPINS_PER_DENOM,ROWS,COLS,K,RATIO,nickel,cellPay,roll,rollRow,playGame};
if(typeof module!=='undefined')module.exports=API;else g.PressMath=API;
})(this);
