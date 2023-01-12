import type { Socket } from 'socket.io-client'
import type { Ref } from 'vue'
import { ref, shallowRef, unref } from '#imports'

export function useSocketIOCall(socket: Socket | Ref<Socket>) {
  const waiting = ref(false)
  const response = shallowRef()
  const error = shallowRef()

  function request<T>(name: string | Ref<string>, ...args: (any | Ref)[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      unref(socket).emit(
        `rpc:${unref(name)}`,
        ...[
          ...args.map(x => unref(x)),
          (err, value) => {
            if (err) {
              return reject(err)
            }
            resolve(value)
          },
        ]
      )
    })
  }

  async function execute<T>(name: string | Ref<string>, ...args: (any | Ref)[]): Promise<T> {
    try {
      waiting.value = true
      error.value = null
      const result = await request<T>(name, ...args)
      response.value = result
      return result
    } catch (e: any) {
      error.value = e
      throw e
    } finally {
      waiting.value = false
    }
  }

  return { waiting, response, error, execute }
}
