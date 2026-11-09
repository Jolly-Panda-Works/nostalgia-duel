// Run locally using the owner's existing gh login. No personal token is stored in workflows.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { gameIdentity, register } from './setup-lib.mjs';

const args = process.argv.slice(2);
const flags = new Set(['create','generate-signing','activate','web','plan','help']);
const values = new Set(['name','slug','repo','directory','keystore','app-client-id','app-key-file']);
const options = {};
for(let i=0;i<args.length;i++) {
  const key=args[i].replace(/^--/,'');
  if(!args[i].startsWith('--') || (!flags.has(key)&&!values.has(key))) throw Error(`Unknown option: ${args[i]}`);
  if(flags.has(key)) options[key]=true;
  else { if(!args[i+1] || args[i+1].startsWith('--')) throw Error(`Missing --${key} value`); options[key]=args[++i]; }
}
if(options.help) {
  console.log(`New game: npm run setup:game -- --create --name "Panda Jump" --slug panda_jump --generate-signing
After granting the App access: cd ../panda-jump; npm run setup:game -- --activate
Preview: add --plan. Existing game: omit --create; do not generate a new signing key for a published game.
Existing signing key: --keystore /absolute/path.jks, with JP_KEYSTORE_PASSWORD, JP_KEY_ALIAS, JP_KEY_PASSWORD in the local environment.
Shared App setup: --app-client-id ID --app-key-file /absolute/app.pem (no game options needed).
All credentials stay out of source control. See README.fa.md.`);
  process.exit(0);
}
let root = fileURLToPath(new URL('../',import.meta.url));
const builder='Jolly-Panda-Works/game-builds';
function command(executable,argv,{cwd=root,input,quiet=false,env=process.env,allowFailure=false}={}) {
  const result=spawnSync(executable,argv,{cwd,input,env,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  if(result.error) throw Error(`${executable} unavailable: ${result.error.message}`);
  if(result.status!==0 && !allowFailure) throw Error(`${executable} failed (${result.status}): ${(result.stderr||result.stdout).slice(0,1200)}`);
  if(!quiet && result.status===0 && result.stdout) process.stdout.write(result.stdout);
  return result;
}
const gh=(argv,opts={})=>command('gh',argv,{quiet:true,...opts});
const git=(argv,opts={})=>command('git',argv,{quiet:true,...opts});
const api=(endpoint,body)=>{
  const argv=['api',endpoint];
  if(body!==undefined) argv.push('--method','PUT','--input','-');
  const result=gh(argv,{input:body===undefined?undefined:JSON.stringify(body)});
  return result.stdout.trim()?JSON.parse(result.stdout):null;
};
const secret=(name,value,environment)=>gh(['secret','set',name,'--repo',builder,...(environment?['--env',environment]:[])],{input:value});
function writeJson(file,value,privateFile=false) {
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{mode:privateFile?0o600:0o666});
}

// Shared App bootstrap is independent of creating a game.
if(options['app-client-id'] || options['app-key-file']) {
  if(!options['app-client-id'] || !options['app-key-file']) throw Error('Supply both --app-client-id and --app-key-file');
  const pem=fs.readFileSync(path.resolve(options['app-key-file']),'utf8');
  if(!/-----BEGIN (RSA )?PRIVATE KEY-----/.test(pem)) throw Error('Invalid private-key PEM');
  if(options.plan) { console.log('Plan: set BUILD_APP_CLIENT_ID and BUILD_APP_PRIVATE_KEY on game-builds.'); process.exit(0); }
  gh(['variable','set','BUILD_APP_CLIENT_ID','--repo',builder,'--body',options['app-client-id']]);
  secret('BUILD_APP_PRIVATE_KEY',pem);
  console.log('Shared App credentials configured. No App installation permissions changed.');
  process.exit(0);
}
const config=JSON.parse(fs.readFileSync(path.join(root,'game.config.json'),'utf8'));
let repo=options.repo;
if(!options.create && !repo) {
  const remote=git(['remote','get-url','origin'],{allowFailure:true}).stdout.trim();
  repo=/(?:github\.com[:/])Jolly-Panda-Works\/([^/]+?)(?:\.git)?$/.exec(remote)?.[1];
}
const identity=gameIdentity({name:options.name||config.name,slug:options.slug||config.slug,repo});
if(options.activate && (options.create || options['generate-signing'] || options.keystore)) throw Error('Activate only after initial setup and App authorization');
if(options.keystore && options['generate-signing']) throw Error('Choose an existing keystore or a new one');
const source=`Jolly-Panda-Works/${identity.repositoryName}`;
if(options.plan) {
  console.log(JSON.stringify({source,appId:identity.appId,create:!!options.create,generateSigning:!!options['generate-signing'],activate:!!options.activate,branch:'Iranian-store',releaseDestination:source},null,2));
  process.exit(0);
}
gh(['api','user','--silent']);
if(options.create) {
  const destination=path.resolve(options.directory||path.join(root,'..',identity.repositoryName));
  if(fs.existsSync(destination)) throw Error('Destination already exists; resume setup from that game directory without --create');
  gh(['repo','create',source,'--private','--template','Jolly-Panda-Works/game-template','--include-all-branches']);
  command('git',['clone',`https://github.com/${source}.git`,destination],{quiet:true});
  root=destination;
}
const metadata=api(`repos/${source}`);
if(!metadata.private || metadata.archived) throw Error('Setup requires an active private game repository');
const actualRemote=git(['remote','get-url','origin']).stdout.trim();
if(!actualRemote.endsWith(`Jolly-Panda-Works/${identity.repositoryName}.git`) && !actualRemote.endsWith(`Jolly-Panda-Works/${identity.repositoryName}`)) throw Error('Local origin does not match target game');
if(git(['branch','--show-current']).stdout.trim()!=='main') throw Error('Switch to main before setup; store-specific commits must not be pushed to main');
if(git(['status','--porcelain']).stdout.trim()) throw Error('Commit or stash local changes before running setup');
if(!options.activate && config.appId!==identity.appId && !options.create && api(`repos/${source}/tags?per_page=1`).length) throw Error('Cannot change appId on an already tagged game');
gh(['variable','set','BUILD_MODE','--repo',source,'--body','central']);
gh(['repo','edit',source,'--add-topic','tgbot','--add-topic','android']);
api(`repos/${builder}/environments/${identity.id}`,{});

if(!options.activate) {
  const existing=JSON.parse(fs.readFileSync(path.join(root,'game.config.json'),'utf8'));
  const localDir=path.join(root,'.local');
  fs.mkdirSync(localDir,{recursive:true,mode:0o700});
  const backupPath=path.join(localDir,'signing-backup.json');
  let signing;
  if(options['generate-signing']) {
    if(api(`repos/${source}/tags?per_page=1`).length) throw Error('Refusing to generate a new signing key for a tagged game; supply the original keystore');
    if(fs.existsSync(backupPath)) signing=JSON.parse(fs.readFileSync(backupPath,'utf8'));
    else {
      const keystore=path.join(localDir,`${identity.slug}.keystore`);
      if(fs.existsSync(keystore)) throw Error('Keystore exists without backup; recover it before continuing');
      const password=randomBytes(32).toString('hex');
      command('keytool',['-genkeypair','-keystore',keystore,'-alias',identity.slug,'-storepass:env','JP_SETUP_PASSWORD','-keypass:env','JP_SETUP_PASSWORD','-keyalg','RSA','-keysize','2048','-validity','10000','-dname',`CN=${identity.slug}, O=Jolly Panda Studio, C=IR`],{quiet:true,env:{...process.env,JP_SETUP_PASSWORD:password}});
      signing={keystore,storePassword:password,alias:identity.slug,keyPassword:password};
      writeJson(backupPath,signing,true);
    }
  } else if(options.keystore) {
    if(!process.env.JP_KEYSTORE_PASSWORD || !process.env.JP_KEY_ALIAS || !process.env.JP_KEY_PASSWORD) throw Error('Set JP_KEYSTORE_PASSWORD, JP_KEY_ALIAS, JP_KEY_PASSWORD locally');
    signing={keystore:path.resolve(options.keystore),storePassword:process.env.JP_KEYSTORE_PASSWORD,alias:process.env.JP_KEY_ALIAS,keyPassword:process.env.JP_KEY_PASSWORD};
  } else if(fs.existsSync(backupPath)) signing=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  if(signing) {
    secret('KEYSTORE_BASE64',fs.readFileSync(signing.keystore).toString('base64'),identity.id);
    for(const [name,key] of [['KEYSTORE_PASSWORD','storePassword'],['KEY_ALIAS','alias'],['KEY_PASSWORD','keyPassword']]) secret(name,signing[key],identity.id);
  }
  if(!options.create && (existing.appId!==identity.appId)) {
    if(api(`repos/${source}/tags?per_page=1`).length) throw Error('Cannot change appId on an already tagged game');
  }
  writeJson(path.join(root,'game.config.json'),{...existing,name:identity.name,slug:identity.slug,appId:identity.appId,...(options.web?{web:true}:{})});
  for(const file of ['package.json','package-lock.json']) {
    const p=path.join(root,file); const data=JSON.parse(fs.readFileSync(p,'utf8')); data.name=identity.repositoryName;
    if(data.packages?.['']) data.packages[''].name=identity.repositoryName;
    writeJson(p,data);
  }
  git(['add','game.config.json','package.json','package-lock.json']);
  if(git(['diff','--cached','--name-only']).stdout.trim()) git(['commit','-m',`chore: configure ${identity.repositoryName}`]);
  git(['push','origin','HEAD:main']);
  // Merge with GitHub's merge API; never reset or force-push a store branch.
  const branch=gh(['api',`repos/${source}/branches/Iranian-store`],{allowFailure:true});
  if(branch.status!==0) {
    const main=api(`repos/${source}/git/ref/heads/main`);
    gh(['api',`repos/${source}/git/refs`,'--method','POST','--input','-'],{input:JSON.stringify({ref:'refs/heads/Iranian-store',sha:main.object.sha})});
  } else gh(['api',`repos/${source}/merges`,'--method','POST','--input','-'],{input:JSON.stringify({base:'Iranian-store',head:'main',commit_message:'chore: sync game configuration'})});
}
if(options.activate) {
  const secrets=JSON.parse(gh(['secret','list','--repo',builder,'--env',identity.id,'--json','name']).stdout);
  for(const name of ['KEYSTORE_BASE64','KEYSTORE_PASSWORD','KEY_ALIAS','KEY_PASSWORD']) if(!secrets.some(s=>s.name===name)) throw Error(`Missing environment secret ${name}; configure signing before activation`);
  const shared=JSON.parse(gh(['secret','list','--repo',builder,'--json','name']).stdout);
  if(!shared.some(s=>s.name==='BUILD_APP_PRIVATE_KEY')) throw Error('Shared BUILD_APP_PRIVATE_KEY is missing');
  gh(['variable','get','BUILD_APP_CLIENT_ID','--repo',builder]);
}
// Optimistic concurrency: don't overwrite another game's concurrent registration.
for(let attempt=0;attempt<3;attempt++) {
  const current=api(`repos/${builder}/contents/games.json?ref=main`);
  const games=JSON.parse(Buffer.from(current.content.replace(/\s/g,''),'base64').toString('utf8'));
  const previous=games.find(g=>g.id===identity.id);
  const updated=register(games,identity,options.activate?true:(previous?.enabled||false));
  if(JSON.stringify(games)===JSON.stringify(updated)) break;
  const response=gh(['api',`repos/${builder}/contents/games.json`,'--method','PUT','--input','-'],{allowFailure:true,input:JSON.stringify({message:`build: ${options.activate?'activate':'register'} ${identity.id}`,branch:'main',sha:current.sha,content:Buffer.from(JSON.stringify(updated,null,2)+'\n').toString('base64')})});
  if(response.status===0) break;
  if(attempt===2 || !/409|422/.test(response.stderr+response.stdout)) throw Error('Registry update failed; rerun after resolving permissions or concurrent updates');
}
console.log(`\n${source}\nLocal directory: ${root}\nApp id: ${identity.appId}\nEnvironment: ${identity.id}`);
if(options.activate) console.log(`Enabled. The registry push/schedule will build it. Releases: https://github.com/${source}/releases`);
else console.log(`Registered but disabled. Back up .local signing files outside the repository. Select this repository in the GitHub App installation, then run from the game directory:\n  npm run setup:game -- --activate\nApp installation settings: https://github.com/organizations/Jolly-Panda-Works/settings/installations`);
