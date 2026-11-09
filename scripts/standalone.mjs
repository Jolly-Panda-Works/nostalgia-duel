import { readFile, writeFile, mkdir } from 'node:fs/promises';
let html=await readFile('dist/index.html','utf8');
const script=html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style=html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
if(!script||!style)throw Error('Expected one bundled script and stylesheet');
const js=await readFile('dist/'+script[1].replace(/^\.\//,''),'utf8');
const css=await readFile('dist/'+style[1].replace(/^\.\//,''),'utf8');
html=html.replace(script[0],()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>').replace(style[0],()=>'<style>'+css+'</style>');
await mkdir('out',{recursive:true});await writeFile('out/play.html',html);console.log('Standalone game: out/play.html (no server needed)');
