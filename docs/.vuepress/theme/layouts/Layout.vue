<template>
  <ParentLayout>
    <template #sidebar-top>
      <QR />
    </template>
  </ParentLayout>
</template>

<script>
import ParentLayout from '@parent-theme/layouts/Layout.vue'
import QR from '@theme/components/QR.vue'
export default {
  name: 'Layout',
  components: {
    ParentLayout,
    QR,
  },
  created() {
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)")
    const bodyClassList = document.body.classList
    bodyClassList.remove('theme-dark')
    bodyClassList.remove('theme-light')
    // 匹配深色模式
    isDarkMode.matches && bodyClassList.add('theme-dark')
    // bodyClassList.add('theme-light')
  }
}
</script>