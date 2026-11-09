import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { config } from './config.mjs';
import { versionCode } from './version.mjs';
const version = process.env.VERSION || JSON.parse(readFileSync('package.json')).version;
const store = process.env.STORE || 'bazaar';
if (store !== 'debug' && !config.stores.includes(store)) throw Error('Store not configured');
writeFileSync('capacitor.config.json', JSON.stringify({appId:config.appId,appName:config.name,webDir:'dist'},null,2));
const npm = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = args => execFileSync(npm,args,{stdio:'inherit',shell:process.platform === 'win32'});
if (!existsSync('android')) run(['cap','add','android']);
run(['cap','sync','android']);
let gradle = readFileSync('android/app/build.gradle','utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode(version)}`).replace(/versionName\s+"[^"]*"/,`versionName "${version}"`);
if (!gradle.includes('// Jolly Panda debug variant')) {
  gradle += '\n// Jolly Panda debug variant\nandroid { buildTypes { debug { applicationIdSuffix ".debug"; versionNameSuffix "-debug" } } }\n';
}
writeFileSync('android/app/build.gradle',gradle);
let manifest = readFileSync('android/app/src/main/AndroidManifest.xml','utf8');
manifest = manifest.replace(/\s+android:screenOrientation="[^"]*"/g, '');
manifest = manifest.replace(/<activity\s+/, `<activity android:screenOrientation="${config.orientation}" `);
writeFileSync('android/app/src/main/AndroidManifest.xml',manifest);
if (config.billing && store !== 'debug') {
  if (store === 'bazaar' && !process.env.BAZAAR_RSA_KEY) throw Error('BAZAAR_RSA_KEY is required for billing');
  if (store === 'myket' && !process.env.MYKET_PUBLIC_KEY) throw Error('MYKET_PUBLIC_KEY is required for billing');
  execFileSync(process.execPath,[`scripts/${store}.mjs`],{stdio:'inherit'});
}
