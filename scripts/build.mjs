import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, chmodSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { config } from './config.mjs';
const store = process.env.STORE || 'bazaar';
const version = process.env.VERSION || JSON.parse(readFileSync('package.json')).version;
const secrets = ['KEYSTORE_BASE64','KEYSTORE_PASSWORD','KEY_ALIAS','KEY_PASSWORD'];
const hasSigning = secrets.every(k => !!process.env[k]);
const signed = store !== 'debug' && hasSigning;
if (secrets.some(k=>!!process.env[k]) && !hasSigning) throw Error('All four signing secrets are required');
if (process.env.PUBLISH_STORES === 'true' && !signed) throw Error('Store publishing requires release signing');
const run = (cmd,args,options={}) => execFileSync(cmd,args,{stdio:'inherit',...options});
run(process.platform === 'win32' ? 'npm.cmd':'npm',['run','build'],{shell:process.platform==='win32',env:{...process.env,VITE_STORE:store,VITE_VERSION:version}});
run(process.execPath,['scripts/android.mjs']);
let signing = [];
if (signed) {
  const path = `${process.env.RUNNER_TEMP || process.cwd()}/release.keystore`;
  writeFileSync(path,Buffer.from(process.env.KEYSTORE_BASE64,'base64'),{mode:0o600});
  signing = [`-Pandroid.injected.signing.store.file=${path}`,`-Pandroid.injected.signing.store.password=${process.env.KEYSTORE_PASSWORD}`,`-Pandroid.injected.signing.key.alias=${process.env.KEY_ALIAS}`,`-Pandroid.injected.signing.key.password=${process.env.KEY_PASSWORD}`];
}
if (process.platform !== 'win32') chmodSync('android/gradlew',0o755);
run(process.platform==='win32' ? 'gradlew.bat':'./gradlew',[signed?'assembleRelease':'assembleDebug',...(signed?['bundleRelease']:[]),'--no-daemon',...signing],{cwd:'android',shell:process.platform==='win32'});
mkdirSync('out',{recursive:true});
const prefix = `${config.slug}-v${version}-${store==='debug'?'standalone-debug':store+(signed?'':'-debug')}`;
copyFileSync(`android/app/build/outputs/apk/${signed?'release/app-release':'debug/app-debug'}.apk`,`out/${prefix}.apk`);
if (signed) copyFileSync('android/app/build/outputs/bundle/release/app-release.aab',`out/${prefix}.aab`);
if (config.web) run('zip',['-qr',`../out/${config.slug}-v${version}-web.zip`,'.'],{cwd:'dist'});
const sums = readdirSync('out').filter(n=>n!=='SHA256SUMS.txt').sort().map(n=>`${createHash('sha256').update(readFileSync(`out/${n}`)).digest('hex')}  ${n}`).join('\n');
writeFileSync('out/SHA256SUMS.txt',sums+'\n');
