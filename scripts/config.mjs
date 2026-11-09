import { readFileSync } from 'node:fs';
export function validate(config) {
  if (!/^[a-z][a-z0-9_]*$/.test(config.slug)) throw Error('slug must be lowercase snake_case');
  if (config.appId !== `com.jollypanda.${config.slug}`) throw Error('appId must equal com.jollypanda.<slug>');
  if (!['portrait', 'landscape'].includes(config.orientation)) throw Error('Invalid orientation');
  if (!Array.isArray(config.stores) || !config.stores.length || config.stores.some(s => !['bazaar','myket'].includes(s))) throw Error('Invalid stores');
  return config;
}
export const config = validate(JSON.parse(readFileSync('game.config.json', 'utf8')));
