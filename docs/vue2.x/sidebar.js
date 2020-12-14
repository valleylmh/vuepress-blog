module.exports = [
    {
      title: '准备工作',
      collapsable: false,
      children: [
        ['prepare/', 'Introduction'],
        'prepare/flow',
        'prepare/directory',
        'prepare/build',
        'prepare/entrance'
      ]
    },
    {
      title: '数据驱动',
      collapsable: false,
      children: [
        ['data-driven/', 'Introduction'],
        'data-driven/new-vue',
        'data-driven/mounted',
        'data-driven/render',
        'data-driven/virtual-dom',
        'data-driven/create-element',
        'data-driven/update'
      ]
    },
    {
      title: '组件化',
      collapsable: false,
      children: [
        ['components/', 'Introduction'],
        'components/create-component',
        'components/patch',
        'components/merge-option',
        'components/lifecycle',
        'components/component-register',
        'components/async-component'
      ]
    },
    {
      title: '深入响应式原理',
      collapsable: false,
      children: [
        ['reactive/', 'Introduction'],
        'reactive/reactive-object',
        'reactive/getters',
        'reactive/setters',
        'reactive/next-tick',
        'reactive/questions',
        'reactive/computed-watcher',
        'reactive/component-update',
        'reactive/props',
        'reactive/summary'
      ]
    },
    {
      title: '编译',
      collapsable: false,
      children: [
        ['compile/', 'Introduction'],
        'compile/entrance',
        'compile/parse',
        'compile/optimize',
        'compile/codegen'
      ]
    },
    {
      title: '扩展',
      collapsable: false,
      children: [
        ['extend/', 'Introduction'],
        'extend/event',
        'extend/v-model',
        'extend/slot',
        'extend/keep-alive',
        'extend/tansition',
        'extend/tansition-group'
      ]
    },
    {
      title: 'Vue Router',
      collapsable: false,
      children: [
        ['vue-router/', 'Introduction'],
        'vue-router/install',
        'vue-router/router',
        'vue-router/matcher',
        'vue-router/transition-to'
      ]
    },
    {
      title: 'Vuex',
      collapsable: false,
      children: [
        ['vuex/', 'Introduction'],
        'vuex/init',
        'vuex/api',
        'vuex/plugin'
      ]
    }
]