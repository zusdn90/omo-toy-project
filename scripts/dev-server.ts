import { startLocalServer } from '../src/server';

const preferredPort = Number(process.env.PORT ?? '4173');
const preferredHost = process.env.HOST ?? '0.0.0.0';

const { url } = await startLocalServer({ port: preferredPort, host: preferredHost, dev: true });
console.log(`Local server running at ${url}`);
console.log(`Accessible at http://localhost:${preferredPort} and http://127.0.0.1:${preferredPort} (use the exact origin registered in Kakao)`);
