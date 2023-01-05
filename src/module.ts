import { fileURLToPath } from 'url'
import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addTemplate,
  addServerHandler,
  addComponentsDir,
  addImportsDir,
} from '@nuxt/kit'
import type { ServerOptions } from 'socket.io'
import { Nuxt } from '@nuxt/schema'
import { resolve, relative } from 'pathe'
import fg from 'fast-glob'

export interface ModuleOptions {
  server?: ServerOptions
}

let filesDir = ''
const files = new Set<string>()

async function updateSourceFiles(nuxt: Nuxt) {
  files.clear()
  filesDir = resolve(nuxt.options.srcDir, 'server/socket.io')
  const updatedFiles = await fg('**/*.{ts,js,mjs}', {
    cwd: filesDir,
    absolute: true,
    onlyFiles: true,
  })
  updatedFiles.forEach(file => files.add(file))
  return files
}

function toName(file: string) {
  if (file.startsWith(filesDir)) {
    return file.substring(filesDir.length + 1).replace('.ts', '')
  }
  return file
}

function createServerMiddleware(nuxt: Nuxt, options?: ServerOptions) {
  addTemplate({
    filename: 'io-handler.ts',
    write: true,
    getContents(opts) {
      return `
          import { createIOHandler } from 'file://${resolve(
            fileURLToPath(new URL('./runtime', import.meta.url)),
            'server.mjs'
          ).replaceAll('\\', '/')}';
          ${[...files]
            .map(
              (file, index) =>
                `import * as ${toName(file)} from '${relative(nuxt.options.buildDir, file).replace('.ts', '')}'`
            )
            .join('\n')}
          export default createIOHandler({
            ${[...files].map((file, index) => `${toName(file)}`).join(',\n')}
          }, ${JSON.stringify(options || {})})
        `
    },
  })
  addServerHandler({
    middleware: true,
    handler: resolve(nuxt.options.buildDir, 'io-handler.ts'),
  })
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'socket.io',
    configKey: 'socket.io',
  },
  hooks: {
    'vite:extendConfig': function (config) {
      config.optimizeDeps ||= {}
      config.optimizeDeps.include ||= []
      config.optimizeDeps.include.push('ws', 'engine.io-client')
    },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    nuxt.options.build.transpile.push(runtimeDir)
    addPlugin(resolve(runtimeDir, 'plugins', 'io.client'))

    await updateSourceFiles(nuxt)
    createServerMiddleware(nuxt, options.server)

    addImportsDir(fileURLToPath(new URL('./runtime/composables', import.meta.url)))
    await addComponentsDir({
      path: fileURLToPath(new URL('./runtime/components', import.meta.url)),
      transpile: true,
      watch: true,
      enabled: true,
      global: true,
    })

    nuxt.hook('builder:watch', async (e, path) => {
      if (e === 'change') return
      if (path.includes('server/socket.io')) {
        await updateSourceFiles(nuxt)
        await nuxt.callHook('builder:generateApp')
      }
    })
  },
})
