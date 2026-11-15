const { spawnSync } = require('node:child_process');

const message = process.argv.slice(2).join(' ').trim() || 'update';

for (const [command, args] of [
  ['pnpm', ['format']],
  ['git', ['add', '-A']],
  ['git', ['commit', '-m', `chore: 🔥 ${message}`]],
  ['git', ['push']],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
