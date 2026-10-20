/**
 * Fails when task-owned doc sections are still placeholders (FR-022, SC-007).
 *
 *   pnpm docs:check --done 1.2,1.4   # these tasks must have no TODO left
 *   pnpm docs:check --phase 1        # no `TODO (task 1.x)` may remain anywhere
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const DOC_FILES = ['README.md', 'CLAUDE.md', 'DESIGN.md', 'INFRASTRUCTURE.md']

export interface Leftover {
  file: string
  line: number
  task: string
}

export function findTodos(file: string, text: string): Leftover[] {
  const out: Leftover[] = []
  text.split('\n').forEach((content, i) => {
    for (const m of content.matchAll(/TODO \(task ([\w.]+)\)/g)) {
      out.push({ file, line: i + 1, task: m[1]! })
    }
  })
  return out
}

export function filterLeftovers(
  todos: Leftover[],
  opts: { done?: string[]; phase?: string },
): Leftover[] {
  return todos.filter(
    (t) =>
      (opts.done?.includes(t.task) ?? false) ||
      (opts.phase !== undefined && t.task.startsWith(`${opts.phase}.`)),
  )
}

function parseArgs(argv: string[]): { done?: string[]; phase?: string } {
  const opts: { done?: string[]; phase?: string } = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--done') opts.done = (argv[++i] ?? '').split(',').filter(Boolean)
    else if (argv[i] === '--phase') opts.phase = argv[++i]
  }
  return opts
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.done && !opts.phase) {
    console.error('Usage: docs:check --done <task,...> | --phase <n>')
    process.exit(2)
  }
  const todos = DOC_FILES.flatMap((f) => findTodos(f, readFileSync(f, 'utf8')))
  const leftovers = filterLeftovers(todos, opts)
  if (leftovers.length) {
    for (const l of leftovers) console.error(`${l.file}:${l.line}  TODO (task ${l.task})`)
    console.error(`\n✖ ${leftovers.length} placeholder(s) left`)
    process.exit(1)
  }
  console.log('✔ docs check passed')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
