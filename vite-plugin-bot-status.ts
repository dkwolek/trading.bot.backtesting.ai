import type { Plugin } from 'vite';
import { Client } from 'ssh2';

interface RequestBody {
  host: string;
  user: string;
  password: string;
  logDir: string;
  tailLines?: number;
}

interface RemoteSlot {
  level: number;
  state: 'pending_buy' | 'owned';
  buyTxid?: string;
  sellTxid?: string;
  buyFillPrice?: number;
  volume?: number;
  cost?: number;
  openedAt?: number;
  ownedAt?: number;
}

interface RemoteState {
  slots: RemoteSlot[];
  gridAnchor: number | null;
  totalRealized: number;
  totalFees: number;
  cycles: number;
}

interface RemoteConfig {
  amountPerLevel: number | null;
  stepPrice: number | null;
  maxTotalSlots: number | null;
}

interface SuccessResponse {
  ok: true;
  logFile: string;
  lines: string[];
  state: RemoteState | null;
  stateError: string | null;
  config: RemoteConfig | null;
  configError: string | null;
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

function shellEscape(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

// Drops trailing slash and the final path segment — `dirname` without
// pulling node:path into a Vite plugin that runs in the dev server's
// node context (already there, but cleaner this way).
function parentDir(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  const slash = trimmed.lastIndexOf('/');
  if (slash <= 0) {
    return '/';
  }
  return trimmed.slice(0, slash);
}

function parseRemoteState(raw: string): RemoteState | null {
  if (raw.trim().length === 0) {
    return null;
  }
  const parsed = JSON.parse(raw) as Partial<RemoteState>;
  return {
    slots: Array.isArray(parsed.slots) ? parsed.slots : [],
    gridAnchor: typeof parsed.gridAnchor === 'number' ? parsed.gridAnchor : null,
    totalRealized: typeof parsed.totalRealized === 'number' ? parsed.totalRealized : 0,
    totalFees: typeof parsed.totalFees === 'number' ? parsed.totalFees : 0,
    cycles: typeof parsed.cycles === 'number' ? parsed.cycles : 0,
  };
}

function parseRemoteConfig(raw: string): RemoteConfig | null {
  if (raw.trim().length === 0) {
    return null;
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    amountPerLevel: typeof parsed.amountPerLevel === 'number' ? parsed.amountPerLevel : null,
    stepPrice: typeof parsed.stepPrice === 'number' ? parsed.stepPrice : null,
    maxTotalSlots: typeof parsed.maxTotalSlots === 'number' ? parsed.maxTotalSlots : null,
  };
}

async function fetchSnapshot(body: RequestBody): Promise<SuccessResponse> {
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
    const escapedDir = shellEscape(body.logDir);
    const latestCmd = `ls -1t '${escapedDir}'/bot-*.log 2>/dev/null | head -n 1`;
    const latestPath = (await execOverSsh(client, latestCmd)).trim();
    if (!latestPath) {
      throw new Error(`No log files found in ${body.logDir}`);
    }
    const tailCmd = `tail -n ${tailLines} '${shellEscape(latestPath)}'`;
    const content = await execOverSsh(client, tailCmd);
    const lines = content.split('\n').filter((line) => line.length > 0);

    // state.json sits in the bot's project root — one directory above
    // the logs/ dir on the new bot layout. Failing to fetch it isn't
    // fatal; we still return the log content and surface the error
    // alongside so the UI can show what's missing.
    const stateDir = parentDir(body.logDir);
    const statePath = `${stateDir}/state.json`;
    let state: RemoteState | null = null;
    let stateError: string | null = null;
    try {
      const stateRaw = await execOverSsh(client, `cat '${shellEscape(statePath)}'`);
      state = parseRemoteState(stateRaw);
    } catch (caught) {
      stateError = caught instanceof Error ? caught.message : String(caught);
    }

    // config.json sits next to state.json — drives ROI % since we
    // need amountPerLevel to derive total capital ever deployed.
    // Bot's config-loader falls back to bot.config.json then config.json.
    const configPath = `${stateDir}/config.json`;
    let config: RemoteConfig | null = null;
    let configError: string | null = null;
    try {
      const configRaw = await execOverSsh(client, `cat '${shellEscape(configPath)}'`);
      config = parseRemoteConfig(configRaw);
    } catch (caught) {
      configError = caught instanceof Error ? caught.message : String(caught);
    }

    return {
      ok: true,
      logFile: latestPath,
      lines,
      state,
      stateError,
      config,
      configError,
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
            const payload: ErrorResponse = {
              ok: false,
              error: 'Missing host, user, password or logDir',
            };
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(payload));
            return;
          }
          const result = await fetchSnapshot(body);
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
