/* ==========================================================================
   FreeModel Radar — 首页轮播数据源（8 页）
   --------------------------------------------------------------------------
   前 3 页是排行榜（mode:'rank'），后 5 页是当日热闻（mode 缺省）。
   独立成一个文件，Agent 每天只重写这里即可完成更新，不必动 models / deals 等主数据。

   排行榜口径（多源交叉取平均，已在 note 字段标注）：
     · LLM 使用率 —— OpenRouter 周调用量 + 公开市占数据，2026 Q3
     · LLM 能力   —— SWE-bench Verified / SWE-bench Pro / Terminal-Bench / MMLU 平均，2026-08
     · Agent 工具 —— Terminal-Bench 2.1 + 市场份额 + GitHub 热度，2026-08

   Agent 写入契约：
     window.FMR_HEADLINES = {
       updatedAt: "2026-08-29T03:00:00+08:00",   // 可选，ISO 时间
       source:    "agent",                        // seed | agent
       groups: [ { id, theme, emoji, accent, mode, note, items:[ ... ] } ]
     }

   分组（group）字段
     id      分组唯一 id
     theme   分组标题
     emoji   分组图标
     accent  配色：orange | green | yellow | blue | purple | red | gray
     mode    'rank' 渲染为排行榜，缺省渲染为热闻列表
     note    右上角小字说明（数据来源与口径）

   条目（item）字段
     t     标题（模型名 / 工具名 / 新闻标题）        两种模式都用
     s     来源（厂商名 / 媒体名）                  两种模式都用
     url   原文链接，可为空                        两种模式都用
     v     排行榜主数值文本，如 "22.4%" / "96"      仅 rank
     d     排行榜环比变化，如 "↑2.1" / "↓0.6"       仅 rank
     note  排行榜副说明（一句话定位）               仅 rank
     h     热度 0-100                              仅热闻
     ago   距今分钟数（Demo 用；真实数据请用 ts）   仅热闻
     ts    绝对时间 ISO 字符串，存在时优先于 ago     仅热闻
     tag   短标签                                  仅热闻

   ⚠️ 排行榜数值为多源综合估算，用于展示与排序，不代表任何单一机构的官方口径。
      热闻为 2026-08 前后的公开信息整理，请用 Agent 按契约持续覆盖更新。
   ========================================================================== */

window.FMR_HEADLINES = {
  updatedAt: '2026-08-30T03:10:00+08:00',
  source: 'seed',
  groups: [
    /* ------------------------------------------------- 1 LLM 使用率排行榜 */
    {
      id: 'g-usage', theme: 'LLM 使用率排行', emoji: '📊', accent: 'blue',
      mode: 'rank', note: '多源综合 · OpenRouter 周调用量 + 公开市占 · 2026 Q3 · 其余约 23% 为长尾',
      items: [
        { t: 'MiMo-V2.5',          s: '小米',       v: '22.4%', d: '↑8.6', note: 'OpenRouter 周调用 10.5T Token，全球第一', url: 'https://openrouter.ai' },
        { t: 'DeepSeek-V4-Flash',  s: 'DeepSeek',  v: '13.6%', d: '↑5.2', note: '周调用 6.37T，低价高频场景首选', url: 'https://platform.deepseek.com' },
        { t: 'DeepSeek-V4-Pro',    s: 'DeepSeek',  v: '6.8%',  d: '↑2.1', note: '周调用 3.17T，开源权重中的性能标杆', url: 'https://platform.deepseek.com' },
        { t: 'GLM-5',              s: '智谱 AI',    v: '5.9%',  d: '↑1.8', note: 'GLM-5.3-Flash 永久免费带动调用量', url: 'https://bigmodel.cn' },
        { t: 'MiniMax-M2.7',       s: 'MiniMax',   v: '5.7%',  d: '↑0.9', note: '多模态创意生成场景占比高', url: 'https://platform.minimaxi.com' },
        { t: 'Step-3.5-Flash',     s: '阶跃星辰',    v: '5.2%',  d: '↓1.4', note: '免费版曾冲上第二，近期份额回落', url: 'https://platform.stepfun.com' },
        { t: 'HY3',                s: '腾讯',       v: '4.8%',  d: '↑1.6', note: 'OpenRouter 周调用量前三', url: 'https://cloud.tencent.com/product/hunyuan' },
        { t: 'Claude Sonnet 4.6',  s: 'Anthropic', v: '4.6%',  d: '↑0.3', note: '企业编码负载份额第一', url: 'https://console.anthropic.com' },
        { t: 'Gemini 3 Flash',     s: 'Google',    v: '4.3%',  d: '↑0.5', note: '免费额度带动个人开发者用量', url: 'https://ai.google.dev' },
        { t: 'Kimi-K2.6',          s: '月之暗面',    v: '3.6%',  d: '↑0.7', note: '开源权重，长文本场景集中', url: 'https://platform.moonshot.cn' }
      ]
    },

    /* --------------------------------------------------- 2 LLM 能力排行榜 */
    {
      id: 'g-power', theme: 'LLM 能力排行', emoji: '🧠', accent: 'purple',
      mode: 'rank', note: '多源平均 · SWE-bench Verified / Pro + Terminal-Bench 2.1 + MMLU · 2026-08',
      items: [
        { t: 'Claude Opus 5',     s: 'Anthropic', v: '96', d: '↑3',  note: 'Terminal-Bench 2.1 89.1%，Claude Code 默认模型', url: 'https://claude.ai' },
        { t: 'GPT-5.6 Sol',       s: 'OpenAI',    v: '95', d: '↑4',  note: 'Terminal-Bench 2.1 89.5% 榜首，7/9 起 GA', url: 'https://platform.openai.com' },
        { t: 'Claude Opus 4.8',   s: 'Anthropic', v: '94', d: '↓1',  note: 'SWE-bench Pro 69.2%，长任务推理最强', url: 'https://claude.ai' },
        { t: 'Claude Fable 5',    s: 'Anthropic', v: '93', d: '↑6',  note: 'SWE-bench Verified 95.0%，7/1 起恢复可用', url: 'https://claude.ai' },
        { t: 'GPT-5.5',           s: 'OpenAI',    v: '91', d: '↓2',  note: 'SWE-bench Verified 88.7%，Codex 上一代默认', url: 'https://platform.openai.com' },
        { t: 'Gemini 3.1 Pro',    s: 'Google',    v: '89', d: '↑2',  note: 'MMLU 94.1% 最高，长上下文与多模态领先', url: 'https://ai.google.dev' },
        { t: 'DeepSeek-V4-Pro',   s: 'DeepSeek',  v: '87', d: '↑3',  note: '开源权重最强，$0.44/$0.87 每百万 Token', url: 'https://platform.deepseek.com' },
        { t: 'GLM-5',             s: '智谱 AI',    v: '88', d: '↑5',  note: '面向 Agentic Engineering 的旗舰基座，开源 SOTA', url: 'https://chat.z.ai' },
        { t: 'Qwen3.7-Max',       s: '阿里通义',    v: '85', d: '↑4',  note: 'SWE-bench Verified 80.4%，HuggingFace 开源榜首', url: 'https://tongyi.aliyun.com' },
        { t: 'Kimi-K3',           s: '月之暗面',    v: '85', d: '↑8',  note: '2.8T 参数全球最大开源，Frontend Code Arena 登顶', url: 'https://www.kimi.com' }
      ]
    },

    /* ----------------------------------------------------- 3 Agent 排行榜 */
    {
      id: 'g-agent', theme: 'Agent 工具排行', emoji: '🤖', accent: 'orange',
      mode: 'rank', note: 'Terminal-Bench 2.1 + 市场份额 + GitHub 热度 · 2026-08-02 更新',
      items: [
        { t: 'Codex CLI',        s: 'OpenAI',     v: '94', d: '↑3',  note: 'GPT-5.6 Sol 默认，Terminal-Bench 89.5% 榜首', url: 'https://github.com/openai/codex' },
        { t: 'Claude Code',      s: 'Anthropic',  v: '93', d: '↑1',  note: 'Opus 5 默认，企业编码市场份额 42%', url: 'https://claude.ai/code' },
        { t: 'OpenCode',         s: 'OpenCode',   v: '88', d: '↑9',  note: '20 万 star，MIT 开源第一，BYOK 任意模型', url: 'https://opencode.ai' },
        { t: 'Cursor',           s: 'Anysphere',  v: '86', d: '↓2',  note: 'IDE 形态日活最高，Composer 自研模型', url: 'https://cursor.com' },
        { t: 'Hermes Agent',     s: 'Hermes',     v: '85', d: 'NEW', note: '23.4 万 star，近三个月热度增速第一', url: '' },
        { t: 'Gemini CLI',       s: 'Google',     v: '82', d: '↑5',  note: '免费 1000 次/天，1M 上下文', url: 'https://github.com/google-gemini/gemini-cli' },
        { t: 'Claw Code',        s: 'Gajae',      v: '80', d: 'NEW', note: '19.5 万 star，Rust 实现的自维护 agent', url: '' },
        { t: 'Cline',            s: 'Cline',      v: '79', d: '↑2',  note: '6.7 万 star，BYOK，成本完全可控', url: 'https://github.com/cline/cline' },
        { t: 'GitHub Copilot',   s: 'Microsoft',  v: '78', d: '↑1',  note: '企业默认，$0.01/credit 用多少付多少', url: 'https://github.com/features/copilot' },
        { t: 'Qwen Code',        s: '阿里通义',    v: '74', d: '↑4',  note: '2.7 万 star，命令行直连百炼免费额度', url: 'https://github.com/QwenLM/qwen-code' }
      ]
    },

    /* ---------------------------------------------------------- 4 今日最热 */
    {
      id: 'g-hot', theme: '今日最热', emoji: '🔥', accent: 'orange',
      items: [
        { t: '小米 MiMo-V2.5 登顶 OpenRouter 全球调用量，周调用 10.5 万亿 Token', s: 'OpenRouter', h: 98, ago: 26, tag: '调用量', url: 'https://openrouter.ai' },
        { t: '国产大模型全球市场份额达 63.5%，美国模型占 35.5%', s: '行业综合', h: 96, ago: 52, tag: '格局', url: '' },
        { t: 'Kimi-K3 以 2.8 万亿参数成为全球最大开源模型，登顶 Frontend Code Arena', s: '月之暗面', h: 94, ago: 71, tag: '开源', url: 'https://www.kimi.com' },
        { t: 'GLM-5 在 SWE-bench Verified、Terminal Bench 2.0 达开源 SOTA，比肩 Claude Opus 4.5', s: '智谱 AI', h: 92, ago: 35, tag: '评测', url: 'https://bigmodel.cn' },
        { t: 'GPT-5.6 Sol 于 7 月 9 日 GA，Codex 默认切换，Terminal-Bench 89.5%', s: 'OpenAI', h: 90, ago: 118, tag: '发布', url: 'https://platform.openai.com' },
        { t: 'Claude Opus 5 于 7 月 24 日成为 Claude Code 默认模型', s: 'Anthropic', h: 88, ago: 142, tag: '发布', url: 'https://claude.ai' },
        { t: 'OpenCode 突破 20 万 star，成为 star 数最多的开源编程 Agent', s: 'GitHub', h: 86, ago: 165, tag: '开源', url: 'https://opencode.ai' },
        { t: '国产模型 API 定价 0.4–0.7 美元/百万 Token，与海外头部价差近 10 倍', s: '行业综合', h: 83, ago: 189, tag: '价格', url: '' },
        { t: 'Gemini CLI 免费额度维持 1000 次/天，个人 Google 账号可用', s: 'Google', h: 80, ago: 214, tag: '免费', url: 'https://ai.google.dev' },
        { t: '智谱新用户额度提升至累计 3000 万 tokens，含 2000 万永久有效额度', s: '智谱 AI', h: 93, ago: 28, tag: '额度', url: 'https://bigmodel.cn' },
        { t: '开源模型企业采用率降至 13%，企业向闭源供应商集中', s: 'Menlo Ventures', h: 77, ago: 238, tag: '趋势', url: '' }
      ]
    },

    /* -------------------------------------------------------- 5 模型发布 */
    {
      id: 'g-model', theme: '模型发布', emoji: '🆕', accent: 'green',
      items: [
        { t: 'DeepSeek-V4 系列上线：Flash 主攻低价高频，Pro 主攻开源性能标杆', s: 'DeepSeek', h: 93, ago: 64, tag: '发布', url: 'https://platform.deepseek.com' },
        { t: 'Qwen3.7-Max 发布，Hugging Face 开源大模型榜单位居全球榜首', s: '阿里通义', h: 91, ago: 88, tag: '开源', url: 'https://tongyi.aliyun.com' },
        { t: 'Kimi-K3 发布数小时即登顶国际编程评测榜单', s: '月之暗面', h: 89, ago: 112, tag: '编程', url: 'https://www.kimi.com' },
        { t: 'MiniMax-M3 发布，SWE-bench Verified 80.5%，开源权重', s: 'MiniMax', h: 86, ago: 136, tag: '开源', url: 'https://platform.minimaxi.com' },
        { t: 'Gemini 3.1 Pro 预览版放出，MMLU 94.1% 刷新最高分', s: 'Google', h: 84, ago: 159, tag: '发布', url: 'https://ai.google.dev' },
        { t: 'GLM-5.3-Flash 开放：原生多模态 + 1M 上下文，Flash 系列永久免费', s: '智谱 AI', h: 82, ago: 55, tag: '免费', url: 'https://bigmodel.cn' },
        { t: '阶跃星辰 Step-3.5-Flash 免费版一度冲上调用量第二', s: 'StepFun', h: 79, ago: 205, tag: '免费', url: 'https://platform.stepfun.com' },
        { t: '腾讯 HY3 进入 OpenRouter 周调用量前三', s: '腾讯', h: 76, ago: 228, tag: '调用量', url: 'https://cloud.tencent.com/product/hunyuan' },
        { t: 'Kimi-K2.6 开源权重更新，长文本场景表现稳定', s: '月之暗面', h: 73, ago: 251, tag: '开源', url: 'https://platform.moonshot.cn' },
        { t: 'GPT-5.6 系列分 Sol/Terra/Luna 三档，目前仅限量预览', s: 'OpenAI', h: 70, ago: 274, tag: '发布', url: 'https://platform.openai.com' }
      ]
    },

    /* -------------------------------------------------------- 6 开源生态 */
    {
      id: 'g-open', theme: '开源生态', emoji: '🌱', accent: 'green',
      items: [
        { t: '国产开源大模型全球累计下载量突破 100 亿次，占 HF 平台 41%', s: 'Hugging Face', h: 92, ago: 77, tag: '生态', url: 'https://huggingface.co' },
        { t: '全球每 10 次大模型下载中有 6 次来自中国研发模型', s: 'Hugging Face', h: 89, ago: 102, tag: '生态', url: 'https://huggingface.co/models' },
        { t: 'vLLM 新版发布，连续批处理吞吐提升约四成', s: 'vLLM', h: 86, ago: 126, tag: '推理', url: 'https://github.com/vllm-project/vllm' },
        { t: 'Ollama 支持一行命令拉取并运行国产开源模型', s: 'Ollama', h: 84, ago: 149, tag: '本地', url: 'https://ollama.com' },
        { t: 'llama.cpp 量化方案更新，端侧内存占用再降', s: 'ggml', h: 81, ago: 172, tag: '端侧', url: 'https://github.com/ggml-org/llama.cpp' },
        { t: 'DeepSeek 开源推理 kernels，训练与部署成本进一步下降', s: 'DeepSeek', h: 78, ago: 195, tag: '基础设施', url: 'https://github.com/deepseek-ai' },
        { t: '开源 Embedding 模型在中文检索基准上反超闭源', s: 'BAAI', h: 75, ago: 218, tag: '向量', url: 'https://www.baai.ac.cn' },
        { t: 'Whisper 衍生模型在多语种识别上刷新开源成绩', s: '社区', h: 72, ago: 241, tag: '语音', url: '' },
        { t: '多家厂商加入模型开放权重联盟，许可证趋于宽松', s: '行业综合', h: 69, ago: 264, tag: '许可', url: '' },
        { t: 'SGLang 与主流推理后端性能对比引发热议', s: '社区', h: 66, ago: 287, tag: '推理', url: '' }
      ]
    },

    /* ------------------------------------------------- 7 免费额度 & 降价 */
    {
      id: 'g-free', theme: '免费额度 & 降价', emoji: '💰', accent: 'yellow',
      items: [
        { t: 'Gemini CLI 免费额度 1000 次/天，个人 Google 账号即可用', s: 'Google', h: 95, ago: 38, tag: '免费', url: 'https://ai.google.dev' },
        { t: '国产模型 API 综合定价 0.4–0.7 美元/百万 Token，较海外低近 10 倍', s: '行业综合', h: 92, ago: 61, tag: '降价', url: '' },
        { t: 'OpenRouter :free 池持续扩容，绑定 GitHub 后日额度提升', s: 'OpenRouter', h: 89, ago: 84, tag: '免费', url: 'https://openrouter.ai/models?fmt=free' },
        { t: 'GitHub Models 全量开放免费调用，主流模型可直接用', s: 'GitHub', h: 87, ago: 107, tag: '免费', url: 'https://github.com/marketplace/models' },
        { t: 'DeepSeek-V4-Flash 定价 0.44/0.87 美元，继续压低行业底线', s: 'DeepSeek', h: 84, ago: 130, tag: '降价', url: 'https://platform.deepseek.com' },
        { t: '智谱 GLM 系列 Flash 版本长期免费，官方定价页标注 ¥0', s: '智谱 AI', h: 81, ago: 153, tag: '免费', url: 'https://bigmodel.cn' },
        { t: '智谱新用户累计可领 3000 万 tokens：注册 2000 万永久有效 + 新手任务 1000 万', s: '智谱 AI', h: 96, ago: 28, tag: '大额', url: 'https://bigmodel.cn' },
        { t: 'Cloudflare Workers AI 每日 10k Neuron 免费额度维持', s: 'Cloudflare', h: 75, ago: 199, tag: '免费', url: 'https://ai.cloudflare.com' },
        { t: '火山方舟新用户礼包扩容，实名后额度翻倍', s: '火山引擎', h: 72, ago: 222, tag: '新用户', url: 'https://console.volcengine.com/ark' },
        { t: 'ZCode 周末送 3 亿 GLM-5.3-Flash tokens，周五 20:00 至周一 09:00 可用', s: '智谱 AI', h: 90, ago: 12, tag: '限时', url: 'https://bigmodel.cn/claude-code' },
        { t: '硅基流动新用户 2000 万 tokens 永久有效，活动期可再领 1000 万', s: '硅基流动', h: 88, ago: 42, tag: '大额', url: 'https://cloud.siliconflow.cn' },
        { t: '多家平台限时免费活动集中到期，需留意续期公告', s: '本站整理', h: 68, ago: 246, tag: '提醒', url: '' }
      ]
    },

    /* ------------------------------------------------------ 8 Coding 工具 */
    {
      id: 'g-code', theme: 'Coding 工具', emoji: '💻', accent: 'blue',
      items: [
        { t: 'Codex CLI 切换 GPT-5.6 Sol 为默认，Terminal-Bench 89.5% 登顶', s: 'OpenAI', h: 94, ago: 44, tag: 'CLI', url: 'https://github.com/openai/codex' },
        { t: 'Claude Code 切换 Opus 5 为默认，企业编码份额达 42%', s: 'Anthropic', h: 92, ago: 67, tag: 'CLI', url: 'https://claude.ai/code' },
        { t: 'OpenCode 突破 20 万 star，MIT 协议可接任意模型', s: 'OpenCode', h: 90, ago: 90, tag: '开源', url: 'https://opencode.ai' },
        { t: 'Gemini CLI 免费 1000 次/天，Apache-2.0 授权', s: 'Google', h: 87, ago: 113, tag: 'CLI', url: 'https://github.com/google-gemini/gemini-cli' },
        { t: 'GitHub Copilot 改为 $0.01/credit 按量计费', s: 'Microsoft', h: 84, ago: 136, tag: '定价', url: 'https://github.com/features/copilot' },
        { t: 'Cursor Composer 自研模型上线，Pro 维持 $20/月', s: 'Anysphere', h: 81, ago: 159, tag: 'IDE', url: 'https://cursor.com' },
        { t: 'Qwen Code 支持命令行直连百炼免费额度', s: '阿里通义', h: 78, ago: 182, tag: 'CLI', url: 'https://github.com/QwenLM/qwen-code' },
        { t: 'Cline 与 Roo Code 分流，BYOK 成本优势明显', s: 'Cline', h: 75, ago: 205, tag: '插件', url: 'https://github.com/cline/cline' },
        { t: 'Aider 在 polyglot 基准上取得 88.0%', s: 'Aider', h: 72, ago: 228, tag: '终端', url: 'https://aider.chat' },
        { t: '开发者调研：多数团队同时使用 2 个以上编程 Agent', s: '社区调研', h: 68, ago: 251, tag: '数据', url: '' }
      ]
    }
  ]
};
