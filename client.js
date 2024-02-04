const fs = require('node:fs')
const net = require('node:net')
const readline = require('node:readline/promises')

let id = -1

function cleanLine(dir) {
    return new Promise((res, rej) => {
        process.stdout.clearLine(dir, () => res())
    })
}

function moveUp(dx, dy) {
    return new Promise((res, rej) => {
        process.stdout.moveCursor(dx, dy, () => res())
    })
}

const socket = net.createConnection({host: 'localhost', port: 8000}, async () => {
    console.log('socket connect')
    while (!socket.destroyed) {
        console.log('upload invoked...')
        console.log("=>(client.js:16) socket.destroyed", socket.destroyed)
        await upload()
    }
}).on('error', err => console.log(err))

socket.on('data', (chunk) => {
    if (chunk.toString().includes('id')) {
        id = JSON.parse(chunk.toString()).id
    }
})

const ask = async () => {
    const rl = await readline.createInterface({input: process.stdin, output: process.stdout})
    return await rl.question('enter path>')
}

const upload = async () => {
    let fileDS, readable, totalChunks = 0, messagePath = '', lastPercent = 0
    messagePath = await ask()
    try {
        if (messagePath !== 'end') {
            console.log('we are in if...')
            await fs.promises.access(messagePath)
            fileDS = await fs.promises.open(messagePath, 'r')
            const size = (await fileDS.stat()).size
            readable = await fileDS.createReadStream()
            const prom = new Promise(res => {
                res(socket.write(`path:${messagePath}/${size}/${id}`))
            })
            await prom
            readable.on('data', async (chunk) => {
                totalChunks += chunk.byteLength
                const percent = Math.round(((totalChunks / size) * 100))
                if (percent !== lastPercent) {
                    lastPercent = percent
                    await moveUp(0, -1)
                    await cleanLine(0)
                    console.log(`${percent}% of the file has been uploaded already`)
                }
                if (!socket.write(chunk)) {
                    readable.pause()
                }
                socket.on('drain', () => {
                    readable.resume()
                })
            })
            readable.on('end', () => {
                console.log('readable was closed...')
                fileDS.close()
            })
        } else {
            console.log('service exit...')
            socket.destroy()
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('ERROR: no such file or directory')
        }
    }
}