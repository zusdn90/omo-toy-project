import { startLocalServer } from '../src/server.js';

const preferredPort = Number(process.env.PORT ?? '4173');

const { url } = await startLocalServer({ port: preferredPort });
console.log(`Local server running at ${url}`);
