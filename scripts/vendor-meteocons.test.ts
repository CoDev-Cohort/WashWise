import { describe, expect, it } from 'vitest'
import { stripAnimation } from './vendor-meteocons'

describe('stripAnimation', () => {
  it('removes self-closing and paired SMIL elements and keeps the shapes', () => {
    const svg =
      '<svg><path d="M0 0"><animateTransform attributeName="transform" values="0;1"/>' +
      '<animate attributeName="opacity" values="0;1"></animate></path><set to="1"/><circle r="2"/></svg>'
    expect(stripAnimation(svg)).toBe('<svg><path d="M0 0"></path><circle r="2"/></svg>')
  })
})
