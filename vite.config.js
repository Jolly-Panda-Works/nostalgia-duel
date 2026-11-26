import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins:[{
    name:'offline-game-files',
    apply:'build',
    generateBundle:{order:'post',handler(_,bundle){
      const files=Object.keys(bundle).filter(file=>!file.endsWith('.map'));
      const worker=readFileSync(new URL('./scripts/offline-worker.js',import.meta.url),'utf8');
      const hash=createHash('sha256').update(worker);
      for(const file of files){
        const item=bundle[file];
        hash.update(file).update(item.type==='chunk'?item.code:item.source);
      }
      this.emitFile({type:'asset',fileName:'offline-worker.js',source:
        'const build='+JSON.stringify(hash.digest('hex').slice(0,16))+';\n'+
        'const files='+JSON.stringify(files)+';\n'+worker});
    }}
  }]
});
