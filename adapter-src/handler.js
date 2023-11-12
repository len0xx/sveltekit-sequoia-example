import { dirname, fromFileUrl, join, exists } from './deps.ts';
import { Server } from './server/index.js';
import { manifest } from './server/manifest.js';
import { processEnv, env } from './env.js';

const server = new Server(manifest);
await server.init({ env: processEnv });

const xff_depth = parseInt(env('XFF_DEPTH', '1'));
const address_header = env('ADDRESS_HEADER', '').toLowerCase();

const dir = dirname(fromFileUrl(import.meta.url));

async function serveDirectory(path, client = false) {
	if (!(await exists(path))) {
		return false;
	}
	return (ctx) => {
		if (client && ctx.request.url.pathname.startsWith(`/${manifest.appDir}/immutable/`)) {
			ctx.response.headers.set('cache-control', 'public,max-age=31536000,immutable');
		}
		return ctx.send({ root: path, extensions: ['.html'], index: 'index.html' });
	};
}

async function ssr(ctx) {
	const request = ctx.request.originalRequest;
	const response = await server.respond(request, {
		getClientAddress() {
			if (address_header) {
				const value = /** @type {string} */ (req.headers[address_header]) || '';

				if (address_header === 'x-forwarded-for') {
					const addresses = value.split(',');

					if (xff_depth < 1) {
						throw new Error(`${"" + 'XFF_DEPTH'} must be a positive integer`);
					}

					if (xff_depth > addresses.length) {
						throw new Error(
							`${"" + 'XFF_DEPTH'} is ${xff_depth}, but only found ${
								addresses.length
							} addresses`
						);
					}
					return addresses[addresses.length - xff_depth].trim();
				}

				return value;
			}

			return ctx.request.ip;
		}
	});
	ctx.response.status = response.status;
	ctx.response.headers = response.headers;
	ctx.response.body = response.body;
}

const handlers = [
	...(await Promise.all([
		serveDirectory(join(dir, 'client'), true),
		serveDirectory(join(dir, 'static')),
		serveDirectory(join(dir, 'prerendered'))
	])),
	ssr
].filter(Boolean);

async function handler(ctx) {
	for (const handle of handlers) {
		try {
			return await handle(ctx);
		} catch (_) { /* nothing */ }
	}
	ctx.response.status = 404;
	ctx.response.body = 'Not found';
}

export { handler };
