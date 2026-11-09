import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
let html=await readFile('dist/index.html','utf8');
const script=html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style=html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
if(!script||!style)throw Error('Expected one bundled script and stylesheet');
let js=await readFile('dist/'+script[1].replace(/^\.\//,''),'utf8');
let css=await readFile('dist/'+style[1].replace(/^\.\//,''),'utf8');
const mime={'.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
for(const asset of [...js.matchAll(/new URL\([`"']([^`"']+\.(?:webp|png|jpe?g|svg))[`"'],\s*import\.meta\.url\)\.href/g)]){
  const file=path.resolve('dist',path.dirname(script[1]),asset[1]);
  const data=await readFile(file);
  js=js.replace(asset[0],()=>JSON.stringify(`data:${mime[path.extname(file)]};base64,${data.toString('base64')}`));
}
for(const font of [...css.matchAll(/url\((["']?)([^)'"\s]+\.(?:woff2|webp|png|jpe?g|svg))\1\)/g)]) {
  const file=path.resolve('dist',path.dirname(style[1]),font[2]);
  const data=await readFile(file);
  css=css.replace(font[0],()=>`url("data:${mime[path.extname(file)]};base64,${data.toString('base64')}")`);
}
for(const asset of [...html.matchAll(/<img\b[^>]*src="([^"\s]+\.(?:webp|png|jpe?g|svg))"[^>]*>/g)]){
  const file=path.resolve('dist',asset[1]);const data=await readFile(file);html=html.replace(asset[0],()=>asset[0].replace(asset[1],`data:${mime[path.extname(file)]};base64,${data.toString('base64')}`));
}
html=html.replace(script[0],()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>').replace(style[0],()=>'<style>'+css+'</style>');
const notices=[];
for(const name of await readdir('public/licenses'))if(name.endsWith('.txt'))notices.push(name+'\n'+await readFile('public/licenses/'+name,'utf8'));
html=html.replace('</head>',()=>`<!-- Third-party licenses\n${notices.join('\n\n').replaceAll('--','—')}\n--></head>`);
await mkdir('out',{recursive:true});await writeFile('out/play.html',html);console.log('Standalone game: out/play.html (no server needed)');
