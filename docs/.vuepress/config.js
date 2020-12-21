
const vue2 = require('../vue2.x/sidebar')
module.exports = {
  // base: '/',
  dest: 'dist',
  title: '一界码农',
  description: '越努力越幸运',
  head: [
    ['link', { rel: 'shortcut icon', href: '/favicon.ico', type: 'image/x-icon' }],
    ['meta', { name: 'keywords', content: '一界码农'}],
    ['meta', { name: 'referrer', content: 'no-referrer' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover' }],
  ],
  locales: {
    '/': {lang: 'zh-CN'}
  },
  themeConfig: {
    editLinks: false,
    docsDir: 'docs',
    algolia: {
      appId: '9SS6JJUJ4Z',
      apiKey: '8aa26175ecbc4cba2eb6395325e77be0',
      indexName: 'blog',
      // facetFilters: ['lang: zh-CN'],
    },
    nav: [
      { text: 'Vue', link: '/vue2.x/' },
      {
        text: '人生杂记', //link: '/study_life/',
        ariaLabel: '生活的理想就是为了理想的生活',
        items: [
          { text: '年度总结', link: '/life/year/' },
          { text: '其他', link: '/life/other/' },
          { text: '老喻的人生算法课', link: '/life_algorithm/' },
        ]
      },
      // { text: '投资学习', link: '/invest/' },
      { text: 'github', link: 'https://github.com/valleylmh/vuepress-blog' },
    ],
    sidebar: {
      '/vue2.x/': [
        {
          title: 'Vue2.x版本',
          collapsable: true,
          children: vue2
        }
      ],
      '/life/year/': [
        {
          title: '年度总结',
          collapsable: false,
          children: ['']
        },
      ],
      '/life/other/': [
        ['homeTown01', '老家农村的结婚：赤裸裸的金钱交易'],
        ['homeTown02', '老家农村的结婚（二）——故事篇']
      ],
      '/life_algorithm/': [
        ['', '为什么推荐'],
        '01_A', '02_A', '03_A', '04_A', '05_B', '06_B', '07_B', '08_B', '09_B', '10_B', '11_B', '12_B', '13_B', '14_B', '15_B', '16_B', '17_B', '18_B', 
      ],
    },
    lastUpdated: '上次更新',
  },
  plugins: [
    ['@vuepress/back-to-top'],
  ]
}
