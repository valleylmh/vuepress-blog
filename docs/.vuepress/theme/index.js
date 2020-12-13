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
              const relativeTime = require('dayjs/plugin/relativeTime')
              dayjs.extend(relativeTime)
              // moment.locale(lang)
              return dayjs(timestamp).fromNow()
            }
          }
        ]
    ]
}