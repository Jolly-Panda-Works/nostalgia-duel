// Original vector icons: parchment cartouches, brass ink and turquoise accents.
const paths={
 house:'<path d="M18 45V28L32 16 46 28V45Z"/><path d="M26 45V34Q32 24 38 34V45M17 28H47M23 23H41"/><path d="M29 15L32 11 35 15"/>',
 profile:'<circle cx="32" cy="25" r="8"/><path d="M18 46Q18 34 32 34T46 46Z"/><path d="M24 21Q32 13 40 21M25 42Q32 38 39 42"/>',
 'users-three':'<circle cx="24" cy="26" r="7"/><circle cx="42" cy="28" r="6"/><path d="M12 46Q12 35 24 35T36 46ZM37 38Q50 35 51 46H40M18 21L24 17 30 21M38 24L42 21 46 24"/>',
 sword:'<path d="M19 45L41 17 47 14 46 21 25 49ZM16 38L29 49M17 47L21 51M29 35L43 18"/><path d="M18 18Q25 20 25 26M16 25L20 27M32 44L38 46"/>',
 advanced:'<path d="M18 46L42 17 47 14 46 21 23 50ZM15 39L29 50M17 18L22 17 47 44 43 49 18 23ZM37 48L49 37"/><path d="M32 12V19M28 15H36"/>',
 trophy:'<path d="M23 17H41L39 32Q32 43 25 32ZM23 20H16V26Q16 33 25 32M41 20H48V26Q48 33 39 32M32 38V46M24 48H40M27 45H37"/><path d="M29 24L32 21 35 24 32 28Z"/>',
 'book-open':'<path d="M32 21Q21 14 13 19V44Q23 40 32 47Q41 40 51 44V19Q43 14 32 21Z"/><path d="M32 21V47M18 24Q23 22 28 25M18 30Q23 28 28 31M37 25Q42 22 47 24M37 31Q42 28 47 30M18 36L27 37M38 37L47 36"/>',
 'flower-lotus':'<path d="M32 13Q20 25 32 43Q44 25 32 13ZM32 43Q13 43 12 24Q28 24 32 43ZM32 43Q51 43 52 24Q36 24 32 43ZM17 46Q32 52 47 46"/><path d="M32 24V42"/>',
 coins:'<ellipse cx="32" cy="43" rx="17" ry="7"/><path d="M15 37V43M49 37V43"/><ellipse cx="32" cy="37" rx="17" ry="7"/><path d="M18 30V36M46 30V36"/><ellipse cx="32" cy="29" rx="14" ry="7"/><path d="M27 26L32 22 37 26 32 31Z"/>',
 pouch:'<path d="M25 23L21 14Q32 19 43 14L39 23Q51 34 47 46Q32 53 17 46Q13 34 25 23Z"/><path d="M24 23H40M23 27H41M29 35L33 31 37 35 33 40Z"/>',
 chest:'<path d="M14 29Q14 16 27 16H37Q50 16 50 29V47H14Z"/><path d="M14 29H50M23 17V47M41 17V47M28 27H36V36H28ZM17 41H20M44 41H47"/>',
 treasure:'<path d="M14 30H50V48H14ZM14 30L18 18 29 12 43 18 50 30M14 30L30 23 50 30M24 28V48M41 28V48M28 32H36V39H28"/><path d="M32 14V20M28 17H36M19 39L21 42M44 41L47 38"/>',
 gear:'<path d="M28 15H36L38 21 44 19 49 25 46 31 50 36 46 43 39 42 36 49H28L25 42 18 43 14 36 18 31 15 25 20 19 26 21Z"/><circle cx="32" cy="32" r="9"/><path d="M32 27L37 32 32 37 27 32Z"/>',
 pen:'<path d="M18 47L24 32Q31 17 48 14Q46 31 31 39L18 47ZM18 47L40 24M24 32L31 39M30 25L36 31"/>',
 lock:'<rect x="19" y="29" width="26" height="20" rx="4"/><path d="M24 29V23Q24 12 32 12T40 23V29M32 36V42"/><circle cx="32" cy="35" r="2"/>',
 check:'<path d="M17 33L27 43 47 21M19 21L22 17M43 46L47 42"/>',
 plus:'<path d="M32 18V46M18 32H46"/>',
 close:'<path d="M21 21L43 43M43 21L21 43"/>',
 'sliders-horizontal':'<path d="M15 21H49M15 32H49M15 43H49"/><circle cx="25" cy="21" r="4"/><circle cx="40" cy="32" r="4"/><circle cx="26" cy="43" r="4"/>',
 play:'<path d="M25 18L46 32 25 46Z"/>',
 pause:'<path d="M23 19H28V45H23ZM36 19H41V45H36Z"/>',
 'arrow-right':'<path d="M15 32H48M35 19L48 32 35 45"/>'
};
export function themedIcon(name,className='ui-icon'){
 return `<svg class="${className} painted-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path class="icon-paper" d="M18 5H46Q46 11 53 11V18Q59 18 59 25V39Q53 39 53 46V53Q46 53 46 59H18Q18 53 11 53V46Q5 46 5 39V25Q11 25 11 18V11Q18 11 18 5Z"/><path class="icon-gold" d="M21 9H43M21 55H43M9 27V37M55 27V37"/><g class="icon-drawing">${paths[name]||paths['flower-lotus']}</g><path class="icon-turquoise" d="M30 6L32 4 34 6 32 8ZM30 58L32 56 34 58 32 60Z"/></svg>`;
}
