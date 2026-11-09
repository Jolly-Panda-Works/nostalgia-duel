import {themedIcon} from './icons.js';
import QRCode from 'qrcode';
import {fa} from './core.js';
const $=id=>document.getElementById(id);
export function setupShop({getFriends,escape}){
 let catalog=null,network='bnb',order=null,busy=false,polling=false,qrVersion=0;
 const request=(path='',method='GET',body)=>getFriends().shopRequest(path,method,body);
 function status(message){$('shop-status').textContent=message;}
 function wallet(value){if(value)window.dispatchEvent(new CustomEvent('wallet-update',{detail:value}));}
 function draw(){
  if(!catalog)return;
  $('shop-networks').innerHTML=catalog.networks.map(n=>`<button data-shop-network="${n.id}" aria-pressed="${network===n.id}" ${busy?'disabled':''}>${n.ticker}</button>`).join('');
  $('shop-packages').innerHTML=catalog.packs.map((p,i)=>`<button class="coin-pack" data-shop-pack="${p.id}" ${busy?'disabled':''}><span class="coin-emblem" aria-hidden="true">${themedIcon(['pouch','chest','treasure'][i])}</span><b>${fa(p.coins)} سکه</b><span>${p.name}</span><strong dir="ltr">${p.prices[network]} ${catalog.networks.find(n=>n.id===network).ticker}</strong><small>قیمت پایه + مبلغ شناسایی فاکتور</small></button>`).join('');
  $('shop-history').innerHTML=catalog.orders.map(o=>`<button data-shop-order="${o.id}" class="shop-order-row"><b>${fa(o.coins)} سکه</b><span>${o.networkName} · ${o.amount} ${o.ticker}</span><strong>${o.status==='paid'?'✓ واریز شد':Date.now()>o.expires?'زمان پرداخت تمام شد':o.status==='pending'?'در حال تأیید':'ادامهٔ پرداخت'}</strong></button>`).join('')||'<p>هنوز خریدی نداری.</p>';
 }
 async function refresh(){catalog=await request();wallet(catalog.wallet);draw();}
 async function open(){if(getFriends()===null)return;status('در حال دریافت فروشگاه…');try{await refresh();status('');}catch(e){status(e.message);}}
 async function showOrder(value){order=value;const stamp=++qrVersion;$('shop-invoice-title').textContent=fa(order.coins)+' سکه';$('shop-invoice-network').textContent=order.networkName+' • فقط '+order.ticker;$('shop-address').value=order.address;$('shop-amount').value=order.amount;$('shop-wallet-link').href=order.uri;$('shop-tx').value=order.txHash||'';$('shop-invoice-meta').textContent='کد سفارش '+order.id.slice(0,8)+' • مهلت پرداخت '+new Date(order.expires).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});$('shop-invoice-state').textContent=order.message||'مبلغ دقیق بالا را ارسال کن؛ سپس شناسهٔ تراکنش را وارد کن.';$('shop-check').disabled=order.status==='paid';$('shop-tx').disabled=order.status==='paid';$('shop-wallet-link').hidden=order.status==='paid'||Date.now()>order.expires;$('shop-qr').removeAttribute('src');if(!$('shop-invoice').open)$('shop-invoice').showModal();const url=await QRCode.toDataURL(order.uri,{width:240,margin:2,errorCorrectionLevel:'M'});if(stamp===qrVersion)$('shop-qr').src=url;}
 async function check(manual=false){if(!order||polling||order.status==='paid')return;const hash=$('shop-tx').value.trim();if(!hash)return;polling=true;$('shop-check').disabled=true;try{const data=await request('/orders/'+order.id+'/check','POST',{txHash:hash});order=data.order;wallet(data.wallet);$('shop-invoice-state').textContent=order.message;if(order.status==='paid'){await showOrder(order);await getFriends().refresh();await refresh();}}catch(e){if(manual||order.status==='pending')$('shop-invoice-state').textContent=e.message;}finally{polling=false;$('shop-check').disabled=order?.status==='paid';}}
 $('shop-networks').onclick=e=>{const b=e.target.closest('[data-shop-network]');if(b&&!busy){network=b.dataset.shopNetwork;draw();}};
 $('shop-packages').onclick=async e=>{const b=e.target.closest('[data-shop-pack]');if(!b||busy)return;busy=true;draw();status('در حال دریافت فاکتور از شبکه…');try{const data=await request('/orders','POST',{packId:b.dataset.shopPack,network});await showOrder(data);await refresh();status('');}catch(e){status(e.message);}finally{busy=false;draw();}};
 $('shop-history').onclick=e=>{const b=e.target.closest('[data-shop-order]');if(b)void showOrder(catalog.orders.find(o=>o.id===b.dataset.shopOrder));};
 $('shop-close-invoice').onclick=()=>$('shop-invoice').close();$('shop-check').onclick=()=>void check(true);$('shop-refresh').onclick=()=>void open();
 for(const [button,input]of [['shop-copy-address','shop-address'],['shop-copy-amount','shop-amount']])$(button).onclick=async()=>{try{await navigator.clipboard.writeText($(input).value);$('shop-invoice-state').textContent='کپی شد.';}catch{$(input).select();$('shop-invoice-state').textContent='متن را انتخاب و کپی کن.';}};
 setInterval(()=>{if($('shop-invoice').open&&!document.hidden&&order?.txHash)void check();},15000);
 return{open};
}
