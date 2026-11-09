export const STARTER_COINS=300;
export const entryOffers={rps:{entry:20,coins:35,xp:30,participationXp:10},advanced:{entry:40,coins:70,xp:50,participationXp:15},party:{entry:30,coins:120,xp:80,participationXp:15}};
export const offerFor=mode=>entryOffers[mode]||entryOffers.rps;
