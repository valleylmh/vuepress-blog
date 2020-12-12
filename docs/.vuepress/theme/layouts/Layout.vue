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
  }
}
</script>