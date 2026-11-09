export function gameIdentity({ name, slug, repo }) {
  if (!name?.trim() || /[\r\n\0]/.test(name)) throw Error('A single-line game name is required');
  if (!/^[a-z][a-z0-9_]*$/.test(slug || '')) throw Error('slug must be lowercase snake_case');
  const repositoryName = repo || slug.replaceAll('_','-');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(repositoryName)) throw Error('Repository name must be lowercase kebab-case');
  if (['game-template','game-builds','build-pipeline-test'].includes(repositoryName)) throw Error('Reserved repository name');
  return { name:name.trim(), slug, appId:`com.jollypanda.${slug}`, repositoryName, id:repositoryName };
}
export function register(games, identity, enabled) {
  const repository = `Jolly-Panda-Works/${identity.repositoryName}`;
  if (!Array.isArray(games)) throw Error('games.json must be an array');
  const collision = games.find(g => (g.id===identity.id && g.repository!==repository) || (g.repository===repository && g.id!==identity.id));
  if (collision) throw Error('Game id or repository already registered differently');
  const entry = {id:identity.id,repository,branch:'Iranian-store',enabled};
  return games.some(g=>g.id===identity.id) ? games.map(g=>g.id===identity.id?entry:g) : [...games,entry];
}
