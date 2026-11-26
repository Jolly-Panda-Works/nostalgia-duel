import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@colyseus/sdk';
import {startOnlineServer} from '../online/server.mjs';
import {entryFees,offerFor} from '../src/economy.js';

test('all entry prices work for fresh profiles and quick queues respect the price',async()=>{
  const {server,port,social}=await startOnlineServer({port:0,host:'127.0.0.1'});
  const sdk=new Client('http://127.0.0.1:'+port),rooms=[];
  try{
    const a=await social.register('بازیکن',0),b=await social.register('هم‌بازی',1);
    const join=async(entry,token)=>{
      const room=await sdk.joinOrCreate('quick_match',{mode:'rps',rounds:3,capacity:2,entry,socialToken:token});
      rooms.push(room);
      return room;
    };
    for(const fee of entryFees){
      const match='test-'+fee;
      await social.chargeEntries(match,[a.profile.id],fee);
      assert.equal(social.wallet(a.profile.id).coins,300-fee);
      await social.refundMatch(match);
      assert.equal(social.wallet(a.profile.id).coins,300);
    }
    await assert.rejects(()=>social.chargeEntries('invalid',[a.profile.id],-10));
    const free=await join(0,a.token),paid=await join(200,b.token);
    assert.notEqual(free.roomId,paid.roomId);
    assert.equal((await join(0,b.token)).roomId,free.roomId);
    const privateRoom=await sdk.create('nostalgia',{entry:200,socialToken:a.token});
    rooms.push(privateRoom);
    social.authenticate(b.token).coins=0;
    await assert.rejects(()=>sdk.joinById(privateRoom.roomId,{entry:0,socialToken:b.token}));
    await assert.rejects(()=>sdk.create('nostalgia',{entry:10}));
    await social.chargeEntries('free',[b.profile.id],0);
    await social.settleMatch('free',b.profile.id,'party');
    assert.deepEqual(social.wallet(b.profile.id),{coins:offerFor(0).coins});
  }finally{
    await Promise.allSettled(rooms.map(room=>room.leave()));
    await server.gracefullyShutdown(false);
  }
});
