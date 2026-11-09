import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}});
function openBrowser(){if(process.argv.includes('--open')&&process.platform==='win32')spawn('explorer.exe',['http://127.0.0.1:4173'],{stdio:'ignore',windowsHide:true}).unref();}
server.on('error',error=>{if(error.code==='EADDRINUSE'){console.log('Port 4173 is already in use. Open http://127.0.0.1:4173 or stop the existing server.');openBrowser();}else{console.error(error.message);process.exitCode=1;}});
server.listen(4173,'127.0.0.1',()=>{console.log('Nostalgia Duel: http://127.0.0.1:4173');openBrowser();});
