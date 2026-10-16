'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { readAdocNavMeta, injectNavMetaTags } = require('../lib/inject-nav-meta.js')

describe('inject-nav-meta', () => {
  it('reads nav-hidden and parent from adoc', () => {
    const meta = readAdocNavMeta(':page-nav-hidden:\n:page-nav-parent: changelog.adoc\n= X\n')
    assert.ok(meta)
    assert.equal(meta.parent, 'changelog.adoc')
  })

  it('injects meta tags into head', () => {
    const out = injectNavMetaTags('<html><head></head><body></body></html>', { parent: 'changelog.adoc' })
    assert.match(out, /antora-supplemental:nav-hidden/)
    assert.match(out, /nav-parent" content="changelog\.adoc"/)
  })
})
