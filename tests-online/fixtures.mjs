// Server-side fixtures give legacy room-rule tests an eligible profile per client.
export function eligibleClients(client,social){
 for(const method of ['create','joinById','joinOrCreate']){
  const original=client[method].bind(client);
  client[method]=async(name,options={})=>{
   const registered=await social.register(options.name||'آزمایشگر',options.avatar||0);
   social.authenticate(registered.token).xp=500;
   return original(name,{...options,socialToken:registered.token});
  };
 }
 return client;
}
