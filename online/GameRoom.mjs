import {offerFor,roundDurationFor} from '../src/economy.js';
import {Room} from '@colyseus/core';
import {randomBytes,randomInt} from 'node:crypto';
import {createMatch,resolve,availableMoves,defaultNames} from '../src/core.js';

export function cleanName(name,fallback='مهمان'){
  return typeof name==='string'?name.replace(/[\u0000-\u001f\u007f<>\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,24)||fallback:fallback;
}

export class GameRoom extends Room {
  onCreate(options={}){
    this.roomId=randomBytes(4).toString('hex').toUpperCase();
    this.mode=['party','advanced'].includes(options.mode)?options.mode:'rps';
    this.capacity=this.mode!=='party'?2:Math.min(8,Math.max(3,Number.isInteger(options.capacity)?options.capacity:4));
    this.rounds=this.mode==='party'?1:[1,3,5,7,9].includes(options.rounds)?options.rounds:3;
    this.maxClients=this.capacity;this.maxMessagesPerSecond=15;
    this.quick=this.constructor.quickMatch===true;
    this.members=new Map();this.stage=this.quick?'matching':'lobby';this.match=null;this.selected={};this.notice='';this.matchId='';this.revealed={};this.fillBots=this.quick||options.fillBots===true;
    this.matchingDeadline=this.quick?Date.now()+5000:0;this.lastPublished=0;this.automatic=[];
    void this.setPrivate(!this.quick);
    this.onMessage('sync',client=>this.sendSnapshot(client));
    this.onMessage('ready',(client,data)=>{const p=this.members.get(client.sessionId);if(p&&this.stage==='lobby'){p.ready=data===true;this.publish();}});
    this.onMessage('start',client=>{if(client.sessionId===this.hostId)this.begin();});
    this.onMessage('move',(client,data)=>this.choose(client,data));
    this.onMessage('rematch',client=>{if(client.sessionId===this.hostId&&this.stage==='finished'){this.reset('برای مسابقهٔ تازه آماده شوید.');}});
    this.clock.setInterval(()=>this.tick(),100);
  }
  onAuth(){return this.stage==='lobby'||this.stage==='matching';}
  onJoin(client,options={},auth={}){
    if(!['lobby','matching'].includes(this.stage))throw Error('Match already started');
    if(!this.hostId)this.hostId=client.sessionId;
    const used=new Set([...this.members.values()].map(p=>p.name));
    const base=cleanName(options.name,defaultNames[this.members.size%8]);let name=base,i=2;
    while(used.has(name))name=base.slice(0,19)+` ${i++}`;
    this.members.set(client.sessionId,{sessionId:client.sessionId,socialId:auth?.socialId||null,name,avatar:Number.isInteger(options.avatar)&&options.avatar>=0&&options.avatar<10?options.avatar:this.members.size%4,connected:true,ready:this.quick});
    this.publish();
    if(this.quick&&this.members.size===this.capacity)this.begin();
  }
  onDrop(client){const p=this.members.get(client.sessionId);if(p){p.connected=false;this.publish();}this.allowReconnection(client,30);}
  onReconnect(client){const p=this.members.get(client.sessionId);if(p){p.connected=true;this.publish();}}
  onLeave(client){
    const p=this.members.get(client.sessionId);this.members.delete(client.sessionId);
    if(this.hostId===client.sessionId)this.hostId=this.members.keys().next().value;
    if(this.stage!=='lobby'&&this.stage!=='finished')this.reset(`${p?.name||'یک بازیکن'} از اتاق خارج شد؛ مسابقه بدون ثبت نتیجه لغو شد.`);
    else this.publish();
  }
  onDispose(){if(this.socialService&&this.matchId)void this.socialService.refundMatch(this.matchId).catch(()=>{});}
  reset(notice=''){
    if(this.socialService&&this.matchId)void this.socialService.refundMatch(this.matchId).catch(()=>{});
    this.stage=this.quick?'matching':'lobby';this.match=null;this.selected={};this.revealed={};this.deadline=0;this.notice=notice;this.matchId='';this.automatic=[];this.matchingDeadline=this.quick?Date.now()+5000:0;
    for(const p of this.members.values())p.ready=this.quick;
    void this.unlock();this.publish();
  }
  async begin(){
    if(!['lobby','matching'].includes(this.stage))return;
    const members=[...this.members.values()];
    const min=this.mode==='party'?3:2;
    if(!members.length||members.some(p=>!p.connected||!p.ready)){this.notice='همهٔ بازیکنان باید متصل و آماده باشند.';this.publish();return;}
    if(!this.fillBots&&members.length<this.capacity){this.notice=`برای این حالت ${this.capacity} بازیکن لازم است.`;this.publish();return;}
    const players=members.map(p=>({name:p.name,avatar:p.avatar,bot:false,sessionId:p.sessionId}));
    if(this.fillBots)while(players.length<this.capacity){const i=players.length;const name=defaultNames.find(n=>!players.some(p=>p.name===n))||`دوست ${i+1}`;players.push({name,avatar:i%4,bot:true,sessionId:null});}
    if(players.length<min)return;
    this.stage='starting';this.matchId=randomBytes(12).toString('hex');const entryMatch=this.matchId;
    try{if(this.socialService)await this.socialService.chargeEntries(entryMatch,members.map(p=>p.socialId).filter(Boolean),this.mode,this.rounds,this.capacity);}catch(error){this.reset(error.status?error.message:'ثبت ورودی انجام نشد؛ دوباره تلاش کن.');return;}
    if(this.stage!=='starting'||this.matchId!==entryMatch){if(this.socialService)void this.socialService.refundMatch(entryMatch).catch(()=>{});return;}
    this.match=createMatch(this.mode,players,this.rounds);
    void this.lock();this.roundStart();
  }
  roundStart(){
    if(this.match.history.length>=250){this.reset('تعداد دست‌ها به سقف این جلسه رسید؛ یک مسابقهٔ تازه بسازید.');return;}
    this.roundResult=null;this.stage='choosing';this.notice='';this.selected={};this.revealed={};this.automatic=[];this.roundDurationMs=roundDurationFor(this.match);this.deadline=Date.now()+this.roundDurationMs;
    const available=availableMoves(this.mode,this.match.players.filter(p=>p.active).length);
    for(const p of this.match.players)if(p.active&&p.bot)this.selected[p.id]=this.botMove(available);
    this.resolveIfComplete();
    this.publish();
  }
  botMove(available){return available[randomInt(available.length)];}
  resolveIfComplete(){
    if(this.stage!=='choosing'||!this.match.players.filter(p=>p.active).every(p=>Object.hasOwn(this.selected,p.id)))return;
    const before=this.match.players.map(p=>({wins:p.wins,score:p.score}));
    const result=resolve(this.match,this.selected);
    const scorer=this.match.players.find(p=>p.wins>before[p.id].wins);
    const championBonus=scorer&&this.match.winner===scorer.id?200:0;
    this.roundResult={round:this.match.round,winnerId:scorer?.id??null,eliminatedId:result.eliminated?.id??null,tie:!scorer&&!result.eliminated,points:scorer?scorer.score-before[scorer.id].score-championBonus:0,championBonus};this.revealed={...this.selected};this.notice=result.message+(this.automatic.length?' • انتخاب‌های ناتمام خودکار ثبت شدند.':'');
    if(this.match.winner!==null&&this.socialService){const winner=this.match.players.find(p=>p.id===this.match.winner),member=this.members.get(winner.sessionId);void this.socialService.settleMatch(this.matchId,member?.socialId||null,this.mode,this.match.players.map(p=>({socialId:this.members.get(p.sessionId)?.socialId,wins:p.wins}))).catch(()=>{});}
    this.stage=this.match.winner!==null?'finished':'reveal';this.deadline=this.stage==='reveal'?Date.now()+2200:0;
  }
  expireRound(){
    if(this.stage!=='choosing')return;
    const available=availableMoves(this.mode,this.match.players.filter(p=>p.active).length);
    for(const p of this.match.players)if(p.active&&!Object.hasOwn(this.selected,p.id)){this.selected[p.id]=this.botMove(available);this.automatic.push(p.id);}
    this.resolveIfComplete();this.publish();
  }
  choose(client,data){
    if(this.stage!=='choosing'||!data||data.matchId!==this.matchId||data.round!==this.match.round)return;
    if(Date.now()>=this.deadline){this.expireRound();return;}
    const player=this.match.players.find(p=>p.sessionId===client.sessionId&&p.active&&!p.bot);
    if(!player||Object.hasOwn(this.selected,player.id))return;
    const available=availableMoves(this.mode,this.match.players.filter(p=>p.active).length);
    if(!available.includes(data.move))return;
    this.selected[player.id]=data.move;
    this.resolveIfComplete();
    this.publish();
  }
  tick(){
    if(this.stage==='matching'&&Date.now()>=this.matchingDeadline)this.begin();
    else if(this.stage==='choosing'&&Date.now()>=this.deadline)this.expireRound();
    else if(this.stage==='reveal'&&Date.now()>=this.deadline){this.match.round++;this.roundStart();}
    else if(['matching','choosing','reveal'].includes(this.stage)&&Date.now()-this.lastPublished>=200)this.publish();
  }
  snapshot(sessionId){
    const players=this.match?this.match.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,bot:p.bot,active:p.active,wins:p.wins,score:p.score,connected:p.bot||this.members.get(p.sessionId)?.connected===true,committed:Object.hasOwn(this.selected,p.id)})):[];
    const me=this.match?.players.find(p=>p.sessionId===sessionId);
    const socialId=this.members.get(sessionId)?.socialId;
    return {roundDurationMs:this.roundDurationMs||5000,economy:offerFor(this.mode,this.rounds,this.capacity),wallet:socialId&&this.socialService?this.socialService.wallet(socialId):null,reward:this.stage==='finished'&&socialId&&this.socialService?this.socialService.rewardFor(this.matchId,socialId):null,roomId:this.roomId,selfId:me?.id??null,host:this.hostId===sessionId,mode:this.mode,capacity:this.capacity,rounds:this.rounds,fillBots:this.fillBots,quickMatch:this.quick,matchingDeadline:this.matchingDeadline,automatic:this.automatic,stage:this.stage,matchId:this.matchId,round:this.match?.round??0,deadline:this.deadline??0,serverTime:Date.now(),winner:this.match?.winner??null,notice:this.notice,members:[...this.members.values()].map(p=>({name:p.name,avatar:p.avatar,connected:p.connected,ready:p.ready,self:p.sessionId===sessionId,host:p.sessionId===this.hostId})),players,summary:this.stage==='finished'?{roundsPlayed:this.match.history.length,decisive:this.match.decisive,lastRounds:this.match.history.slice(-3).reverse()}:null,roundResult:['reveal','finished'].includes(this.stage)?this.roundResult??null:null,choices:this.stage==='reveal'||this.stage==='finished'?this.revealed:{}};
  }
  sendSnapshot(client){client.send('snapshot',this.snapshot(client.sessionId));}
  publish(){this.lastPublished=Date.now();for(const client of this.clients)this.sendSnapshot(client);}
}
export class QuickMatchRoom extends GameRoom {static quickMatch=true;}
