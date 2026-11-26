import {availableMoves,createMatch,matchFormat,resolveRound} from './core.js';
import {roundDurationFor} from './economy.js';

export function createLocalMatch({mode,name,avatar},publish){
  const {capacity,rounds}=matchFormat(mode);
  const players=[{name,avatar,bot:false},...Array.from({length:capacity-1},(_,i)=>({
    name:i===0?'بات اول':'بات دوم',avatar:i+1,bot:true
  }))];
  const match=createMatch(mode,players,rounds);
  const matchId='local-'+performance.now();
  let stage,deadline,duration,choices,result,timer,closed=false;
  const active=()=>match.players.filter(player=>player.active);
  function randomMove(){
    const moves=availableMoves(mode,active().length);
    return moves[Math.floor(Math.random()*moves.length)];
  }
  function emit(){
    publish({local:true,mode,capacity,rounds,matchId,stage,deadline,roundDurationMs:duration,
      serverTime:Date.now(),round:match.round,selfId:0,quickMatch:true,members:[],roomId:'',
      players:match.players.map(p=>({...p,connected:true,committed:Object.hasOwn(choices,p.id)})),
      choices:stage==='choosing'?{}:{...choices},winner:match.winner,roundResult:result,
      summary:stage==='finished'?{roundsPlayed:match.history.length,lastRounds:match.history.slice(-3).reverse()}:null});
  }
  function finishRound(){
    if(closed||stage!=='choosing')return;
    clearTimeout(timer);
    for(const player of active())choices[player.id]??=randomMove();
    result=resolveRound(match,choices);
    stage=match.winner===null?'reveal':'finished';
    deadline=0;
    emit();
    if(stage==='reveal')timer=setTimeout(()=>{match.round++;startRound();},1800);
  }
  function startRound(){
    if(closed)return;
    choices={};result=null;stage='choosing';duration=roundDurationFor(match);deadline=Date.now()+duration;
    emit();
    timer=setTimeout(finishRound,match.players[0].active?duration:650);
  }
  return {start:startRound,choose(move){
    if(closed||stage!=='choosing'||!match.players[0].active)return;
    if(Date.now()<deadline&&availableMoves(mode,active().length).includes(move))choices[0]=move;
    finishRound();
  },close(){closed=true;clearTimeout(timer);}};
}
