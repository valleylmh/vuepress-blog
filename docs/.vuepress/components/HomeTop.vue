<template>
  <div>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  mounted() {
    axios.get('/api/getTicket', {url: 'asdf'}).then(res => {
      console.log(res)
    })
    const aBtn = document.querySelector('.action-button')
    const siderBtn = document.querySelector('.sidebar-button')
    // .theme-container 父节点
    const container = siderBtn.parentElement.parentElement
    aBtn.addEventListener('click', (e) => {
      const show = window.getComputedStyle(siderBtn)['display']
      if (show === 'block') {
        container.classList.add('sidebar-open')
        container.classList.add('additional')
      }
      e.stopPropagation()
    }, false)
    container.addEventListener('click',() => {
      console.log('asdf')
      if (container.classList.contains('additional')) {
        container.classList.remove('additional')
        container.classList.remove('sidebar-open')
      }
    }, false)
  }
}
</script>

<style>

</style>