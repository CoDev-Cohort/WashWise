import { describe, expect, it } from 'vitest'
import { filterLeftovers, findTodos } from './check-docs'

const text = ['# Doc', '> TODO (task 1.2)', 'ok', '> TODO (task 1.4)', '> TODO (task P4)'].join(
  '\n',
)

describe('check-docs', () => {
  const todos = findTodos('X.md', text)

  it('finds every task marker with its line number', () => {
    expect(todos).toEqual([
      { file: 'X.md', line: 2, task: '1.2' },
      { file: 'X.md', line: 4, task: '1.4' },
      { file: 'X.md', line: 5, task: 'P4' },
    ])
  })

  it('--done only flags the listed tasks', () => {
    expect(filterLeftovers(todos, { done: ['1.4'] }).map((t) => t.task)).toEqual(['1.4'])
  })

  it('--phase flags every task in that phase but not other phases', () => {
    expect(filterLeftovers(todos, { phase: '1' }).map((t) => t.task)).toEqual(['1.2', '1.4'])
  })
})
