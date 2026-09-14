import type { ParameterizedContext } from 'koa';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const isProd = process.env.NODE_ENV === 'production';

export const maskEmail = (email?: string | null) => {
  if (!email) return email;
  const [u, d] = email.split('@');
  if (!d) return email;
  const masked = u.length <= 1 ? '*' : `${u[0]}***`;
  return `${masked}@${d}`;
};

export const maskPhone = (p?: string | null) => {
  if (!p) return p;
  const s = p.trim();
  if (s.length <= 6) return '***';
  return `${s.slice(0, 3)}***${s.slice(-3)}`;
};

export const reqMeta = (ctx: ParameterizedContext) => ({
  method: ctx.method,
  path: ctx.path,
  ip: ctx.ip,
  reqId: (ctx.request.headers['x-request-id'] as string) || undefined,
});

const safeStringify = (value: unknown) => {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_k, v) => {
      if (v instanceof Error) {
        return { name: v.name, message: v.message, stack: isProd ? undefined : v.stack };
      }
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    }
  );
};

const redact = (data: unknown) => {
  if (!data || typeof data !== 'object') return data;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const key = k.toLowerCase();
    if (key === 'email' && typeof v === 'string') out[k] = maskEmail(v);
    else if ((/phone|phonenumber|callerid/i).test(k) && typeof v === 'string') out[k] = maskPhone(v);
    else if (v instanceof Error) out[k] = { name: v.name, message: v.message, stack: isProd ? undefined : v.stack };
    else out[k] = v;
  }
  return out;
};

function emit(level: LogLevel, name: string, data?: unknown) {
  const entry = { ts: new Date().toISOString(), level, name, data: redact(data) };
  if (isProd) {
    console.log(safeStringify(entry));
  } else {
    console.log(`[${level.toUpperCase()}] ${name}`, entry);
  }
}

type Logger = {
  (name: string, data?: unknown): void;
  debug: (name: string, data?: unknown) => void;
  info: (name: string, data?: unknown) => void;
  warn: (name: string, data?: unknown) => void;
  error: (name: string, data?: unknown) => void;
};

export const logger = ((name: string, data?: unknown) => emit('info', name, data)) as Logger;

logger.debug = (name, data) => emit('debug', name, data);
logger.info  = (name, data) => emit('info',  name, data);
logger.warn  = (name, data) => emit('warn',  name, data);
logger.error = (name, data) => emit('error', name, data);
