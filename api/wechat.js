// const mongoose = require('mongoose')
// const Token = mongoose.model('Token')
const axios = require('axios')
const path = require('path')
const fs = require('fs')
const filePath = path.join(__dirname, './access_token.txt')
const Token = {
    getAccessToken() {
        return new Promise((resolve) => {
            fs.readFile(filePath, (err, data) => {
                resolve(JSON.parse(data))
            })
        })
    },
    saveAccessToken(data) {
        return new Promise((resolve) => {
            fs.writeFile(filePath, JSON.stringify(data), (err) => {
                resolve()
            })
        })
    }
}
const config = {
    // 本地测试是用测试号 
    // appID: 'wx43852f8f0e199224',
    // appSecret: '3fcaa30f1c7c52db0a60e17ce6dccf1d',
    // 生产环境 一届码农公众号 vercel 环境变量设置
    appID: process.env.appID, //'wxf556eacceb6b785e',
    appSecret: process.env.wechatAppSecret,
    // auth: 'https://api.weixin.qq.com/sns/oauth2', // 授权回调
    cgiBin: 'https://api.weixin.qq.com/cgi-bin', // 获取普通的access_token ticket使用
    getAccessToken: async () => await Token.getAccessToken(),
    saveAccessToken: async data => await Token.saveAccessToken(data),
}

function Wechat(opts) {
    this.cgiBin = opts.cgiBin
    this.appID = opts.appID
    this.appSecret = opts.appSecret
    this.getAccessToken = opts.getAccessToken
    this.saveAccessToken = opts.saveAccessToken
}

Wechat.prototype.fetchAccessToken = async function (code) {
    const accessTokenObj = await this.getAccessToken()
    // console.log(accessTokenObj)
    if (accessTokenObj) {
        const isValid = this.isValidAccessToken(accessTokenObj)
        if (!isValid) {
            return this.updateAccessToken(code)
        } else {
            return accessTokenObj.access_token
        }
        // return accessToken.access_token
    } else {
        return this.updateAccessToken(code)
    }
}
Wechat.prototype.isValidAccessToken = function(data) {
    if (!data || !data.access_token || !data.expires_in) {
        return false
    }
    var expires_in = data.expires_in
    var now = (new Date().getTime())
    return now < expires_in
}
Wechat.prototype.updateAccessToken = async function() {
    console.log('appSecret=====', process.env.wechatAppSecret)
    const { data } = await axios.get(this.cgiBin + '/token', {
        params: { appid: this.appID, secret: this.appSecret, grant_type: 'client_credential' }
    })
    if (data.errcode) {
        console.log('wechat error=============', data.errmsg)
        return
    }
    data.expires_in = new Date().getTime() + (data.expires_in - 200)*1000
    // const data = {"access_token":"34_Yc_S14VIubYbbUsEtNt2DJKfrSWdmZgaOSFb36tZV8aPxN8mh7y5qx4H23mHBqaLKbLBIzt-HosnmFH3hQw0aA","expires_in":7200,"refresh_token":"34_hJKVmeoxAupcggxa6vRgD0sUOgASxwNeNOUwyk-cDlxRQYN_PQU_-CSGW8O0kECQ0VDQMP9WzGOI1AgMI6sQvA","openid":"oYSBrwf1214GHIDOtpYpRknmuqUc","scope":"snsapi_userinfo"}
    this.saveAccessToken(data)
    return data.access_token
}

Wechat.prototype.getJsTicket = async function() {
    const accessToken = await this.fetchAccessToken()
    const { data } = await axios.get(this.cgiBin + '/ticket/getticket', {
        params: { access_token: accessToken, type: 'jsapi' }
    })
    if (data.errcode) {
        console.log('wechat error=============', data.errmsg)
        return
    }
    return data.ticket
}
const wechatInstance = new Wechat(config)

module.exports = wechatInstance


