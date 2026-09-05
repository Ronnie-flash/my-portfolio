/* ==========================================================================
   FreeModel Radar — 种子数据层
   --------------------------------------------------------------------------
   设计约定（后续接爬虫 / 官方 API 时按此契约替换即可，无需改渲染逻辑）：

   · 本文件提供 window.FMR_SOURCE 作为「数据源」。
   · app.js 只依赖 normalize() 之后的标准结构（见下 MODELS 字段契约）。
   · 时间字段：demo 可继续用 `ago`（距当前分钟数），让种子数据在任何时刻打开都保持新鲜；
     但 **ago 是派生字段，不是源数据** —— normalize 会把它转成绝对时间 `verifiedAt`，
     导出（FMR.export / FMR.toPatch）只输出 verifiedAt，永不回写 ago。
     接入真实后端请直接存 `verifiedAt: "2026-08-29T01:05:00+08:00"`。

   · 来源字段：`src` 可取 official（官方）/ vendor（厂商页面）/ community（社区）/ unknown，
     未提供时由 freeType 与 apiUrl 推断。也可直接给 `sources: [{type,name,url,checkedAt}]`。
     可信度 = 来源 40 + 新鲜度 25 + 社区反馈 20 + 信息完整度 15，由 normalize 计算。

   · **id 必须带集合语义**：models / deals / codes / radar 各是一张表，
     findObj(kind, id) 必须显式指定集合，同名 id 落在不同集合互不影响。
     推荐命名 model_xxx / deal_xxx / code_xxx；历史 id 为兼容起见保持原样。

   字段契约（Model）：
     id, name, vendor, vendorCn, country, caps[], freeType, summary, quota,
     end(null=长期|"YYYY-MM-DD"), needSignup, needCard, needCode,
     capability(0-100), stability(0-100), url, apiUrl,
     src? | sources?, ago(分钟) | verifiedAt(ISO), up, down, tags[]
   ========================================================================== */

window.FMR_SOURCE = {

  meta: {
    product: 'FreeModel Radar',
    slogan: 'Free AI, before it expires.',
    sloganCn: '在免费消失之前，找到它。',
    // 数据源最后核实时间（联网核对，非凭记忆填写）
    updatedAt: '2026-08-30T03:10:00+08:00'
  },

  /* ---------------------------------------------------------------- 模型库 */
  models: [
    /* ===================== 🇨🇳 国内 ===================== */
    {
      id: 'deepseek-v3', name: 'DeepSeek-V4-Flash', vendor: 'DeepSeek', vendorCn: '深度求索',
      country: 'CN', caps: ['chat', 'api', 'coding'], freeType: 'quota',
      summary: 'V4 系列低价高频版本，网页端全功能免费，API 定价 0.44/0.87 美元每百万 Token。',
      quota: 'Chat 不限量免费 · API 0.44/0.87 美元/百万 Token',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 87, stability: 93, url: 'https://chat.deepseek.com',
      apiUrl: 'https://platform.deepseek.com', ago: 9, up: 412, down: 12,
      tags: ['国产之光', '性价比', 'OpenAI 兼容']
    },
    {
      id: 'deepseek-r1', name: 'DeepSeek-V4-Pro', vendor: 'DeepSeek', vendorCn: '深度求索',
      country: 'CN', caps: ['chat', 'api', 'coding'], freeType: 'quota',
      summary: 'V4 系列性能标杆，开源权重，SWE-bench Verified 80.6%。',
      quota: 'Chat 不限量免费 · 开源权重可自部署',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 88, stability: 92, url: 'https://chat.deepseek.com',
      apiUrl: 'https://platform.deepseek.com', ago: 9, up: 356, down: 14,
      tags: ['推理', '开源权重']
    },
    {
      id: 'siliconflow', name: 'SiliconFlow', vendor: 'SiliconFlow', vendorCn: '硅基流动',
      country: 'CN', caps: ['api', 'chat', 'coding'], freeType: 'quota',
      summary: '聚合 DeepSeek、Qwen、GLM、Kimi、Llama 等主流开源模型的推理平台，新用户赠 2000 万 tokens 永久有效，活动期完成新手任务可再领 1000 万。',
      quota: '新用户 2000 万 tokens（永久）· 活动期累计最高 3000 万 · 实名送 16 元代金券',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 82, stability: 88, url: 'https://cloud.siliconflow.cn',
      apiUrl: 'https://cloud.siliconflow.cn', ago: 42, up: 241, down: 11,
      tags: ['聚合平台', 'OpenAI 兼容', '额度高', '响应快']
    },
    {
      id: 'glm-46', name: 'GLM-5', vendor: 'Zhipu', vendorCn: '智谱 AI',
      country: 'CN', caps: ['chat', 'api', 'coding', 'agent'], freeType: 'quota',
      summary: '智谱新一代旗舰基座，面向 Agentic Engineering。注册即送 2000 万 tokens 永久有效，完成新手任务可再领 1000 万，累计最高 3000 万。',
      quota: '注册送 2000 万 tokens（永久）· 新手任务再领 1000 万 · Flash 系列永久免费无上限',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 92, stability: 86, url: 'https://chat.z.ai',
      apiUrl: 'https://bigmodel.cn', ago: 21, up: 231, down: 27,
      tags: ['Coding Plan', 'Agent']
    },
    {
      id: 'glm-45-flash', name: 'GLM-5.3-Flash', vendor: 'Zhipu', vendorCn: '智谱 AI',
      country: 'CN', caps: ['api', 'coding'], freeType: 'apifree',
      summary: 'GLM-5 系列首个原生多模态模型，支持图像/视频/文档理解，原生 1M 上下文，智能水平对标 Claude Opus 4.8 而价格约 1/40。Flash 系列永久免费。',
      quota: '永久免费无 token 上限 · 30 并发 · 需实名不绑卡',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 86, stability: 88, url: 'https://chat.z.ai',
      apiUrl: 'https://bigmodel.cn/dev/howuse/model', ago: 14, up: 188, down: 6,
      tags: ['长期免费', '高并发']
    },
    {
      id: 'qwen3-max', name: 'Qwen3.7-Max', vendor: 'Alibaba', vendorCn: '阿里通义',
      country: 'CN', caps: ['chat', 'api', 'coding'], freeType: 'quota',
      summary: '百炼集成国内外 20+ 主流模型，每款模型独立赠送免费额度，累计可超 7000 万。',
      quota: '每款模型各送 100 万 tokens（90 天）· 累计可超 7000 万',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 89, stability: 91, url: 'https://tongyi.aliyun.com',
      apiUrl: 'https://bailian.console.aliyun.com', ago: 17, up: 297, down: 9,
      tags: ['开源生态', '企业稳定']
    },
    {
      id: 'qwen3-coder', name: 'Qwen3-Coder-Plus', vendor: 'Alibaba', vendorCn: '阿里通义',
      country: 'CN', caps: ['api', 'coding', 'agent'], freeType: 'quota',
      summary: '百炼 Coding 专区赠送额度，可直连 Qwen Code CLI 与主流 IDE。',
      quota: '赠额度 · Qwen Code CLI 免配置直连',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 87, stability: 87, url: 'https://tongyi.aliyun.com',
      apiUrl: 'https://bailian.console.aliyun.com', ago: 34, up: 164, down: 11,
      tags: ['Coding', 'CLI', '大上下文']
    },
    {
      id: 'qwen3-embedding', name: 'Qwen3-Embedding', vendor: 'Alibaba', vendorCn: '阿里通义',
      country: 'CN', caps: ['api', 'embedding'], freeType: 'apifree',
      summary: '百炼部分向量模型长期免费，适合 RAG 与知识库场景。',
      quota: 'Embedding 免费额度 · 按 QPS 限制',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 76, stability: 90, url: 'https://tongyi.aliyun.com',
      apiUrl: 'https://bailian.console.aliyun.com', ago: 62, up: 87, down: 3,
      tags: ['RAG', '向量']
    },
    {
      id: 'kimi-k2', name: 'Kimi-K2.5', vendor: 'Moonshot', vendorCn: '月之暗面',
      country: 'CN', caps: ['chat', 'api', 'coding', 'agent'], freeType: 'quota',
      summary: '长文本与多模态能力见长，上下文窗口国内领先，支持 Kimi-K2.5 与 K2-thinking。',
      quota: '实名到账 15 元 · 有效期约 3 个月',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 87, stability: 85, url: 'https://www.kimi.com',
      apiUrl: 'https://platform.moonshot.cn', ago: 28, up: 203, down: 16,
      tags: ['Agent', '长文本', '开源权重']
    },
    {
      id: 'kimi-k3', name: 'Kimi-K3', vendor: 'Moonshot', vendorCn: '月之暗面',
      country: 'CN', caps: ['chat', 'api', 'coding', 'agent'], freeType: 'quota',
      summary: '2.8 万亿参数全球最大开源模型，发布数小时即登顶 Frontend Code Arena 编程榜。',
      quota: '开发者平台赠额度 · 开源权重可自部署',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 91, stability: 83, url: 'https://www.kimi.com',
      apiUrl: 'https://platform.moonshot.cn', ago: 71, up: 186, down: 12,
      tags: ['开源', '2.8T 参数', '编程榜首']
    },
    {
      id: 'claude-opus-5', name: 'Claude-Opus-5', vendor: 'Anthropic', vendorCn: 'Anthropic',
      country: 'US', caps: ['chat', 'api', 'coding', 'agent'], freeType: 'newuser',
      summary: 'Terminal-Bench 2.1 以 89.1% 位居第二，7 月 24 日起成为 Claude Code 默认模型。',
      quota: 'Free 版每日限额 · API 需绑定支付方式',
      end: null, needSignup: true, needCard: true, needCode: false,
      capability: 96, stability: 95, url: 'https://claude.ai',
      apiUrl: 'https://console.anthropic.com', ago: 33, up: 298, down: 19,
      tags: ['Coding 最强', 'Agent', '需信用卡']
    },
    {
      id: 'minimax-m2', name: 'MiniMax-M2.7', vendor: 'MiniMax', vendorCn: '稀宇科技',
      country: 'CN', caps: ['chat', 'api', 'coding'], freeType: 'quota',
      summary: '相比 M2.5 实战能力显著提升，强工程与 Coding 能力，支持复杂 Office 自动化。',
      quota: '实名认证到账 15 元代金券 · 有效期约 2 个月',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 86, stability: 84, url: 'https://www.minimaxi.com',
      apiUrl: 'https://platform.minimaxi.com', ago: 47, up: 132, down: 12,
      tags: ['多模态']
    },
    {
      id: 'doubao-seed', name: 'Doubao-Seed', vendor: 'ByteDance', vendorCn: '字节 · 火山引擎',
      country: 'CN', caps: ['chat', 'api', 'image', 'video'], freeType: 'quota',
      summary: '火山引擎两层免费计划：模型体验额度 + 每日协作奖励，豆包 App 端免费。',
      quota: '模型体验额度 · 每日 200 万 token 协作奖励',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 85, stability: 90, url: 'https://www.doubao.com',
      apiUrl: 'https://console.volcengine.com/ark', ago: 12, up: 176, down: 8,
      tags: ['多模态', '低价']
    },
    {
      id: 'ernie-45', name: 'ERNIE-4.5', vendor: 'Baidu', vendorCn: '百度千帆',
      country: 'CN', caps: ['chat', 'api'], freeType: 'quota',
      summary: '千帆平台聚合 DeepSeek-V4、ERNIE 5.0、Kimi-K2.5、GLM 5.1 等主流模型，注册送代金券。',
      quota: '注册送 ¥20 代金券（1 个月）· Qwen3.5-2B 推理免费不限量',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 84, stability: 88, url: 'https://yiyan.baidu.com',
      apiUrl: 'https://console.bce.baidu.com/qianfan', ago: 96, up: 94, down: 19,
      tags: ['国产']
    },
    {
      id: 'spark-x1', name: '星火 Spark X2', vendor: 'iFlytek', vendorCn: '科大讯飞',
      country: 'CN', caps: ['chat', 'api', 'audio'], freeType: 'quota',
      summary: '讯飞星火深度推理模型，数理推理与问答表现出色，新用户可领大额 tokens 包。',
      quota: '新用户领 500 万 tokens · Spark Lite 永久免费不限量',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 80, stability: 87, url: 'https://xinghuo.xfyun.cn',
      apiUrl: 'https://www.xfyun.cn', ago: 143, up: 71, down: 22,
      tags: ['语音']
    },
    {
      id: 'mimo-vl', name: 'MiMo-V2.5', vendor: 'Xiaomi', vendorCn: '小米',
      country: 'CN', caps: ['chat', 'api', 'coding'], freeType: 'limited',
      summary: '小米 MiMo 系列，OpenRouter 周调用量曾登顶全球第一，免费额度与性价比双驱动。',
      quota: '注册赠 1000 万 tokens · 兑换码活动不定期开放',
      end: '2026-09-15', needSignup: true, needCard: false, needCode: true,
      capability: 88, stability: 79, url: 'https://mimo.xiaomi.com',
      apiUrl: 'https://mimo.xiaomi.com', ago: 5, up: 158, down: 31,
      tags: ['新用户', '兑换码', '多模态']
    },
    {
      id: 'step-3', name: 'Step-3.5-Flash', vendor: 'StepFun', vendorCn: '阶跃星辰',
      country: 'CN', caps: ['chat', 'api'], freeType: 'newuser',
      summary: '阶跃星辰新一代模型，免费版曾冲上全球调用量第二，多模态能力完整。',
      quota: '免费版可直接调用 · 注册赠体验额度',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 84, stability: 81, url: 'https://www.stepfun.com',
      apiUrl: 'https://platform.stepfun.com', ago: 188, up: 63, down: 17,
      tags: ['多模态']
    },
    {
      id: 'hunyuan-t1', name: '腾讯混元 HY', vendor: 'Tencent', vendorCn: '腾讯混元',
      country: 'CN', caps: ['chat', 'api', 'image'], freeType: 'quota',
      summary: '腾讯全链路自研通用与多模态大模型家族，覆盖文本、图像、视频、3D 等模态。',
      quota: '首次开通送 100 万 tokens（1 年）· Hunyuan-lite 完全免费',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 85, stability: 91, url: 'https://yuanbao.tencent.com',
      apiUrl: 'https://cloud.tencent.com/product/hunyuan', ago: 39, up: 118, down: 7,
      tags: ['大厂']
    },
    {
      id: 'sensenova-v6', name: 'SenseNova-V6', vendor: 'SenseTime', vendorCn: '商汤',
      country: 'CN', caps: ['chat', 'api', 'image', 'video'], freeType: 'quota',
      summary: '日日新平台注册赠送额度，图像与视频生成能力覆盖完整。',
      quota: '注册赠送额度 · 多模态免费试用',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 78, stability: 80, url: 'https://www.sensenova.cn',
      apiUrl: 'https://platform.sensenova.cn', ago: 214, up: 52, down: 14,
      tags: ['多模态']
    },
    {
      id: 'cogview-4', name: 'CogView-4', vendor: 'Zhipu', vendorCn: '智谱 AI',
      country: 'CN', caps: ['image', 'api'], freeType: 'quota',
      summary: '图像生成模型，BigModel 平台赠送额度。',
      quota: '注册赠送生图额度',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 76, stability: 83, url: 'https://chat.z.ai',
      apiUrl: 'https://bigmodel.cn', ago: 71, up: 64, down: 9,
      tags: ['图像']
    },
    {
      id: 'cogvideox', name: 'CogVideoX', vendor: 'Zhipu', vendorCn: '智谱 AI',
      country: 'CN', caps: ['video', 'api'], freeType: 'quota',
      summary: '视频生成模型，开源权重可自部署，平台侧有免费额度。',
      quota: '开源自部署免费 · 平台赠试用额度',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 72, stability: 78, url: 'https://chat.z.ai',
      apiUrl: 'https://bigmodel.cn', ago: 132, up: 41, down: 11,
      tags: ['视频', '开源权重']
    },

    /* ===================== 🇺🇸 / 🌍 海外 ===================== */
    {
      id: 'claude-sonnet-45', name: 'Claude-Sonnet-4.6', vendor: 'Anthropic', vendorCn: 'Anthropic',
      country: 'US', caps: ['chat', 'api', 'coding', 'agent'], freeType: 'newuser',
      summary: '企业编码负载份额第一，Coding 与 Agent 场景表现最强。',
      quota: 'Free 版每日限额 · API 新用户赠试用金',
      end: null, needSignup: true, needCard: true, needCode: false,
      capability: 92, stability: 96, url: 'https://claude.ai',
      apiUrl: 'https://console.anthropic.com', ago: 7, up: 389, down: 23,
      tags: ['Coding 强', 'Agent', '需信用卡']
    },
    {
      id: 'claude-haiku-45', name: 'Claude Haiku 4.5', vendor: 'Anthropic', vendorCn: 'Anthropic',
      country: 'US', caps: ['chat', 'api', 'coding'], freeType: 'quota',
      summary: '轻量高速模型，Free 版可直接使用，API 单价低。',
      quota: 'Free 版可用 · API 按量低价',
      end: null, needSignup: true, needCard: true, needCode: false,
      capability: 86, stability: 95, url: 'https://claude.ai',
      apiUrl: 'https://console.anthropic.com', ago: 7, up: 214, down: 10,
      tags: ['高速', '需信用卡']
    },
    {
      id: 'gemini-25-pro', name: 'Gemini-3.1-Pro', vendor: 'Google', vendorCn: 'Google',
      country: 'US', caps: ['chat', 'api', 'coding', 'image'], freeType: 'apifree',
      summary: 'MMLU 94.1% 刷新最高分，长上下文与多模态领先，AI Studio 有免费额度。',
      quota: 'AI Studio 每日免费额度 · API free tier',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 93, stability: 91, url: 'https://aistudio.google.com',
      apiUrl: 'https://ai.google.dev', ago: 4, up: 476, down: 13,
      tags: ['长上下文', '免费额度大', '首选']
    },
    {
      id: 'gemini-25-flash', name: 'Gemini-3-Flash', vendor: 'Google', vendorCn: 'Google',
      country: 'US', caps: ['chat', 'api', 'image', 'video'], freeType: 'apifree',
      summary: '免费额度更高，速度与成本平衡，适合批量任务与多模态处理。',
      quota: 'AI Studio 高额免费额度 · API free tier',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 86, stability: 92, url: 'https://aistudio.google.com',
      apiUrl: 'https://ai.google.dev', ago: 4, up: 402, down: 8,
      tags: ['多模态', '高额度', '首选']
    },
    {
      id: 'gemini-embedding', name: 'Gemini Embedding', vendor: 'Google', vendorCn: 'Google',
      country: 'US', caps: ['api', 'embedding'], freeType: 'apifree',
      summary: '文本向量化模型，API free tier 可直接调用。',
      quota: 'API free tier · RPM 限制',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 78, stability: 90, url: 'https://aistudio.google.com',
      apiUrl: 'https://ai.google.dev', ago: 58, up: 73, down: 4,
      tags: ['RAG', '向量']
    },
    {
      id: 'gpt-5', name: 'GPT-5.6-Sol', vendor: 'OpenAI', vendorCn: 'OpenAI',
      country: 'US', caps: ['chat', 'api', 'coding', 'image'], freeType: 'quota',
      summary: 'Terminal-Bench 2.1 以 89.5% 登顶，7 月 9 日起 GA 并成为 Codex 默认模型。',
      quota: 'Free 版少量额度 · API 付费（无免费额度）',
      end: null, needSignup: true, needCard: true, needCode: false,
      capability: 95, stability: 95, url: 'https://chatgpt.com',
      apiUrl: 'https://platform.openai.com', ago: 11, up: 351, down: 34,
      tags: ['需信用卡', 'API 无免费']
    },
    {
      id: 'gpt-5-mini', name: 'GPT-5 mini', vendor: 'OpenAI', vendorCn: 'OpenAI',
      country: 'US', caps: ['api', 'coding', 'chat'], freeType: 'quota',
      summary: '轻量版本，API 单价低，Free 版亦有少量额度。',
      quota: 'Free 版少量额度 · API 低价',
      end: null, needSignup: true, needCard: true, needCode: false,
      capability: 80, stability: 94, url: 'https://chatgpt.com',
      apiUrl: 'https://platform.openai.com', ago: 11, up: 187, down: 21,
      tags: ['轻量', '需信用卡']
    },
    {
      id: 'grok-4', name: 'Grok 4', vendor: 'xAI', vendorCn: 'xAI',
      country: 'US', caps: ['chat', 'api', 'coding'], freeType: 'newuser',
      summary: 'X 平台订阅附赠额度，API 侧周期性放出免费额度活动。',
      quota: 'X 订阅附赠 · API 不定期赠送额度',
      end: null, needSignup: true, needCard: true, needCode: false,
      capability: 88, stability: 85, url: 'https://grok.com',
      apiUrl: 'https://console.x.ai', ago: 66, up: 129, down: 26,
      tags: ['需信用卡', '活动多']
    },
    {
      id: 'llama-4-scout', name: 'Llama 4 Scout', vendor: 'Meta', vendorCn: 'Meta',
      country: 'US', caps: ['api', 'coding', 'chat'], freeType: 'free',
      summary: '开源权重，可本地自部署；多家推理平台提供完全免费托管。',
      quota: '开源免费 · OpenRouter/Groce :free 免登录调用',
      end: null, needSignup: false, needCard: false, needCode: false,
      capability: 84, stability: 89, url: 'https://www.llama.com',
      apiUrl: 'https://openrouter.ai/models?fmt=free', ago: 23, up: 245, down: 5,
      tags: ['开源', '自部署', '完全免费']
    },
    {
      id: 'mistral-small-3', name: 'Mistral Small 3', vendor: 'Mistral AI', vendorCn: 'Mistral AI',
      country: 'EU', caps: ['chat', 'api', 'coding'], freeType: 'apifree',
      summary: 'La Plateforme 免费层可直接调用，无需信用卡，Eu 合规友好。',
      quota: '免费 tier · 1 req/s 速率限制',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 80, stability: 86, url: 'https://chat.mistral.ai',
      apiUrl: 'https://console.mistral.ai', ago: 31, up: 152, down: 9,
      tags: ['免信用卡', 'Apache 2.0']
    },
    {
      id: 'mistral-large', name: 'Mistral Large', vendor: 'Mistral AI', vendorCn: 'Mistral AI',
      country: 'EU', caps: ['chat', 'api', 'coding'], freeType: 'quota',
      summary: '旗舰模型，La Plateforme 提供试用额度，超出后按量计费。',
      quota: '试用额度 · 超出按量计费',
      end: null, needSignup: true, needCard: true, needCode: false,
      capability: 88, stability: 88, url: 'https://chat.mistral.ai',
      apiUrl: 'https://console.mistral.ai', ago: 54, up: 96, down: 15,
      tags: ['需信用卡']
    },
    {
      id: 'command-a', name: 'Command A', vendor: 'Cohere', vendorCn: 'Cohere',
      country: 'US', caps: ['api', 'chat'], freeType: 'quota',
      summary: '提供免费 Trial API Key，适合企业场景评估。',
      quota: '免费 Trial Key · 速率限制',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 82, stability: 84, url: 'https://cohere.com',
      apiUrl: 'https://dashboard.cohere.com', ago: 97, up: 58, down: 12,
      tags: ['Trial']
    },
    {
      id: 'cohere-embed-4', name: 'Cohere Embed 4', vendor: 'Cohere', vendorCn: 'Cohere',
      country: 'US', caps: ['api', 'embedding'], freeType: 'apifree',
      summary: '向量模型，Trial Key 下可免费调用，多语言检索表现好。',
      quota: 'Trial Key 免费调用',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 74, stability: 85, url: 'https://cohere.com',
      apiUrl: 'https://dashboard.cohere.com', ago: 121, up: 44, down: 6,
      tags: ['RAG', '多语言']
    },
    {
      id: 'groq-inference', name: 'Groq 推理平台', vendor: 'Groq', vendorCn: 'Groq',
      country: 'US', caps: ['api', 'chat', 'coding'], freeType: 'apifree',
      summary: 'LPU 超低延迟推理，托管多家开源模型，免费 tier 额度充足。',
      quota: '免费 tier · RPM / TPM 限制',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 82, stability: 87, url: 'https://groq.com',
      apiUrl: 'https://console.groq.com', ago: 16, up: 268, down: 11,
      tags: ['超低延迟', '开源托管']
    },
    {
      id: 'openrouter-free', name: 'OpenRouter :free 池', vendor: 'OpenRouter', vendorCn: 'OpenRouter',
      country: 'GLOBAL', caps: ['api', 'chat', 'coding', 'image'], freeType: 'apifree',
      summary: '聚合多家厂商，带 :free 后缀的模型零成本调用，一个 Key 通吃全平台。',
      quota: '每日 50 次 · 绑定后提升至 1000 次',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 78, stability: 84, url: 'https://openrouter.ai',
      apiUrl: 'https://openrouter.ai/models?fmt=free', ago: 6, up: 331, down: 18,
      tags: ['聚合', '一个 Key', '首选']
    },
    {
      id: 'github-models', name: 'GitHub Models', vendor: 'GitHub', vendorCn: 'GitHub',
      country: 'US', caps: ['api', 'chat', 'coding'], freeType: 'apifree',
      summary: 'GitHub 账号登录即可免费调用主流模型， playground 支持直接对比。',
      quota: '免费 · 按 RPM / 每日请求限制',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 88, stability: 92, url: 'https://github.com/marketplace/models',
      apiUrl: 'https://github.com/marketplace/models', ago: 19, up: 279, down: 7,
      tags: ['免信用卡', '多模型对比', '首选']
    },
    {
      id: 'cloudflare-ai', name: 'Cloudflare Workers AI', vendor: 'Cloudflare', vendorCn: 'Cloudflare',
      country: 'US', caps: ['api', 'embedding', 'image'], freeType: 'free',
      summary: '边缘推理，每日 10k Neuron 免费额度，绑定自有域名即可上线。',
      quota: '每日 10,000 Neuron',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 74, stability: 90, url: 'https://ai.cloudflare.com',
      apiUrl: 'https://dash.cloudflare.com', ago: 43, up: 121, down: 8,
      tags: ['边缘', 'Serverless']
    },
    {
      id: 'hf-inference', name: 'HF Serverless Inference', vendor: 'Hugging Face', vendorCn: 'Hugging Face',
      country: 'EU', caps: ['api', 'chat', 'image'], freeType: 'free',
      summary: '海量开源模型一键推理，免费额度足够个人项目与原型验证。',
      quota: '免费月度额度 · 社区模型',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 72, stability: 82, url: 'https://huggingface.co',
      apiUrl: 'https://huggingface.co/settings/tokens', ago: 27, up: 163, down: 14,
      tags: ['开源', '模型最全']
    },
    {
      id: 'flux-schnell', name: 'FLUX.1 [schnell]', vendor: 'Black Forest Labs', vendorCn: 'BFL',
      country: 'EU', caps: ['image', 'api'], freeType: 'free',
      summary: 'Apache 2.0 开源图像模型，可自部署，多家平台免费托管。',
      quota: '开源免费 · 自部署无限制',
      end: null, needSignup: false, needCard: false, needCode: false,
      capability: 84, stability: 83, url: 'https://blackforestlabs.ai',
      apiUrl: 'https://huggingface.co/black-forest-labs', ago: 37, up: 198, down: 6,
      tags: ['开源', '图像', '商用友好']
    },
    {
      id: 'sd35', name: 'Stable Diffusion 3.5', vendor: 'Stability AI', vendorCn: 'Stability AI',
      country: 'US', caps: ['image', 'api'], freeType: 'free',
      summary: '开源权重自部署完全免费，社区生态与 LoRA 资源最丰富。',
      quota: '开源免费 · 自部署无限制',
      end: null, needSignup: false, needCard: false, needCode: false,
      capability: 82, stability: 80, url: 'https://stability.ai',
      apiUrl: 'https://huggingface.co/stabilityai', ago: 88, up: 147, down: 12,
      tags: ['开源', 'LoRA 生态']
    },
    {
      id: 'whisper-v3', name: 'Whisper large-v3', vendor: 'OpenAI', vendorCn: 'OpenAI',
      country: 'US', caps: ['audio', 'api'], freeType: 'free',
      summary: '开源语音识别模型，本地自部署零成本，多语言准确率高。',
      quota: '开源免费 · 自部署无限制',
      end: null, needSignup: false, needCard: false, needCode: false,
      capability: 80, stability: 88, url: 'https://openai.com/research/whisper',
      apiUrl: 'https://huggingface.co/openai', ago: 74, up: 172, down: 9,
      tags: ['开源', '语音识别']
    },
    {
      id: 'elevenlabs-tts', name: 'ElevenLabs TTS', vendor: 'ElevenLabs', vendorCn: 'ElevenLabs',
      country: 'US', caps: ['audio', 'api'], freeType: 'quota',
      summary: '免费层每月提供字符额度，语音自然度高。',
      quota: '每月 10,000 字符免费',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 86, stability: 89, url: 'https://elevenlabs.io',
      apiUrl: 'https://elevenlabs.io/app', ago: 52, up: 134, down: 11,
      tags: ['语音合成']
    },
    {
      id: 'bge-m3', name: 'BGE-M3', vendor: 'BAAI', vendorCn: '智源研究院',
      country: 'CN', caps: ['api', 'embedding'], freeType: 'free',
      summary: '开源多语言向量模型，自部署免费，中文检索表现优秀。',
      quota: '开源免费 · 自部署无限制',
      end: null, needSignup: false, needCard: false, needCode: false,
      capability: 76, stability: 85, url: 'https://www.baai.ac.cn',
      apiUrl: 'https://huggingface.co/BAAI/bge-m3', ago: 103, up: 91, down: 4,
      tags: ['开源', '中文向量', 'RAG']
    },
    {
      id: 'perplexity-sonar', name: 'Perplexity Sonar', vendor: 'Perplexity', vendorCn: 'Perplexity',
      country: 'US', caps: ['chat', 'api'], freeType: 'quota',
      summary: 'AI 搜索，免费版每日有限次深度检索，适合资料调研。',
      quota: '每日有限次快速检索 · 深度检索次数极少',
      end: null, needSignup: true, needCard: false, needCode: false,
      capability: 80, stability: 86, url: 'https://www.perplexity.ai',
      apiUrl: 'https://www.perplexity.ai/settings/api', ago: 24, up: 141, down: 17,
      tags: ['AI 搜索']
    },
    {
      id: 'nvidia-nim', name: 'NVIDIA NIM 端点', vendor: 'NVIDIA', vendorCn: 'NVIDIA',
      country: 'US', caps: ['api', 'coding', 'embedding'], freeType: 'limited',
      summary: 'build.nvidia.com 托管大量开源模型的免费推理端点，额度随活动周期调整，需留意续期公告。',
      quota: '免费额度 · 按 RPM 限制，活动期不定期调整',
      end: '2026-10-31', needSignup: true, needCard: false, needCode: false,
      capability: 82, stability: 83, url: 'https://build.nvidia.com',
      apiUrl: 'https://build.nvidia.com', ago: 35, up: 118, down: 14,
      tags: ['开源托管', '限时额度', 'OpenAI 兼容']
    },
    {
      id: 'glm-coding-trial', name: 'GLM Coding Plan 试用', vendor: 'Zhipu', vendorCn: '智谱 AI',
      country: 'CN', caps: ['coding', 'agent', 'api'], freeType: 'code',
      summary: '通过兑换码领取 GLM Coding Plan 试用额度。配套 ZCode 客户端，周末活动可领 3 亿 GLM-5.3-Flash tokens。',
      quota: '兑换码领试用额度 · ZCode 周末送 3 亿 tokens',
      end: '2026-09-30', needSignup: true, needCard: false, needCode: true,
      capability: 89, stability: 84, url: 'https://bigmodel.cn/claude-code',
      apiUrl: 'https://bigmodel.cn/claude-code', ago: 21, up: 96, down: 34,
      tags: ['兑换码', 'Coding Plan', 'IDE 接入']
    }
  ],

  /* ------------------------------------------------------------- 限时活动 */
  deals: [
    {
      id: 'd9', title: '智谱新用户累计可领 3000 万 tokens',
      vendor: 'Zhipu', country: 'CN', hot: true,
      free: '注册送 2000 万 tokens（永久有效），完成新手任务再领 1000 万',
      how: '注册后进「财务 - 资源包管理」查看，需实名认证，无需绑卡',
      end: null, source: '官方活动', url: 'https://bigmodel.cn',
      ago: 28, up: 386, down: 14, cap: 'chat,api,coding,agent'
    },
    {
      id: 'd10', title: 'ZCode 周末送 3 亿 GLM-5.3-Flash tokens',
      vendor: 'Zhipu', country: 'CN', hot: true,
      free: '3 亿 tokens，用于 GLM-5.3-Flash（原生多模态，1M 上下文）',
      how: '客户端升到 3.10+，周五 15:00 起左下角领取，切 Trial Plan 使用；周五 20:00 至周一 09:00 有效',
      end: null, source: '官方活动', url: 'https://bigmodel.cn/claude-code',
      ago: 12, up: 412, down: 9, cap: 'coding,agent'
    },
    {
      id: 'd11', title: '硅基流动新用户 2000 万 tokens，活动再领 1000 万',
      vendor: 'SiliconFlow', country: 'CN', hot: true,
      free: '新用户 2000 万 tokens 永久有效，活动期完成新手任务可再领 1000 万',
      how: '注册并完成实名认证，控制台 API Keys 即时生效，兼容 OpenAI 格式',
      end: null, source: '官方活动', url: 'https://cloud.siliconflow.cn',
      ago: 42, up: 241, down: 11, cap: 'api,chat,coding'
    },
    {
      id: 'd1', title: 'GitHub Models 全量开放免费调用',
      vendor: 'GitHub', country: 'US', hot: true,
      free: '主流商业模型 + 开源模型，playground 直接对比',
      how: '登录 GitHub 账号即可，无需信用卡',
      end: '2026-09-30', source: '官方公告', url: 'https://github.com/marketplace/models',
      ago: 19, up: 279, down: 7, cap: 'chat,api,coding'
    },
    {
      id: 'd2', title: 'MiMo 新用户 1000 万 Token 赠送计划',
      vendor: 'Xiaomi', country: 'CN', hot: true,
      free: '1000 万 tokens，覆盖 MiMo-VL 全系列',
      how: '注册账号后自动发放，另有兑换码叠加',
      end: '2026-09-15', source: '官方活动', url: 'https://mimo.xiaomi.com',
      ago: 5, up: 158, down: 31, cap: 'chat,api,coding'
    },
    {
      id: 'd3', title: 'Gemini API free tier 额度上调',
      vendor: 'Google', country: 'US', hot: true,
      free: '2.5 Flash / Pro 免费额度上调，RPM 放宽',
      how: 'AI Studio 获取 Key 即可，无需信用卡',
      end: null, source: '官方更新', url: 'https://ai.google.dev',
      ago: 4, up: 476, down: 13, cap: 'chat,api,coding,image'
    },
    {
      id: 'd4', title: 'GLM Coding Plan 首月体验额度',
      vendor: 'Zhipu', country: 'CN', hot: false,
      free: 'Coding Plan 订阅用户首月额外额度，可接 Claude Code / Cline',
      how: 'BigModel 控制台订阅后领取',
      end: '2026-09-05', source: '官方活动', url: 'https://bigmodel.cn/claude-code',
      ago: 21, up: 231, down: 27, cap: 'coding,agent'
    },
    {
      id: 'd5', title: 'OpenRouter :free 每日额度提升至 1000 次',
      vendor: 'OpenRouter', country: 'GLOBAL', hot: true,
      free: '绑定 GitHub 后 :free 模型每日调用从 50 次提至 1000 次',
      how: '设置页绑定 GitHub 账号',
      end: null, source: '官方更新', url: 'https://openrouter.ai/models?fmt=free',
      ago: 6, up: 331, down: 18, cap: 'api,coding'
    },
    {
      id: 'd6', title: 'Cloudflare Workers AI 每日 10k Neuron',
      vendor: 'Cloudflare', country: 'US', hot: false,
      free: '每日 10,000 Neuron 免费额度，含 LLM / 向量 / 图像',
      how: '注册 Cloudflare 账号创建 Worker 即可',
      end: null, source: '长期政策', url: 'https://ai.cloudflare.com',
      ago: 43, up: 121, down: 8, cap: 'api,embedding,image'
    },
    {
      id: 'd7', title: '智谱 GLM-4.5-Flash API 长期免费',
      vendor: 'Zhipu', country: 'CN', hot: true,
      free: 'Flash 系列 API 不计费，并发 2 / RPM 30',
      how: 'BigModel 注册获取 API Key',
      end: null, source: '长期政策', url: 'https://bigmodel.cn/dev/howuse/model',
      ago: 14, up: 188, down: 6, cap: 'api,coding'
    },
    {
      id: 'd8', title: '月之暗面开发者平台注册赠额度',
      vendor: 'Moonshot', country: 'CN', hot: false,
      free: '¥15 试用额度，Kimi-K2 可直接调用',
      how: '开发者平台注册自动发放',
      end: null, source: '长期政策', url: 'https://platform.moonshot.cn',
      ago: 28, up: 203, down: 16, cap: 'chat,api,coding,agent'
    }
  ],

  /* --------------------------------------------------------------- 兑换码 */
  codes: [
    {
      id: 'c1', title: 'MiMo Token Plan 礼包', vendor: 'Xiaomi', country: 'CN',
      code: 'MIMO-FREE-10M', reward: '1000 万 tokens',
      end: '2026-09-15', url: 'https://mimo.xiaomi.com',
      ago: 5, up: 137, down: 24, note: '每个账号限兑一次，与注册赠送可叠加'
    },
    {
      id: 'c2', title: '智谱 BigModel 体验码', vendor: 'Zhipu', country: 'CN',
      code: 'GLM-DEV-2026', reward: '500 万 tokens',
      end: '2026-09-30', url: 'https://bigmodel.cn',
      ago: 21, up: 92, down: 31, note: '新用户专享，需在控制台兑换页输入'
    },
    {
      id: 'c3', title: 'OpenRouter 新用户赠金', vendor: 'OpenRouter', country: 'GLOBAL',
      code: 'OR-FREE-CREDIT', reward: '$1 调用额度',
      end: null, url: 'https://openrouter.ai',
      ago: 6, up: 208, down: 12, note: '需在 Billing 页面手动激活'
    },
    {
      id: 'c4', title: '火山方舟新手礼包', vendor: 'ByteDance', country: 'CN',
      code: 'ARK-NEW-50W', reward: '50 万 tokens',
      end: '2026-10-31', url: 'https://console.volcengine.com/ark',
      ago: 12, up: 76, down: 9, note: '实名认证后可用'
    },
    {
      id: 'c5', title: 'Groq 开发者加速码', vendor: 'Groq', country: 'US',
      code: 'GROQ-BOOST-1M', reward: '100 万 tokens 提速额度',
      end: '2026-09-20', url: 'https://console.groq.com',
      ago: 16, up: 54, down: 41, note: '⚠️ 近期多人反馈失效，兑换前请先验证'
    },
    {
      id: 'c6', title: 'StepFun 体验邀请码', vendor: 'StepFun', country: 'CN',
      code: 'STEP-INVITE-88', reward: '体验额度 888 元',
      end: '2026-12-31', url: 'https://platform.stepfun.com',
      ago: 188, up: 33, down: 18, note: '邀请码形式，长期有效'
    },
    {
      id: 'c7', title: 'Mistral 教育优惠码', vendor: 'Mistral AI', country: 'EU',
      code: 'EDU-MISTRAL-25', reward: 'La Plateforme 额度',
      end: null, url: 'https://console.mistral.ai',
      ago: 31, up: 47, down: 6, note: '需教育邮箱验证'
    },
    {
      id: 'c8', title: '腾讯云混元体验码', vendor: 'Tencent', country: 'CN',
      code: 'HUNYUAN-TRY-1M', reward: '100 万 tokens',
      end: '2026-11-30', url: 'https://cloud.tencent.com/product/hunyuan',
      ago: 39, up: 88, down: 7, note: '新用户专享，限主账号'
    }
  ],

  /* ------------------------------------------------------------ 快捷入口 */
  tools: [
    { group: 'Chat', items: [
      { name: 'DeepSeek', url: 'https://chat.deepseek.com', country: 'CN' },
      { name: '通义千问', url: 'https://tongyi.aliyun.com', country: 'CN' },
      { name: '智谱清言', url: 'https://chat.z.ai', country: 'CN' },
      { name: 'Kimi', url: 'https://www.kimi.com', country: 'CN' },
      { name: '豆包', url: 'https://www.doubao.com', country: 'CN' },
      { name: '元宝', url: 'https://yuanbao.tencent.com', country: 'CN' },
      { name: 'Claude', url: 'https://claude.ai', country: 'US' },
      { name: 'Gemini', url: 'https://gemini.google.com', country: 'US' },
      { name: 'ChatGPT', url: 'https://chatgpt.com', country: 'US' },
      { name: 'Grok', url: 'https://grok.com', country: 'US' },
      { name: 'Mistral', url: 'https://chat.mistral.ai', country: 'EU' },
      { name: 'Perplexity', url: 'https://www.perplexity.ai', country: 'US' }
    ]},
    { group: 'API / Console', items: [
      { name: 'DeepSeek Platform', url: 'https://platform.deepseek.com', country: 'CN' },
      { name: '阿里云百炼', url: 'https://bailian.console.aliyun.com', country: 'CN' },
      { name: 'BigModel 智谱', url: 'https://bigmodel.cn', country: 'CN' },
      { name: 'Moonshot 平台', url: 'https://platform.moonshot.cn', country: 'CN' },
      { name: '火山方舟', url: 'https://console.volcengine.com/ark', country: 'CN' },
      { name: 'GitHub Models', url: 'https://github.com/marketplace/models', country: 'US' },
      { name: 'Google AI Studio', url: 'https://aistudio.google.com', country: 'US' },
      { name: 'OpenRouter', url: 'https://openrouter.ai', country: 'GLOBAL' },
      { name: 'Groq Console', url: 'https://console.groq.com', country: 'US' },
      { name: 'Hugging Face', url: 'https://huggingface.co', country: 'EU' },
      { name: 'Cloudflare AI', url: 'https://dash.cloudflare.com', country: 'US' },
      { name: 'Mistral Console', url: 'https://console.mistral.ai', country: 'EU' }
    ]},
    { group: 'Coding', items: [
      { name: 'Claude Code', url: 'https://claude.ai/code', country: 'US' },
      { name: 'Codex CLI', url: 'https://github.com/openai/codex', country: 'US' },
      { name: 'Qwen Code', url: 'https://github.com/QwenLM/qwen-code', country: 'CN' },
      { name: 'GLM Coding Plan', url: 'https://bigmodel.cn/claude-code', country: 'CN' },
      { name: 'Cursor', url: 'https://cursor.com', country: 'US' },
      { name: 'Cline', url: 'https://github.com/cline/cline', country: 'US' },
      { name: 'OpenCode', url: 'https://opencode.ai', country: 'GLOBAL' },
      { name: 'Continue', url: 'https://continue.dev', country: 'US' }
    ]}
  ],

  /* ------------------------------------------------------------- 雷达动态
     字段：type(new/change/hot/expire) · ago(分钟) · text · vendor · country
           url(原文/官方入口，可空) · modelId(可选，点击优先打开站内模型详情) */
  radar: [
    { type: 'hot',    ago: 12,  text: 'ZCode 周末活动放出 3 亿 GLM-5.3-Flash tokens，新老用户零门槛可领', vendor: 'Zhipu', country: 'CN',
      url: 'https://bigmodel.cn/claude-code', modelId: 'glm-45-flash' },
    { type: 'change', ago: 28,  text: '智谱新用户额度提升至累计 3000 万 tokens（2000 万注册 + 1000 万新手任务）', vendor: 'Zhipu', country: 'CN',
      url: 'https://bigmodel.cn', modelId: 'glm-46' },
    { type: 'new',    ago: 55,  text: 'GLM-5.3-Flash 开放：原生多模态 + 1M 上下文，Flash 系列永久免费无上限', vendor: 'Zhipu', country: 'CN',
      url: 'https://bigmodel.cn/dev/howuse/model', modelId: 'glm-45-flash' },
    { type: 'new',    ago: 12,  text: 'GitHub Models 新增 3 个免费可用模型，Playground 支持并行对比', vendor: 'GitHub', country: 'US',
      url: 'https://github.com/marketplace/models', modelId: 'github-models' },
    { type: 'change', ago: 48,  text: 'Gemini API free tier 的 Flash 额度由 250 RPD 调整为 500 RPD', vendor: 'Google', country: 'US',
      url: 'https://ai.google.dev', modelId: 'gemini-25-flash' },
    { type: 'hot',    ago: 96,  text: 'MiMo 兑换码活动延长至 9 月 15 日，新增叠加注册赠送', vendor: 'Xiaomi', country: 'CN',
      url: 'https://mimo.xiaomi.com', modelId: 'mimo-vl' },
    { type: 'new',    ago: 132, text: 'OpenRouter :free 池新增 6 个模型，含 2 个 200K 上下文', vendor: 'OpenRouter', country: 'GLOBAL',
      url: 'https://openrouter.ai/models?fmt=free', modelId: 'openrouter-free' },
    { type: 'expire', ago: 168, text: 'Cohere Trial Key 速率下调，免费额度未变但并发受限', vendor: 'Cohere', country: 'US',
      url: 'https://dashboard.cohere.com', modelId: 'command-a' },
    { type: 'change', ago: 205, text: 'Groq 免费 tier 的 Llama 4 Scout TPM 下调约 30%', vendor: 'Groq', country: 'US',
      url: 'https://console.groq.com', modelId: 'groq-inference' },
    { type: 'hot',    ago: 260, text: 'GLM-4.5-Flash 明确长期免费，官方定价页标注 ¥0', vendor: 'Zhipu', country: 'CN',
      url: 'https://bigmodel.cn/dev/howuse/model', modelId: 'glm-45-flash' },
    { type: 'new',    ago: 340, text: 'Hugging Face 免费 Inference 额度月度重置规则调整', vendor: 'Hugging Face', country: 'EU',
      url: 'https://huggingface.co/settings/tokens', modelId: 'hf-inference' },
    { type: 'expire', ago: 430, text: '多家平台限时免费活动集中到期，已归档至失效列表', vendor: 'Multi', country: 'GLOBAL',
      url: '', modelId: null },
    { type: 'change', ago: 520, text: 'Cloudflare Workers AI 每日免费 Neuron 维持在 10,000', vendor: 'Cloudflare', country: 'US',
      url: 'https://ai.cloudflare.com', modelId: 'cloudflare-ai' }
  ]
};
