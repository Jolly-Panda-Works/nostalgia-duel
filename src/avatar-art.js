import {avatarCatalog} from './profile-data.js';
import a0 from '../assets/avatars/0.webp';import a1 from '../assets/avatars/1.webp';import a2 from '../assets/avatars/2.webp';import a3 from '../assets/avatars/3.webp';import a4 from '../assets/avatars/4.webp';import a5 from '../assets/avatars/5.webp';import a6 from '../assets/avatars/6.webp';import a7 from '../assets/avatars/7.webp';import a8 from '../assets/avatars/8.webp';import a9 from '../assets/avatars/9.webp';
export const avatarArt=[a0,a1,a2,a3,a4,a5,a6,a7,a8,a9];
export function portrait(id){const i=Number.isInteger(id)&&id>=0&&id<10?id:0;return `<span class="avatar avatar-art"><img src="${avatarArt[i]}" alt="${avatarCatalog[i].name}" draggable="false"></span>`;}
