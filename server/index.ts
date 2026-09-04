import { createRealtimeServer } from './createServer'

const port = Number(process.env.PORT ?? 3001)
const server = createRealtimeServer()

server.httpServer.listen(port, '0.0.0.0', () => {
  process.stdout.write(`暗棋服务已启动：http://127.0.0.1:${port}\n`)
})
