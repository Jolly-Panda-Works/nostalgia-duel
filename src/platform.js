import {cleanSave} from './core.js';
export const native=Boolean(globalThis.Capacitor?.isNativePlatform?.());
export const mobileStandalone=native||import.meta.env.VITE_MOBILE_STANDALONE==='true';
const key='nostalgia-duel-v2';
export function load(){try{return{data:cleanSave(JSON.parse(localStorage.getItem(key)||'null')),available:true};}catch{return{data:cleanSave(null),available:false};}}
export function persist(data){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}}
export function bindLifecycle(pause){document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);if(native)globalThis.Capacitor.Plugins?.App?.addListener('appStateChange',state=>{if(!state.isActive)pause();});}
