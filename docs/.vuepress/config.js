
module.exports = {
  // base: '/',
  dest: 'dist',
  title: '一界码农',
  description: '越努力越幸运',
  head: [
    ['link', { rel: 'shortcut icon', href: '/favicon.ico', type: 'image/x-icon' }],
    ['meta', { name: 'referrer', content: 'no-referrer' }]
  ],
  themeConfig: {
    editLinks: false,
    docsDir: 'docs',
    nav: [
      // { text: 'Coding', link: '/coding/' },
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
    lastUpdated: 'Last Updated',
  },
  plugins: [
    ['@vuepress/back-to-top'],
  ]
}
