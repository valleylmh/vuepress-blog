import axios from 'axios'
const config = {
    beta: true, // 必须这么写，否则wx.invoke调用形式的jsapi会有问题
    debug: process.env.NODE_ENV === 'development',
    appId: 'wx43852f8f0e199224',
    timestamp: '',
    nonceStr: '',
    signature: '',
    jsApiList: [
        'checkJsApi', 'closeWindow',
        'updateTimelineShareData', 'updateAppMessageShareData',
    ]
}
// 微信SDK初始化配置
const initConfig = async () => {
  // 调接口获取签名、随机数和时间戳，配置微信官方接口参数
  const { data: { timestamp, nonceStr, signature}} = await axios.get('https://valleylmh.vip/api/getTicket',
    {
      params: { url: location.href} 
    }
  )
  wx.config({ ...config, timestamp, nonceStr, signature }) // wx为全局变量，在index.html通过script标签引入
}

const share = (option = {}) => {
  const { title = '一界码农', desc = '越努力，越幸运', link = location.href, imgUrl = location.origin+'/logo.jpg' } = option
  wx.ready(function () {   //需在用户可能点击分享按钮前就先调用
    wx.updateAppMessageShareData({ 
      title, // 分享标题
      desc, // 分享描述
      link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
      imgUrl, // 分享图标
      success: function () {
        // 设置成功
      }
    })
    wx.updateTimelineShareData({ 
      title, // 分享标题
      desc, // 分享描述
      link, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
      imgUrl, // 分享图标
      success: function () {
        // 设置成功
      }
    })
  });
}
export default {
  initConfig, share
}