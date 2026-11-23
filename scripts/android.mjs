import {applyAndroidBranding} from './android-branding.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { config } from './config.mjs';
import { versionCode } from './version.mjs';
const version = process.env.VERSION || JSON.parse(readFileSync('package.json')).version;
const store = process.env.STORE || 'bazaar';
const gameplayOnly = process.env.ANDROID_GAMEPLAY_ONLY === 'true';
if (store !== 'debug' && !config.stores.includes(store)) throw Error('Store not configured');
const billingTarget = !gameplayOnly && config.billing
  ? (store === 'debug' ? (process.env.BAZAAR_DRAFT === 'true' ? 'bazaar' : null) : store)
  : null;
if (existsSync('android/app/build.gradle')) {
  const existing = readFileSync('android/app/build.gradle','utf8');
  if ((billingTarget !== 'bazaar' && /Poolakey:poolakey/i.test(existing))
    || (billingTarget !== 'myket' && /ir\.myket:billing/i.test(existing))) {
    throw Error('Changing Android billing targets requires a clean checkout');
  }
}
writeFileSync('capacitor.config.json', JSON.stringify({appId:config.appId,appName:config.name,webDir:'dist'},null,2));
const npm = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = args => execFileSync(npm,args,{stdio:'inherit',shell:process.platform === 'win32'});
if (!existsSync('android')) run(['cap','add','android']);
run(['cap','sync','android']);
await applyAndroidBranding();
let gradle = readFileSync('android/app/build.gradle','utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode(version)}`).replace(/versionName\s+"[^"]*"/,`versionName "${version}"`);
if (!gradle.includes('// Jolly Panda debug variant')) {
  gradle += '\n// Jolly Panda debug variant\nandroid { buildTypes { debug { applicationIdSuffix ".debug"; versionNameSuffix "-debug" } } }\n';
}
writeFileSync('android/app/build.gradle',gradle);
let manifest = readFileSync('android/app/src/main/AndroidManifest.xml','utf8');
manifest = manifest.replace(/\s+android:screenOrientation="[^"]*"/g, '');
manifest = manifest.replace(/<activity\s+/, `<activity android:screenOrientation="${config.orientation}" `);
if (!manifest.includes('android:appCategory=')) manifest = manifest.replace('<application', '<application android:appCategory="game"');
writeFileSync('android/app/src/main/AndroidManifest.xml',manifest);
if (billingTarget) {
  if (store === 'bazaar' && !process.env.BAZAAR_RSA_KEY && !JSON.parse(readFileSync('bazaar.config.json','utf8')).rsaKey && process.env.BAZAAR_DRAFT !== 'true') throw Error('BAZAAR_RSA_KEY is required for release billing');
  if (store === 'myket' && !process.env.MYKET_PUBLIC_KEY && !JSON.parse(readFileSync('myket.config.json','utf8')).publicKey) throw Error('MYKET_PUBLIC_KEY is required for billing');
  execFileSync(process.execPath,[`scripts/${billingTarget}.mjs`],{stdio:'inherit'});
}
