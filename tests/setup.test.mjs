import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gameIdentity, register } from '../scripts/setup-lib.mjs';
test('new game follows studio package and repo naming',()=>{
  assert.deepEqual(gameIdentity({name:' Panda Jump ',slug:'panda_jump'}),{name:'Panda Jump',slug:'panda_jump',appId:'com.jollypanda.panda_jump',repositoryName:'panda-jump',id:'panda-jump'});
  for(const slug of ['../bad','Upper','a-b','']) assert.throws(()=>gameIdentity({name:'Game',slug}));
  assert.throws(()=>gameIdentity({name:'Game',slug:'game_template'}));
});
test('registration starts disabled, preserves peers and is idempotent',()=>{
  const identity=gameIdentity({name:'Panda',slug:'panda_jump'});
  const peer={id:'peer',repository:'Jolly-Panda-Works/peer',branch:'Iranian-store',enabled:true};
  const disabled=register([peer],identity,false);
  assert.equal(disabled[1].enabled,false);
  assert.deepEqual(register(disabled,identity,false),disabled);
  const enabled=register(disabled,identity,true);
  assert.deepEqual(enabled[0],peer);
  assert.equal(enabled[1].enabled,true);
  assert.throws(()=>register([{id:'panda-jump',repository:'Jolly-Panda-Works/other'}],identity,true));
});
test('preview works without GitHub calls or generating credentials',()=>{
  const p=spawnSync(process.execPath,['scripts/setup-game.mjs','--create','--name','Test','--slug','setup_test','--generate-signing','--plan'],{encoding:'utf8',env:{...process.env,GH_TOKEN:''}});
  assert.equal(p.status,0,p.stderr);
  const plan=JSON.parse(p.stdout);
  assert.equal(plan.appId,'com.jollypanda.setup_test');
  assert.equal(plan.activate,false);
  assert.equal(plan.releaseDestination,'Jolly-Panda-Works/setup-test');
});
