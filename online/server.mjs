import {Server} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {SocialService,socialRoom} from './SocialService.mjs';
import {GameRoom,QuickMatchRoom} from './GameRoom.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function startOnlineServer({port=Number(process.env.PORT||2567),host=process.env.HOST||'0.0.0.0',socialFile=port===0?null:path.join(root,'.local','social.json')}={}){
  const social=await SocialService.create(socialFile);
  const transport=new WebSocketTransport({maxPayload:8192,pingInterval:10000});
  const server=new Server({transport,greet:false,express:app=>{
    app.disable('x-powered-by');
    app.use('/api/social',social.router());
    app.get('/health',(_req,res)=>res.json({ok:true,game:'nostalgia-duel'}));
    app.use(express.static(path.join(root,'dist'),{index:'index.html'}));
  }});
  server.define('nostalgia',socialRoom(GameRoom,social));
  server.define('quick_match',socialRoom(QuickMatchRoom,social)).filterBy(['mode','rounds','capacity']);
  await server.listen(port,host);
  return {server,social,port:transport.server.address().port};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {port}=await startOnlineServer();
  console.log(`ONLINE_READY ${port}`);
  console.log(`Local: http://127.0.0.1:${port}`);
  for(const entries of Object.values(networkInterfaces()))for(const entry of entries||[])if(entry.family==='IPv4'&&!entry.internal)console.log(`LAN: http://${entry.address}:${port}`);
}
