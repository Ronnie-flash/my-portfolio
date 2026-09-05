# FreeModel Radar — 项目结构说明

> 本文档用于让 AI（GPT 等）快速理解本项目结构与实现，以便提出优化建议。
> 全部内容基于对源码的完整阅读整理，客观描述现状，不含结论性优化建议。

---

## 1. 项目概述

| 项 | 内容 |
|---|---|
| 项目名 | FreeModel Radar |
| 版本 | v1.1.0 |
| 定位 | 国内外 AI 免费模型 / 免费 API / 限时活动 / Token 赠送 / 兑换码聚合雷达站 |
| 技术栈 | 原生 HTML + CSS + JavaScript（**零依赖、零框架、零构建、无后端**） |
| 运行方式 | 直接双击 `index.html`（file:// 可用）或任意静态服务器托管 |
| 数据模式 | 纯静态种子数据 + 浏览器 localStorage 覆盖层 + Agent 导入（`window.FMR` API）+ 可选远端 URL 拉取 |
| 主题 | 深色 / 浅色双主题（CSS 变量切换，跟随系统偏好） |
| 语言 | 中文界面 |

## 2. 目录结构（总计约 4165 行）

```
freemodel-radar/
├── index.html                    # 170 行  —— 页面骨架（入口）
└── assets/
    ├── css/
    │   └── style.css             # 1481 行 —— 视觉层（tokens/双主题/全部组件样式）
    └── js/
        ├── data.js               # 664 行  —— 种子数据层（window.FMR_SOURCE）
        ├── headlines.js          # 180 行  —— 首页热闻轮播数据（window.FMR_HEADLINES）
        └── app.js                # 1670 行 —— 应用层（IIFE，全部逻辑）
```

脚本加载顺序（index.html 末尾，均带 `defer`）：`headlines.js` → `data.js` → `app.js`。

## 3. index.html — 页面骨架

- **head**：SEO meta、Open Graph（og:image 为内联 SVG data URI）、内联 SVG favicon、`data-theme="dark"` 初始主题。
- **header（.site-header）**：品牌区、移动端汉堡按钮（`#navToggle`）、导航容器 `#nav`（**由 app.js 依据 NAV 常量渲染**）、header-actions：
  - 地区筛选 `#region`：全部 / 国内 / 海外 三个按钮；
  - 数据接口按钮（`data-action="ingest"`）；
  - 主题切换 `#themeToggle`（快捷键 T）。
- **main**：
  - `<noscript>` 提示块；
  - 首屏骨架屏 `#bootSkeleton`（首次渲染后由 app.js 移除）；
  - **7 个视图容器**：`#view-home` / `#view-models` / `#view-deals` / `#view-codes` / `#view-coding` / `#view-launcher` / `#view-radar`（内容全部由 app.js 渲染）。
- **footer**：品牌区、浏览链接 `#footNav`（JS 渲染）、Free Score 六维构成说明、数据免责声明、版本号 `#footVersion`。
- **运行时组件**：toast 容器 `#toastHost`、读屏器路由播报 `#routeAnnouncer`、回到顶部 `#toTop`、通用弹窗 `#modalHost > #modal`（title/sub/body + 关闭按钮）。

## 4. app.js — 应用层（核心，单文件 IIFE）

文件头注释自述模块划分 8 块，实际还包括公共 API 与启动流程：

### 4.1 模块清单

| # | 模块 | 关键内容 |
|---|---|---|
| 0 | 站点配置 | `APP`（名称/版本/标语）、`NAV`（7 项导航，header+footer 单一数据源）、`VIEW_META`（每视图独立 title/desc） |
| 1 | 工具函数 | `$` / `$$` 查询、`esc()`（HTML 转义）、`relTime()`（相对时间）、`countdown()`（倒计时文本+等级）、`fmtDate()` |
| 2 | 数据归一化 | `mergeInto()`（覆盖层合并）、`loadData()` / `loadHeadlines()`、`normalize()`（补算派生字段） |
| 3 | Free Score 算法 | 六维打分 `freeScore()`、`durationScore()`、`daysLeft()`、`scoreBadge()` |
| 4 | 验证状态 | `verifyLevel()`（5 级新鲜度）、`verifyBadge()`、`trustBar()`（可信度条） |
| 5 | 全局状态 | `STATE`（view/region/q/cap/freeType/sort/layout/ide/focusSearch）+ localStorage 持久化键 |
| 6 | 视图渲染 | 7 个 `renderXxx()` + 组件函数（modelCard / dealCard / codeCard / radarItem / buzz 系列） |
| 7 | 路由 | hash 路由（`#/xxx`）、`RENDERERS` 映射、`render()` 统一入口、`syncMeta()`（title/desc/OG 跟随视图） |
| 8 | 交互绑定 | 事件委托、toast、复制、详情弹窗、数据导入/导出、键盘快捷键 |
| — | 公共 API | `window.FMR`（Agent 自动化入口） |
| — | 启动 | `boot()`：主题 → ?data 参数 → 投票 → 数据 → 绑定 → 渲染 → 骨架退场 → 定时刷新 |

### 4.2 数据流（核心链路）

```
种子数据 data.js (window.FMR_SOURCE)
        │
        ▼
loadData() ── 合并 localStorage 覆盖层 LS_DATA（mergeInto，按 id upsert，增量不抹除）
        │
        ▼
normalize() ── 补算：verifiedAt（ago→时间戳）、trust（up/down 投票比）、
│              score（Free Score 六维）、parts、verify（新鲜度级）、
│              apiFree、cd（倒计时）、risky（码可信度<70%）
        │
        ▼
DB（内存全局对象：models/deals/codes/tools/radar/headlines/meta）
        │
        ▼
render() ── 读 STATE 筛选排序 → 拼 HTML 字符串 → host.innerHTML（全量重建当前视图）
```

**持久化键（localStorage）**：

| 键 | 内容 | 语义 |
|---|---|---|
| `fmr-votes-v1` | 我的投票 `{id: 'up'/'down'}` | 只存本机表态，社区基数来自数据文件 |
| `fmr-data-v1` | Agent 导入的覆盖层 | 加载时 merge 到种子之上 |
| `fmr-headlines-v1` | 热闻覆盖层 | 独立键，Agent 每天只覆盖热闻 |
| `fmr-theme` | 主题选择 | 本机选择 > 系统偏好 > 深色兜底 |

**投票机制**：`effVotes(o)` = 数据文件基数 + 本机我的那一票（渲染时相加，刷新不重复累加，再点取消）。

### 4.3 Free Score 算法（六维，满分 100）

| 维度 | 权重 | 计算 |
|---|---|---|
| 免费额度 | 30 | `TYPE_SCORE[freeType]`：free=30, apifree=27, quota=21, limited=17, newuser=14, code=10 |
| 持续时间 | 20 | 长期=20；已过期=0；≤7天=3；≤30天=7；≤90天=11；其余=15 |
| 模型能力 | 20 | `clamp(round((capability-60)×0.5), 0, 20)`（基线偏移，避免 70-95 区间无区分度） |
| 无需信用卡 | 15 | needCard ? 0 : 15 |
| 无需兑换码 | 5 | needCode ? 0 : 5 |
| 访问稳定性 | 10 | `round(stability × 0.1)` |

`freeType` 枚举：`free / quota / limited / newuser / code / apifree`（各配颜色点、label、CSS 类）。

### 4.4 七个视图

| 视图 | renderer | 说明 |
|---|---|---|
| home | `renderHome` | hero（标语+统计条+搜索）+ 热闻轮播（buzz）+ 今日值得关注（hotDeals 前4）+ 当前免费模型 Top9 + 最新权益变动 5 条 |
| models | `renderModels` | 搜索 / 能力 chip / 免费类型 chip / 排序下拉 / 卡片↔表格布局切换 / 空结果降级引导（`emptyState`） |
| deals | `renderDeals` | 全部活动卡片，hot 优先 + 即将到期优先排序 |
| codes | `renderCodes` | 兑换码卡片，risky（可信度<70%）沉底，复制按钮 |
| coding | `renderCoding` | IDE 维度筛选（`IDE_MAP` 硬编码 8 个工具 → 模型 id 白名单），地区清空时自动放宽 |
| launcher | `renderLauncher` | 分组快捷入口（Chat / API Console / Coding），悬停显示按钮 |
| radar | `renderRadar` | 权益变动时间线（type: new/change/hot/expire），刷新按钮 |

**热闻轮播（buzz）**：`BUZZ` 状态机（当前页/定时器/7s 翻页/播放状态），10 页 × 10 条；`prefers-reduced-motion` 时默认不自动翻页；离开首页停止定时器；进度条动画通过强制回流重启。

### 4.5 交互实现特征

- **事件委托**：所有 `data-action` 点击统一委托到 `document`；搜索 input 防抖（`window.__t` / `__t2`，首页输入 280ms 后跳转模型库）。
- **键盘**：`/` 聚焦搜索、`T` 切换主题、`Esc` 关弹窗、Tab 焦点锁在弹窗内（`trapFocus`）、弹窗关闭回焦触发元素。
- **弹窗**：`openModal(title, sub, html)` 统一入口，含焦点管理。
- **toast**：最多 3 条并存，自动淡出。
- **复制**：Clipboard API + 降级 `execCommand`。
- **无障碍**：skip-link、aria-pressed、读屏器路由播报、reduced-motion 全局降级。
- **XSS 防护**：所有动态文本经 `esc()`；内联 `style="width:XX%"` 用于进度条。

### 4.6 公共 API（window.FMR，Agent 自动化入口）

| 方法 | 说明 |
|---|---|
| `FMR.ingest(payload, opts)` | 按 id 合并导入（新增/更新/跳过计数），persist 可选落盘；导入后重算 normalize 并重渲染 |
| `FMR.validate(payload)` | 只校验不落盘，返回 `{ok, errors, warnings}`（必填字段、freeType/caps 枚举、end 格式等） |
| `FMR.export()` | 全量导出 JSON（含热闻与投票） |
| `FMR.toPatch(sections)` | 生成可粘回 data.js 的 `window.FMR_SOURCE = {...}` 片段 |
| `FMR.refresh()` / `FMR.find(q)` / `FMR.state()` / `FMR.votes()` / `FMR.reset()` | 重绘 / 站内搜索 / 状态快照 / 投票快照 / 清空本机数据并重载 |

另有 URL 参数 `?data=<url>`：启动时自动从远端拉取 JSON 导入。

### 4.7 启动流程（boot）

主题初始化 → 解析 `?data=` → 载入投票 → `loadData()` 异步 → `normalize` → `bind()` 绑定事件 → 注册 hashchange → 首渲染 → 骨架屏移除 → 填写版本号 → **setInterval 每分钟全量重渲染**（保持滚动位置，用于倒计时/验证状态刷新）→ 若有 DATA_URL 则自动拉取。

## 5. data.js — 种子数据层（window.FMR_SOURCE）

**Model 字段契约**：`id, name, vendor, vendorCn, country(CN/US/EU/GLOBAL), caps[], freeType, summary, quota, end(null=长期|"YYYY-MM-DD"), needSignup, needCard, needCode, capability(0-100), stability(0-100), url, apiUrl, ago(距当前分钟数)|verifiedAt(ISO), up, down, tags[]`

> 时间字段用 `ago`（相对分钟）而非绝对时间，保证 demo 任何时刻打开都"新鲜"；接真实后端改 `verifiedAt` 即可，normalize 优先使用它。

**数据量**：models 44 条（国内 18 / 海外 26）、deals 8 条、codes 8 条、tools 3 组 32 个入口、radar 10 条。

**radar 字段**：`type(new/change/hot/expire), ago, text, vendor, country, url(可空), modelId(可选，点击跳站内模型详情)`。

## 6. headlines.js — 热闻轮播数据（window.FMR_HEADLINES）

- 8 组：前 3 组排行榜（`mode:'rank'`：LLM 使用率 / LLM 能力 / Agent 工具），后 5 组热闻（今日最热 / 模型发布 / 开源生态 / 免费额度&降价 / Coding 工具），每组 10 条。
- 条目字段（rank）：`t, s, v, d(环比↑↓), note, url`；条目字段（热闻）：`t, s, h(热度0-100), ago, tag, url`。
- 设计意图：独立成文件，Agent 每天只需重写此文件即可更新轮播，不动主数据。

## 7. style.css — 视觉层

- **设计原则**：高信息密度、克制配色、细边框、无渐变发光（参考 Linear/Vercel/GitHub）。
- **Tokens**：`:root` 定义字体/圆角/间距/header 高/最大宽；`[data-theme='dark']` 与 `[data-theme='light']` 两套 CSS 变量（bg/card/border/text/6 种语义色及其 13% 透明度背景）。
- **组件覆盖**：header/nav、hero、stats、searchbar、卡片/网格、badge/能力标签、Free Score 展示、验证状态点、可信度条、按钮族、筛选 chips、表格、deal 卡片、countdown、code 卡片、radar 时间线、launcher、IDE chips、empty、toast、totop、modal(+kv/score 拆解条)、buzz 轮播全套、ingest 面板、骨架屏、skip-link、工具类（margin/padding/flex/字号/颜色）。
- **响应式**：640px / 720px / 760px / 900px 断点；移动端导航折叠、deal 单列、launcher 按钮常显。
- **动效**：统一 `--ease` 缓动；`prefers-reduced-motion` 全局关动画。

## 8. 架构特征（供优化分析的关键事实）

1. **纯前端、零依赖**：无框架、无构建、无包管理、无服务端；渲染靠字符串拼接 + innerHTML。
2. **单一巨型 IIFE**：app.js 1670 行全部在一个闭包内，函数互相可见，无模块化拆分。
3. **渲染粒度**：`render()` 每次全量重建当前视图的整棵 innerHTML（无虚拟 DOM / 无局部更新）。
4. **定时刷新**：`setInterval` 每分钟全量重渲染当前视图（用于倒计时与验证状态的新鲜度）。
5. **数据时效**：时间以"距今分钟数"（ago）表示，每次 normalize 时换算成时间戳。
6. **两套数据合并路径并存**：
   - `mergeInto()`：启动时把 localStorage 覆盖层（LS_DATA）合并到种子之上；
   - `FMR.ingest()`：运行时直接把 payload 合并进内存 DB，再持久化为**全量快照**（LS_DATA 存的是合并后的完整数组，而非增量 patch）。
7. **路由**：hash 路由，`#/view` → RENDERERS；每个视图独立 document.title / meta description（SPA 下尽量利于分享）。
8. **交互全部事件委托** 到 document（click/input/change/keydown）。
9. **Agent 优先设计**：暴露 `window.FMR` 完整 API + `?data=` URL + "生成 data.js 补丁"导出，明确"Agent 能做自动化，登录/验证码才留给人"。
10. **可访问性投入较多**：skip-link、aria-pressed、路由播报、焦点陷阱/回焦、reduced-motion、noscript 提示。
11. **内联样式数据点**：进度条宽度、颜色等少量内联 style；HTML 中 og:image 与 favicon 为内联 SVG data URI。
12. **数据契约集中在文件头注释**：data.js 头部有 Model 字段契约；app.js validate() 内维护必填字段/枚举清单（与 data.js 注释存在重复维护）。

## 9. 附录：阅读时观察到的可疑点（客观列举，供 GPT 参考验证）

> 以下均为阅读过程中记录的客观现象，未经运行验证，是否构成问题请 AI 分析时自行判断。

1. **data.js llama-4-scout 的 quota 文案**："OpenRouter/Groce :free 免登录调用" —— "Groce" 疑为 "Groq" 笔误（数据质量问题）。
2. **headlines.js "今日最热" 组第 4 条**："…并发放开至 2" —— 文案疑似截断不完整（如"并发放宽至 2"）。
3. **两份合并逻辑语义不同**：启动合并（mergeInto，增量 overlay）与 ingest 落盘（全量快照）可能造成 LS_DATA 里存的既不是纯增量也不是可回退的历史。
4. **`window.__t` / `window.__t2`** 作为防抖计时器挂在全局上，而非闭包内变量。
5. **normalize() 中 radar 排序**：`sort((a,b) => a.ago - b.ago)` 按 ago 升序（旧的在前），而"最新权益变动"通常期望新的在前，需确认是否符合预期。
6. **FMR.ingest 的 append 选项**：`opts.append === false` 时跳过新增，但 validate 已先通过，两处逻辑对"已存在条目按增量处理"的边界（空字符串 vs 缺失字段）口径需确认一致。
7. **VOTES 键与数据 id 的耦合**：投票按 `o.id` 关联，若同一 id 在不同集合（models/deals/codes）出现会互相影响（findObj 按顺序取第一个命中）。
8. **定时重渲染与轮播计时器**：每分钟 render 会调用 buzzMount，与 buzz 自身 7s 计时器并存，需要确认翻页进度条不会周期性被打断。
9. **`?data=` 远端数据与 localStorage 覆盖层同时存在时**的优先级与合并顺序（loadData 先合并 overlay，boot 再 fetchRemote ingest）。
10. **依赖 defer 加载顺序**：三个脚本靠 defer 保证顺序，无显式依赖检查（若 FMR_SOURCE 加载失败，app.js 使用空数组兜底）。
