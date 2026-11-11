// dsh-deepseek-c —— 把终端里的 DeepSeek C 端客户端（ds）包成 DSH 工具。
// 复用手机 App 已登录的账号（token 存在 ~/.dsh/deepseek/session.json），
// 每次调用 spawn 一次 python CLI，返回纯文本，不占额外依赖。
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const name = 'deepseek-c';
export const inject = ['tools'];

const DS = join(homedir(), '.dsh/skills/deepseek-c-end/bin/ds');
const PY = process.env.DS_PYTHON || 'python3';

function run(args, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    if (!existsSync(DS)) {
      reject(new Error(`找不到 ds 客户端：${DS}`));
      return;
    }
    execFile(PY, [DS, ...args], { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`${err.message}\n${(stderr || '').slice(-800)}`));
          return;
        }
        resolve((stdout || '').trim());
      });
  });
}

const textOut = (label) => ({
  schema: { type: 'string' },
  render: (_a, v) => [{ type: 'text', text: String(v) }],
});

export function apply(ctx /* , config */) {
  ctx.tools.register({
    name: 'ds_chat',
    description:
      '用当前账号的 DeepSeek C 端（App 同一个后端）回答一个问题或处理一段文本，返回纯文本答复。'
      + '适合：繁重的文字加工、长文摘要、批量改写、需要另一个模型独立判断的场合；'
      + '不适合：需要本机真实状态（文件、进程、root、日志）或不可逆终端操作。'
      + '每次调用约消耗账号一次额度，连续调用请合并成一条。',
    parameters: {
      prompt: { type: 'string', required: true, description: '要发给 DeepSeek 的正文' },
      session_id: { type: 'string', description: '接续已有会话 id（省略则新建）' },
      thinking: { type: 'boolean', description: '开启深度思考（R1），更慢更贵' },
      search: { type: 'boolean', description: '开启联网搜索' },
    },
    output: textOut(),
    timeoutMs: 300000,
    isConcurrencySafe: () => false,
    async execute(args) {
      if (typeof args?.prompt !== 'string' || !args.prompt.trim()) {
        throw new Error('ds_chat 需要非空的 prompt');
      }
      const cli = ['send', args.prompt, '--fast'];
      if (args.session_id) cli.push('--session', String(args.session_id));
      if (args.thinking) cli.push('--think');
      if (args.search) cli.push('--search');
      return await run(cli);
    },
  });

  ctx.tools.register({
    name: 'ds_sessions',
    description: '列出 DeepSeek C 端最近的会话（id + 标题）。用于找到要接续的 session_id，或查看用户刚在 App 里聊了什么主题。',
    parameters: {
      count: { type: 'number', description: '返回条数，默认 10' },
    },
    output: textOut(),
    timeoutMs: 60000,
    async execute(args) {
      const n = Number.isFinite(args?.count) && args.count > 0 ? Math.floor(args.count) : 10;
      return await run(['list', String(n)], 60000);
    },
  });

  ctx.tools.register({
    name: 'ds_history',
    description: '读取某个 DeepSeek 会话最近的消息，把 App 侧（或终端侧）聊过的内容搬到当前上下文。用于延续用户之前在手机上进行的讨论。',
    parameters: {
      session_id: { type: 'string', required: true, description: '会话 id（可由 ds_sessions 获得）' },
      limit: { type: 'number', description: '最近多少条，默认 10' },
    },
    output: textOut(),
    timeoutMs: 60000,
    async execute(args) {
      if (!args?.session_id) throw new Error('ds_history 需要 session_id');
      const n = Number.isFinite(args?.limit) && args.limit > 0 ? Math.floor(args.limit) : 10;
      return await run(['history', String(args.session_id), String(n)], 60000);
    },
  });

  ctx.tools.register({
    name: 'ds_identity',
    description: '查看 DeepSeek C 端当前登录身份（脱敏后的邮箱/手机号与用户 id），用于确认凭证是否还有效。',
    parameters: {},
    output: textOut(),
    timeoutMs: 30000,
    async execute() {
      return await run(['whoami'], 30000);
    },
  });
}
