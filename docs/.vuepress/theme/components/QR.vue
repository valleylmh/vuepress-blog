<template>
  <div class="qr">
    <img src="../qr.jpg" alt="山月行" width="120" height="120" loading="lazy">
    <p class="we-intro">
      生活的理想就是为了理想的生活，越努力越幸运。<span class="red">终身学习爱好者</span>欢迎扫码关注我的公众号<span class="we-highlight">一界码农</span>
    </p>
  </div>
</template>

<script>
export default {
  name: 'QR'
}
</script>

<style>
.qr {
  margin-top: 10px;
  margin-bottom: -1rem;
  margin-left: 1rem;
  display: flex;
}
.qr .we-intro {
  color: var(--text-color);
  font-size: .8em;
  width: 54%;
}
.qr .we-highlight {
  color: #3eaf7c;
  font-weight: 900;
}
.qr .red {
  color: #dd5b0f;
  font-weight: 900;
}
</style>