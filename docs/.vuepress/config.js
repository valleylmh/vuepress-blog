const LAOYULIFE = '老喻的人生算法课'
module.exports = {
  // base: '/',
  dest: 'dist',
  title: '一界码农',
  description: '越努力越幸运',
  head: [
    ['link', { rel: 'shortcut icon', href: '/favicon.ico', type: 'image/x-icon' }]
  ],
  themeConfig: {
    editLinks: false,
    docsDir: 'docs',
    nav: [
      // { text: 'Coding', link: '/coding/' },
      {
        text: '人生杂记', link: '/study_life/'
        // ariaLabel: '生活不易且珍惜',
        // items: [
        //   { text: '得到APP认知学习', link: '/study_life/iget_app/' },
        //   { text: '年度总结', link: '/study_life/year/' }
        // ]
      },
      { text: '认知升级', link: '/upgrade/' },
      // { text: '投资学习', link: '/invest/' },
      { text: 'github', link: 'https://github.com/valleylmh/vuepress-blog' },
    ],
    sidebar: {
      '/coding/': [
        {
          title: '初识 TypeScript',
          collapsable: false,
          children: [
            ['chapter1/', 'Introduction'],
            'chapter1/install',
            'chapter1/start'
          ]
        }
      ],
      '/study_life/': [
        {
          title: '年度总结',
          collapsable: false,
          children: [ 'year/' ]
        },
        {
          title: '杂记',
          collapsable: false,
          children: [
            'other/老家农村的结婚：赤裸裸的金钱交易',
            'other/老家农村的结婚（二）——故事篇'
          ]
        },
      ],
      '/upgrade/': [
        {
          title: '精选好文',
          collapsable: false,
          children: ['goodArticle']
        },
        {
          title: '老喻的人生算法课',
          collapsable: true,
          children: [
            [LAOYULIFE+'/', '为什么推荐'],
            LAOYULIFE + '/01_A',
            LAOYULIFE + '/02_A',
            LAOYULIFE + '/03_A',
            LAOYULIFE + '/04_A',
            LAOYULIFE + '/05_B',
            LAOYULIFE + '/06_B',
            LAOYULIFE + '/07_B',
            LAOYULIFE + '/08_B',
            LAOYULIFE + '/09_B',
            LAOYULIFE + '/10_B',
            LAOYULIFE + '/11_B',
            LAOYULIFE + '/12_B',
            LAOYULIFE + '/13_B',
            LAOYULIFE + '/14_B',
            LAOYULIFE + '/15_B',
            LAOYULIFE + '/16_B',
            LAOYULIFE + '/17_B',
            LAOYULIFE + '/18_B',
            // LAOYULIFE + '/19_B',
          ]
        }
      ]
    }
  },
  plugins: [
    ['@vuepress/back-to-top'],
  ]
}
