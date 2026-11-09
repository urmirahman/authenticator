const { spawnSync } = require('node:child_process');

const message = process.argv.slice(2).join(' ').trim();
if (!message) {
  console.error('Usage: pnpm boom <commit message>');
  process.exit(1);
}

for (const args of [['add', '-A'], ['commit', '-m', `chore: 🔥 ${message}`], ['push']]) {
  const result = spawnSync('git', args, { stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
