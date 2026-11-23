import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from './config.mjs';
const store = process.env.STORE || 'bazaar';
if (!['debug', 'bazaar', 'myket'].includes(store)) throw Error('Unknown Android target');
const gameplayOnly = process.env.ANDROID_GAMEPLAY_ONLY === 'true';
const version = process.env.VERSION || JSON.parse(readFileSync('package.json')).version;
const secrets = ['KEYSTORE_BASE64','KEYSTORE_PASSWORD','KEY_ALIAS','KEY_PASSWORD'];
const hasSigning = secrets.every(k => !!process.env[k]);
const signed = store !== 'debug' && hasSigning;
if (secrets.some(k=>!!process.env[k]) && !hasSigning) throw Error('All four signing secrets are required');
if (process.env.PUBLISH_STORES === 'true' && !signed) throw Error('Store publishing requires release signing');
if (gameplayOnly && process.env.PUBLISH_STORES === 'true') throw Error('Gameplay builds cannot be submitted automatically');
if (process.env.REQUIRE_SIGNING === 'true' && !signed) throw Error('A signed release requires all four signing secrets');
const run = (cmd,args,options={}) => execFileSync(cmd,args,{stdio:'inherit',...options});
run(process.platform === 'win32' ? 'npm.cmd':'npm',['run','build'],{shell:process.platform==='win32',env:{...process.env,VITE_STORE:store,VITE_VERSION:version,VITE_ANDROID_GAMEPLAY_ONLY:String(gameplayOnly)}});
run(process.execPath,['scripts/android.mjs']);
const signingDir = signed ? mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'toranj-signing-')) : null;
try {
  const tasks = signed ? ['assembleRelease', 'bundleRelease'] : ['assembleDebug'];
  const gradleEnv = {...process.env};
  const signing = [];
  if (signingDir) {
    const path = join(signingDir, 'release.keystore');
    writeFileSync(path, Buffer.from(process.env.KEYSTORE_BASE64, 'base64'), {mode: 0o600});
    signing.push(
      `-Pandroid.injected.signing.store.file=${path}`,
      `-Pandroid.injected.signing.store.password=${process.env.KEYSTORE_PASSWORD}`,
      `-Pandroid.injected.signing.key.alias=${process.env.KEY_ALIAS}`,
      `-Pandroid.injected.signing.key.password=${process.env.KEY_PASSWORD}`,
    );
    for (const secret of secrets) delete gradleEnv[secret];
  }
  const windows = process.platform === 'win32';
  const java = process.env.JAVA_HOME
    ? join(process.env.JAVA_HOME, 'bin', windows ? 'java.exe' : 'java')
    : 'java';
  // A direct wrapper invocation preserves the signing arguments without shell interpolation.
  const result = spawnSync(java, [
    '-Dorg.gradle.appname=gradlew', '-classpath', 'gradle/wrapper/gradle-wrapper.jar',
    'org.gradle.wrapper.GradleWrapperMain', ...tasks, '--no-daemon', ...signing,
  ], {
    cwd: 'android', stdio: 'inherit', env: gradleEnv,
  });
  if (result.status !== 0) throw Error('Gradle build failed');
} finally {
  if (signingDir) rmSync(signingDir, {recursive:true, force:true});
}
mkdirSync('out',{recursive:true});
const prefix = `${config.slug}-v${version}-${store==='debug'?'standalone-debug':store+(signed?'':'-debug')}`;
copyFileSync(`android/app/build/outputs/apk/${signed?'release/app-release':'debug/app-debug'}.apk`,`out/${prefix}.apk`);
if (signed) copyFileSync('android/app/build/outputs/bundle/release/app-release.aab',`out/${prefix}.aab`);
if (config.web) {
  const archive = `../out/${config.slug}-v${version}-web.zip`;
  if (process.platform === 'win32') run('tar.exe',['-a','-cf',archive,'.'],{cwd:'dist'});
  else run('zip',['-qr',archive,'.'],{cwd:'dist'});
}
const sums = readdirSync('out',{withFileTypes:true}).filter(entry=>entry.isFile() && /\.(apk|aab|zip)$/.test(entry.name)).map(entry=>entry.name).sort().map(n=>`${createHash('sha256').update(readFileSync(`out/${n}`)).digest('hex')}  ${n}`).join('\n');
writeFileSync('out/SHA256SUMS.txt',sums+'\n');
