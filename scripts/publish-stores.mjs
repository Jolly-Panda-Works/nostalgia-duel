import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { config } from './config.mjs';
import { versionCode } from './version.mjs';
if (process.env.PUBLISH_STORES !== 'true' || process.env.STORE === 'debug') { console.log('Store publishing disabled.'); process.exit(0); }
if (process.env.SOURCE_BRANCH !== 'Iranian-store') throw Error('Publishing requires Iranian-store');
const version = process.env.VERSION;
const store = process.env.STORE;
const notes = JSON.parse(readFileSync('store-release-notes.json','utf8'));
if (notes.version !== version || !notes.fa?.trim() || !notes.en?.trim()) throw Error('Write Persian/English release notes for this exact version before publishing');
if (store === 'bazaar' && !process.env.BAZAAR_PISHKHAN_TOKEN) throw Error('Missing BAZAAR_PISHKHAN_TOKEN');
if (store === 'myket' && !process.env.MYKET_ACCESS_TOKEN) throw Error('Missing MYKET_ACCESS_TOKEN');
execFileSync(process.execPath,[`scripts/${store==='bazaar'?'pishkhan':'myket'}-release.mjs`,`out/${config.slug}-v${version}-${store}.apk`,'--version',version,'--code',String(versionCode(version)),'--changelog','store-release-notes.json'],{stdio:'inherit',env:{...process.env,MYKET_PACKAGE_NAME:config.appId,GAME_NAME:config.name}});
