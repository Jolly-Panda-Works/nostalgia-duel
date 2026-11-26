export const STARTER_COINS=300;
export const entryFees=Object.freeze([0,10,25,50,100,200]);

export function offerFor(entry=0){
  if(!entryFees.includes(entry))throw Object.assign(Error('ورودی انتخاب‌شده معتبر نیست.'),{status:400});
  return {entry,coins:entry===0?5:entry*2};
}

export function roundDurationFor(match){if(match.mode==='party'){const total=match.players.length,active=match.players.filter(p=>p.active).length;const progress=Math.max(0,Math.min(1,(total-active)/Math.max(1,total-2)));return Math.round((5000-2000*progress)/100)*100;}if(match.rounds===1)return 3000;const progress=Math.max(0,Math.min(1,match.decisive/(match.rounds-1)));return Math.round((5000-2000*progress)/100)*100;}
