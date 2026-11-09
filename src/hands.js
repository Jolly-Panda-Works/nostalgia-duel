import idle from '../assets/hands/idle.webp';
import rock from '../assets/hands/rock.webp';
import paper from '../assets/hands/paper.webp';
import scissors from '../assets/hands/scissors.webp';
import palm from '../assets/hands/palm.webp';
import back from '../assets/hands/back.webp';
import lizard from '../assets/hands/lizard.webp';
import spock from '../assets/hands/spock.webp';
import {labels,fa} from './core.js';
export const handArt={idle,rock,paper,scissors,palm,back,lizard,spock};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function choiceArt(move){return `<img class="choice-art" src="${handArt[move]}" alt="" aria-hidden="true">`;}
export function tabletop(players,{id='',selfId=0,choices={},revealed=false,ownMove=null,round=0,className=''}={}){
  const self=players.find(p=>p.id===selfId)||players[0];
  const seats=[self,...players.filter(p=>p.id!==self?.id)];
  const arms=seats.map((p,index)=>{
    const angle=index*360/seats.length,radians=angle*Math.PI/180;
    const x=50+Math.sin(radians)*40,y=50+Math.cos(radians)*40;
    const labelX=50+Math.sin(radians)*39,labelY=50+Math.cos(radians)*44;
    const move=p.active?(revealed?choices[p.id]||'idle':p.id===selfId&&ownMove?ownMove:'idle'):'idle';
    return `<div class="hand-seat table-arm ${p.id===selfId?'is-self':''} ${!p.active?'is-eliminated':''}" style="--seat-x:${x}%;--seat-y:${y}%;--seat-angle:${-angle}deg;--hand-delay:${-index*.17}s" data-player="${p.id}" data-pose="${move}" aria-label="${escape(p.name)}: ${!p.active?'حذف‌شده':move==='idle'?'در انتظار روشدن':labels[move]}"><img class="arm-sprite" src="${handArt[move]}" alt="دست از آرنج؛ ${move==='idle'?'آماده':labels[move]}" draggable="false"></div><div class="seat-name ${p.id===selfId?'self-name':''}" style="left:${labelX}%;top:${labelY}%"><b>${escape(p.name)}${p.id===selfId?' (تو)':''}</b><small>${!p.active?'حذف‌شده':fa(p.wins||0)+' برد'}</small></div>`;
  }).join('');
  return `<div ${id?`id="${id}"`:''} class="hand-table physical-table ${className}" data-seats="${seats.length}" data-phase="${revealed?'reveal':'choose'}" data-round="${round}"><div class="table-top" aria-hidden="true"></div>${arms}</div>`;
}
// Warm the gesture states so changing pose does not wait for a network request.
for(const src of Object.values(handArt)){const image=new Image();image.src=src;}
