module.exports = {
    extend: '@vuepress/theme-default',
    plugins: [
        ['@vuepress/medium-zoom', {
          // selector: 'img.zoom-custom-imgs',
          // medium-zoom options here
          // See: https://github.com/francoischalifour/medium-zoom#options
          options: {
            margin: 16, background: '#000', scrollOffset: 100
          }
        }],
        [
          '@vuepress/last-updated',
          {
            // dateOptions: { hour12: false }
            transformer: (timestamp, lang) => {
              const dayjs = require('dayjs')
              require('dayjs/locale/zh-cn')
              // dayjs.locale('zh-cn') // 全局使用
              // dayjs().locale('zh-cn').format() // 当前实例使用
              // 发布在vercel静态网站托管平台 git 获取unix时间戳 需额外加8小时
              timestamp = process.env.NODE_ENV === 'development' ? timestamp : timestamp + 8*60*60*1000
              return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
            }
          }
        ]
    ]
}