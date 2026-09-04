import { existsSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { resolve } from 'node:path'
import express from 'express'
import { Server } from 'socket.io'
import {
  type Ack,
  type ClientToServerEvents,
  type EnterRoomResult,
  type GameUpdate,
  type ServerToClientEvents,
  type SocketData,
} from '../src/online/protocol'
import { RoomManager, RoomServiceError } from './roomManager'

interface CreateRealtimeServerOptions {
  roomManager?: RoomManager
}

function failure(error: unknown): Ack<never> {
  if (error instanceof RoomServiceError) {
    return { ok: false, error: { code: error.code, message: error.message } }
  }
  return { ok: false, error: { code: 'server-error', message: '服务器暂时不可用' } }
}

export function createRealtimeServer(options: CreateRealtimeServerOptions = {}) {
  const app = express()
  const httpServer = createHttpServer(app)
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    { cors: { origin: true, credentials: true } },
  )
  const rooms = options.roomManager ?? new RoomManager()

  const sendSnapshot = (roomCode: string) => {
    for (const socketId of rooms.socketIds(roomCode)) {
      const snapshot = rooms.snapshotForSocket(socketId)
      if (snapshot) io.to(socketId).emit('room:snapshot', snapshot)
    }
  }

  rooms.setHooks({
    onRoomChanged: sendSnapshot,
    onRoomClosed: (socketIds, message) => {
      for (const socketId of socketIds) io.to(socketId).emit('room:closed', { message })
    },
  })

  io.on('connection', (socket) => {
    socket.on('room:create', (payload, acknowledge) => {
      try {
        acknowledge({ ok: true, data: rooms.createRoom(socket.id, payload.nickname) })
      } catch (error) {
        acknowledge(failure(error))
      }
    })

    socket.on('room:join', (payload, acknowledge) => {
      try {
        acknowledge({
          ok: true,
          data: rooms.joinRoom(socket.id, payload.roomCode, payload.nickname),
        })
      } catch (error) {
        acknowledge(failure(error))
      }
    })

    socket.on('room:resume', (payload, acknowledge) => {
      try {
        const result = rooms.resumeRoom(socket.id, payload.roomCode, payload.playerToken)
        const response: EnterRoomResult = { session: result.session, snapshot: result.snapshot }
        acknowledge({ ok: true, data: response })
        if (result.replacedSocketId) io.sockets.sockets.get(result.replacedSocketId)?.disconnect(true)
      } catch (error) {
        acknowledge(failure(error))
      }
    })

    socket.on('game:move', (payload, acknowledge) => {
      try {
        const result = rooms.move(socket.id, payload)
        for (const socketId of rooms.socketIds(result.roomCode)) {
          const snapshot = rooms.snapshotForSocket(socketId)
          if (!snapshot) continue
          const update: GameUpdate = {
            version: snapshot.version,
            snapshot,
            move: result.move,
            captured: result.captured,
          }
          io.to(socketId).emit('game:update', update)
        }
        acknowledge({ ok: true, data: { accepted: true } })
      } catch (error) {
        acknowledge(failure(error))
      }
    })

    socket.on('game:new-round', (acknowledge) => {
      try {
        rooms.startNextRound(socket.id)
        acknowledge({ ok: true, data: { accepted: true } })
      } catch (error) {
        acknowledge(failure(error))
      }
    })

    socket.on('disconnect', () => rooms.disconnectSocket(socket.id))
  })

  app.get('/api/health', (_request, response) => response.json({ ok: true }))
  const clientDirectory = resolve(process.cwd(), 'dist')
  if (existsSync(clientDirectory)) {
    app.use(express.static(clientDirectory))
    app.use((request, response, next) => {
      if (request.method !== 'GET' || !request.accepts('html')) return next()
      response.sendFile(resolve(clientDirectory, 'index.html'))
    })
  }

  return {
    app,
    httpServer,
    io,
    rooms,
    async close(): Promise<void> {
      rooms.destroy()
      await new Promise<void>((resolveClose) => io.close(() => resolveClose()))
    },
  }
}
