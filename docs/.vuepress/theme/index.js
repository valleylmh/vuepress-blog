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
              // console.log('process.env.NODE_ENV=====',process.env.NODE_ENV)
              // const time = process.env.NODE_ENV === 'development' ? dayjs(timestamp) : dayjs(timestamp).utcOffset(8)
              // moment.locale(lang)
              return dayjs(timestamp).format()//format('YYYY-MM-DD HH:mm')
            }
          }
        ]
    ]
}