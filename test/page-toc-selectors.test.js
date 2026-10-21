'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { JSDOM } = require('jsdom')
const {
  resolveTocRoot,
  buildSectionLevelSelector,
  collectHeadings,
} = require('../lib/page-toc-selectors')

test('buildSectionLevelSelector scopes sections under toc root', () => {
  assert.equal(buildSectionLevelSelector(1), '.sect1>h2[id]')
  assert.equal(
    buildSectionLevelSelector(2),
    '.sect1>.sectionbody>.sect2>h3[id]:not(.discrete)'
  )
})

test('resolveTocRoot prefers data-page-toc-root', () => {
  const dom = new JSDOM(`<article class="doc"><div data-page-toc-root id="root"></div></article>`)
  const article = dom.window.document.querySelector('article.doc')
  assert.equal(resolveTocRoot(article).id, 'root')
})

test('collectHeadings finds h2 under data-page-toc-root body zone', () => {
  const dom = new JSDOM(`<!DOCTYPE html><article class="doc" data-zone-root>
<header class="doc-zone doc-zone--header" data-zone="header"><h1 id="title" class="page">Title</h1></header>
<div class="doc-zone doc-zone--body" data-zone="body" data-page-toc-root>
<div class="sect1"><h2 id="one">One</h2></div>
<div class="sect1"><h2 id="two">Two</h2></div>
</div>
</article>`)
  const article = dom.window.document.querySelector('article.doc')
  const headings = collectHeadings(article, 2)
  assert.equal(headings.length, 3)
  assert.deepEqual(
    headings.map((h) => h.id),
    ['title', 'one', 'two']
  )
})

test('legacy flat article still matches sections', () => {
  const dom = new JSDOM(`<!DOCTYPE html><article class="doc">
<div class="sect1"><h2 id="a">A</h2></div>
</article>`)
  const article = dom.window.document.querySelector('article.doc')
  const headings = collectHeadings(article, 1)
  assert.equal(headings.length, 1)
  assert.equal(headings[0].id, 'a')
})
