import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('standalone debug can never submit to a store',()=>{
  const p=spawnSync(process.execPath,['scripts/publish-stores.mjs'],{encoding:'utf8',env:{...process.env,PUBLISH_STORES:'true',SOURCE_BRANCH:'Iranian-store',STORE:'debug'}});
  assert.equal(p.status,0,p.stderr);
  assert.match(p.stdout,/disabled/);
});
test('test builds cannot accidentally call store APIs',()=>{
  const p=spawnSync(process.execPath,['scripts/publish-stores.mjs'],{encoding:'utf8',env:{...process.env,PUBLISH_STORES:'false',BAZAAR_PISHKHAN_TOKEN:'not-a-real-token',MYKET_ACCESS_TOKEN:'not-a-real-token'}});
  assert.equal(p.status,0);
  assert.match(p.stdout,/disabled/);
});
test('submission from main is rejected before any network call',()=>{
  const p=spawnSync(process.execPath,['scripts/publish-stores.mjs'],{encoding:'utf8',env:{...process.env,PUBLISH_STORES:'true',SOURCE_BRANCH:'main'}});
  assert.notEqual(p.status,0);
  assert.match(p.stderr,/requires Iranian-store/);
});
test('unversioned release notes cannot submit',()=>{
  const p=spawnSync(process.execPath,['scripts/publish-stores.mjs'],{encoding:'utf8',env:{...process.env,PUBLISH_STORES:'true',SOURCE_BRANCH:'Iranian-store',STORE:'bazaar',VERSION:'0.1.0'}});
  assert.notEqual(p.status,0);
  assert.match(p.stderr,/exact version/);
});
