# Nostalgia Duel / دوئل نوستالژی

بازی فقط آنلاین برای وب و اندروید، ساختهٔ **استودیو جولی پاندا — [jollypanda.ir](https://jollypanda.ir)**. همهٔ مسابقه‌ها در سرور Colyseus محاسبه می‌شوند؛ بازی آفلاین، تمرین محلی و انتخاب نوبتی روی یک دستگاه حذف شده‌اند. فعلاً سرور فقط روی سیستم میزبان و LAN اجرا می‌شود؛ میزبانی عمومی فعال نشده است.

## اجرا

Node 22.12+ لازم است. ابتدا npm ci و سپس START-GAME.cmd یا START-ONLINE.cmd را اجرا کنید؛ هر دو بازی را می‌سازند و سرور را روشن نگه می‌دارند. معادل: npm run build و npm run start:online. روی سیستم میزبان http://127.0.0.1:2567 و روی دستگاه دوم آدرس LAN همان سیستم را باز کنید. توسعهٔ رابط با npm run dev نیز به سرور بازی روی 2567 نیاز دارد.

فایل out/play.html که با node scripts/standalone.mjs ساخته می‌شود فقط کلاینت بسته‌بندی‌شده است و برای بازی همچنان به سرور نیاز دارد؛ هنگام قطع اتصال حالت آفلاین جایگزین نمی‌شود. خروجی وب در dist و ZIP در out است.

## دوستان و دعوت

- از «پروفایل و تنظیمات» فقط نام و آواتار خودت، تعداد دورهای دوئل و ظرفیت دورهمی را تعیین کن.
- در «دوستان»، کد هشت‌کاراکتری خودت را کپی کن یا کد دوستت را وارد کن. دوستی پس از قبول درخواست دوطرفه می‌شود؛ درخواست را می‌توان رد/لغو و دوست را حذف کرد.
- وضعیت حضور، درخواست‌ها و دعوت‌ها هر ۳ ثانیه به‌روز می‌شوند. فهرست‌ها چهار مورد در هر صفحه دارند؛ صفحه اسکرول ندارد.
- «دعوت به بازی» برای دوست تأییدشده، در صورت نداشتن میز، یک اتاق دوستان با حالت و ظرفیت فعلی می‌سازد و دعوت ۶۰ ثانیه‌ای می‌فرستد. دریافت‌کننده در تب «دعوت‌ها» ورود را انتخاب می‌کند. دعوت فقط به میز دوستانِ باز و دارای جای خالی ممکن است؛ وسط مسابقه یا از میز جست‌وجوی سریع دعوت نمی‌فرستیم.
- میزبان پس از آماده‌شدن همه شروع می‌کند. بازیکنی که پشت میز دیگری است، ابتدا باید از آن خارج شود تا دعوت را قبول کند. شروع/پرشدن/بسته‌شدن میز یا پایان مهلت، دعوت را نامعتبر می‌کند.
- هویت فعلی مهمان و وابسته به مرورگر و آدرس سرور است؛ توکن در localStorage و فقط هش آن در سرور نگهداری می‌شود. ورود با ایمیل/موبایل و بازیابی حساب روی دستگاه دیگر هنوز اضافه نشده است. پاک‌کردن دادهٔ مرورگر یا عوض‌کردن مبدأ آدرس می‌تواند هویت مهمان تازه بسازد.
- پروفایل‌ها، درخواست‌ها و دوستی‌ها در .local/social.json روی میزبان ذخیره می‌شوند (از Git خارج است). حفظ فایل برای نگهداری دوستان لازم است. دعوت‌ها و حضور کوتاه‌مدت‌اند و با راه‌اندازی مجدد سرور پاک می‌شوند.

## بازی و آموزش

سه حالت: کلاسیک، دوئل پیشرفتهٔ پنج‌حرکتی، پلم پولوم پلیچ ۳ تا ۸ نفره. دوئل‌ها ۱/۳/۵/۷/۹ دور غیرمساوی دارند؛ دورهمی با یک دوئل کلاسیک تمام می‌شود. مسابقهٔ سریع پس از ۵ ثانیه ظرفیت خالی را با حریف کامپیوتری تکمیل می‌کند؛ داخل مسابقه برچسب/ظاهر متمایز ندارد. هر انتخاب ۵ ثانیه فرصت دارد؛ حرکت ناتمام تصادفی معتبر ثبت می‌شود. نتیجه و محرمانگی انتخاب‌ها با سرور است.

«راهنما» نمودار تعاملی ژست‌ها و فلش‌های برد، سه مثال دورهمی و توضیح کوتاه شروع آنلاین دارد. ژست‌ها و نگارگری اختصاصی در assets هستند. [مرجع معرفی نسخهٔ پیشرفته](https://fa.wikipedia.org/wiki/سنگ-کاغذ-قیچی) و [Sam Kass / Karen Bryla](https://www.samkass.com/theories/RPSSL.html)؛ تصاویر نمودار آن صفحات کپی نشده‌اند.

رکوردهای نتیجهٔ آنلاین روی همین دستگاه ذخیره می‌شوند؛ جدول جهانی نداریم. [راهنمای LAN و سرور](docs/ONLINE.fa.md)، [بررسی طراحی](design-qa.md) و [برنامهٔ درآمد](docs/MONETIZATION.fa.md). تبلیغ، پرداخت و تله‌متری فعلاً خاموش‌اند.

## تست

npm test، npm run test:online، npm run test:browser، npm run test:online:browser و npm run test:viewport. تست‌های مجزا: scripts/test-advanced-browser.mjs، test-matchmaking-browser.mjs، test-tutorial-browser.mjs و test-standalone.mjs. تست viewport شامل 1920×1080، 1366×768، 1280×600، 1024×600، 800×600، 390×844 و 360×640 است.

## Android / CI

App id: `com.jollypanda.nostalgiaduel` (slug: `nostalgiaduel`, repository: `nostalgia-duel`). `npm run android:prepare` creates/syncs ignored android/. `STORE=debug npm run build:android` (PowerShell: `$env:STORE='debug'; npm run build:android`) produces a standalone debug APK in out plus a web ZIP. Local Android SDK 36 required. Debug app id has `.debug` suffix; never submit debug APK to a store.

`.github/workflows/prototype.yml` provides a manually triggered APK + web test build without release keys or store submission. It retains contents:read and artifact upload; no automated private Release delivery is enabled. Artifact storage is currently full. Per the owner's choice, only local web output is needed for now; no new workflow run, permanent signing key or central-builder activation is performed in this update. The workflow verifies debug package identity, APK signature and portrait orientation on a future run. Main release pipeline remains the template's central builder contract: main for development, Iranian-store for builds, web=true, separate Bazaar/Myket targets. Creating a repo does not automatically authorize the central builder GitHub App. When using setup later, pass --repo nostalgia-duel with --slug nostalgiaduel to preserve the selected identity. No publisher should be enabled for this prototype.

## تب‌های پایین

میدان بازی، پروفایل، رکوردها و راهنما چهار tab هستند که محتوای اصلی صفحه را تغییر می‌دهند. نوار نزدیک لبهٔ پایین و مستقل از مقیاس محتوای بازی ثابت است؛ فضای امن گوشی و ارتفاع نوار از فضای محتوای وسط کم می‌شود. تب‌ها با کلیدهای جهت، Home و End هم قابل جابه‌جایی‌اند. تست: node scripts/test-tabs-browser.mjs.

## رابط مسابقه

در مسابقه فقط تنظیمات بالای صفحه می‌ماند. کارت‌های امتیاز، برد و وضعیت حذف بازیکنان بالای میز هستند؛ نوار زمان پیوسته از زمان سرور کم می‌شود. دو ثانیهٔ آخر برای بازیکنی که انتخاب نکرده، حاشیهٔ صفحه با آهنگ ملایم یک بار در ثانیه هشدار می‌دهد (در reduced-motion ثابت است). نتیجهٔ هر دور از سرور شامل برنده، امتیاز همان دست، حذف یا تساوی است و وسط میز نمایش داده می‌شود.

تنظیمات شامل روشن/خاموش‌کردن صدای تولیدشدهٔ بازی، بلندی صدا، ویبره و خروج با تأیید است. تنظیمات در localStorage می‌مانند؛ مسابقه هنگام بازبودن تنظیمات متوقف نمی‌شود. ویبره به پشتیبانی مرورگر/دستگاه وابسته است و در نبود آن کنترل غیرفعال می‌شود. صدای بازی پس از تعامل کاربر فعال می‌شود. تست: node scripts/test-match-hud.mjs.

## نتیجهٔ مسابقه

پس از پایان، صفحهٔ مستقل Match Result جای میز را می‌گیرد: قهرمان، امتیاز و برد نهایی هر بازیکن، تعداد دست‌ها و سه دست آخر با انتخاب صفحه. در مسابقهٔ سریع هر نفر می‌تواند جست‌وجوی تازه را شروع کند؛ در اتاق دوستان، میزبان مسابقهٔ دوباره با همان جمع را آغاز می‌کند. برگشت به میدان از نتیجه بدون تأیید خروجِ مسابقهٔ جاری انجام می‌شود. خلاصهٔ دورها فقط پس از پایان از سرور ارسال می‌شود. تست: node scripts/test-match-result.mjs.
