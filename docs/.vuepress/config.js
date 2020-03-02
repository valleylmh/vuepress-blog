const LAOYULIFE = '老喻的人生算法课'
module.exports = {
  // base: '/',
  dest: 'dist',
  title: '一界码农',
  description: '越努力越幸运',
  themeConfig: {
    editLinks: false,
    docsDir: 'docs',
    nav: [
      // { text: 'Coding', link: '/coding/' },
      // { text: '投资学习', link: '/invest/' },
      {
        text: '生活life', link: '/study_life/'
        // ariaLabel: '生活不易且珍惜',
        // items: [
        //   { text: 'Chinese', link: '/language/chinese/' },
        //   { text: 'Japanese', link: '/language/japanese/' }
        // ]
      }
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
          title: '老喻的人生算法课',
          collapsable: false,
          children: [
            [LAOYULIFE+'/', '为什么推荐'],
            LAOYULIFE + '/01_A',
          ]
        }
      ]
    }
  },
  plugins: [
    ['@vuepress/back-to-top'],
  ]
}
