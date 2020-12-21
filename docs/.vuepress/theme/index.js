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
            transformer: (timestamp, lang) => {
              const dayjs = require('dayjs')
              require('dayjs/locale/zh-cn')
              dayjs.locale('zh-cn') // 全局使用
              dayjs().locale('zh-cn').format() // 当前实例使用
              // const time = process.env.NODE_ENV === 'development' ? dayjs(timestamp) : dayjs(timestamp).utcOffset(8)
              return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
            }
          }
        ]
    ]
}