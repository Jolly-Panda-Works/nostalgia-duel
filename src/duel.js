import {availableMoves,fa,labels} from './core.js';
const poses=import.meta.glob('../assets/duel/{left,right}-*.webp',{eager:true,query:'?url',import:'default'});

const keys=import.meta.glob('../assets/duel/key-*.webp',{eager:true,query:'?url',import:'default'});
export function duelKeyArt(move){
  return `<img src="${keys['../assets/duel/key-'+move+'.webp']}" class="choice-art" alt="" draggable="false">`;
}
// Coordinates follow the painted shoulder and waist on the 205 × 190 stage.
const silhouettes={
  left:'M0 0 H95 V62 Q78 70 84 84 Q87 101 80 126 L78 149 Q80 170 89 190 H0Z',
  right:'M205 0 H99 V67 Q112 82 105 92 Q101 107 110 130 L116 154 Q104 171 85 190 H205Z'
};
function fighter(side,player,pose,escape){
  const src=poses['../assets/duel/'+side+'-'+pose+'.webp'];
  const align=side==='left'?'xMin':'xMax';
  const figure=`<image width="205" height="190" href="${src}" preserveAspectRatio="${align}YMax meet"/>`;
  // The moving copy sits behind the stationary silhouette. Both share the same
  // source and registration, so the two layers reassemble exactly at full reach.
  return `<svg class="fighter fighter-${side}" viewBox="0 0 205 190" preserveAspectRatio="${side==='left'?'xMax':'xMin'}YMax meet" data-player="${player.id}" data-pose="${pose}" role="img" aria-label="${escape(player.name)}">
    <defs><clipPath id="torso-${side}"><path d="${silhouettes[side]}"/></clipPath>
    <clipPath id="arm-${side}"><path clip-rule="evenodd" d="M0 0H205V190H0Z ${silhouettes[side]}"/></clipPath></defs>
    <g class="duel-arm"><g clip-path="url(#arm-${side})">${figure}</g></g>
    <g clip-path="url(#torso-${side})">${figure}</g></svg>`;
}
export function renderDuel(state,{ownMove,reconnecting,escape,award,phaseStarted}){
  const self=state.players.find(p=>p.id===state.selfId);
  const opponent=state.players.find(p=>p.id!==state.selfId);
  const revealed=state.stage!=='choosing';
  const ready=!revealed&&!ownMove&&!self.committed&&!reconnecting;
  const moves=availableMoves(state.mode);
  const plate=(p,side)=>`<div class="score-player duel-nameplate ${side}" aria-label="${escape(p.name)}، ${fa(p.wins)} برد"><b>${escape(p.name)}${p===self?' (تو)':''}</b><strong>${fa(p.wins)}</strong></div>`;
  const pose=p=>revealed?state.choices[p.id]||'idle':'idle';
  const status=state.stage==='finished'?'پایان مسابقه':revealed?'نتیجهٔ این دست':ready?'حرکتت را انتخاب کن':reconnecting?'در حال اتصال دوباره…':'دستت ثبت شد';
  const wins=state.players.reduce((sum,player)=>sum+player.wins,0);
  const round=Math.min(state.rounds,wins+(revealed&&!state.roundResult?.tie?0:1));
  const buttons=moves.map((move,i)=>{
    const selected=(ownMove||state.choices[self.id])===move;
    return `<button type="button" class="gesture-key ${selected?'is-chosen':''}" ${ready?'data-online-move="'+move+'"':'disabled'} aria-label="${labels[move]}" title="${labels[move]} · ${fa(i+1)}">${duelKeyArt(move)}<span>${labels[move]}</span></button>`;
  }).join('');
  return `<div class="duel-board" style="--phase-delay:-${Math.floor(performance.now()-phaseStarted)}ms" data-phase="${revealed?'reveal':'choose'}">
    <div class="duel-scoreboard">${plate(self,'on-right')}<span class="duel-round">دور ${fa(round)} از ${fa(state.rounds)}</span>${plate(opponent,'on-left')}</div>
    <div class="duel-timer"><span id="online-time"></span><div id="round-timebar" class="round-timebar" role="progressbar" aria-label="زمان انتخاب" aria-valuemin="0" aria-valuemax="${(state.roundDurationMs||5000)/1000}"><span id="round-time-fill"></span></div></div>
    <div class="duel-stage">${fighter('left',opponent,pose(opponent),escape)}${fighter('right',self,pose(self),escape)}
    </div>
    <div class="online-control-panel duel-controls"><div class="duel-prompt"><p role="status">${status}</p><div class="round-feedback-lane">${award}</div></div><div class="duel-keys" data-count="${moves.length}">${buttons}</div></div>
  </div>`;
}
