import { Application } from "./deps.ts"
import { handler } from './handler.js'
import { env } from './env.js'

const path = env('SOCKET_PATH', false)
const host = env('HOST', '0.0.0.0')
const port = env('PORT', !path && '3000')

const server = new Application()
server.use(handler)

const addr = path || `${host}:${port}`
server.listen({ hostname: host, port }, () => {
	console.log(`Listening on http://${addr}`)
})

export { host, path, port, server }