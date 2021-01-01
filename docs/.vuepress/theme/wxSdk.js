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
export const initConfig = async (ctx) => {
  // 调接口获取签名、随机数和时间戳，配置微信官方接口参数
  const { timestamp, nonceStr, signature } = await ctx.$req.get(ctx.$utils.config.urlJsapiTicket)
  wx.config({ ...config, timestamp, nonceStr, signature }) // wx为全局变量，在index.html通过script标签引入
}