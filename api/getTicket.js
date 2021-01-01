const wechat = require('./wechat')
const genSign = require('./genSign')


module.exports = (req, res) => {
    const ticket = wechat.getJsTicket()
    const { url = 'https://valleylmh.vip' } = req.query
    const obj = genSign(ticket, url)
    res.json(obj)
}