import {Room} from '@colyseus/core';
import {randomBytes,randomInt} from 'node:crypto';
import {createMatch,resolve,moves,defaultNames} from '../src/core.js';

export function cleanName(name,fallback='مهمان'){
  return typeof name==='string'?name.replace(/[\u0000-\u001f\u007f<>\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,24)||fallback:fallback;
}

export class GameRoom extends Room {
  onCreate(options={}){
    this.roomId=randomBytes(4).toString('hex').toUpperCase();
    this.mode=options.mode==='party'?'party':'rps';
    this.capacity=this.mode==='rps'?2:Math.min(8,Math.max(3,Number.isInteger(options.capacity)?options.capacity:4));
    this.rounds=[1,3,5,7,9].includes(options.rounds)?options.rounds:3;
    this.maxClients=this.capacity;this.maxMessagesPerSecond=15;
    this.members=new Map();this.stage='lobby';this.match=null;this.selected={};this.notice='';this.matchId='';this.revealed={};this.fillBots=options.fillBots===true;
    void this.setPrivate(true);
    this.onMessage('sync',client=>this.sendSnapshot(client));
    this.onMessage('ready',(client,data)=>{const p=this.members.get(client.sessionId);if(p&&this.stage==='lobby'){p.ready=data===true;this.publish();}});
    this.onMessage('start',client=>{if(client.sessionId===this.hostId)this.begin();});
    this.onMessage('move',(client,data)=>this.choose(client,data));
    this.onMessage('rematch',client=>{if(client.sessionId===this.hostId&&this.stage==='finished'){this.reset('برای مسابقهٔ تازه آماده شوید.');}});
    this.clock.setInterval(()=>this.tick(),1000);
  }
  onAuth(){return this.stage==='lobby';}
  onJoin(client,options={}){
    if(this.stage!=='lobby')throw Error('Match already started');
    if(!this.hostId)this.hostId=client.sessionId;
    const used=new Set([...this.members.values()].map(p=>p.name));
    const base=cleanName(options.name,defaultNames[this.members.size%8]);let name=base,i=2;
    while(used.has(name))name=base.slice(0,19)+` ${i++}`;
    this.members.set(client.sessionId,{sessionId:client.sessionId,name,avatar:Number.isInteger(options.avatar)&&options.avatar>=0&&options.avatar<4?options.avatar:this.members.size%4,connected:true,ready:false});
    this.publish();
  }
  onDrop(client){const p=this.members.get(client.sessionId);if(p){p.connected=false;this.publish();}this.allowReconnection(client,30);}
  onReconnect(client){const p=this.members.get(client.sessionId);if(p){p.connected=true;this.publish();}}
  onLeave(client){
    const p=this.members.get(client.sessionId);this.members.delete(client.sessionId);
    if(this.hostId===client.sessionId)this.hostId=this.members.keys().next().value;
    if(this.stage!=='lobby'&&this.stage!=='finished')this.reset(`${p?.name||'یک بازیکن'} از اتاق خارج شد؛ مسابقه بدون ثبت نتیجه لغو شد.`);
    else this.publish();
  }
  reset(notice=''){
    this.stage='lobby';this.match=null;this.selected={};this.revealed={};this.deadline=0;this.notice=notice;this.matchId='';
    for(const p of this.members.values())p.ready=false;
    void this.unlock();this.publish();
  }
  begin(){
    if(this.stage!=='lobby')return;
    const members=[...this.members.values()];
    const min=this.mode==='party'?3:2;
    if(!members.length||members.some(p=>!p.connected||!p.ready)){this.notice='همهٔ بازیکنان باید متصل و آماده باشند.';this.publish();return;}
    if(!this.fillBots&&members.length<min){this.notice=`برای این حالت حداقل ${min} بازیکن لازم است.`;this.publish();return;}
    const players=members.map(p=>({name:p.name,avatar:p.avatar,bot:false,sessionId:p.sessionId}));
    if(this.fillBots)while(players.length<this.capacity){const i=players.length;players.push({name:`${defaultNames[i%8]} (کامپیوتر)`,avatar:i%4,bot:true,sessionId:null});}
    if(players.length<min)return;
    this.match=createMatch(this.mode,players,this.rounds);this.matchId=randomBytes(12).toString('hex');
    void this.lock();this.roundStart();
  }
  roundStart(){
    if(this.match.history.length>=250){this.reset('تعداد دست‌ها به سقف این جلسه رسید؛ یک مسابقهٔ تازه بسازید.');return;}
    this.stage='choosing';this.notice='';this.selected={};this.revealed={};this.deadline=Date.now()+60000;
    const available=this.match.players.filter(p=>p.active).length>2?['palm','back']:moves;
    for(const p of this.match.players)if(p.active&&p.bot)this.selected[p.id]=this.botMove(available);
    this.resolveIfComplete();
    this.publish();
  }
  botMove(available){return available[randomInt(available.length)];}
  resolveIfComplete(){
    if(this.stage!=='choosing'||!this.match.players.filter(p=>p.active).every(p=>Object.hasOwn(this.selected,p.id)))return;
    const result=resolve(this.match,this.selected);this.revealed={...this.selected};this.notice=result.message;
    this.stage=this.match.winner!==null?'finished':'reveal';this.deadline=this.stage==='reveal'?Date.now()+4000:0;
  }
  choose(client,data){
    if(this.stage!=='choosing'||!data||data.matchId!==this.matchId||data.round!==this.match.round)return;
    const player=this.match.players.find(p=>p.sessionId===client.sessionId&&p.active&&!p.bot);
    if(!player||Object.hasOwn(this.selected,player.id))return;
    const available=this.match.players.filter(p=>p.active).length>2?['palm','back']:moves;
    if(!available.includes(data.move))return;
    this.selected[player.id]=data.move;
    this.resolveIfComplete();
    this.publish();
  }
  tick(){
    if(this.stage==='choosing'&&Date.now()>=this.deadline)this.reset('زمان انتخاب تمام شد؛ مسابقه بدون برنده لغو شد. دوباره آماده شوید.');
    else if(this.stage==='reveal'&&Date.now()>=this.deadline){this.match.round++;this.roundStart();}
    else if(this.stage==='choosing'||this.stage==='reveal')this.publish();
  }
  snapshot(sessionId){
    const players=this.match?this.match.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,bot:p.bot,active:p.active,wins:p.wins,score:p.score,connected:p.bot||this.members.get(p.sessionId)?.connected===true,committed:Object.hasOwn(this.selected,p.id)})):[];
    const me=this.match?.players.find(p=>p.sessionId===sessionId);
    return {roomId:this.roomId,selfId:me?.id??null,host:this.hostId===sessionId,mode:this.mode,capacity:this.capacity,rounds:this.rounds,fillBots:this.fillBots,stage:this.stage,matchId:this.matchId,round:this.match?.round??0,deadline:this.deadline??0,serverTime:Date.now(),winner:this.match?.winner??null,notice:this.notice,members:[...this.members.values()].map(p=>({name:p.name,avatar:p.avatar,connected:p.connected,ready:p.ready,self:p.sessionId===sessionId,host:p.sessionId===this.hostId})),players,choices:this.stage==='reveal'||this.stage==='finished'?this.revealed:{}};
  }
  sendSnapshot(client){client.send('snapshot',this.snapshot(client.sessionId));}
  publish(){for(const client of this.clients)this.sendSnapshot(client);}
}
