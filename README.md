# Nostalgia Duel / دوئل نوستالژی

Independent web + Android game based on the studio's `game-template` build contract. Local/offline play plus Colyseus guest rooms for LAN multiplayer. No YouTube dependency, cloud accounts or global leaderboard. Android uses Capacitor with portrait orientation; desktop web uses the wide table layout and small screens use the compact portrait layout.

سازنده: **استودیو جولی پاندا — [jollypanda.ir](https://jollypanda.ir)**. لوگوی رسمی ارسالی کاربر در assets/brand نگهداری می‌شود و در پایین بازی و پنجرهٔ معرفی سازنده نمایش داده می‌شود.

## آنلاین و نام بازیکن‌ها

نام‌های پیش‌فرض: آرش، ترانه، سامان، رها، نیما، مهتاب، باران و پویا؛ همه قابل تغییرند. برای شبکهٔ داخلی `START-ONLINE.cmd` یا `npm run build` و سپس `npm run start:online` را اجرا کنید. صفحهٔ بازی روی پورت 2567 است؛ دوستان با کد اتاق از دستگاه‌های مستقل وارد می‌شوند. [راهنمای کامل LAN و Colyseus](docs/ONLINE.fa.md) شامل اتصال گوشی، بازیابی اتصال، قواعد سرور و تست‌هاست. اینترنت عمومی راه‌اندازی نشده است.

## اجرا

Node 22.12+ and Java 21 for native builds. `npm ci`, `npm run dev` then open the URL shown by Vite. `START-GAME.cmd` opens a standalone HTML game without a local server; after `npm run build`, `node scripts/standalone.mjs` produces out/play.html, which can be opened directly in Chrome. `node scripts/test-standalone.mjs` verifies direct-file launch. The optional development server remains at http://127.0.0.1:4175 via `node server.mjs`. `npm test` runs logic and pipeline tests; `npm run test:browser` tests the real browser with Chrome installed. `npm run build` creates the relative-path web bundle in dist.

## بازی‌ها

لابی جدید با نگارگری اختصاصی ایرانی، انتخاب سریع حالت و دکمهٔ اصلی «شروع مسابقه» ساخته شده است. از «بازیکن‌ها» یا «تغییر بازیکن‌ها و دورها» تنظیمات را باز کنید. در بازی با یک کامپیوتر، انتخاب دست مستقیم باز می‌شود؛ برای چند انسان مرحلهٔ تحویل مخفی دستگاه حفظ می‌شود. [جهت طراحی UX](docs/UX-DIRECTION.fa.md) و [بررسی بصری](design-qa.md) ثبت شده‌اند. تصویر اصلی و prompt در assets/art هستند و نسخهٔ WebP حدود ۵۶۷ کیلوبایتی در خروجی مصرف می‌شود.

وب مانند یک صفحهٔ بازی بدون اسکرول اجرا می‌شود: چیدمان فشرده با اندازهٔ پنجره هماهنگ می‌شود و اگر ارتفاع خیلی کم باشد، کل صحنه متناسب کوچک می‌شود؛ کنترل‌ها بریده نمی‌شوند. تنظیمات بازیکن‌ها چهار نفر در هر صفحه و رکوردها پنج نتیجه در هر صفحه دارند. از دکمه‌های قبلی/بعدی و تب دوئل/دورهمی استفاده کنید. تست اندازه‌ها: `npm run test:viewport`؛ شامل پنجره‌های 1920×1080، 1366×768، 1280×600، 1024×600، 800×600، 390×844 و 360×640. چیدمان viewport مخصوص مرورگر است؛ محیط native اندروید تغییر اجباری مقیاس ندارد.

- سنگ کاغذ قیچی: دو بازیکن، انسانی یا انسان با کامپیوتر؛ ۱/۳/۵/۷/۹ دور غیرمساوی قابل تنظیم. تساوی تکرار می‌شود و هرگز یک دور مصرف نمی‌کند. بیشترین برد پس از دورهای تعیین‌شده قهرمان است.
- پلم پولوم پلیچ: ۳ تا ۸ بازیکن با ترکیب انسان و کامپیوتر. انتخاب کف/پشت دست؛ فقط بازیکن تک حذف می‌شود. اگر تک نداشته باشیم، همان جمع دوباره بازی می‌کند. دو نفر آخر یک دست تعیین‌کنندهٔ سنگ کاغذ قیچی دارند؛ تساوی تکرار می‌شود.
- انتخاب‌های انسانی در حالت محلی، روی یک دستگاه مخفی و نوبتی‌اند. در حالت آنلاین هر نفر از دستگاه خودش انتخاب می‌کند و سرور Colyseus حرکت‌ها را تا روشدن همگانی مخفی نگه می‌دارد. کامپیوترها پیش از انتخاب انسان‌ها دست تصادفی مستقل ثبت می‌کنند.
- صحنه شامل میز و دست‌های مصور از آرنج با شش حالت و انیمیشن آماده‌بودن، روکردن و چرخش است؛ بازیکن پایین تصویر قرار دارد و در زمین چهره‌ای نیست. تصویر اصلی و prompt در assets/hands نگهداری می‌شوند.
- مسابقهٔ سریع با Colyseus: انتظار حداکثر ۵ ثانیه، تکمیل ظرفیت با کامپیوتر، بدون برچسب نقش در مسابقه. هر انتخاب ۵ ثانیه مهلت دارد و پس از اتمام زمان، حرکت معتبر تصادفی ثبت می‌شود.
- رکوردهای محلی دو حالت جدا هستند؛ امتیاز سنگ‌کاغذقیچی و جام‌های دورهمی مستقیماً مقایسه نمی‌شوند. رکوردهای دوئل تعداد دور مسابقه را نیز نمایش می‌دهند. تبلیغ، پرداخت و تله‌متری فعلاً خاموش‌اند.

## Android / CI

App id: `com.jollypanda.nostalgiaduel` (slug: `nostalgiaduel`, repository: `nostalgia-duel`). `npm run android:prepare` creates/syncs ignored android/. `STORE=debug npm run build:android` (PowerShell: `$env:STORE='debug'; npm run build:android`) produces a standalone debug APK in out plus a web ZIP. Local Android SDK 36 required. Debug app id has `.debug` suffix; never submit debug APK to a store.

`.github/workflows/prototype.yml` provides a manually triggered APK + web test build without release keys or store submission. It retains contents:read and artifact upload; no automated private Release delivery is enabled. Artifact storage is currently full. Per the owner's choice, only local web output is needed for now; no new workflow run, permanent signing key or central-builder activation is performed in this update. The workflow verifies debug package identity, APK signature and portrait orientation on a future run. Main release pipeline remains the template's central builder contract: main for development, Iranian-store for builds, web=true, separate Bazaar/Myket targets. Creating a repo does not automatically authorize the central builder GitHub App. When using setup later, pass --repo nostalgia-duel with --slug nostalgiaduel to preserve the selected identity. No publisher should be enabled for this prototype.

## درآمد و حقوق محتوا

[برنامهٔ درآمدی فارسی](docs/MONETIZATION.fa.md): هستهٔ رایگان + بستهٔ تزئینی یک‌باره + آگهی اختیاری محدود؛ بدون برتری پولی. خروج از YouTube مجوز استفادهٔ تجاری از شخصیت‌ها، چهره‌ها و آواتارهای دیگران ایجاد نمی‌کند. برای استفادهٔ نهایی حقوق باید روشن باشند؛ تصاویر نمادین فعلی برای تست‌اند.

The earlier YouTube prototype is retained in the original YouTube Playable Games folder as an archive; this repository is the active web/Android version.

