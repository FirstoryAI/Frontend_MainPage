// 가짜 API 서버와 프론트 개발 서버를 함께 실행해요. (npm run dev:mock)
import { spawn } from 'node:child_process';
import { startMockApi } from './mock-api.mjs';

const port = Number(process.env.MOCK_API_PORT) || 8787;
await startMockApi({ port, seed: process.argv.includes('--seed') });

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const vite = spawn(npm, ['run', 'dev', '--', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, API_PROXY_TARGET: `http://localhost:${port}` },
});

vite.on('exit', (code) => process.exit(code ?? 0));
