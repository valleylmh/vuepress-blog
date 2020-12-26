<template>
  <div class="theme-container">
    <div class="theme-default-content">
      <h1>抱歉，页面无法访问…</h1>
      <span>页面链接可能已失效或被删除</span>
      <img class="bg-404" src="../decorate.png" />
      <!-- <blockquote>{{ getMsg() }}</blockquote> -->

      <!-- <RouterLink to="/">
        Take me home.
      </RouterLink> -->
    </div>
  </div>
</template>

<style scoped>
body { background: #d9d9d9; }
.theme-default-content { text-align: center; }
.theme-default-content span { color: #999; }
.bg-404 { width: 100%; position: fixed; bottom: 0; left: 0; }
</style>
