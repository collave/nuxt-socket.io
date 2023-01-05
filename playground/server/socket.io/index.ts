import type { Socket, Server } from 'socket.io'

export const middlewares = []

export function initialize(server: Server) {
  console.log('initializing server')
}

export default function(socket: Socket, server: Server) {

}
