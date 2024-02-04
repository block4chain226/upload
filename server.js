const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')

let clients = []
let clientsMap = new Map()

const server = net.createServer(async socket => {
    try {
        let writable
        let filename, size, id
        socket.on('data', async (chunk) => {
            if (chunk.toString().includes('path:')) {
                [filename, size, id] = await promisifyGetFileName(chunk)
                if (!fs.existsSync(`./db/${id}/`)) {
                    await fs.promises.mkdir(`./db/${id}/`)
                }
                writable = fs.createWriteStream(path.join(`./db/${id}/`, filename))
            } else {
                if (!writable.write(chunk)) {
                    socket.pause()
                }
                writable.on('drain', () => {
                    socket.resume()
                })
            }
        })
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`folder ${id} does not exists`)
        }
    } finally {
        server.on('close', () => console.log('server was closed'))
        server.on('error', err => console.log(err))
    }
})

server.listen(8000, 'localhost', () => console.log('server is running...'))

server.on('connection', (socket) => {
    const clientId = clients.length + 1
    console.log(`user with id ${clientId} was connected to the server`)
    clients.push({id: clientId, socket})
    const {port, family, address} = socket.address()
    console.log("=>(server.js:50) {port, family, address}", {port, family, address});
    clientsMap.set(socket.address, socket.port)
    socket.write(JSON.stringify({id: clientId}))
})

const promisifyGetFileName = (chunk) => {
    return new Promise((res, rej) => {
        if (chunk.toString().includes('path:')) {
            const [filename, size, id] = chunk.toString().substring(7).split('/')
            res([filename, size, id])
        }
        rej()
    })
}