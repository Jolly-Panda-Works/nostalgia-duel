import {test} from 'node:test';import assert from 'node:assert/strict';import {SocialService} from '../online/SocialService.mjs';import {ChainReader,networks} from '../online/ShopService.mjs';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {startOnlineServer} from '../online/server.mjs';
const hash='0x'+'1'.repeat(64),btcHash='2'.repeat(64);
test('HTTP shop requires authentication and ignores client-supplied price, recipient and coin amount',async()=>{
 const {server,port,social}=await startOnlineServer({port:0,host:'127.0.0.1'});social.shop.reader={height:async()=>100,verify:async()=>({status:'confirmed'})};
 const base=`http://127.0.0.1:${port}/api/social`;try{
  const a=await social.register('بازیکن اول',0),b=await social.register('بازیکن دوم',0);
  assert.equal((await fetch(base+'/shop')).status,401);
  const req=(token,path,body)=>fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const response=await req(a.token,'/shop/orders',{packId:'pouch',network:'bnb',coins:999999,amount:'0',address:'attacker'}),o=await response.json();assert.equal(response.status,200);assert.equal(o.coins,300);assert.equal(o.address,networks.bnb.address);assert.ok(BigInt(o.units)>networks.bnb.base);
  assert.equal((await req(b.token,'/shop/orders/'+o.id+'/check',{txHash:hash})).status,404);assert.deepEqual((await(await req(b.token,'/shop')).json()).orders,[]);
  const paid=await(await req(a.token,'/shop/orders/'+o.id+'/check',{txHash:hash,coins:999999})).json();assert.equal(paid.wallet.coins,600);
 }finally{await server.gracefullyShutdown(false);}
});
test('failed network or disk cannot report or grant a successful purchase',async()=>{
 const s=await SocialService.create(null),a=await s.register('خریدار',0),u=s.authenticate(a.token);s.shop.reader={height:async()=>100,verify:async()=>({status:'confirmed'})};
 const o=await s.shop.create(u,'pouch','bnb');const save=s.save;s.save=async()=>{throw Error('disk failure');};await assert.rejects(()=>s.shop.check(u,o.id,hash));assert.equal(u.coins,300);assert.equal(o.status,'awaiting');s.save=save;
 s.shop.reader.verify=async()=>{throw Error('network offline');};await assert.rejects(()=>s.shop.check(u,o.id,hash));assert.equal(u.coins,300);assert.equal(o.status,'awaiting');
 s.shop.reader.verify=async()=>({status:'confirmed'});await s.shop.check(u,o.id,hash);assert.equal(u.coins,600);
});
test('invoices bind server prices, unique exact amounts, ownership and once-only durable credit',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'shop-test-')),file=path.join(folder,'social.json');try{
  const s=await SocialService.create(file),a=await s.register('خریدار',0),b=await s.register('دیگری',0),u=s.authenticate(a.token),v=s.authenticate(b.token);
  let confirmed=false;s.shop.reader={height:async()=>100,verify:async()=>({status:confirmed?'confirmed':'pending',message:'waiting'})};
  const o=await s.shop.create(u,'pouch','ethereum');assert.equal(o.coins,300);assert.match(o.uri,/ethereum:0x.*@1\?value=/);assert.equal((await s.shop.create(u,'pouch','ethereum')).id,o.id);
  const other=await s.shop.create(v,'pouch','ethereum');assert.notEqual(o.units,other.units);await assert.rejects(()=>s.shop.check(v,o.id,hash),e=>e.status===404);
  await s.shop.check(u,o.id,hash);assert.equal(u.coins,300);confirmed=true;
  await Promise.all([s.shop.check(u,o.id,hash),s.shop.check(u,o.id,hash)]);assert.equal(u.coins,600);
  await assert.rejects(()=>s.shop.check(v,other.id,hash),e=>e.status===409);
  const restored=await SocialService.create(file);assert.equal(restored.authenticate(a.token).coins,600);assert.equal(restored.purchaseOrders.find(x=>x.id===o.id).status,'paid');
  await restored.shop.check(restored.authenticate(a.token),o.id,hash);assert.equal(restored.authenticate(a.token).coins,600);
  await assert.rejects(()=>s.shop.create(u,'fake','bnb'));await assert.rejects(()=>s.shop.create(u,'pouch','fake'));
  const pending=await s.shop.create(u,'chest','bnb');confirmed=false;await s.shop.check(u,pending.id,hash);confirmed=true;await s.shop.poll();assert.equal(u.coins,1400);
 }finally{await rm(folder,{recursive:true,force:true});}
});
function evmFixture(network='ethereum'){
 const reader=new ChainReader(),order={network,address:networks[network].address,units:'300000000000001',startHeight:100,expires:Date.now()+10000};
 const tx={hash,to:order.address,value:'0x'+BigInt(order.units).toString(16),input:'0x',blockHash:'block'},receipt={transactionHash:hash,status:'0x1',blockNumber:'0x65',blockHash:'block'},block={hash:'block',number:'0x65',timestamp:'0x'+Math.floor(Date.now()/1000).toString(16)};
 let tip=120,finalized=101,chain=network==='ethereum'?1:56;
 reader.rpc=async(_n,method,args)=>({eth_chainId:'0x'+chain.toString(16),eth_blockNumber:'0x'+tip.toString(16),eth_getTransactionByHash:tx,eth_getTransactionReceipt:receipt,eth_getBlockByNumber:args?.[0]==='finalized'?{number:'0x'+finalized.toString(16)}:block})[method];
 return{reader,order,tx,receipt,block,setTip:n=>tip=n,setFinal:n=>finalized=n,setChain:n=>chain=n};
}
test('EVM verifier rejects wrong network, amount, recipient, failure, old or late blocks; waits for finality',async()=>{
 const f=evmFixture();assert.equal((await f.reader.verify(f.order,hash)).status,'confirmed');
 f.setFinal(100);assert.equal((await f.reader.verify(f.order,hash)).status,'pending');f.setFinal(101);
 for(const [target,key,value]of [[f.tx,'value','0x1'],[f.tx,'to','0x'+'9'.repeat(40)],[f.tx,'input','0x1234'],[f.receipt,'status','0x0'],[f.order,'startHeight',101],[f.order,'expires',1]]){const old=target[key];target[key]=value;await assert.rejects(()=>f.reader.verify(f.order,hash));target[key]=old;}
 f.block.hash='reorg';assert.equal((await f.reader.verify(f.order,hash)).status,'pending');f.setChain(56);await assert.rejects(()=>f.reader.verify(f.order,hash));
 const b=evmFixture('bnb');b.setTip(114);assert.equal((await b.reader.verify(b.order,hash)).status,'pending');b.setTip(115);assert.equal((await b.reader.verify(b.order,hash)).status,'confirmed');
});
test('Bitcoin requires exact native outputs, canonical block and six confirmations',async()=>{
 const reader=new ChainReader(),o={network:'bitcoin',address:networks.bitcoin.address,units:'10001',startHeight:100,expires:Date.now()+10000};let tip=106,canonical='block';
 const tx={txid:btcHash,vout:[{scriptpubkey_address:o.address,value:10001}],status:{confirmed:true,block_height:101,block_hash:'block',block_time:Math.floor(Date.now()/1000)}};
 reader.get=async url=>url.includes('/tx/')?tx:url.includes('/block-height/')?canonical:String(tip);
 assert.equal((await reader.verify(o,btcHash)).status,'confirmed');tip=105;assert.equal((await reader.verify(o,btcHash)).status,'pending');tip=106;canonical='other';assert.equal((await reader.verify(o,btcHash)).status,'pending');canonical='block';
 tx.vout[0].value--;await assert.rejects(()=>reader.verify(o,btcHash));tx.vout[0].value++;o.startHeight=101;await assert.rejects(()=>reader.verify(o,btcHash));
});
