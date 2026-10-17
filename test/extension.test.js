'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

describe('soft-nav-page-toc extension', () => {
  it('hooks pagesComposed', () => {
    const ext = require('../lib/extension.js')
    const handlers = {}
    ext.register.call({
      on (e, fn) { handlers[e] = fn },
      getLogger () { return { info () {} } },
    }, { config: {} })
    assert.equal(typeof handlers.pagesComposed, 'function')
  })

  it('injectAfterSiteJs inserts defer script after site.js', () => {
    const { injectAfterSiteJs } = require('../lib/extension.js')
    const html =
      '<body><script src="../../ui/js/site.js"></script></body>'
    const out = injectAfterSiteJs(html)
    assert.match(out, /site\.js"><\/script><script src="\.\.\/\.\.\/_\/js\/soft-nav-page-toc\.js" defer><\/script>/)
    assert.equal(injectAfterSiteJs(out), out)
  })

  it('injectAfterSiteJs keeps _/js when site.js is already in the supplemental bundle', () => {
    const { injectAfterSiteJs } = require('../lib/extension.js')
    const html =
      '<script id="site-script" src="../../_/js/site.js" data-ui-root-path="../../_"></script>'
    const out = injectAfterSiteJs(html)
    assert.match(out, /src="\.\.\/\.\.\/_\/js\/soft-nav-page-toc\.js" defer/)
    assert.doesNotMatch(out, /src="\.\.\/\.\.\/_\/" defer/)
  })

  it('toc script uses site.js sectionbody selector (no double combinator)', () => {
    const fs = require('node:fs')
    const path = require('node:path')
    const src = fs.readFileSync(path.join(__dirname, '../ui/js/soft-nav-page-toc.js'), 'utf8')
    assert.match(src, /\(c === 2 \? '\.sectionbody>' : ''\) \+ '\.sect' \+ c\)/)
    assert.doesNotMatch(src, /parts\.push\(c === 2 \? '\.sectionbody>' : ''\)/)
  })
})
