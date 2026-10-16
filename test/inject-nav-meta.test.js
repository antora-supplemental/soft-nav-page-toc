'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { readAdocNavMeta, injectNavMetaTags, injectParentBreadcrumb } = require('../lib/inject-nav-meta.js')

describe('inject-nav-meta', () => {
  it('reads hide-page and parent from adoc', () => {
    const meta = readAdocNavMeta(':hide-page:\n:navtree-parent: changelog.adoc\n= X\n')
    assert.ok(meta)
    assert.equal(meta.parent, 'changelog.adoc')
  })

  it('injects meta tags into head', () => {
    const out = injectNavMetaTags('<html><head></head><body></body></html>', { parent: 'changelog.adoc' })
    assert.match(out, /hide-page/)
    assert.match(out, /navtree-parent" content="changelog\.adoc"/)
  })

  it('injects parent breadcrumb before current trail', () => {
    const html =
      '<ul><li class="adt-breadcrumb-trail adt-breadcrumb-trail--current"><a href="./">Leaf</a></li></ul>'
    const out = injectParentBreadcrumb(html, { parent: 'changelog.adoc' }, { pub: { url: '/docs/changelog-details/foo/' } })
    assert.match(out, /data-navtree-parent="1"/)
    assert.match(out, /href="\.\.\/\.\.\/changelog\/"/)
  })
})
