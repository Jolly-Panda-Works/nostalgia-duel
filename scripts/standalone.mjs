import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
let html=await readFile('dist/index.html','utf8');
const script=html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style=html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
if(!script||!style)throw Error('Expected one bundled script and stylesheet');
const js=await readFile('dist/'+script[1].replace(/^\.\//,''),'utf8');
let css=await readFile('dist/'+style[1].replace(/^\.\//,''),'utf8');
const mime={'.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
for(const font of [...css.matchAll(/url\((["']?)([^)'"\s]+\.(?:woff2|webp|png|jpe?g|svg))\1\)/g)]) {
  const file=path.resolve('dist',path.dirname(style[1]),font[2]);
  const data=await readFile(file);
  css=css.replace(font[0],()=>`url("data:${mime[path.extname(file)]};base64,${data.toString('base64')}")`);
}
for(const asset of [...html.matchAll(/<img\b[^>]*src="([^"\s]+\.(?:webp|png|jpe?g|svg))"[^>]*>/g)]){
  const file=path.resolve('dist',asset[1]);const data=await readFile(file);html=html.replace(asset[0],()=>asset[0].replace(asset[1],`data:${mime[path.extname(file)]};base64,${data.toString('base64')}`));
}
html=html.replace(script[0],()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>').replace(style[0],()=>'<style>'+css+'</style>');
const iconLicense=await readFile('public/licenses/phosphor-icons-LICENSE.txt','utf8');
html=html.replace('</head>',()=>`<!-- Phosphor icon license\n${iconLicense.replaceAll('--','—')}\n--></head>`);
await mkdir('out',{recursive:true});await writeFile('out/play.html',html);console.log('Standalone game: out/play.html (no server needed)');
