'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { JSDOM } = require('jsdom')
const {
  buildLevelSelector,
  buildHeadingSelectorQuery,
  collectHeadings,
} = require('../lib/page-toc-selectors')

test('level-1 selector uses descendant gap for zoned article body', () => {
  assert.equal(buildLevelSelector('article.doc', 1), 'article.doc .sect1>h2[id]')
})

test('level-2 selector keeps sectionbody token inside sect chain', () => {
  assert.equal(
    buildLevelSelector('article.doc', 2),
    'article.doc .sect1>.sectionbody>.sect2>h3[id]:not(.discrete)'
  )
})

test('collectHeadings finds h2 under doc-zone--body', () => {
  const dom = new JSDOM(`<!DOCTYPE html><article class="doc" data-zone-root>
<header class="doc-zone doc-zone--header"><h1 id="title" class="page">Title</h1></header>
<div class="doc-zone doc-zone--body">
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

test('legacy flat article still matches direct sect children', () => {
  const dom = new JSDOM(`<!DOCTYPE html><article class="doc">
<div class="sect1"><h2 id="a">A</h2></div>
</article>`)
  const article = dom.window.document.querySelector('article.doc')
  const headings = collectHeadings(article, 1)
  assert.equal(headings.length, 1)
  assert.equal(headings[0].id, 'a')
})

test('buildHeadingSelectorQuery joins levels for querySelectorAll', () => {
  const q = buildHeadingSelectorQuery('article.doc', 1)
  assert.match(q, /article\.doc \.sect1>h2\[id\]/)
  assert.match(q, /article\.doc h1\[id\]\.sect0/)
})
