'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  parseNavAdocComments,
  resolveNavtreeParent,
  mergeRegistry,
  emptyRegistry,
} = require('../lib/navtree-registry.js')

describe('navtree-registry', () => {
  it('parses nav.adoc comment rules', () => {
    const r = parseNavAdocComments(
      '* xref:changelog.adoc[]\n;; navtree-parent-association: changelog-details/ -> changelog.adoc\n'
    )
    assert.equal(r.parentByPrefix['changelog-details/'], 'changelog.adoc')
  })

  it('resolves page-specific parent over prefix', () => {
    const reg = mergeRegistry(emptyRegistry(), {
      pages: { 'proposals/tgc.adoc': 'proposals/index.adoc' },
      parentByPrefix: { 'changelog-details/': 'changelog.adoc' },
    })
    assert.equal(
      resolveNavtreeParent('proposals/tgc.adoc', {}, reg),
      'proposals/index.adoc'
    )
    assert.equal(
      resolveNavtreeParent('changelog-details/x.adoc', {}, reg),
      'changelog.adoc'
    )
  })
})
