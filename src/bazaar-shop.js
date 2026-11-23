import {registerPlugin} from '@capacitor/core';
import {bazaarProducts} from './bazaar-products.js';
import {grantStorePurchase} from './mobile-data.js';
import {themedIcon} from './icons.js';
import {fa, persianDigits} from './core.js';

const $ = id => document.getElementById(id);

export function setupStoreShop() {
  const target = import.meta.env.VITE_STORE;
  const provider = target === 'myket' ? {plugin: 'Myket', name: 'مایکت'} : {plugin: 'Bazaar', name: 'کافه‌بازار'};
  const intro = document.querySelector('.shop-intro');
  const status = message => { $('shop-status').textContent = message; };
  $('shop-networks').hidden = true;

  if (target === 'debug' || import.meta.env.VITE_ANDROID_GAMEPLAY_ONLY === 'true') {
    $('shop-refresh').hidden = true;
    $('shop-history').previousElementSibling.hidden = true;
    intro.textContent = 'در این نسخه می‌توانی با بازی سکه به دست بیاوری.';
    return {open() {}};
  }

  const plugin = globalThis.Capacitor?.Plugins?.[provider.plugin] || registerPlugin(provider.plugin);
  const products = new Map(bazaarProducts.map(product => [product.id, product]));
  const buttons = new Map();
  let prices = new Map(), busy = false, connected = false;

  for (const [index, product] of bazaarProducts.entries()) {
    const button = document.createElement('button');
    button.className = 'coin-pack';
    button.dataset.storeProduct = product.id;
    button.innerHTML = '<span class="coin-emblem" aria-hidden="true"></span><b></b><span></span><strong></strong>';
    const [icon, count, title] = button.children;
    icon.innerHTML = themedIcon(['pouch', 'chest', 'treasure'][index % 3]);
    count.textContent = fa(product.coins) + ' سکه';
    title.textContent = product.name;
    $('shop-packages').append(button);
    buttons.set(product.id, button);
    button.onclick = () => void buy(product);
  }

  function draw() {
    for (const [id, button] of buttons) {
      button.disabled = busy || !prices.has(id);
      button.querySelector('strong').textContent = prices.get(id) || 'قیمت در دسترس نیست';
    }
  }

  async function credit(purchase, expectedId) {
    const pack = products.get(purchase.productId);
    if (!pack || (expectedId && purchase.productId !== expectedId)) throw Error('رسید خرید معتبر نیست.');
    grantStorePurchase(purchase, pack);
    try {
      await plugin.consume({purchaseToken: purchase.purchaseToken});
      return true;
    } catch {
      return false;
    }
  }

  async function open() {
    if (busy) return;
    busy = true;
    draw();
    status('دریافت بسته‌ها از ' + provider.name + '…');
    try {
      if (!connected) {
        await plugin.connect();
        connected = true;
      }
      const details = await plugin.skuDetails({productIds: [...products.keys()]});
      prices = new Map((details.products || [])
        .filter(item => products.has(item.productId) && typeof item.price === 'string' && item.price.trim())
        .map(item => [item.productId, persianDigits(item.price.replace(/(?<=\d),(?=\d)/g,'٬'))]));
      const pending = await plugin.purchases();
      let unfinished = false;
      for (const purchase of pending.purchases || []) {
        if (products.has(purchase.productId) && !(await credit(purchase))) unfinished = true;
      }
      status(unfinished ? 'سکه ثبت شد؛ نهایی‌سازی خرید در اتصال بعدی دوباره انجام می‌شود.'
        : prices.size ? '' : 'بسته‌ها هنوز در ' + provider.name + ' فعال نشده‌اند.');
    } catch {
      connected = false;
      prices.clear();
      status('اینترنت و برنامهٔ ' + provider.name + ' را بررسی کن و «به‌روزرسانی» را بزن.');
    } finally {
      busy = false;
      draw();
    }
  }

  async function buy(product) {
    if (busy || !prices.has(product.id)) return;
    busy = true;
    draw();
    status('در انتظار تأیید خرید در ' + provider.name + '…');
    try {
      const purchase = await plugin.purchase({productId: product.id, payload: 'toranj:' + crypto.randomUUID()});
      status(await credit(purchase, product.id) ? 'خرید موفق بود؛ سکه‌ها اضافه شدند.'
        : 'سکه اضافه شد؛ نهایی‌سازی خرید در اتصال بعدی دوباره انجام می‌شود.');
    } catch (error) {
      status(error.code === 'CANCELLED' ? 'خرید لغو شد؛ سکه‌ای اضافه نشد.'
        : 'خرید کامل نشد. اگر پرداخت شده، «به‌روزرسانی» را برای بازیابی بزن.');
    } finally {
      busy = false;
      draw();
    }
  }

  $('shop-refresh').onclick = () => void open();
  $('shop-history').textContent = 'برای بازیابی خرید ناتمام، «به‌روزرسانی» را بزن.';
  intro.textContent = 'پرداخت و تأیید خرید در ' + provider.name + ' انجام می‌شود.';
  draw();
  return {open};
}
