import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
let html=await readFile('dist/index.html','utf8');
const script=html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style=html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
if(!script||!style)throw Error('Expected one bundled script and stylesheet');
const js=await readFile('dist/'+script[1].replace(/^\.\//,''),'utf8');
let css=await readFile('dist/'+style[1].replace(/^\.\//,''),'utf8');
for(const font of [...css.matchAll(/url\((["']?)([^)'"\s]+\.woff2)\1\)/g)]) {
  const file=path.resolve('dist',path.dirname(style[1]),font[2]);
  const data=await readFile(file);
  css=css.replace(font[0],()=>`url("data:font/woff2;base64,${data.toString('base64')}")`);
}
html=html.replace(script[0],()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>').replace(style[0],()=>'<style>'+css+'</style>');
await mkdir('out',{recursive:true});await writeFile('out/play.html',html);console.log('Standalone game: out/play.html (no server needed)');
