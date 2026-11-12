# dsh-deepseek-c

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）用的 Cordis 插件：把 DeepSeek **消费端**（chat.deepseek.com，即手机 App 的后端）接成 `ds_chat` / `ds_sessions` / `ds_history` / `ds_identity` 四个工具，让智能体在对话里直接把活甩过去。

配套 CLI 见同作者的 [`dscli`](https://github.com/Yourtokenkeeper/dscli)。

## 工具

| 工具 | 作用 |
|---|---|
| `ds_chat` | 发一条消息给 DeepSeek C 端，取回纯文本答复（可指定会话、思考、联网） |
| `ds_sessions` | 列最近会话，拿 `session_id` |
| `ds_history` | 读某会话最近消息，把手机上聊过的内容搬进当前上下文 |
| `ds_identity` | 查当前登录身份（脱敏），确认凭证是否还有效 |

## 安装

```bash
# 1. 先装 CLI（token 与逻辑都在它里面）
git clone https://github.com/Yourtokenkeeper/dscli && cd dscli && make build
mkdir -p ~/.dsh/ && cp dist/dscli_linux_* ~/.dsh/skills/deepseek-c-end/bin/ds 2>/dev/null || true

# 2. 写凭证
install -d -m700 ~/.dsh/deepseek
printf '{"token":"你的64位token"}\n' > ~/.dsh/deepseek/session.json && chmod 600 ~/.dsh/deepseek/session.json

# 3. 装插件（DSH 内置的插件管理器）
dsh plugin --profile web add file:/path/to/dsh-deepseek-c
```

插件默认调用 `~/.dsh/skills/deepseek-c-end/bin/ds`（可用环境变量 `DS_PYTHON` / 自己改 `index.js` 里的 `DS` 常量指向任意可执行文件，Go 版二进制同样适用）。

## 配置

无配置文件。行为由三处决定：

- 凭证：`dscli` 自己的查找顺序（`DS_TOKEN` → `DS_SESSION_FILE` → `~/.dsh/deepseek/session.json`）
- 二进制位置：`index.js` 顶部常量 `DS`
- 解释器：`DS_PYTHON`（仅当目标不是可执行文件时使用）

## 边界

- 每次 `ds_chat` 都是账号的一次真实调用，额度算在使用者头上
- 需要本机真实状态（文件、进程、root、日志）的任务不应交给它
- 不做绕过限流、不做批量注册、不代持他人凭证

## License

MIT，见 [LICENSE](LICENSE)。
