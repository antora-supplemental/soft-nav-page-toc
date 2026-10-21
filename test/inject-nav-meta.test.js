'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { readAdocNavMeta, injectNavMetaTags, injectParentBreadcrumb, injectNavMetaForPages } = require('../lib/inject-nav-meta.js')

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
      '<ul><li class="valentus-breadcrumb-sep" aria-hidden="true">/</li>' +
      '<li class="valentus-breadcrumb-trail valentus-breadcrumb-trail--current"><a href="./">Leaf</a></li></ul>'
    const out = injectParentBreadcrumb(html, { parent: 'changelog.adoc' }, { pub: { url: '/docs/changelog-details/foo/' } })
    assert.match(out, /data-navtree-parent="1"/)
    assert.match(out, /href="\.\.\/\.\.\/changelog\/"/)
    assert.match(out, />Changelog</)
    assert.equal((out.match(/valentus-breadcrumb-sep/g) || []).length, 2)
  })

  it('reads hide-page from composed page attributes when source bytes are already HTML', () => {
    const page = {
      contents: Buffer.from(
        '<html><head></head><body><ul>' +
        '<li class="valentus-breadcrumb-sep" aria-hidden="true">/</li>' +
        '<li class="valentus-breadcrumb-trail valentus-breadcrumb-trail--current"><span class="valentus-breadcrumb-trail-text">2026-10-16</span></li>' +
        '</ul></body></html>'
      ),
      asciidoc: { attributes: { 'hide-page': '', 'navtree-parent': 'changelog.adoc' } },
      pub: { url: '/docs/docs/changelog-details/foo/' },
      src: { relative: 'modules/ROOT/pages/changelog-details/foo.adoc' },
    }
    const n = injectNavMetaForPages([page], { pages: {}, parentByPrefix: {} }, () => 'changelog-details/foo.adoc')
    assert.equal(n, 1)
    const html = page.contents.toString('utf8')
    assert.match(html, /antora-supplemental:hide-page/)
    assert.match(html, /navtree-parent" content="changelog\.adoc"/)
    assert.match(html, /data-navtree-parent="1"/)
    assert.match(html, />Changelog</)
  })
})
