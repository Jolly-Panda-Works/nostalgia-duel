import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@colyseus/sdk';
import {startOnlineServer} from '../online/server.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('quick matchmaking shares settings, fills at five seconds and expires choices',{timeout:23000},async()=>{
 const {server,port}=await startOnlineServer({port:0,host:'127.0.0.1'}),client=new Client(`http://127.0.0.1:${port}`),rooms=[];
 const latest=new Map();const join=async options=>{const room=await client.joinOrCreate('quick_match',options);rooms.push(room);room.onMessage('snapshot',s=>latest.set(room,s));room.send('sync');return room;};
 const wait=async(room,predicate)=>{const start=Date.now();while(Date.now()-start<6500){const s=latest.get(room);if(s&&predicate(s))return s;await sleep(20);}throw Error('timeout '+JSON.stringify(latest.get(room)));};
 try{
  const a=await join({mode:'rps',rounds:1,name:'آرش',capacity:2});await wait(a,s=>s.stage==='matching');
  const b=await join({mode:'rps',rounds:1,name:'رها',capacity:2});assert.equal(a.roomId,b.roomId);
  const choosing=await wait(a,s=>s.stage==='choosing');assert.ok(choosing.deadline-choosing.serverTime<=5000);assert.deepEqual(choosing.choices,{});
  const soloStarted=Date.now(),solo=await join({mode:'party',rounds:1,capacity:3,name:'ترانه'});assert.notEqual(solo.roomId,a.roomId);
  const filled=await wait(solo,s=>s.stage==='choosing');assert.ok(Date.now()-soloStarted>=4800);assert.equal(filled.players.length,3);assert.ok(filled.players.every(p=>!p.name.includes('کامپیوتر')&&!p.name.includes('بات')));
  const expired=await wait(a,s=>s.stage==='reveal'||s.stage==='finished');assert.equal(expired.automatic.length,2);assert.equal(Object.keys(expired.choices).length,2);
  const round=await wait(solo,s=>s.stage==='reveal'||s.stage==='finished');assert.equal(round.automatic.length,1);assert.ok(Object.values(round.choices).every(m=>['palm','back'].includes(m)));
 }finally{await Promise.allSettled(rooms.map(r=>r.leave()));await server.gracefullyShutdown(false);}
});
