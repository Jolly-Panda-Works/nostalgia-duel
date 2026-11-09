const key='nostalgia-feedback';
export function setupMatchFeedback(){
 let prefs={sound:true,volume:.35,vibration:true};try{const p=JSON.parse(localStorage.getItem(key));if(p){prefs={sound:typeof p.sound==='boolean'?p.sound:true,volume:typeof p.volume==='number'?Math.max(0,Math.min(1,p.volume)):.35,vibration:typeof p.vibration==='boolean'?p.vibration:true};}}catch{}
 let context;const $=id=>document.getElementById(id);
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}};
 const warm=()=>{if(prefs.sound){try{context??=new (window.AudioContext||window.webkitAudioContext)();void context.resume().catch(()=>{});}catch{}}};
 document.addEventListener('pointerdown',warm,{passive:true});document.addEventListener('keydown',warm);
 function play(kind){if(document.hidden)return;if(prefs.vibration&&navigator.vibrate){try{navigator.vibrate(kind==='win'?[35,45,65]:kind==='lose'?60:kind==='choose'?15:20);}catch{}}
  if(!prefs.sound||!prefs.volume)return;warm();if(!context||context.state!=='running')return;
  const notes={win:[523,659,784],lose:[330,220],tie:[392,392],choose:[440],tick:[660]}[kind]||[440];notes.forEach((frequency,i)=>{const o=context.createOscillator(),g=context.createGain(),t=context.currentTime+i*.11;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(prefs.volume*.16,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.1);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.12);});
 }
 $('setting-sound').checked=prefs.sound;$('setting-volume').value=String(Math.round(prefs.volume*100));$('setting-vibration').checked=prefs.vibration;
 if(!navigator.vibrate){$('setting-vibration').disabled=true;$('vibration-support').textContent='این دستگاه یا مرورگر از ویبره پشتیبانی نمی‌کند.';}
 $('setting-sound').onchange=e=>{prefs.sound=e.target.checked;save();if(prefs.sound)play('choose');};$('setting-volume').oninput=e=>{prefs.volume=Number(e.target.value)/100;save();};$('setting-volume').onchange=()=>play('choose');$('setting-vibration').onchange=e=>{prefs.vibration=e.target.checked;save();if(prefs.vibration&&navigator.vibrate)navigator.vibrate(35);};
 return{play};
}
