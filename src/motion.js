import scene from '../assets/motion/toranj/scene.rml?raw';
import './motion.css';

// The Rive progress tracks drive native DOM elements in both browser and WebView.
const xml = new DOMParser().parseFromString(scene, 'application/xml');
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const tracks = new Map();

for (const animation of xml.querySelectorAll('LinearAnimation')) {
  const progress = animation.querySelector('KeyedObject[objectId="0:4"] KeyedProperty[property="x"]');
  if (!progress) continue;
  const name = animation.getAttribute('name');
  const frames = Number(animation.getAttribute('duration'));
  const duration = frames * 1000 / Number(animation.getAttribute('fps') || 60);
  const stops = [...progress.children].map(key => {
    const percent = Number(key.getAttribute('frame') || 0) * 100 / frames;
    return key.getAttribute('value') + ' ' + percent + '%';
  });
  const easing = 'linear(' + stops.join(', ') + ')';
  tracks.set(name, {duration, easing});
  root.style.setProperty('--' + name + '-duration', duration + 'ms');
  root.style.setProperty('--' + name + '-ease', easing);
}

export function moveElement(element, track, keyframes) {
  if (!element || reducedMotion.matches) return;
  for (const previous of element.getAnimations()) {
    if (previous.id === 'toranj-motion') previous.cancel();
  }
  element.animate(keyframes, {...tracks.get(track), id: 'toranj-motion'});
}

export function showSeal(element) {
  if (!element || reducedMotion.matches) return;
  element.querySelector(':scope > .toranj-seal')?.remove();
  const seal = document.createElement('i');
  seal.setAttribute('aria-hidden', 'true');
  seal.className = 'toranj-seal';
  element.classList.add('seal-host');
  element.append(seal);
  seal.addEventListener('animationend', () => seal.remove(), {once: true});
  setTimeout(() => seal.remove(), 650);
}
