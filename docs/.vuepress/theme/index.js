module.exports = {
    extend: '@vuepress/theme-default',
    plugins: [
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