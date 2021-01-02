const wechat = require('./wechat')
const genSign = require('./genSign')

// const ticket = wechat.getJsTicket()
// ticket.then(res => {
//     const obj = genSign(res, 'https://valleylmh.vip')
//     console.log(obj)
// })
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const ticket = await wechat.getJsTicket()
    const { url = 'https://valleylmh.vip' } = req.query
    const obj = genSign(ticket, url)
    res.json(obj)
}