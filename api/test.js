modules.exports = (req, res) => {
    const { name = 'world' } = req.query
    res.status(200).send(`hello ${name}`)
}