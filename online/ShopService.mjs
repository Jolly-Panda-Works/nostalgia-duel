import {randomBytes,randomInt} from 'node:crypto';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export const networks={
 ethereum:{name:'Ethereum Mainnet',ticker:'ETH',address:'0x4988bd4266D0b1279c8607F53A8c8C82aDF994a7',chainId:1,decimals:18,rpc:process.env.SHOP_ETH_RPC||'https://ethereum-rpc.publicnode.com',base:300000000000000n,step:1000000000n},
 bnb:{name:'BNB Smart Chain',ticker:'BNB',address:'0x4988bd4266D0b1279c8607F53A8c8C82aDF994a7',chainId:56,decimals:18,rpc:process.env.SHOP_BNB_RPC||'https://bsc-dataseed.binance.org',base:1000000000000000n,step:10000000000n},
 bitcoin:{name:'Bitcoin',ticker:'BTC',address:'bc1qxpc77z06cwmdu6dw47c4h7ajw9wpchq73hg0hz',decimals:8,api:process.env.SHOP_BTC_API||'https://blockstream.info/api',base:10000n,step:1n}
};
export const packs=[{id:'pouch',name:'کیسهٔ سکه',coins:1000,multiplier:1},{id:'chest',name:'صندوق سکه',coins:3000,multiplier:2},{id:'treasure',name:'گنجینهٔ سکه',coins:8000,multiplier:5}];
export function decimal(units,places){const s=BigInt(units).toString().padStart(places+1,'0');return (s.slice(0,-places)+'.'+s.slice(-places)).replace(/0+$/,'').replace(/\.$/,'');}
export class ChainReader{
 async get(url,plain=false){const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(r.status===404)return null;if(!r.ok)throw Error('Network unavailable');return plain?r.text():r.json();}
 async rpc(n,method,params=[]){const r=await fetch(n.rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('RPC unavailable');const data=await r.json();if(data.error)throw Error('RPC error');return data.result;}
 async height(id){const n=networks[id];if(id==='bitcoin')return Number(await this.get(n.api+'/blocks/tip/height',true));if(Number(BigInt(await this.rpc(n,'eth_chainId')))!==n.chainId)throw Error('Wrong chain');return Number(BigInt(await this.rpc(n,'eth_blockNumber')));}
 async verify(order,hash){
  const n=networks[order.network],amount=BigInt(order.units);await this.height(order.network);
  if(order.network==='bitcoin'){
   const tx=await this.get(n.api+'/tx/'+hash);if(!tx)return{status:'pending',message:'تراکنش هنوز روی شبکه پیدا نشده است.'};
   if(tx.txid!==hash)fail('شناسهٔ تراکنش با پاسخ شبکه یکسان نیست.');
   const received=(tx.vout||[]).filter(o=>o.scriptpubkey_address===order.address).reduce((sum,o)=>sum+BigInt(o.value),0n);
   if(received!==amount)fail('مقصد یا مبلغ تراکنش با فاکتور یکسان نیست.');
   if(!tx.status?.confirmed)return{status:'pending',message:'در انتظار ثبت تراکنش در بلاک…'};
   const s=tx.status;if(s.block_height<=order.startHeight||s.block_time*1000>order.expires)fail('تراکنش خارج از بازهٔ این سفارش است.');
   const canonical=await this.get(n.api+'/block-height/'+s.block_height,true);if(canonical!==s.block_hash)return{status:'pending',message:'در انتظار پایدارشدن بلاک…'};
   const confirmations=await this.height('bitcoin')-s.block_height+1;
   return confirmations>=6?{status:'confirmed',confirmations}:{status:'pending',confirmations,message:`تأیید شبکه: ${confirmations} از ۶`};
  }
  const [tx,receipt]=await Promise.all([this.rpc(n,'eth_getTransactionByHash',[hash]),this.rpc(n,'eth_getTransactionReceipt',[hash])]);
  if(!tx)return{status:'pending',message:'تراکنش هنوز روی شبکه پیدا نشده است.'};
  if(tx.hash?.toLowerCase()!==hash||tx.to?.toLowerCase()!==order.address.toLowerCase()||BigInt(tx.value)!==amount||tx.input!=='0x')fail('تراکنش باید انتقال مستقیم ارز اصلی، با مقصد و مبلغ دقیق فاکتور باشد.');
  if(!receipt)return{status:'pending',message:'در انتظار ثبت تراکنش در بلاک…'};
  if(receipt.transactionHash?.toLowerCase()!==hash||BigInt(receipt.status)!==1n)fail('تراکنش ناموفق یا نامعتبر است.');
  const height=Number(BigInt(receipt.blockNumber)),block=await this.rpc(n,'eth_getBlockByNumber',[receipt.blockNumber,false]);
  if(!block||block.hash!==receipt.blockHash||tx.blockHash!==receipt.blockHash)return{status:'pending',message:'در انتظار پایدارشدن بلاک…'};
  if(height<=order.startHeight||Number(BigInt(block.timestamp))*1000>order.expires)fail('تراکنش خارج از بازهٔ این سفارش است.');
  if(order.network==='ethereum'){
   const finalized=await this.rpc(n,'eth_getBlockByNumber',['finalized',false]);
   return finalized&&Number(BigInt(finalized.number))>=height?{status:'confirmed'}:{status:'pending',message:'در انتظار نهایی‌شدن تراکنش اتریوم…'};
  }
  const confirmations=await this.height('bnb')-height+1;
  return confirmations>=15?{status:'confirmed',confirmations}:{status:'pending',confirmations,message:`تأیید شبکه: ${confirmations} از ۱۵`};
 }
}
export class ShopService{
 constructor(social,reader=new ChainReader()){this.social=social;this.reader=reader;this.lock=Promise.resolve();this.polling=false;}
 serial(fn){const next=this.lock.then(fn);this.lock=next.catch(()=>{});return next;}
 catalog(){return{packs:packs.map(p=>({...p,prices:Object.fromEntries(Object.entries(networks).map(([id,n])=>[id,decimal(n.base*BigInt(p.multiplier),n.decimals)]))})),networks:Object.entries(networks).map(([id,n])=>({id,name:n.name,ticker:n.ticker,address:n.address})),source:'https://www.useffarahmand.com/en/support'};}
 list(user){return this.social.purchaseOrders.filter(o=>o.userId===user.id).slice(-8).reverse();}
 async create(user,packId,network){return this.serial(async()=>{
  const n=networks[network],p=packs.find(p=>p.id===packId);if(!n||!p)fail('بسته یا شبکه معتبر نیست.');
  const old=this.list(user).find(o=>o.packId===packId&&o.network===network&&o.status!=='paid'&&o.expires>Date.now());if(old)return old;
  if(this.social.purchaseOrders.length>=20000)fail('ظرفیت سفارش‌ها پُر است.',503);
  if(this.social.purchaseOrders.filter(o=>o.userId===user.id&&o.expires>Date.now()&&o.status!=='paid').length>=3)fail('ابتدا سفارش باز فعلی را تکمیل کن.');
  const startHeight=await this.reader.height(network);if(!Number.isSafeInteger(startHeight)||startHeight<1)throw Error('Invalid height');
  let units;for(let i=0;i<2000;i++){units=(n.base*BigInt(p.multiplier)+BigInt(randomInt(1,1000))*n.step).toString();if(!this.social.purchaseOrders.some(o=>o.network===network&&o.units===units))break;units=null;}if(!units)fail('برای این بسته فعلاً فاکتور تازه موجود نیست.',503);
  const amount=decimal(units,n.decimals),now=Date.now(),order={id:randomBytes(16).toString('hex'),userId:user.id,packId:p.id,coins:p.coins,network,address:n.address,units,amount,ticker:n.ticker,networkName:n.name,startHeight,created:now,expires:now+2*60*60*1000,status:'awaiting',txHash:null};
  order.uri=network==='bitcoin'?`bitcoin:${n.address}?amount=${amount}`:`ethereum:${n.address}@${n.chainId}?value=${units}`;
  this.social.purchaseOrders.push(order);try{await this.social.save();}catch(e){this.social.purchaseOrders.pop();throw e;}return order;
 });}
 async check(user,id,hash){
  const order=this.social.purchaseOrders.find(o=>o.id===id&&o.userId===user.id);if(!order)fail('سفارش پیدا نشد.',404);if(order.status==='paid')return order;
  hash=String(hash||order.txHash||'').trim().toLowerCase();if(!(order.network==='bitcoin'?/^[a-f0-9]{64}$/:/^0x[a-f0-9]{64}$/).test(hash))fail('شناسهٔ تراکنش معتبر نیست.');
  if(this.social.purchaseOrders.some(o=>o.id!==id&&o.network===order.network&&o.txHash===hash&&o.status==='paid'))fail('این تراکنش قبلاً مصرف شده است.',409);
  const result=await this.reader.verify(order,hash);return this.serial(async()=>{if(order.status==='paid')return order;if(this.social.purchaseOrders.some(o=>o.id!==id&&o.network===order.network&&o.txHash===hash&&o.status==='paid'))fail('این تراکنش قبلاً مصرف شده است.',409);const previous={...order},coins=user.coins;
  Object.assign(order,{txHash:hash,status:result.status==='confirmed'?'paid':'pending',message:result.message||'پرداخت تأیید شد و سکه اضافه شد.',confirmations:result.confirmations||0});
  if(order.status==='paid'){user.coins+=order.coins;order.paidAt=Date.now();}
  try{await this.social.save();}catch(e){Object.assign(order,previous);user.coins=coins;throw e;}return order;
 });}
 async poll(){if(this.polling)return;this.polling=true;try{for(const o of this.social.purchaseOrders.filter(o=>o.status==='pending'&&o.txHash).slice(-30)){try{await this.check(this.social.users.get(o.userId),o.id,o.txHash);}catch{}}}finally{this.polling=false;}}
}
