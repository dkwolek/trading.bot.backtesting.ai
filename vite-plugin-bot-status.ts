import type { Plugin } from 'vite';
import { Client } from 'ssh2';

interface RequestBody {
  host: string;
  user: string;
  password: string;
  logDir: string;
  tailLines?: number;
}

interface SuccessResponse {
  ok: true;
  logFile: string;
  lines: string[];
  fetchedAt: number;
}

interface ErrorResponse {
  ok: false;
  error: string;
}

const DEFAULT_TAIL = 500;

function readBody(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', reject);
  });
}

function execOverSsh(client: Client, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.exec(command, (execError, stream) => {
      if (execError) {
        reject(execError);
        return;
      }
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => out.push(chunk));
      stream.stderr.on('data', (chunk: Buffer) => err.push(chunk));
      stream.on('close', (code: number) => {
        if (code === 0) {
          resolve(Buffer.concat(out).toString('utf-8'));
          return;
        }
        const stderr = Buffer.concat(err).toString('utf-8').trim();
        reject(new Error(stderr || `Command "${command}" exited ${code}`));
      });
    });
  });
}

async function fetchLatestLog(body: RequestBody): Promise<SuccessResponse> {
  const tailLines = body.tailLines ?? DEFAULT_TAIL;
  const client = new Client();

  const connect = new Promise<void>((resolve, reject) => {
    client.once('ready', resolve);
    client.once('error', reject);
    client.connect({
      host: body.host,
      port: 22,
      username: body.user,
      password: body.password,
      readyTimeout: 8000,
    });
  });

  try {
    await connect;
    const escapedDir = body.logDir.replace(/'/g, `'\\''`);
    const latestCmd = `ls -1t '${escapedDir}'/bot-*.log 2>/dev/null | head -n 1`;
    const latestPath = (await execOverSsh(client, latestCmd)).trim();
    if (!latestPath) {
      throw new Error(`No log files found in ${body.logDir}`);
    }
    const tailCmd = `tail -n ${tailLines} '${latestPath.replace(/'/g, `'\\''`)}'`;
    const content = await execOverSsh(client, tailCmd);
    const lines = content.split('\n').filter((line) => line.length > 0);
    return {
      ok: true,
      logFile: latestPath,
      lines,
      fetchedAt: Date.now(),
    };
  } finally {
    client.end();
  }
}

export default function botStatusPlugin(): Plugin {
  return {
    name: 'bot-status',
    configureServer(server) {
      server.middlewares.use('/api/bot-status', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        try {
          const raw = await readBody(req);
          const body: RequestBody = JSON.parse(raw);
          if (!body.host || !body.user || !body.password || !body.logDir) {
            const payload: ErrorResponse = { ok: false, error: 'Missing host, user, password or logDir' };
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(payload));
            return;
          }
          const result = await fetchLatestLog(body);
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (caught) {
          const payload: ErrorResponse = {
            ok: false,
            error: caught instanceof Error ? caught.message : String(caught),
          };
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(payload));
        }
      });
    },
  };
}
