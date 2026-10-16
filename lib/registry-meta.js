'use strict'

module.exports = {
  name: 'SoftNav page TOC',
  packageName: '@antora-supplemental/soft-nav-page-toc',
  purpose: 'soft-nav',
  layer: 'bolt-on',
  chassis: 'soft-nav',
  pipeline: true,
  asciidoctor: false,
  lifecycleHooks: ['pagesComposed'],
  processorSubtypes: [],
  informalName: 'soft-nav-page-toc',
  description: 'Rebuild aside page TOC after SoftNav article swaps (Default UI site.js parity)',
}
