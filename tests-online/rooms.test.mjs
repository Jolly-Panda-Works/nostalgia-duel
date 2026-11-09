import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@colyseus/sdk';
import {matchMaker} from '@colyseus/core';
import {startOnlineServer} from '../online/server.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const states=new WeakMap();
function watch(room){room.reconnection.minUptime=0;const messages=[];states.set(room,messages);room.onMessage('snapshot',snapshot=>messages.push(snapshot));room.send('sync');return room;}
async function wait(room,predicate,timeout=6500){const start=Date.now();while(Date.now()-start<timeout){const snapshot=states.get(room)?.at(-1);if(snapshot&&predicate(snapshot))return snapshot;await sleep(20);}throw Error('Snapshot timeout: '+JSON.stringify(states.get(room)?.at(-1)));}
function move(room,state,choice,extra={}){room.send('move',{round:state.round,matchId:state.matchId,move:choice,...extra});}

test('live Colyseus rooms enforce authority, privacy, reconnection, party rules and leave handling',{timeout:45000},async()=>{
  const {server,port}=await startOnlineServer({port:0,host:'127.0.0.1'}),client=new Client(`http://127.0.0.1:${port}`),rooms=[];
  const keep=room=>{rooms.push(room);return watch(room);};
  try{
    const a=keep(await client.create('nostalgia',{mode:'rps',rounds:1,name:'آرش'}));
    const b=keep(await client.joinById(a.roomId,{name:'ترانه'}));
    let initial=await wait(a,s=>s.members.length===2);assert.equal(initial.members[0].name,'آرش');assert.equal(initial.members[1].name,'ترانه');
    b.send('start');await sleep(80);assert.equal((await wait(b,()=>true)).stage,'lobby');
    a.send('ready',true);b.send('ready',true);await wait(a,s=>s.members.every(p=>p.ready));a.send('start');
    const choosing=await wait(a,s=>s.stage==='choosing');await wait(b,s=>s.stage==='choosing');
    a.send('move',{move:'paper',round:999,matchId:choosing.matchId});move(a,choosing,'palm');await sleep(80);assert.equal((await wait(a,()=>true)).players[0].committed,false);
    move(a,choosing,'rock');move(a,choosing,'paper');
    const hidden=await wait(b,s=>s.players[0].committed);assert.deepEqual(hidden.choices,{});assert.equal('selected' in hidden,false);
    const reconnect=new Promise(resolve=>a.onReconnect.once(resolve));const oldSession=a.sessionId;void a.leave(false);await Promise.race([reconnect,sleep(6000).then(()=>{throw Error('Reconnect timed out');})]);
    a.send('sync');const restored=await wait(a,s=>s.stage==='choosing'&&s.players[0].committed);assert.equal(a.sessionId,oldSession);assert.deepEqual(restored.choices,{});
    move(b,choosing,'scissors');const result=await wait(a,s=>s.stage==='finished');assert.equal(result.winner,0);assert.equal(result.choices[0],'rock');assert.equal(result.players[0].score,300);
    await assert.rejects(()=>client.joinById(a.roomId,{name:'نباید وارد شود'}));
    b.send('rematch');await sleep(80);assert.equal((await wait(a,()=>true)).stage,'finished');a.send('rematch');await wait(b,s=>s.stage==='lobby');
    await a.leave();const transferred=await wait(b,s=>s.members.length===1);assert.equal(transferred.host,true);

    const p0=keep(await client.create('nostalgia',{mode:'party',capacity:3,name:'سامان'}));
    const p1=keep(await client.joinById(p0.roomId,{name:'رها'}));const p2=keep(await client.joinById(p0.roomId,{name:'رها'}));
    await wait(p0,s=>s.members.length===3);assert.equal(new Set((await wait(p0,()=>true)).members.map(p=>p.name)).size,3);
    for(const p of [p0,p1,p2])p.send('ready',true);await wait(p0,s=>s.members.every(p=>p.ready));p0.send('start');const party=await wait(p0,s=>s.stage==='choosing');
    move(p0,party,'palm');move(p1,party,'back');const partyHidden=await wait(p2,s=>s.players[0].committed&&s.players[1].committed);assert.deepEqual(partyHidden.choices,{});
    move(p2,party,'back');const eliminated=await wait(p1,s=>s.stage==='reveal');assert.equal(eliminated.players[0].active,false);assert.equal(eliminated.players.filter(p=>p.active).length,2);
    const final=await wait(p1,s=>s.stage==='choosing'&&s.round===2);move(p0,final,'rock');await sleep(80);assert.equal((await wait(p1,()=>true)).players[0].committed,false);
    move(p1,final,'paper');move(p2,final,'rock');const champion=await wait(p2,s=>s.stage==='finished');assert.equal(champion.winner,1);

    const c0=keep(await client.create('nostalgia',{mode:'rps',name:'باران'}));const c1=keep(await client.joinById(c0.roomId,{name:'پویا'}));
    await wait(c0,s=>s.members.length===2);c0.send('ready',true);c1.send('ready',true);await wait(c0,s=>s.members.every(p=>p.ready));c0.send('start');await wait(c1,s=>s.stage==='choosing');await c0.leave();
    const cancelled=await wait(c1,s=>s.stage==='lobby'&&s.members.length===1);assert.match(cancelled.notice,/لغو/);assert.equal(cancelled.host,true);assert.equal(cancelled.players.length,0);

    const crowd=[keep(await client.create('nostalgia',{mode:'party',capacity:8,name:'آرش'}))];
    for(let i=1;i<8;i++)crowd.push(keep(await client.joinById(crowd[0].roomId,{name:`دوست ${i}`})));
    await wait(crowd[0],s=>s.members.length===8);for(const p of crowd)p.send('ready',true);await wait(crowd[0],s=>s.members.every(p=>p.ready));crowd[0].send('start');const eight=await wait(crowd[0],s=>s.stage==='choosing');
    for(let i=0;i<8;i++)move(crowd[i],eight,i===0?'palm':'back');const eightResult=await wait(crowd[7],s=>s.stage==='reveal');assert.equal(eightResult.players.length,8);assert.equal(eightResult.players.filter(p=>p.active).length,7);assert.equal(eightResult.players[0].active,false);

    const spectator=keep(await client.create('nostalgia',{mode:'party',capacity:3,fillBots:true,name:'ناظر'}));await wait(spectator,s=>s.members.length===1);
    const botFixture=matchMaker.getLocalRoomById(spectator.roomId);let draw=0;
    // Control only the test server's RNG: eliminate the human, then force a decisive bot duel.
    botFixture.botMove=available=>available.includes('back')?'back':available[(draw++)%2];
    spectator.send('ready',true);await wait(spectator,s=>s.members[0].ready);spectator.send('start');const withBots=await wait(spectator,s=>s.stage==='choosing');move(spectator,withBots,'palm');await wait(spectator,s=>s.stage==='reveal'&&!s.players[0].active);const botsFinished=await wait(spectator,s=>s.stage==='finished');assert.equal(botsFinished.players[botsFinished.winner].bot,true);
  }finally{
    await Promise.allSettled(rooms.map(r=>r.leave()));await server.gracefullyShutdown(false);
  }
});
