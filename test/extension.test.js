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
})
