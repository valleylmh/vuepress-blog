
const path = require('path')
const vue2 = require('../vue2.x/sidebar')
console.log(path.resolve(__dirname, './public/bdunion.txt'))
module.exports = {
  // base: '/',
  dest: 'dist',
  title: '一界码农',
  description: '越努力越幸运',
  head: [
    ['link', { rel: 'shortcut icon', href: '/favicon.ico', type: 'image/x-icon' }],
    ['meta', { name: 'referrer', content: 'no-referrer' }],
    ['meta', { name: 'baidu-site-verification', content: 'code-IoDDvZg9UC' }],
    ['meta', { name: 'baidu_union_verify', content: 'ef8729d54c118ea2f89c9b5813838aaa' }],
    ['meta', { name: 'renderer', content: 'webkit' }],
    ['meta', { 'http-equiv': 'X-UA-Compatible', content: 'edge' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover' }],
    [ // 添加百度统计
      "script", {}, `
        var _hmt = _hmt || [];
        (function() {
          var hm = document.createElement("script");
          hm.src = "https://hm.baidu.com/hm.js?a40ea45f7e812f35bb88ba0db4f7e663";
          var s = document.getElementsByTagName("script")[0]; 
          s.parentNode.insertBefore(hm, s);
        })();
      `
    ],
  ],
  locales: {
    '/': {lang: 'zh-CN'}
  },
  additionalPages: [
    // { // 百度联盟推广
    //   path: '/bdunion.txt/',
    //   filePath: path.resolve(__dirname, './public/bdunion.txt')
    // }
  ],
  themeConfig: {
    editLinks: false,
    docsDir: 'docs',
    algolia: {
      // 申请邮件成功会返回下面的apiKey和indexName
      apiKey: '79ccf0632a76664033618fcec9968e1b',
      indexName: 'valleylmh',
      // 自己在algoia注册的是没法爬取，除非不用这个插件
      // appId: '9SS6JJUJ4Z',
      // apiKey: '8aa26175ecbc4cba2eb6395325e77be0',
      // indexName: 'blog',
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
