import { execFileSync, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import husky from 'husky'

if (process.env.HUSKY === '0') process.exit(0)

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const gitDir = resolve(git('rev-parse', '--git-dir'))
const commonDir = resolve(git('rev-parse', '--git-common-dir'))

if (gitDir === commonDir) {
  const error = husky()
  if (error) throw new Error(error)
} else {
  const previous = spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], { encoding: 'utf8' })
  if (![0, 1].includes(previous.status)) throw new Error(previous.stderr)
  git('config', '--local', 'extensions.worktreeConfig', 'true')
  try {
    const error = husky()
    if (error) throw new Error(error)
    git('config', '--worktree', 'core.hooksPath', '.husky/_')
  } finally {
    if (previous.status === 0) {
      git('config', '--local', 'core.hooksPath', previous.stdout.trim())
    } else {
      const restored = spawnSync('git', ['config', '--local', '--unset', 'core.hooksPath'], { encoding: 'utf8' })
      if (![0, 5].includes(restored.status)) throw new Error(restored.stderr)
    }
  }
}
