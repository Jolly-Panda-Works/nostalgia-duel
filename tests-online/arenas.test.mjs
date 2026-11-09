import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@colyseus/sdk';
import {startOnlineServer} from '../online/server.mjs';
import {arenasByMode} from '../src/arenas.js';
test('arena levels are enforced for create, join, quick matchmaking and entry payment',async()=>{
 const {server,port,social}=await startOnlineServer({port:0,host:'127.0.0.1'}),sdk=new Client(`http://127.0.0.1:${port}`),rooms=[];
 try{
  const a=await social.register('آزمایشگر',0),b=await social.register('تازه وارد',1),user=social.authenticate(a.token);
  for(const mode of ['rps','advanced','party']){
   const tiers=arenasByMode[mode];
   for(const arena of tiers.slice(1)){
    const options={...arena,socialToken:a.token,minLevel:1,arenaId:tiers[0].id};
    await assert.rejects(()=>sdk.create('nostalgia',options),/لول/);
    await assert.rejects(()=>sdk.joinOrCreate('quick_match',options),/لول/);
    await assert.rejects(()=>sdk.create('nostalgia',{...arena}),/لول/);
    await assert.rejects(()=>social.chargeEntries('locked-'+arena.id,[user.id],mode,arena.rounds,arena.capacity),/لول/);
   }
  }
  assert.equal(user.coins,300);
  user.xp=100;
  const room=await sdk.create('nostalgia',{mode:'rps',rounds:3,socialToken:a.token});rooms.push(room);
  await assert.rejects(()=>sdk.joinById(room.roomId,{socialToken:b.token}),/لول/);
  await social.chargeEntries('unlocked',[user.id],'rps',3,2);assert.equal(user.coins,280);await social.refundMatch('unlocked');assert.equal(user.coins,300);
  const all=Object.values(arenasByMode).flat();assert.equal(all.length,16);assert.equal(new Set(all.map(a=>a.art)).size,16);assert.equal(new Set(all.map(a=>a.name)).size,16);
 }finally{await Promise.allSettled(rooms.map(r=>r.leave()));await server.gracefullyShutdown(false);}
});
