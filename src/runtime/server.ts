import type { Server } from 'http'
import { Socket, Server as SocketServer, ServerOptions } from 'socket.io'
import { eventHandler } from 'h3'

declare global {
  // eslint-disable-next-line no-var
  var __io: SocketServer
}

export type SocketMiddleware<T> = (socket: Socket, server: SocketServer) => T | Promise<T>;

type SocketImport = {
  initialize?: (server: SocketServer) => void | Promise<void>
  middlewares?: SocketMiddleware<void>[]
  default: SocketMiddleware<void | Record<string, Function>>
}

export function createIOHandler(imports: Record<string, SocketImport>, serverOptions: Partial<ServerOptions>) {
  return eventHandler(async (event) => {
    if (!globalThis.__io) {
      const httpServer = (event.node.req.socket as any).server as Server
      const io = new SocketServer(httpServer, serverOptions)
      for (const [key, { initialize, middlewares, default: handler }] of Object.entries(imports)) {
        await initialize?.(io)
        ;(key === 'index' ? io : io.of(key)).on('connection', (socket) => {
          const fn = async () => {
            for (const middleware of middlewares || []) {
              await middleware?.(socket, io)
            }
            const events = handler?.(socket, io) || {}
            for (const [event, eventHandler] of Object.entries(events)) {
              socket.on(`rpc:${event}`, (...args) => {
                const callback = args[args.length - 1]
                const fn1 = async () => {
                  try {
                    const value = await eventHandler(...args.slice(0, -1))
                    callback(null, value)
                  } catch (error: any) {
                    callback({ error: error.message || JSON.parse(JSON.stringify(error)) })
                  }
                }
                fn1().then()
              })
            }
          }
          fn().then()
        })
      }
      globalThis.__io = io
    }
  })
}
