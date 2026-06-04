import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { appsInToss } from '@apps-in-toss/plugins'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function readEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
    const vars = {}
    content.split('\n').forEach(line => {
      const m = line.match(/^([^=]+)=(.+)$/)
      if (m) vars[m[1].trim()] = m[2].trim()
    })
    return vars
  } catch { return {} }
}

const env = readEnv()
const anthropicKey = env.VITE_ANTHROPIC_API_KEY
const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)

const anthropicProxy = {
  name: 'anthropic-proxy',
  configureServer(server) {
    server.middlewares.use('/api/claude', (req, res) => {
      const chunks = []
      req.on('data', chunk => chunks.push(Buffer.from(chunk)))
      req.on('end', async () => {
        try {
          const body = Buffer.concat(chunks)
          const upstream = await fetch(`https://api.anthropic.com${req.url}`, {
            method: req.method ?? 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: body.length > 0 ? body : undefined,
          })
          res.writeHead(upstream.status, {
            'content-type': upstream.headers.get('content-type') ?? 'application/json',
            'cache-control': 'no-cache',
          })
          const reader = upstream.body.getReader()
          const pump = async () => {
            const { done, value } = await reader.read()
            if (done) { res.end(); return }
            res.write(value)
            await pump()
          }
          await pump()
        } catch (err) {
          console.error('[anthropic-proxy]', err.message)
          res.writeHead(500).end(JSON.stringify({ error: err.message }))
        }
      })
    })
  },
}

const ait = appsInToss({
  brand: {
    displayName: '혼밥쿡',
    primaryColor: '#FF6B35',
    icon: 'https://honbap-recipe.vercel.app/icons.svg',
  },
  permissions: [],
})

export default defineConfig({
  plugins: [react(), anthropicProxy],
  server: { port: 5175 },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: `assets/honbapcook-${timestamp}.js`,
        chunkFileNames: `assets/honbapcook-chunk-${timestamp}.js`,
        assetFileNames: `assets/honbapcook-[name]-${timestamp}.[ext]`,
      },
    },
  },
})
