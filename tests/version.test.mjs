import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextVersion, versionCode } from '../scripts/version.mjs';
import { validate } from '../scripts/config.mjs';
test('one version sequence across store and main tags',()=>{
  assert.equal(nextVersion(['v1.2.3','bazaar-v1.4.9','myket-v1.4.9','stores-v1.5.1'],'0.1.0'),'1.5.2');
  assert.equal(nextVersion(['v1.4.9'],'0.1.0','minor'),'1.5.0');
  assert.equal(nextVersion(['v1.4.9'],'0.1.0','major'),'2.0.0');
  assert.equal(nextVersion([],'0.1.0'),'0.1.0');
  assert.equal(nextVersion(['v1.0.0'],'2.0.0'),'2.0.0');
});
test('Android code is monotonic and bounded',()=>{
  assert.equal(versionCode('1.33.0'),1033000);
  assert.ok(versionCode('2.0.0')>versionCode('1.999.999'));
  for(const v of ['1.0.1000','0.0.0','2101.0.0','1.0.x']) assert.throws(()=>versionCode(v));
});
test('package id must match studio convention',()=>{
  assert.throws(()=>validate({slug:'test',appId:'com.other.test'}));
});
