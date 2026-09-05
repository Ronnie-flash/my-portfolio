/* ==========================================================================
   FreeModel Radar — 应用层
   --------------------------------------------------------------------------
   模块划分：
     1. 工具函数      2. 数据归一化    3. Free Score 算法
     4. 验证状态      5. 全局状态      6. 视图渲染（7 个）
     7. 路由          8. 交互绑定

   接入真实后端：只需替换 loadData() 内的实现（改为 fetch JSON），
   其余逻辑无需改动。
   ========================================================================== */
(function () {
  'use strict';

  /* ========================================================== 0. 站点配置 */
  const APP = {
    name: 'FreeModel Radar',
    version: '1.2.0',
    tagline: '在免费消失之前，找到它',
    sloganEn: 'Free AI, before it expires.'
  };

  /* 数据更新频率 —— 页脚展示，同时作为过期提醒的判定依据 */
  const UPDATE_CADENCE = '每日自动更新';

  /* 导航单一数据源 —— header 与 footer 共用，新增页面只改这里一处 */
  const NAV = [
    { id: 'home',     label: '首页',        foot: '首页 · 今日值得薅' },
    { id: 'models',   label: '模型库',      foot: '模型数据库' },
    { id: 'deals',    label: '🔥 今日免费', foot: '今日免费权益' },
    { id: 'codes',    label: '🎟️ 兑换码',   foot: '兑换码库' },
    { id: 'coding',   label: '💻 Coding',   foot: 'Coding 免费模型' },
    { id: 'launcher', label: '🚀 快捷入口', foot: 'AI 快捷启动器' },
    { id: 'radar',    label: '📡 动态',     foot: '权益变动雷达' }
  ];

  /* 每个视图独立的 title / description —— hash 路由做不到服务端出不同页面，
     至少让 document.title 与 meta 跟着走，分享和书签才不会全是首页标题。 */
  const VIEW_META = {
    home: {
      title: APP.name + ' — ' + APP.tagline,
      desc: '国内外 AI 免费模型、免费 API、限时免费活动、Token 赠送与兑换码聚合雷达。实时发现现在什么 AI 可以免费用。'
    },
    models: {
      title: '模型库 · ' + APP.name,
      desc: '按国内/海外、Chat/API/Coding、免费类型筛选当前可免费使用的 AI 模型，并按 Free Score 排序。'
    },
    deals: {
      title: '今日免费 · ' + APP.name,
      desc: '今日值得关注的 AI 免费权益：限时活动、新用户福利、API 免费层、Token 赠送，附倒计时与领取方式。'
    },
    codes: {
      title: '兑换码库 · ' + APP.name,
      desc: '社区共同验证的 AI 平台兑换码，标注可信度、有效期与失效反馈。'
    },
    coding: {
      title: 'Coding 免费模型 · ' + APP.name,
      desc: '按 IDE 工具筛选可直接接入的免费编程模型：Claude Code、Codex CLI、Cline、Cursor、OpenCode 等。'
    },
    launcher: {
      title: '快捷入口 · ' + APP.name,
      desc: '一个页面打开所有 AI Chat、API 控制台与 Coding 工具，建议加入书签栏。'
    },
    radar: {
      title: '权益变动雷达 · ' + APP.name,
      desc: '只推送能帮你省钱的 AI 免费权益变动：新增免费、额度调整、活动到期。'
    }
  };

  function navLabel(id) {
    const n = NAV.filter(x => x.id === id)[0];
    return n ? n.label : id;
  }

  /* ========================================================== 1. 工具函数 */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.prototype.slice.call(r.querySelectorAll(s));
  const MIN = 60000, HOUR = 3600000, DAY = 86400000;

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const FLAG = { CN: '🇨🇳', US: '🇺🇸', EU: '🇪🇺', GLOBAL: '🌍' };

  const CAP_LABEL = {
    chat: 'Chat', api: 'API', coding: 'Coding', agent: 'Agent',
    image: 'Image', video: 'Video', audio: 'Audio', embedding: 'Embedding'
  };

  /** 相对时间 → 人类可读 */
  function relTime(ts) {
    const d = Date.now() - ts;
    if (d < 0) return '刚刚';
    if (d < MIN) return '刚刚';
    if (d < HOUR) return Math.floor(d / MIN) + ' 分钟前';
    if (d < DAY) return Math.floor(d / HOUR) + ' 小时前';
    if (d < 30 * DAY) return Math.floor(d / DAY) + ' 天前';
    return Math.floor(d / (30 * DAY)) + ' 个月前';
  }

  /** 剩余时间 → "03天 13小时" */
  function countdown(endStr) {
    if (!endStr) return null;
    const end = new Date(endStr + 'T23:59:59').getTime();
    const d = end - Date.now();
    if (isNaN(d)) return null;
    if (d <= 0) return { text: '已结束', cls: 'cd-long', days: -1 };
    const days = Math.floor(d / DAY);
    const hours = Math.floor((d % DAY) / HOUR);
    const cls = days <= 3 ? 'cd-urgent' : days <= 14 ? 'cd-soon' : days <= 60 ? 'cd-normal' : 'cd-long';
    return {
      text: days > 0 ? String(days).padStart(2, '0') + '天 ' + String(hours).padStart(2, '0') + '小时'
                     : String(hours).padStart(2, '0') + '小时 ' + String(Math.floor((d % HOUR) / MIN)).padStart(2, '0') + '分',
      cls: cls, days: days
    };
  }

  function fmtDate(s) {
    if (!s) return '长期';
    const p = String(s).split('-');
    return p.length === 3 ? p[0] + '/' + p[1] + '/' + p[2] : s;
  }

  /** URL 白名单：远端 / Agent 提供的链接一律过这里，
      挡掉 javascript: / data: / vbscript: 这类能执行脚本的协议。 */
  function safeUrl(u) {
    if (!u) return '';
    const s = String(u).trim();
    if (/^(javascript|data|vbscript|file|blob)\s*:/i.test(s)) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^\/{1,2}[^/]/.test(s) || /^\.{0,2}\//.test(s)) return s;   // 相对路径
    return '';
  }

  /* ====================================================== 2. 数据归一化 */
  /* 数据源替换点：把这里改成 fetch('/api/models') 即可接入后端 */
  /* ------------------------------------------------------ Patch Store
     数据分层：data.js（基准）→ patch（增量）→ normalize → DB
     localStorage 只存「改了什么」，不存整份快照。这样：
       ① data.js 永远是基准，Agent 更新不会污染原始数据
       ② 随时可以 reset 回官方基准
       ③ 能看出改了哪些字段（未来的变更日志 / 版本管理）
       ④ 接后端时把 patch 换成 API 拉取即可，其余逻辑不动            */
  const KINDS = ['models', 'deals', 'codes', 'radar'];

  function readPatch() { return lsGet(LS_PATCH) || {}; }

  function writePatch(kind, id, changes) {
    const p = readPatch();
    p[kind] = p[kind] || {};
    p[kind][id] = Object.assign({}, p[kind][id], changes);
    lsSet(LS_PATCH, p);
  }

  /** 基准数据 + 增量 patch = 当前数据 */
  function applyPatch(base, patch) {
    const out = { meta: Object.assign({}, base.meta) };
    KINDS.forEach(k => {
      const p = (patch && patch[k]) || {};
      const list = (base[k] || []).map(x => p[x.id] ? Object.assign({}, x, p[x.id]) : x);
      // patch 里有、基准里没有的条目 = Agent 新增
      Object.keys(p).forEach(id => {
        if (!list.some(x => x.id === id)) {
          list.push(Object.assign({}, p[id], { id: id }));
        }
      });
      out[k] = list;
    });
    out.tools = (base.tools || []);
    return out;
  }

  /** 一次性迁移：把旧版全量快照 diff 成 patch，然后删掉快照 */
  function migrateSnapshot() {
    const snap = lsGet(LS_DATA);
    if (!snap) return;
    if (!lsGet(LS_PATCH)) {
      const base = window.FMR_SOURCE || {};
      const patch = {};
      KINDS.forEach(k => {
        const byId = {};
        (base[k] || []).forEach(x => { byId[x.id] = x; });
        (snap[k] || []).forEach(x => {
          if (!x || !x.id) return;
          const b = byId[x.id];
          let diff = null;
          if (!b) {
            diff = Object.assign({}, x);
          } else {
            Object.keys(x).forEach(f => {
              if (JSON.stringify(x[f]) !== JSON.stringify(b[f])) {
                diff = diff || {};
                diff[f] = x[f];
              }
            });
          }
          if (diff) { patch[k] = patch[k] || {}; patch[k][x.id] = diff; }
        });
      });
      if (Object.keys(patch).length) lsSet(LS_PATCH, patch);
    }
    lsDel(LS_DATA);
  }

  /**
   * 把 Agent 导入的覆盖层合并到种子数据之上（按 id upsert）。
   * 种子数据始终作为底座 —— 覆盖层只改增量，不会把没提到的字段抹掉。
   */
  function mergeInto(base, patch) {
    return applyPatch(base, patch);
  }

  /** 热闻单独一个键 —— Agent 每天只需覆盖 headlines，不必动主数据 */
  function loadHeadlines() {
    const ov = lsGet(LS_HEAD);
    if (ov && ov.groups && ov.groups.length) return ov;
    return window.FMR_HEADLINES || { groups: [] };
  }

  function loadData() {
    const src = window.FMR_SOURCE || { models: [], deals: [], codes: [], tools: [], radar: [] };
    const patch = readPatch();
    return Promise.resolve(Object.keys(patch).length ? applyPatch(src, patch) : src);
  }

  let DB = { models: [], deals: [], codes: [], tools: [], radar: [], headlines: { groups: [] } };

  /* ---------------------------------------------- 来源体系与可信度（四维）
     单靠「数据自己说自己是真的 + 用户投票」撑不起一个雷达站，
     所以把可信度拆成：来源可信度 40 + 时间新鲜度 25 + 社区反馈 20 + 信息完整度 15。 */
  const SRC_SCORE = { official: 40, vendor: 32, community: 22, unknown: 10 };
  const SRC_LABEL = { official: '官方来源', vendor: '厂商页面', community: '社区来源', unknown: '来源不明' };

  function inferSrc(o) {
    if (o.src) return o.src;
    if (o.freeType === 'apifree' || o.freeType === 'free') return 'official';
    if (o.apiUrl) return 'vendor';
    return 'community';
  }

  /** 关键字段填得越全，可信度越高 —— 缺胳膊少腿的数据不配拿高分 */
  const REQUIRED_FIELDS = {
    models: ['name', 'vendor', 'country', 'caps', 'freeType', 'summary', 'quota', 'url'],
    deals:  ['title', 'vendor', 'free', 'how', 'url'],
    codes:  ['title', 'vendor', 'code', 'reward', 'url'],
    radar:  ['text']
  };
  function completenessOf(kind, o) {
    const req = REQUIRED_FIELDS[kind] || [];
    if (!req.length) return 1;
    const hit = req.filter(f => o[f] !== undefined && o[f] !== null && o[f] !== '').length;
    return hit / req.length;
  }

  function trustScore(o) {
    const e = effVotes(o);
    const age = Date.now() - (o.verifiedAt || 0);
    const fresh = age < HOUR ? 25 : age < 6 * HOUR ? 20 : age < DAY ? 15
                : age < 3 * DAY ? 10 : age < 7 * DAY ? 5 : 0;
    const src = SRC_SCORE[o.srcType] || SRC_SCORE.unknown;
    const community = Math.round((e.trust / 100) * 20);
    const complete = Math.round((o.completeness == null ? 1 : o.completeness) * 15);
    return clamp(src + fresh + community + complete, 0, 100);
  }

  const TRUST_LEVELS = [
    { min: 85, cls: 'v-official',  label: '官方验证' },
    { min: 70, cls: 'v-high',      label: '高可信' },
    { min: 50, cls: 'v-community', label: '社区确认' },
    { min: 30, cls: 'v-unverified',label: '待验证' },
    { min: 0,  cls: 'v-suspect',   label: '疑似失效' }
  ];
  function trustLevel(s) {
    for (let i = 0; i < TRUST_LEVELS.length; i++) {
      if (s >= TRUST_LEVELS[i].min) return TRUST_LEVELS[i];
    }
    return TRUST_LEVELS[TRUST_LEVELS.length - 1];
  }

  /** 统一入口：打类型标记、派生时间、算来源与可信度 */
  function normalizeEntry(kind, o, now) {
    const verifiedAt = o.verifiedAt ? new Date(o.verifiedAt).getTime() : now - (o.ago || 0) * MIN;
    const srcType = inferSrc(o);
    const out = Object.assign({}, o, {
      _t: kind,                                    // ID 类型隔离：对象自带类型，不再靠 id 猜
      verifiedAt: verifiedAt,
      verifiedISO: new Date(verifiedAt).toISOString(),
      up: o.up || 0,
      down: o.down || 0,
      expired: o.end ? new Date(o.end + 'T23:59:59').getTime() < now : false,
      srcType: srcType,
      completeness: completenessOf(kind, o),
      sources: o.sources || [{
        type: srcType,
        name: SRC_LABEL[srcType],
        url: o.apiUrl || o.url || '',
        checkedAt: new Date(verifiedAt).toISOString()
      }],
      verify: verifyLevel(verifiedAt)
    });
    out.trustScore = trustScore(out);
    out.trustLevel = trustLevel(out.trustScore);
    return out;
  }

  function normalize(src) {
    const now = Date.now();

    const models = (src.models || []).map(m => {
      const o = normalizeEntry('models', m, now);
      const sc = freeScore(m);
      o.score = sc.total;
      o.parts = sc.parts;
      o.apiFree = (m.caps || []).indexOf('api') >= 0 && (m.freeType === 'apifree' || m.freeType === 'free');
      return o;
    });

    const deals = (src.deals || []).map(d => {
      const o = normalizeEntry('deals', d, now);
      o.cd = countdown(d.end);
      return o;
    });

    const codes = (src.codes || []).map(c => {
      const o = normalizeEntry('codes', c, now);
      o.cd = countdown(c.end);
      o.risky = o.trustScore < 70;
      return o;
    });

    const radar = (src.radar || []).map(r => Object.assign({}, r, {
      _t: 'radar',
      ts: r.ts ? new Date(r.ts).getTime() : now - (r.ago || 0) * MIN
    })).sort((a, b) => a.ts - b.ts).reverse();

    return { models: models, deals: deals, codes: codes, tools: src.tools || [],
             radar: radar, headlines: loadHeadlines(), meta: src.meta || {} };
  }

  /* ==================================================== 3. Free Score 算法 */
  /*  免费额度 30 · 持续时间 20 · 模型能力 20 · 无需信用卡 15 · 无需兑换码 5 · 访问稳定性 10
      注：能力项用 (capability-60)×0.5 而非 ×0.2 —— 主流模型能力普遍在 70-95 区间，
      线性映射会让这一维几乎失去区分度，做基线偏移后才能真正拉开差距。          */
  const TYPE_SCORE = { free: 30, apifree: 27, quota: 21, limited: 17, newuser: 14, code: 10 };
  const TYPE_LABEL = {
    free: '完全免费', quota: '免费额度', limited: '限时免费',
    newuser: '新用户福利', code: '兑换码', apifree: 'API 免费'
  };
  const TYPE_DOT = { free: '🟢', quota: '🔵', limited: '🟣', newuser: '🟠', code: '🟡', apifree: '🔴' };
  const TYPE_CLS = { free: 'b-free', quota: 'b-quota', limited: 'b-limited', newuser: 'b-newuser', code: 'b-code', apifree: 'b-api' };

  function daysLeft(end) {
    if (!end) return Infinity;
    return (new Date(end + 'T23:59:59').getTime() - Date.now()) / DAY;
  }

  function durationScore(m) {
    const d = daysLeft(m.end);
    if (d === Infinity) return 20;          // 长期
    if (d < 0) return 0;                    // 已过期
    if (d <= 7) return 3;
    if (d <= 30) return 7;
    if (d <= 90) return 11;
    return 15;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function freeScore(m) {
    const parts = [
      { k: '免费额度',   v: TYPE_SCORE[m.freeType] || 0,  max: 30 },
      { k: '持续时间',   v: durationScore(m),             max: 20 },
      { k: '模型能力',   v: clamp(Math.round(((m.capability || 0) - 60) * 0.5), 0, 20), max: 20 },
      { k: '无需信用卡', v: m.needCard ? 0 : 15,          max: 15 },
      { k: '无需兑换码', v: m.needCode ? 0 : 5,           max: 5 },
      { k: '访问稳定性', v: Math.round((m.stability || 0) * 0.1), max: 10 }
    ];
    const total = parts.reduce((s, p) => s + p.v, 0);
    return { total: total, parts: parts };
  }

  function scoreCls(s) { return s >= 80 ? 's-high' : s >= 60 ? 's-mid' : 's-low'; }

  function scoreBadge(m, withBar) {
    return '<div class="score ' + scoreCls(m.score) + '" title="Free Score ' + m.score + '/100">' +
      '<span class="score-num">' + m.score + '</span><span class="score-den">/100</span></div>' +
      (withBar ? '<div class="flex-1"><div class="score-bar"><i style="width:' + m.score + '%;background:var(--' +
        (m.score >= 80 ? 'green' : m.score >= 60 ? 'yellow' : 'gray') + ')"></i></div></div>' : '');
  }

  /* ======================================================== 4. 验证状态 */
  function verifyLevel(ts) {
    const d = Date.now() - ts;
    if (d <= 60 * MIN)  return { cls: 'v-fresh', label: '刚刚验证' };
    if (d <= 6 * HOUR)  return { cls: 'v-ok',    label: Math.floor(d / HOUR) + ' 小时前验证' };
    if (d <= 24 * HOUR) return { cls: 'v-ok',    label: Math.floor(d / HOUR) + ' 小时前验证' };
    if (d <= 72 * HOUR) return { cls: 'v-warn',  label: Math.floor(d / DAY) + ' 天未验证' };
    if (d <= 7 * DAY)   return { cls: 'v-stale', label: Math.floor(d / DAY) + ' 天未验证' };
    return { cls: 'v-dead', label: '疑似失效' };
  }

  function verifyBadge(ts) {
    const v = verifyLevel(ts);
    return '<span class="verify ' + v.cls + '"><span class="dot"></span>' + esc(v.label) + '</span>';
  }

  function trustBar(o) {
    const t = o.trustScore || 0;
    const lv = o.trustLevel || trustLevel(t);
    const cls = t >= 85 ? '' : t >= 70 ? 't-mid' : 't-low';
    return '<div class="trust"><div class="trust-top"><span>可信度 ' + t + '%</span>' +
      '<span>' + esc(lv.label) + ' · ' + esc(SRC_LABEL[o.srcType] || '来源不明') + '</span></div>' +
      '<div class="trust-bar"><i class="' + cls + '" style="width:' + t + '%"></i></div></div>';
  }

  /** 综合可信度徽章：来源 40 + 新鲜度 25 + 社区 20 + 完整度 15 */
  function trustBadge(o) {
    const t = o.trustScore || 0;
    const lv = o.trustLevel || trustLevel(t);
    return '<span class="verify ' + lv.cls + '" title="可信度 ' + t + '/100 · 来源：' +
      esc(SRC_LABEL[o.srcType] || '来源不明') + ' · ' + esc(o.verify.label) + '">' +
      '<span class="dot"></span>' + esc(lv.label) + ' ' + t + '</span>';
  }

  /* ========================================================= 5. 全局状态 */
  const STATE = {
    view: 'home',
    region: 'ALL',      // ALL | CN | INTL
    q: '',
    cap: 'ALL',
    freeType: 'ALL',
    sort: 'score',
    layout: 'card',     // card | table
    ide: 'ALL',
    focusSearch: false
  };

  /* --------------------------------------------------- 本地持久化存储键
     本站没有后端：用户的投票与导入的数据都落在本机 localStorage。
     VOTES   —— 只存「我的表态」（id → up/down），社区基数始终来自数据文件；
                渲染时两者相加，所以刷新后我的那一票依然在，且不会重复计数。
     OVERLAY —— Agent 导入进来的数据覆盖层，下次打开自动合并到种子数据之上。  */
  const LS_VOTES = 'fmr-votes-v1';
  const LS_PATCH = 'fmr-patch-v1';
  const LS_HEAD  = 'fmr-headlines-v1';
  const LS_THEME = 'fmr-theme';
  const LS_DATA  = 'fmr-data-v1';    // 旧版全量快照，仅用于一次性迁移后删除

  let VOTES = {};       // id -> 'up' | 'down'
  let DATA_URL = '';    // ?data=<url> 指定的远端数据源（可选）

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function loadVotes() { VOTES = lsGet(LS_VOTES) || {}; }
  function saveVotes() { lsSet(LS_VOTES, VOTES); }

  /** 我的表态也按「集合:ID」存，避免不同集合里同名 id 互相串台 */
  function voteKey(o) { return (o._t || '?') + ':' + o.id; }

  /** 有效票数 = 数据文件里的社区基数 + 我本机投的那一票 */
  function effVotes(o) {
    const my = VOTES[voteKey(o)] || null;
    const up = (o.up || 0) + (my === 'up' ? 1 : 0);
    const down = (o.down || 0) + (my === 'down' ? 1 : 0);
    return {
      up: up, down: down, my: my,
      trust: (up + down) > 0 ? Math.round(up / (up + down) * 100) : 100
    };
  }

  /* 地区过滤 */
  function byRegion(list) {
    if (STATE.region === 'ALL') return list;
    if (STATE.region === 'CN') return list.filter(x => x.country === 'CN');
    return list.filter(x => x.country !== 'CN');
  }

  function matchQ(m, q) {
    if (!q) return true;
    const s = (m.name + ' ' + m.vendor + ' ' + (m.vendorCn || '') + ' ' + m.summary + ' ' +
               m.quota + ' ' + (m.tags || []).join(' ') + ' ' + m.id).toLowerCase();
    return q.toLowerCase().split(/\s+/).every(t => s.indexOf(t) >= 0);
  }

  function filterModels(ms) {
    let out = byRegion(ms);
    if (STATE.q) out = out.filter(m => matchQ(m, STATE.q));
    if (STATE.cap !== 'ALL') out = out.filter(m => m.caps.indexOf(STATE.cap) >= 0);
    if (STATE.freeType !== 'ALL') out = out.filter(m => m.freeType === STATE.freeType);
    return sortModels(out);
  }

  function sortModels(list) {
    const arr = list.slice();
    const s = STATE.sort;
    arr.sort((a, b) => {
      if (s === 'score') return b.score - a.score;
      if (s === 'cap')   return (b.capability || 0) - (a.capability || 0);
      if (s === 'verified') return b.verifiedAt - a.verifiedAt;   // 最近验证的在前
      if (s === 'expiry') {
        const da = daysLeft(a.end), db = daysLeft(b.end);
        if (da === Infinity && db === Infinity) return b.score - a.score;
        if (da === Infinity) return 1;
        if (db === Infinity) return -1;
        return da - db;
      }
      if (s === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
    return arr;
  }

  /** 权益类排序：过期的沉底，活着的按「热度 → 剩余时间」排。
      过期活动不该继续占着「今日值得关注」的位置。 */
  function sortByExpiry(list) {
    return list.slice().sort((a, b) => {
      if (!!a.expired !== !!b.expired) return a.expired ? 1 : -1;
      if (!!a.hot !== !!b.hot) return a.hot ? -1 : 1;
      const da = a.cd ? (a.cd.days < 0 ? 9999 : a.cd.days) : 99999;
      const db = b.cd ? (b.cd.days < 0 ? 9999 : b.cd.days) : 99999;
      return da - db;
    });
  }

  /* ======================================================== 6. 视图渲染 */

  /* ------------------------------------------------------- 组件：模型卡 */
  function modelCard(m) {
    const caps = (m.caps || []).map(c =>
      '<span class="cap' + (STATE.cap === c ? ' is-hit' : '') + '">' + esc(CAP_LABEL[c] || c) + '</span>').join('');
    const cd = countdown(m.end);
    return '' +
    '<article class="card' + (m.expired ? ' is-expired' : '') + '" data-id="' + esc(m.id) + '">' +
      '<div class="card-top">' +
        '<div class="minw-0">' +
          '<h3 class="card-name">' + esc(m.name) + '</h3>' +
          '<div class="card-vendor"><span class="flag">' + (FLAG[m.country] || '') + '</span>' +
            esc(m.vendorCn || m.vendor) + ' · ' + esc(m.vendor) + '</div>' +
        '</div>' +
        scoreBadge(m) +
      '</div>' +

      '<div class="row mb-2">' +
        '<span class="badge ' + TYPE_CLS[m.freeType] + '"><span class="dot">' + TYPE_DOT[m.freeType] + '</span>' +
          esc(TYPE_LABEL[m.freeType]) + '</span>' +
        (m.apiFree ? '<span class="badge b-api"><span class="dot">🔴</span>API 免费</span>' : '') +
        (m.expired ? '<span class="tag-dead">活动已结束</span>' : '') +
      '</div>' +

      '<div class="caps mb-2">' + caps + '</div>' +

      '<p class="card-summary">' + esc(m.summary) + '</p>' +

      '<div class="free-block">' +
        '<div class="free-row"><span class="k">免费额度</span><span class="v">' + esc(m.quota) + '</span></div>' +
        '<div class="free-row"><span class="k">有效期</span><span class="v mono">' +
          (cd ? esc(cd.text) + '（至 ' + esc(fmtDate(m.end)) + '）' : '长期有效') + '</span></div>' +
        '<div class="free-row"><span class="k">注册要求</span><span class="v">' +
          (m.needSignup ? '需注册' : '免注册') +
          (m.needCard ? ' · 需信用卡' : '') +
          (m.needCode ? ' · 需兑换码' : '') + '</span></div>' +
      '</div>' +

      trustBar(m) +

      '<div class="card-foot mt-3">' +
        trustBadge(m) +
        verifyBadge(m.verifiedAt) +
        '<span class="spacer"></span>' +
        voteBtns('models', m) +
      '</div>' +

      '<div class="row mt-3 gap-sm">' +
        '<a class="btn btn-primary flex-1" href="' + esc(safeUrl(m.url)) + '" target="_blank" rel="noopener noreferrer">立即使用 ↗</a>' +
        '<button class="btn" data-action="detail" data-id="' + esc(m.id) + '">详情</button>' +
      '</div>' +
    '</article>';
  }

  /* 显示值 = 数据文件里的社区基数 + 我本机这一票（effVotes）。
     基数永远不被改写，所以刷新、反复投票都不会出现重复累加。 */
  function voteBtns(kind, o) {
    const e = effVotes(o);
    // 用 <button> 而不是 <span>：否则键盘用户根本 Tab 不到，读屏器也认不出它是按钮
    return '<button type="button" class="btn-icon' + (e.my === 'up' ? ' is-on' : '') + '" data-action="vote" data-coll="' + kind +
        '" data-id="' + esc(o.id) + '" data-kind="up" aria-pressed="' + (e.my === 'up' ? 'true' : 'false') +
        '" title="仍有效（你的表态存在本机）">👍 ' + e.up + '</button>' +
      '<button type="button" class="btn-icon' + (e.my === 'down' ? ' is-off' : '') + '" data-action="vote" data-coll="' + kind +
        '" data-id="' + esc(o.id) + '" data-kind="down" aria-pressed="' + (e.my === 'down' ? 'true' : 'false') +
        '" title="已失效（你的表态存在本机）">👎 ' + e.down + '</button>';
  }

  /* ==================================================== 热闻轮播（首页顶部）
     10 页 × 每页 10 条，自动翻页；数据来源 headlines.js，
     Agent 每天只需重写那一个文件（或用 FMR.ingest({headlines}) 覆盖）。 */
  const BUZZ = {
    i: 0, timer: null, dur: 7000,
    // 系统开了「减弱动态效果」就默认不自动翻页，交给用户手动点
    playing: !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  };

  function buzzGroups() { return (DB.headlines && DB.headlines.groups) || []; }

  /** 排行榜条目：突出主数值与环比变化，副说明放第二行 */
  function rankItem(it, i) {
    const d = it.d || '';
    const cls = /^↑/.test(d) ? 'up' : /^↓/.test(d) ? 'down' : 'flat';
    const inner =
      '<span class="bz-rank">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="bz-main">' +
        '<span class="bz-t">' + esc(it.t) + '</span>' +
        '<span class="bz-meta">' +
          '<span class="bz-src">' + esc(it.s || '') + '</span>' +
          (it.note ? '<span class="bz-sub">' + esc(it.note) + '</span>' : '') +
        '</span>' +
      '</span>' +
      '<span class="bz-val"><b>' + esc(it.v || '') + '</b>' +
        (d ? '<small class="' + cls + '">' + esc(d) + '</small>' : '') +
      '</span>';
    return it.url
      ? '<li><a class="bz-item" href="' + esc(safeUrl(it.url)) + '" target="_blank" rel="noopener noreferrer">' + inner + '<span class="bz-go">↗</span></a></li>'
      : '<li><span class="bz-item is-plain">' + inner + '</span></li>';
  }

  /** 热闻条目：突出热度与新鲜度 */
  function newsItem(it, i) {
    const heat = it.h || 0;
    const hcls = heat >= 90 ? 'hi' : heat >= 75 ? 'mid' : 'low';
    const inner =
      '<span class="bz-rank">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="bz-main">' +
        '<span class="bz-t">' + esc(it.t) + '</span>' +
        '<span class="bz-meta">' +
          '<span class="bz-src">' + esc(it.s || '—') + '</span>' +
          (it.tag ? '<span class="bz-tag">' + esc(it.tag) + '</span>' : '') +
          '<span class="bz-time">' + esc(relTime(Date.now() - (it.ago || 0) * MIN)) + '</span>' +
        '</span>' +
      '</span>' +
      '<span class="bz-heat ' + hcls + '">' + heat + '<small>热度</small></span>';
    return it.url
      ? '<li><a class="bz-item" href="' + esc(safeUrl(it.url)) + '" target="_blank" rel="noopener noreferrer">' + inner + '<span class="bz-go">↗</span></a></li>'
      : '<li><span class="bz-item is-plain">' + inner + '</span></li>';
  }

  function buzzPageHTML(g) {
    const items = (g.items || []).slice(0, 10);
    const isRank = g.mode === 'rank';
    return '<div class="buzz-theme a-' + esc(g.accent || 'blue') + '">' +
        '<span>' + esc(g.emoji || '') + '</span><b>' + esc(g.theme) + '</b>' +
        '<span class="bz-note">' + esc(g.note || 'TOP 10 · 按热度排序') + '</span>' +
      '</div>' +
      '<ol class="buzz-list">' +
        items.map((it, i) => isRank ? rankItem(it, i) : newsItem(it, i)).join('') +
      '</ol>';
  }

  function buzzHTML() {
    const g = buzzGroups();
    if (!g.length) return '';
    return '<section class="buzz" id="buzz">' +
      '<div class="buzz-head">' +
        '<div class="buzz-title">' +
          '<span class="buzz-live"><i></i>LIVE</span>' +
          '<b>今日 AI 热闻榜</b>' +
          '<span class="buzz-sub">' + g.length + ' 页 · ' + (g.length * 10) + ' 条 · 每 ' + Math.round(BUZZ.dur / 1000) + ' 秒自动翻页</span>' +
        '</div>' +
        '<div class="buzz-ctrl">' +
          '<button class="icon-btn" data-action="buzz" data-v="prev" title="上一页">‹</button>' +
          '<button class="icon-btn" data-action="buzz" data-v="toggle" id="buzzToggle" title="暂停 / 播放">❙❙</button>' +
          '<button class="icon-btn" data-action="buzz" data-v="next" title="下一页">›</button>' +
        '</div>' +
      '</div>' +
      '<div class="buzz-progress"><i id="buzzBar"></i></div>' +
      '<div class="buzz-page" id="buzzPage">' + buzzPageHTML(g[BUZZ.i] || g[0]) + '</div>' +
      '<div class="buzz-dots" id="buzzDots">' +
        g.map((x, i) => '<button class="buzz-dot' + (i === BUZZ.i ? ' is-active' : '') +
          '" data-action="buzz" data-v="go" data-i="' + i + '" title="' + esc(x.theme) + '">' + esc(x.emoji || '') + '</button>').join('') +
      '</div>' +
    '</section>';
  }

  function buzzStop() { clearTimeout(BUZZ.timer); BUZZ.timer = null; }

  /** 重置进度条动画与翻页计时器 */
  function buzzArm() {
    buzzStop();
    const bar = document.getElementById('buzzBar');
    if (bar) {
      bar.style.animation = 'none';
      void bar.offsetWidth;                       // 强制回流以重启动画
      if (BUZZ.playing) bar.style.animation = 'buzzProgress ' + BUZZ.dur + 'ms linear forwards';
    }
    const tg = document.getElementById('buzzToggle');
    if (tg) tg.textContent = BUZZ.playing ? '❙❙' : '▶';
    if (BUZZ.playing) BUZZ.timer = setTimeout(function () { buzzGo(BUZZ.i + 1); }, BUZZ.dur);
  }

  function buzzGo(i) {
    const g = buzzGroups();
    if (!g.length) return;
    BUZZ.i = ((i % g.length) + g.length) % g.length;
    const page = document.getElementById('buzzPage');
    if (page) {
      page.classList.remove('is-in');
      page.innerHTML = buzzPageHTML(g[BUZZ.i]);
      void page.offsetWidth;
      page.classList.add('is-in');
    }
    $$('#buzzDots .buzz-dot').forEach((d, idx) => d.classList.toggle('is-active', idx === BUZZ.i));
    buzzArm();
  }

  function buzzToggle() { BUZZ.playing = !BUZZ.playing; buzzArm(); }

  /** 每次渲染后调用：离开首页时停掉定时器，避免后台空转。
      定时器还在跑就不重启 —— 否则每分钟的定时刷新会把进度条打断回零点。 */
  function buzzMount() {
    if (STATE.view !== 'home' || !buzzGroups().length) { buzzStop(); return; }
    if (BUZZ.i > buzzGroups().length - 1) BUZZ.i = 0;
    const bz = document.getElementById('buzz');
    if (!bz) return;
    bz.addEventListener('mouseenter', buzzStop);
    bz.addEventListener('mouseleave', function () { if (BUZZ.playing) buzzArm(); });
    if (!BUZZ.timer) buzzArm();
  }

  /* -------------------------------------------------------- 视图：首页 */
  function renderHome() {
    const hotDeals = sortByExpiry(byRegion(DB.deals)).slice(0, 4);

    // 首页展示全局 Top（只受地区影响，不继承模型库的筛选状态）
    const top = sortModels(byRegion(DB.models)).slice(0, 9);
    const fresh = DB.models.filter(m => Date.now() - m.verifiedAt <= 30 * MIN).length;
    const freeNow = DB.models.filter(m => m.freeType === 'free' || m.freeType === 'apifree').length;
    const expiring = DB.models.filter(m => { const d = daysLeft(m.end); return d !== Infinity && d >= 0 && d <= 14; }).length;

    return '' +
    '<div class="hero"><div class="wrap">' +
      '<div class="hero-tag"><span class="fg-green">●</span> RADAR ONLINE · 数据每 15 分钟巡检</div>' +
      '<h1>在免费消失之前，<br>找到它。</h1>' +
      '<p class="hero-slogan">国内外 AI <b>免费模型 / 免费 API / 限时活动 / Token 赠送 / 兑换码</b> 聚合雷达。' +
        '不告诉你模型有多强，只回答一个问题：<b>现在什么能免费用。</b></p>' +

      '<div class="stats">' +
        '<div class="stat"><div class="stat-k">Models Tracked</div><div class="stat-v">' + DB.models.length + '</div></div>' +
        '<div class="stat"><div class="stat-k">Free Right Now</div><div class="stat-v fg-green">' + freeNow + '</div></div>' +
        '<div class="stat"><div class="stat-k">Active Deals</div><div class="stat-v">' + DB.deals.length + '</div></div>' +
        '<div class="stat"><div class="stat-k">Expiring ≤14d</div><div class="stat-v fg-yellow">' + expiring + '</div></div>' +
        '<div class="stat"><div class="stat-k">Verified ≤30m</div><div class="stat-v">' + fresh + '<small> /' + DB.models.length + '</small></div></div>' +
      '</div>' +

      '<div class="searchbar">' +
        '<span class="icon"><svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">' +
          '<path d="M11.7 10.3a5.5 5.5 0 1 0-1.4 1.4l3 3 1.4-1.4-3-3ZM3 6.5A3.5 3.5 0 1 1 6.5 10 3.5 3.5 0 0 1 3 6.5Z"/></svg></span>' +
        '<input id="heroSearch" type="search" placeholder="搜索模型、厂商、权益关键词… 例：Coding / 免费 API / Gemini" ' +
          'autocomplete="off" value="' + esc(STATE.q) + '">' +
        '<kbd>/</kbd>' +
      '</div>' +
    '</div></div>' +

    '<div class="wrap">' +
      buzzHTML() +

      '<div class="section">' +
        '<div class="sec-head">' +
          '<h2 class="sec-title"><span class="dot"></span>🔥 今日值得关注</h2>' +
          '<p class="sec-desc">按「即将到期 + 热度」排序 · 只放真金白银的权益</p>' +
        '</div>' +
        '<div>' + hotDeals.map(dealCard).join('') + '</div>' +
      '</div>' +

      '<div class="section">' +
        '<div class="sec-head">' +
          '<h2 class="sec-title"><span class="dot"></span>🟢 当前免费模型</h2>' +
          '<p class="sec-desc">按 Free Score 排序 · <a href="#/models" class="link">查看全部 ' + DB.models.length + ' 个 →</a></p>' +
        '</div>' +
        legend() +
        '<div class="grid">' + top.map(modelCard).join('') + '</div>' +
      '</div>' +

      '<div class="section">' +
        '<div class="sec-head">' +
          '<h2 class="sec-title"><span class="dot"></span>📡 最新权益变动</h2>' +
          '<p class="sec-desc"><a href="#/radar" class="link">全部动态 →</a></p>' +
        '</div>' +
        '<div class="timeline">' + DB.radar.slice(0, 5).map(radarItem).join('') + '</div>' +
      '</div>' +
    '</div>';
  }

  function legend() {
    return '<div class="legend">' +
      Object.keys(TYPE_LABEL).map(k =>
        '<span class="legend-item"><span class="badge ' + TYPE_CLS[k] + '"><span class="dot">' + TYPE_DOT[k] +
        '</span>' + TYPE_LABEL[k] + '</span></span>').join('') +
      '<span class="legend-item faint ml-auto">🔴 特指「API 免费」，对开发者价值高于 Chat 免费</span>' +
    '</div>';
  }

  /* ---------------------------------------------------- 空结果 & 降级引导 */
  /* 空结果时不要只丢一个「无匹配」：告诉用户卡在哪个条件上，
     并判断是不是地区筛得太死 —— 放宽后有多少结果，给用户一键出路。 */
  function emptyState() {
    const pool = DB.models.filter(m =>
      matchQ(m, STATE.q) &&
      (STATE.cap === 'ALL' || m.caps.indexOf(STATE.cap) >= 0) &&
      (STATE.freeType === 'ALL' || m.freeType === STATE.freeType));
    const regionBlocked = STATE.region !== 'ALL' && pool.length > 0;

    const conds = [];
    if (STATE.q) conds.push('关键词「' + STATE.q + '」');
    if (STATE.cap !== 'ALL') conds.push('能力 ' + (CAP_LABEL[STATE.cap] || STATE.cap));
    if (STATE.freeType !== 'ALL') conds.push('类型 ' + (TYPE_LABEL[STATE.freeType] || STATE.freeType));
    if (STATE.region !== 'ALL') conds.push(STATE.region === 'CN' ? '仅国内' : '仅海外');

    return '<div class="empty">' +
      '<div class="empty-mark">∅</div>' +
      '<p>没有匹配的模型' +
        (conds.length ? '<br><span class="mono faint fs-sm">当前条件：' + esc(conds.join(' · ')) + '</span>' : '') +
      '</p>' +
      (regionBlocked
        ? '<p class="fg-dim mb-3">放宽地区限制后有 <b class="fg-strong">' +
            pool.length + '</b> 个匹配结果</p>' +
          '<div class="row jc-center">' +
            '<button class="btn btn-primary" data-action="region" data-v="ALL">切换到全部地区</button>' +
            '<button class="btn" data-action="reset">清除全部筛选</button>' +
          '</div>'
        : '<button class="btn" data-action="reset">清除全部筛选</button>') +
    '</div>';
  }

  /* ----------------------------------------------------- 视图：模型库 */
  function renderModels() {
    const all = DB.models;
    const list = filterModels(all);

    const caps = ['chat', 'api', 'coding', 'agent', 'image', 'video', 'audio', 'embedding'];
    const types = Object.keys(TYPE_LABEL);

    return '' +
    '<div class="wrap view-pad">' +
      '<div class="sec-head mb-3">' +
        '<div>' +
          '<h1 class="page-title">模型数据库</h1>' +
          '<p class="sec-desc">' + all.length + ' 个模型 · 覆盖 Chat / API / Coding / 多模态 / 向量</p>' +
        '</div>' +
        '<div class="row">' +
          '<div class="region" role="group" aria-label="布局切换">' +
            '<button data-action="layout" data-v="card" aria-pressed="' + (STATE.layout === 'card') +
              '" class="' + (STATE.layout === 'card' ? 'is-active' : '') + '">卡片</button>' +
            '<button data-action="layout" data-v="table" aria-pressed="' + (STATE.layout === 'table') +
              '" class="' + (STATE.layout === 'table' ? 'is-active' : '') + '">表格</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="filters">' +
        '<div class="fgroup flex-1" style="min-width:220px">' +
          '<div class="searchbar maxw-none">' +
            '<span class="icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">' +
              '<path d="M11.7 10.3a5.5 5.5 0 1 0-1.4 1.4l3 3 1.4-1.4-3-3ZM3 6.5A3.5 3.5 0 1 1 6.5 10 3.5 3.5 0 0 1 3 6.5Z"/></svg></span>' +
            '<input id="modelSearch" type="search" placeholder="搜索模型 / 厂商 / 权益…" autocomplete="off" value="' + esc(STATE.q) + '">' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="filters" style="top:calc(var(--header-h) + 62px)">' +
        '<div class="fgroup"><span class="flabel">能力</span>' +
          chip('cap', 'ALL', '全部', STATE.cap === 'ALL') +
          caps.map(c => chip('cap', c, esc(CAP_LABEL[c]), STATE.cap === c)).join('') +
        '</div>' +
        '<div class="fgroup"><span class="flabel">免费类型</span>' +
          chip('type', 'ALL', '全部', STATE.freeType === 'ALL') +
          types.map(t => chip('type', t, TYPE_DOT[t] + ' ' + TYPE_LABEL[t], STATE.freeType === t)).join('') +
        '</div>' +
        '<span class="spacer"></span>' +
        '<div class="fgroup">' +
          '<span class="flabel">排序</span>' +
          '<select class="sortsel" id="sortSel">' +
            '<option value="score"'    + (STATE.sort === 'score' ? ' selected' : '') + '>Free Score ↓</option>' +
            '<option value="verified"' + (STATE.sort === 'verified' ? ' selected' : '') + '>最近验证 ↓</option>' +
            '<option value="expiry"'   + (STATE.sort === 'expiry' ? ' selected' : '') + '>即将到期 ↑</option>' +
            '<option value="cap"'      + (STATE.sort === 'cap' ? ' selected' : '') + '>模型能力 ↓</option>' +
            '<option value="name"'     + (STATE.sort === 'name' ? ' selected' : '') + '>名称 A-Z</option>' +
          '</select>' +
        '</div>' +
        '<span class="count">命中 <b>' + list.length + '</b> / ' + all.length + '</span>' +
      '</div>' +

      (list.length === 0 ? emptyState() : (STATE.layout === 'card'
            ? '<div class="grid">' + list.map(modelCard).join('') + '</div>'
            : '<div class="tablewrap">' + modelTable(list) + '</div>')) +
    '</div>';
  }

  function modelTable(list) {
    return '<table class="grid-table"><thead><tr>' +
      '<th>模型</th><th>厂商</th><th>能力标签</th><th>免费类型</th><th>额度 / 期限</th>' +
      '<th>Score</th><th>最后验证</th><th></th>' +
    '</tr></thead><tbody>' +
    list.map(m => {
      const cd = countdown(m.end);
      return '<tr>' +
        '<td class="t-name">' + esc(m.name) + '</td>' +
        '<td class="t-dim"><span class="flag">' + (FLAG[m.country] || '') + '</span> ' + esc(m.vendorCn || m.vendor) + '</td>' +
        '<td><div class="caps">' + (m.caps || []).map(c => '<span class="cap">' + esc(CAP_LABEL[c] || c) + '</span>').join('') + '</div></td>' +
        '<td><span class="badge ' + TYPE_CLS[m.freeType] + '"><span class="dot">' + TYPE_DOT[m.freeType] + '</span>' + esc(TYPE_LABEL[m.freeType]) + '</span></td>' +
        '<td class="t-dim">' + esc(m.quota) +
          (cd ? '<br><span class="mono faint">' + esc(cd.text) + '</span>' : '<br><span class="faint">长期</span>') + '</td>' +
        '<td class="t-mono"><b style="color:var(--' + (m.score >= 80 ? 'green' : m.score >= 60 ? 'yellow' : 'gray') + ')">' + m.score + '</b></td>' +
        '<td>' + verifyBadge(m.verifiedAt) + '</td>' +
        '<td><div class="row gap-xs nowrap">' +
          '<a class="btn btn-sm" href="' + esc(safeUrl(m.url)) + '" target="_blank" rel="noopener noreferrer">打开</a>' +
          '<button class="btn btn-sm" data-action="detail" data-id="' + esc(m.id) + '">详情</button></div></td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
  }

  /* ---------------------------------------------------- 视图：今日免费 */
  function renderDeals() {
    const list = sortByExpiry(byRegion(DB.deals));
    return '<div class="wrap view-pad">' +
      '<div class="sec-head mb-3">' +
        '<div><h1 class="page-title">🔥 今日免费权益</h1>' +
        '<p class="sec-desc">限时活动 · 新用户福利 · API 免费层 · Token 赠送 — 只收录「能省钱」的信息</p></div>' +
      '</div>' +
      legend() +
      (list.length ? list.map(dealCard).join('')
        : '<div class="empty"><div class="empty-mark">∅</div><p>当前地区暂无活动</p></div>') +
    '</div>';
  }

  function dealCard(d) {
    const cd = d.cd;
    const caps = String(d.cap || '').split(',').filter(Boolean)
      .map(c => '<span class="cap">' + esc(CAP_LABEL[c] || c) + '</span>').join('');
    return '<article class="deal' + (d.hot ? ' is-hot' : '') + (d.expired ? ' is-expired' : '') +
        '" data-id="' + esc(d.id) + '">' +
      '<div>' +
        '<h3 class="deal-title">' + esc(d.title) +
          (d.expired ? '<span class="tag-dead">已结束</span>' : '') +
          (d.hot ? '<span class="badge b-newuser"><span class="dot">🔥</span>热门</span>' : '') +
          (!d.expired && cd && cd.days >= 0 && cd.days <= 7 ? '<span class="badge b-code"><span class="dot">⏰</span>即将结束</span>' : '') +
        '</h3>' +
        '<div class="row mb-2">' + caps +
          '<span class="tag">' + (FLAG[d.country] || '') + ' ' + esc(d.vendor) + '</span></div>' +
        '<div class="deal-meta">' +
          '<span class="k">免费内容</span><span class="v">' + esc(d.free) + '</span>' +
          '<span class="k">领取方式</span><span class="v">' + esc(d.how) + '</span>' +
          '<span class="k">信息来源</span><span class="v mono faint">' + esc(d.source) + '</span>' +
        '</div>' +
        '<div class="row">' + verifyBadge(d.verifiedAt) + voteBtns('deals', d) + '</div>' +
      '</div>' +
      '<div class="deal-side">' +
        (d.expired
          ? '<div class="countdown cd-long">已结束<small>活动已过期</small></div>'
          : cd
          ? '<div class="countdown ' + cd.cls + '">' + esc(cd.text) + '<small>剩余时间</small></div>'
          : '<div class="countdown cd-long">长期<small>无截止日期</small></div>') +
        '<div class="faint mono fs-xs">截止 ' + esc(fmtDate(d.end)) + '</div>' +
        '<a class="btn btn-primary w-full mt-1" href="' + esc(safeUrl(d.url)) + '" target="_blank" rel="noopener noreferrer">立即领取 ↗</a>' +
      '</div>' +
    '</article>';
  }

  /* ------------------------------------------------------ 视图：兑换码 */
  function renderCodes() {
    const list = sortByExpiry(byRegion(DB.codes));
    return '<div class="wrap view-pad">' +
      '<div class="sec-head mb-3">' +
        '<div><h1 class="page-title">🎟️ 兑换码库</h1>' +
        '<p class="sec-desc">社区共同验证 · 左边标红表示近 24 小时有多人反馈失效，兑换前先看可信度</p></div>' +
      '</div>' +
      '<div class="grid">' + list.map(codeCard).join('') + '</div>' +
    '</div>';
  }

  function codeCard(c) {
    return '<article class="code-card' + (c.risky ? ' is-risky' : '') + (c.expired ? ' is-expired' : '') +
        '" data-id="' + esc(c.id) + '">' +
      '<div class="row jc-between">' +
        '<span class="card-name fs-base">' + esc(c.title) + '</span>' +
        '<span class="tag">' + (FLAG[c.country] || '') + ' ' + esc(c.vendor) + '</span>' +
      '</div>' +
      '<div class="code-value"><span>' + esc(c.code) + '</span>' +
        '<button class="btn-icon" data-action="copy" data-v="' + esc(c.code) + '" title="复制">复制</button></div>' +
      '<div class="code-reward">🎁 ' + esc(c.reward) + '</div>' +
      '<div class="row faint mono fs-xs gap-lg">' +
        '<span>⏰ ' + (c.expired ? '已过期' : (c.cd ? esc(c.cd.text) + '（' + esc(fmtDate(c.end)) + '）' : '长期有效')) + '</span>' +
        (c.expired ? '<span class="tag-dead">已失效</span>' : '') +
        '<span>👥 ' + (c.up + c.down) + ' 人已反馈</span>' +
      '</div>' +
      '<div class="code-note">' + esc(c.note) + '</div>' +
      trustBar(c) +
      '<div class="row mt-3">' +
        verifyBadge(c.verifiedAt) + '<span class="spacer"></span>' + voteBtns('codes', c) +
      '</div>' +
      '<div class="row mt-3 gap-sm">' +
        '<a class="btn btn-primary flex-1" href="' + esc(safeUrl(c.url)) + '" target="_blank" rel="noopener noreferrer">去兑换 ↗</a>' +
        '<button class="btn" data-action="copy" data-v="' + esc(c.code) + '">复制码</button>' +
      '</div>' +
    '</article>';
  }

  /* ------------------------------------------------------ 视图：Coding */
  const IDE_MAP = {
    'Claude Code': ['glm-46', 'kimi-k2', 'qwen3-coder', 'deepseek-v3', 'glm-45-flash', 'minimax-m2'],
    'Codex CLI':   ['gpt-5', 'gpt-5-mini', 'openrouter-free', 'github-models'],
    'Qwen Code':   ['qwen3-coder', 'qwen3-max', 'github-models', 'openrouter-free'],
    'Cline':       ['openrouter-free', 'gemini-25-pro', 'github-models', 'deepseek-v3', 'glm-46', 'groq-inference'],
    'Cursor':      ['claude-sonnet-45', 'gpt-5', 'gemini-25-pro', 'groq-inference', 'openrouter-free'],
    'OpenCode':    ['openrouter-free', 'github-models', 'groq-inference', 'glm-46', 'qwen3-coder'],
    'Continue':    ['github-models', 'openrouter-free', 'gemini-25-flash', 'qwen3-coder', 'groq-inference'],
    '通用 API':     ['github-models', 'openrouter-free', 'groq-inference', 'glm-45-flash', 'gemini-25-flash']
  };

  function renderCoding() {
    const ides = Object.keys(IDE_MAP);
    let list, relaxed = false;
    if (STATE.ide === 'ALL') {
      list = filterModels(DB.models.filter(m => m.caps.indexOf('coding') >= 0));
    } else {
      const ids = IDE_MAP[STATE.ide] || [];
      list = byRegion(DB.models).filter(m => ids.indexOf(m.id) >= 0);
      // 地区筛选把结果清空时回退到全地区 —— 选了具体工具后，兼容性优先于地区
      if (!list.length) {
        list = DB.models.filter(m => ids.indexOf(m.id) >= 0);
        relaxed = true;
      }
      list = sortModels(list);
    }
    return '<div class="wrap view-pad">' +
      '<div class="sec-head mb-3">' +
        '<div><h1 class="page-title">💻 Coding 免费模型</h1>' +
        '<p class="sec-desc">选一个工具，直接看哪些模型能白嫖进去 — 对开发者来说，API 免费 &gt; Chat 免费</p></div>' +
      '</div>' +
      '<div class="ide-row">' +
        chip('ide', 'ALL', '全部 Coding 模型', STATE.ide === 'ALL', 'ide-chip') +
        ides.map(k => chip('ide', k, esc(k), STATE.ide === k, 'ide-chip')).join('') +
      '</div>' +
      (STATE.ide !== 'ALL'
        ? '<div class="legend mb-4"><span class="legend-item">' +
          (relaxed
            ? '当前地区没有适配 <b class="fg-strong">' + esc(STATE.ide) + '</b> 的免费模型，已为你展示<b class="fg-strong">全部地区</b>的 ' + list.length + ' 个结果'
            : '已按 <b class="fg-strong">' + esc(STATE.ide) + '</b> 的接入兼容性筛选 · 命中 <b class="fg-strong">' + list.length + '</b> 个可直连模型') +
          '</span></div>'
        : '') +
      (list.length ? '<div class="grid">' + list.map(modelCard).join('') + '</div>'
        : '<div class="empty"><div class="empty-mark">∅</div><p>该工具暂无匹配的免费模型</p></div>') +
    '</div>';
  }

  /* --------------------------------------------------- 视图：快捷入口 */
  function renderLauncher() {
    return '<div class="wrap view-pad">' +
      '<div class="sec-head mb-3">' +
        '<div><h1 class="page-title">🚀 AI 快捷启动器</h1>' +
        '<p class="sec-desc">一个页面打开所有 Chat / API 控制台 / Coding 工具 — 建议加到书签栏</p></div>' +
      '</div>' +
      '<div class="launch-grid">' +
        DB.tools.map(g => {
          const items = byRegion(g.items);
          if (!items.length) return '';
          return '<div class="launch-group">' +
            '<div class="launch-title">' + esc(g.group) + ' · ' + items.length + '</div>' +
            items.map(it =>
              '<div class="launch-row">' +
                '<span class="launch-name"><span class="flag">' + (FLAG[it.country] || '') + '</span>' + esc(it.name) + '</span>' +
                '<a class="btn btn-sm" href="' + esc(safeUrl(it.url)) + '" target="_blank" rel="noopener noreferrer">打开 ↗</a>' +
              '</div>').join('') +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------ 视图：动态 */
  const TL_LABEL = { new: '新发现', change: '状态变化', hot: '限时活动', expire: '即将到期' };

  function radarItem(r) {
    const m = r.modelId ? DB.models.filter(x => x.id === r.modelId)[0] : null;
    return '<div class="tl-item t-' + esc(r.type) + '">' +
      '<div class="tl-time">' + esc(relTime(r.ts)) + ' · <span style="color:var(--' +
        (r.type === 'new' ? 'green' : r.type === 'change' ? 'yellow' : r.type === 'hot' ? 'orange' : 'red') +
        ')">' + esc(TL_LABEL[r.type] || r.type) + '</span></div>' +
      '<div class="tl-text">' + esc(r.text) + '</div>' +
      '<div class="row gap-md mt-1">' +
        '<span class="tl-src">' + (FLAG[r.country] || '') + ' ' + esc(r.vendor) + '</span>' +
        (m ? '<button class="btn-icon" data-action="detail" data-id="' + esc(m.id) + '">查看 ' + esc(m.name) + '</button>' : '') +
        (r.url ? '<a class="btn-icon" href="' + esc(safeUrl(r.url)) + '" target="_blank" rel="noopener noreferrer">官方来源 ↗</a>' : '') +
      '</div>' +
    '</div>';
  }

  /** 刷新：配了远端数据源就重新拉取，否则只重算相对时间与排序 */
  function refreshRadar() {
    if (DATA_URL) { fetchRemote(DATA_URL); return; }
    DB = normalize(DB);
    render({ scroll: false });
    toast('已刷新 · ' + DB.radar.length + ' 条动态 · 相对时间已重算');
  }

  function renderRadar() {
    const list = byRegion(DB.radar);
    return '<div class="wrap view-pad">' +
      '<div class="sec-head mb-3">' +
        '<div><h1 class="page-title">📡 权益变动雷达</h1>' +
        '<p class="sec-desc">不做 AI 新闻站 — 只推送「用户可能因此省钱」的变动</p></div>' +
        '<div class="row">' +
          '<span class="faint mono fs-xs">' +
            (DATA_URL ? '数据源：' + esc(DATA_URL) : '数据源：本地文件（未配置远端）') + '</span>' +
          '<button class="btn" data-action="refresh-radar" title="重新计算时间；配置了远端数据源时会重新拉取">↻ 刷新</button>' +
          '<button class="btn" data-action="ingest">⌥ 导入数据</button>' +
        '</div>' +
      '</div>' +
      '<div class="legend">' +
        '<span class="legend-item"><span class="fg-green">●</span> 新发现</span>' +
        '<span class="legend-item"><span class="fg-yellow">●</span> 状态变化</span>' +
        '<span class="legend-item"><span class="fg-orange">●</span> 限时活动</span>' +
        '<span class="legend-item"><span class="fg-red">●</span> 即将到期</span>' +
      '</div>' +
      '<div class="timeline">' + (list.length ? list.map(radarItem).join('')
        : '<div class="empty"><p>暂无动态</p></div>') + '</div>' +
    '</div>';
  }

  /* ====================================================== 7. 路由 & 渲染 */
  const RENDERERS = {
    home: renderHome, models: renderModels, deals: renderDeals,
    codes: renderCodes, coding: renderCoding, launcher: renderLauncher, radar: renderRadar
  };

  function currentView() {
    const h = (location.hash || '#/home').replace('#/', '');
    return RENDERERS[h] ? h : 'home';
  }

  /* ---------------------------------------------- 导航渲染（header+footer 同源） */
  function renderNav() {
    const nav = $('#nav');
    if (nav) {
      nav.innerHTML = '<ul>' + NAV.map(n =>
        '<li><a class="nav-link" href="#/' + n.id + '" data-nav="' + n.id + '">' + esc(n.label) + '</a></li>'
      ).join('') + '</ul>';
    }
    const fn = $('#footNav');
    if (fn) {
      fn.innerHTML = NAV.map(n =>
        '<li><a href="#/' + n.id + '">' + esc(n.foot) + '</a></li>'
      ).join('') + '<li><a href="#" data-action="ingest">数据接口 · Agent 导入</a></li>';
    }
  }

  /** 视图切换后同步 title / description / OG，并让读屏器播报当前页面 */
  function syncMeta(view) {
    const m = VIEW_META[view] || VIEW_META.home;
    document.title = m.title;
    setMeta('meta[name="description"]', 'content', m.desc);
    setMeta('meta[property="og:title"]', 'content', m.title);
    setMeta('meta[property="og:description"]', 'content', m.desc);

    const ann = $('#routeAnnouncer');
    if (ann) ann.textContent = '已切换到「' + esc(navLabel(view)) + '」页面';
  }

  function setMeta(sel, attr, val) {
    const el = document.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  }

  /** 统一的筛选按钮：带 aria-pressed，读屏器能知道哪个处于选中态 */
  function chip(action, v, label, active, cls) {
    return '<button type="button" class="' + (cls || 'chip') + (active ? ' is-active' : '') +
      '" data-action="' + action + '" data-v="' + esc(v) +
      '" aria-pressed="' + (active ? 'true' : 'false') + '">' + label + '</button>';
  }

  /**
   * @param {object} [opts]  opts.scroll=false 时保持滚动位置（筛选/搜索/定时刷新用）
   */
  function render(opts) {
    const keepScroll = opts && opts.scroll === false;
    STATE.view = currentView();
    $$('.view').forEach(v => v.classList.remove('is-active'));
    $$('.nav-link').forEach(a => a.classList.toggle('is-active', a.dataset.nav === STATE.view));

    const host = $('#view-' + STATE.view);
    host.innerHTML = RENDERERS[STATE.view]();
    host.classList.add('is-active');
    syncMeta(STATE.view);

    // 恢复搜索焦点
    if (STATE.focusSearch) {
      const inp = $('#modelSearch');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      STATE.focusSearch = false;
    }
    if (STATE.view === 'home') {
      const hs = $('#heroSearch');
      if (hs && STATE.q) hs.value = STATE.q;
    }
    if (!keepScroll) window.scrollTo(0, 0);
    buzzMount();
  }

  function go(v) { location.hash = '#/' + v; }

  /* ========================================================= 8. 交互 */
  const TOAST_MAX = 3;   // 最多同时挂 3 条，否则连点会把页面下半部分糊住

  function toast(msg) {
    const host = $('#toastHost');
    while (host.children.length >= TOAST_MAX) host.removeChild(host.firstChild);
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 260);
    }, 1900);
  }

  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(t).then(() => toast('已复制：' + t), () => fallbackCopy(t));
    } else fallbackCopy(t);
  }
  function fallbackCopy(t) {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制：' + t); }
    catch (e) { toast('复制失败，请手动选择'); }
    ta.remove();
  }

  /* --------------------------------------------------------- 详情弹窗 */
  function openDetail(id) {
    const m = DB.models.filter(x => x.id === id)[0];
    if (!m) return;
    // 走统一的 openModal，才能带上焦点管理与关闭回焦
    openModal(
      m.name,
      (FLAG[m.country] || '') + ' ' + esc(m.vendorCn || m.vendor) + ' · ' + esc(m.vendor),
      detailBody(m)
    );
  }

  function detailBody(m) {
    const cd = countdown(m.end);
    const caps = (m.caps || []).map(c => '<span class="cap is-hit">' + esc(CAP_LABEL[c] || c) + '</span>').join(' ');

    // 注意：return 后不能直接换行跟表达式，ASI 会插入分号导致返回 undefined
    return (
      '<div class="row mb-3">' +
        '<span class="badge ' + TYPE_CLS[m.freeType] + '"><span class="dot">' + TYPE_DOT[m.freeType] + '</span>' + esc(TYPE_LABEL[m.freeType]) + '</span>' +
        (m.apiFree ? '<span class="badge b-api"><span class="dot">🔴</span>API 免费</span>' : '') +
        scoreBadge(m) +
        '<span class="spacer"></span>' + verifyBadge(m.verifiedAt) +
      '</div>' +

      '<div class="caps mb-3">' + caps + '</div>' +

      '<p class="fs-md fg-dim mb-4 lh-16">' + esc(m.summary) + '</p>' +

      '<div class="kv">' +
        '<div class="k">免费额度</div><div>' + esc(m.quota) + '</div>' +
        '<div class="k">活动期限</div><div class="mono">' + (cd ? esc(cd.text) + '（至 ' + esc(fmtDate(m.end)) + '）' : '长期有效') + '</div>' +
        '<div class="k">注册要求</div><div>' + (m.needSignup ? '需要注册账号' : '无需注册') + '</div>' +
        '<div class="k">支付方式</div><div>' + (m.needCard ? '⚠️ 需绑定信用卡' : '无需信用卡') + '</div>' +
        '<div class="k">兑换码</div><div>' + (m.needCode ? '需要兑换码' : '无需兑换码') + '</div>' +
        '<div class="k">官方入口</div><div><a href="' + esc(safeUrl(m.url)) + '" target="_blank" rel="noopener noreferrer" class="link">' + esc(m.url) + ' ↗</a></div>' +
        (m.apiUrl ? '<div class="k">API 控制台</div><div><a href="' + esc(safeUrl(m.apiUrl)) + '" target="_blank" rel="noopener noreferrer" class="link">' + esc(m.apiUrl) + ' ↗</a></div>' : '') +
        '<div class="k">最后验证</div><div class="mono">' + esc(relTime(m.verifiedAt)) + ' · ' + esc(verifyLevel(m.verifiedAt).label) + '</div>' +
      '</div>' +

      '<div class="foot-h mb-2">Free Score 拆解</div>' +
      '<div class="score-breakdown">' +
        m.parts.map(p =>
          '<div class="sb-row"><span class="sbk">' + esc(p.k) + '</span>' +
          '<span class="sb-bar"><i style="width:' + Math.round(p.v / p.max * 100) + '%"></i></span>' +
          '<span class="sbv">' + p.v + '/' + p.max + '</span></div>').join('') +
        '<div class="sb-row bt mt-1 pt-2">' +
          '<span class="sbk fg-strong fw-6">合计</span>' +
          '<span></span><span class="sbv fg-strong fw-7 fs-base">' + m.score + '/100</span></div>' +
      '</div>' +

      trustBar(m) +

      (m.tags && m.tags.length ? '<div class="row my-3">' +
        m.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>' : '') +

      '<div class="row mt-4 gap-md">' +
        '<a class="btn btn-primary flex-1" href="' + esc(safeUrl(m.url)) + '" target="_blank" rel="noopener noreferrer">立即使用 ↗</a>' +
        (m.apiUrl ? '<a class="btn" href="' + esc(safeUrl(m.apiUrl)) + '" target="_blank" rel="noopener noreferrer">API 控制台 ↗</a>' : '') +
        '<button class="btn" data-action="report" data-id="' + esc(m.id) + '">报告失效</button>' +
      '</div>'
    );
  }

  function closeModal() {
    const host = $('#modalHost');
    if (!host.classList.contains('is-open')) return;
    host.classList.remove('is-open');
    // 焦点还给触发弹窗的那个元素，键盘用户不会「掉回页面顶部」
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    lastFocused = null;
  }

  let lastFocused = null;   // 打开弹窗前的焦点，关闭时还回去
  const FOCUSABLE = 'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

  function openModal(title, sub, html) {
    lastFocused = document.activeElement;
    $('#modalTitle').textContent = title;
    $('#modalSub').innerHTML = sub || '';
    $('#modalBody').innerHTML = html;
    $('#modalHost').classList.add('is-open');
    // 等一帧再聚焦，避开「元素刚插入还不可聚焦」的时序问题
    requestAnimationFrame(function () {
      const f = $('#modal').querySelector(FOCUSABLE);
      if (f) f.focus();
    });
  }

  /** Tab 焦点锁在弹窗内，不让键盘用户 Tab 到背后的页面上去 */
  function trapFocus(e) {
    const host = $('#modalHost');
    if (!host.classList.contains('is-open') || e.key !== 'Tab') return;
    const items = $$('#modal ' + FOCUSABLE).filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* -------------------------------------------------- 数据导入 / 导出 */
  /* 导出的是「源数据」形态：派生字段（_t / ago / trustScore / score / cd …）全部剥掉，
     绝对时间用 verifiedAt 输出 —— ago 只能是派生值，不能进源数据。 */
  const DERIVED = ['_t', 'ago', 'verifiedAt', 'verifiedISO', 'trust', 'trustScore', 'trustLevel',
    'verify', 'expired', 'sources', 'completeness', 'score', 'parts', 'cd', 'risky', 'apiFree', 'ts'];

  function stripDerived(o) {
    const out = {};
    Object.keys(o).forEach(k => {
      if (k.charAt(0) === '_') return;
      if (DERIVED.indexOf(k) >= 0) return;
      out[k] = o[k];
    });
    if (o.verifiedISO) out.verifiedAt = o.verifiedISO;
    return out;
  }

  function plainList(k) { return (DB[k] || []).map(stripDerived); }

  function DBexport() {
    return JSON.stringify({
      meta: Object.assign({}, DB.meta, {
        exportedAt: new Date().toISOString(), schemaVersion: '1.0', app: APP.version
      }),
      models: plainList('models'), deals: plainList('deals'), codes: plainList('codes'),
      radar: plainList('radar'), tools: DB.tools, headlines: DB.headlines, votes: VOTES
    }, null, 2);
  }

  /** 生成可直接粘回 assets/js/data.js 的片段 —— 这是「让数据长期留下来」的唯一办法 */
  function DBpatch(sections) {
    sections = sections || ['models', 'deals', 'codes', 'radar', 'tools'];
    const body = sections
      .filter(k => DB[k] && DB[k].length)
      .map(k => '  ' + k + ': ' + JSON.stringify(plainList(k), null, 2).split('\n').join('\n  '))
      .join(',\n');
    return '/* FreeModel Radar 导出 · ' + new Date().toISOString() +
      ' · 粘贴进 assets/js/data.js 覆盖 window.FMR_SOURCE 对应字段 */\n' +
      'window.FMR_SOURCE = {\n' + body + '\n};';
  }

  const FETCH_MAX_BYTES = 2 * 1024 * 1024;   // 2MB 上限
  const FETCH_TIMEOUT_MS = 8000;             // 8 秒超时

  /** 远端地址白名单：https 优先；本地开发放宽到 localhost 与相对路径 */
  function remoteUrlAllowed(url) {
    return /^https:\/\//i.test(url) ||
           /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url) ||
           /^\.{0,2}\//.test(url);
  }

  /** 拉取 → 校验 → 落地。任何一步失败都不碰现有数据（失败即回滚） */
  function fetchRemote(url) {
    if (!url) { toast('请填写数据地址'); return; }
    if (!remoteUrlAllowed(url)) {
      toast('只接受 https 地址，或本地 http://localhost / 相对路径');
      return;
    }
    toast('正在拉取数据…');

    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;

    fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(txt => {
        if (txt.length > FETCH_MAX_BYTES) throw new Error('数据超过 2MB 上限');
        let p;
        try { p = JSON.parse(txt); } catch (e) { throw new Error('不是合法 JSON'); }
        // 校验不通过就到此为止，现有数据一行都不会被改
        const res = window.FMR.ingest(p, { persist: true });
        if (!res.ok) {
          toast('导入失败：' + (res.errors[0] || '数据不合规范'));
          return;
        }
        DATA_URL = url;
        toast('已导入远端数据 · 新增 ' + res.report.added + ' · 更新 ' + res.report.updated);
        closeModal();
      })
      .catch(e => {
        const msg = e && e.name === 'AbortError' ? '超时（8 秒）' : (e && e.message);
        toast('拉取失败：' + msg + ' · 现有数据未改动');
      })
      .then(() => { if (timer) clearTimeout(timer); });
  }

  function doIngest() {
    const el = document.getElementById('ingestText');
    const raw = (el && el.value ? el.value : '').trim();
    if (!raw) { toast('请先粘贴 JSON'); return; }
    let p;
    try { p = JSON.parse(raw); }
    catch (e) { toast('JSON 解析失败：' + e.message); return; }
    const res = window.FMR.ingest(p, { persist: true });
    if (!res.ok) {
      toast('校验未通过 · ' + res.errors.length + ' 处问题');
      window.alert('校验未通过：\n\n' + res.errors.slice(0, 12).join('\n') +
        (res.errors.length > 12 ? '\n…共 ' + res.errors.length + ' 处' : ''));
      return;
    }
    const r = res.report;
    toast('导入完成 · 新增 ' + r.added + ' · 更新 ' + r.updated + (r.skipped ? ' · 跳过 ' + r.skipped : ''));
    closeModal();
  }

  function openIngest() {
    const sample = JSON.stringify({
      models: [{
        id: 'my-model-id', name: 'Model Name', vendor: 'Vendor', vendorCn: '厂商中文名',
        country: 'CN', caps: ['chat', 'api'], freeType: 'quota',
        summary: '一句话说明这个模型怎么免费', quota: '额度描述，例如：每日 200 次',
        end: null, needSignup: true, needCard: false, needCode: false,
        capability: 85, stability: 88, url: 'https://example.com', apiUrl: 'https://api.example.com',
        ago: 0, up: 0, down: 0, tags: ['标签']
      }]
    }, null, 2);

    openModal('数据接口 · Agent Ingest', '本地 Agent 抓到的数据，直接灌进来',
      '<div class="ingest-note">' +
        '<b>本站是纯静态站点，没有服务端。</b>你的投票与导入数据都写在<b>本机浏览器</b>的 localStorage 里，' +
        '不会上传到任何地方；换浏览器或清缓存会丢失。想让数据长期留下来，用下方的' +
        '<b>「生成 data.js 补丁」</b>把内容写回文件即可。' +
      '</div>' +

      '<div class="foot-h ingest-label">① 粘贴 JSON（按 id 合并，已存在则更新）</div>' +
      '<textarea id="ingestText" class="ingest-ta" spellcheck="false" ' +
        'placeholder=\'{"models":[...],"deals":[...],"codes":[...],"radar":[...],"headlines":{...}}\'></textarea>' +
      '<div class="row mt-2 gap-sm">' +
        '<button class="btn btn-primary" data-action="do-ingest">校验并导入</button>' +
        '<button class="btn" data-action="export-patch">生成 data.js 补丁</button>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn-ghost" data-action="export-all">导出全量 JSON</button>' +
        '<button class="btn btn-ghost" data-action="export-votes">导出我的投票</button>' +
      '</div>' +

      '<div class="foot-h ingest-label">② 从 URL 拉取（需 http(s) 或同源相对路径；file:// 会被 CORS 拦下）</div>' +
      '<div class="row gap-sm">' +
        '<input id="ingestUrl" class="ingest-input" placeholder="http://127.0.0.1:8000/fmr.json" value="' + esc(DATA_URL) + '">' +
        '<button class="btn" data-action="ingest-url">拉取并导入</button>' +
      '</div>' +
      '<div class="faint fs-xs mt-1">' +
        '启动时自动拉取：用 <span class="mono">?data=&lt;url&gt;</span> 打开本页。' +
      '</div>' +

      '<div class="foot-h ingest-label">③ Agent 直接调用（控制台 / 浏览器自动化脚本）</div>' +
      '<pre class="ingest-code">' + esc(
        "FMR.ingest({ models:[...] })               // 按 id 合并，返回 {added, updated, skipped}\n" +
        "FMR.ingest({ headlines:{ groups:[...] } }) // 只更新首页热闻轮播\n" +
        "FMR.validate(payload)                      // 先校验再导入，返回 {ok, errors, warnings}\n" +
        "FMR.export()                               // 导出全量数据（含热闻与我的投票）\n" +
        "FMR.toPatch(['models','deals'])            // 生成可直接粘回 data.js 的片段\n" +
        "FMR.find('gemini')                         // 站内搜索\n" +
        "FMR.state()                                // 当前筛选状态\n" +
        "FMR.refresh()                              // 重绘\n" +
        "FMR.reset()                                // 清空本机导入与投票并重载"
      ) + '</pre>' +

      '<div class="foot-h ingest-label">④ 字段约束</div>' +
      '<div class="ingest-schema">' +
        '<div><b>models</b> 必填 · id, name, vendor, country, caps[], freeType, summary, quota, url</div>' +
        '<div><b>freeType</b> · free / quota / limited / newuser / code / apifree</div>' +
        '<div><b>caps</b> · chat / api / coding / agent / image / video / audio / embedding</div>' +
        '<div><b>deals</b> 必填 · id, title, vendor, country, free, how, url</div>' +
        '<div><b>codes</b> 必填 · id, title, vendor, code, reward, url</div>' +
        '<div><b>radar</b> 必填 · text（可选 type / ago / url / modelId）</div>' +
        '<div><b>headlines</b> · { groups:[{ id, theme, emoji, accent, items:[{ t, s, h, ago, tag, url }] }] }</div>' +
      '</div>' +

      '<details class="mt-4">' +
        '<summary class="faint fs-sm cur-p">查看最小可用示例</summary>' +
        '<pre class="ingest-code mt-2">' + esc(sample) + '</pre>' +
      '</details>' +

      '<div class="row mt-4 gap-sm bt pt-4">' +
        '<span class="faint mono fs-xs">本机已存 ' + Object.keys(VOTES).length + ' 条投票 · ' +
          DB.models.length + ' 个模型</span>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn-ghost fg-red" data-action="wipe">清空本机数据</button>' +
      '</div>'
    );
  }

  /* --------------------------------------------------------- 事件绑定 */
  function bind() {
    renderNav();

    // 地区切换（header 按钮 + 空状态里的降级按钮共用同一入口）
    function setRegion(v) {
      STATE.region = v;
      $$('#region button').forEach(x => {
        const on = x.dataset.region === v;
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');   // 单选按钮组的选中态
      });
    }
    $('#region').addEventListener('click', e => {
      const b = e.target.closest('button[data-region]');
      if (!b) return;
      setRegion(b.dataset.region);
      render();
    });

    // 主题
    $('#themeToggle').addEventListener('click', toggleTheme);

    // 移动端导航折叠
    const navToggle = $('#navToggle'), navEl = $('#nav');
    function setNav(open) {
      navEl.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? '收起导航菜单' : '展开导航菜单');
    }
    navToggle.addEventListener('click', () => setNav(!navEl.classList.contains('is-open')));
    navEl.addEventListener('click', e => { if (e.target.closest('.nav-link')) setNav(false); });

    // 全局委托
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-action]');
      if (!t) return;
      const a = t.dataset.action, v = t.dataset.v;

      if (a === 'cap')       { STATE.cap = v; render({ scroll: false }); }
      else if (a === 'type') { STATE.freeType = v; render({ scroll: false }); }
      else if (a === 'ide')  { STATE.ide = v; render({ scroll: false }); }
      else if (a === 'layout') { STATE.layout = v; render({ scroll: false }); }
      else if (a === 'region') { setRegion(v); render({ scroll: false }); }
      else if (a === 'reset') {
        STATE.q = ''; STATE.cap = 'ALL'; STATE.freeType = 'ALL'; STATE.sort = 'score'; render({ scroll: false });
      }
      else if (a === 'copy')  { copyText(v); }
      else if (a === 'detail') { openDetail(t.dataset.id); }
      else if (a === 'report') { toast('已记录反馈，感谢！这将帮助其他人避坑'); closeModal(); }
      else if (a === 'vote') {
        const coll = t.dataset.coll, id = t.dataset.id, kind = t.dataset.kind;
        const o = findObj(coll, id);
        if (!o) return;
        const key = coll + ':' + id;
        const next = VOTES[key] === kind ? null : kind;   // 再点一次 = 取消
        if (next) VOTES[key] = next; else delete VOTES[key];
        saveVotes();
        o.trustScore = trustScore(o);
        o.trustLevel = trustLevel(o.trustScore);
        toast(next === 'up'   ? '已标记为「仍有效」✓ · 存在本机' :
              next === 'down' ? '已标记为「已失效」· 感谢反馈'   : '已取消反馈');
        render({ scroll: false });
      }
      else if (a === 'refresh-radar') { refreshRadar(); }
      else if (a === 'ingest')        { e.preventDefault(); openIngest(); }
      else if (a === 'do-ingest')     { doIngest(); }
      else if (a === 'ingest-url')    { fetchRemote($('#ingestUrl').value.trim()); }
      else if (a === 'export-all')    { copyText(DBexport()); }
      else if (a === 'export-patch')  { copyText(DBpatch()); }
      else if (a === 'export-votes')  { copyText(JSON.stringify(VOTES, null, 2) || '{}'); }
      else if (a === 'wipe') {
        if (window.confirm('确定清空本机的投票与导入数据？此操作不可撤销。')) {
          lsDel(LS_VOTES); lsDel(LS_PATCH); lsDel(LS_DATA); lsDel(LS_HEAD);
          VOTES = {};
          toast('已清空本机数据，正在重载…');
          setTimeout(() => location.reload(), 700);
        }
      }
      else if (a === 'buzz') {
        if (v === 'prev') buzzGo(BUZZ.i - 1, true);
        else if (v === 'next') buzzGo(BUZZ.i + 1, true);
        else if (v === 'toggle') buzzToggle();
        else if (v === 'go') buzzGo(parseInt(t.dataset.i, 10), true);
      }
    });

    // 搜索（首页 / 模型库）
    document.addEventListener('input', e => {
      if (e.target.id === 'heroSearch') {
        STATE.q = e.target.value;
        clearTimeout(window.__t);
        // 首页输入后自动跳转模型库（hashchange 会触发渲染）
        window.__t = setTimeout(() => go('models'), 280);
      } else if (e.target.id === 'modelSearch') {
        STATE.q = e.target.value;
        STATE.focusSearch = true;
        clearTimeout(window.__t2);
        window.__t2 = setTimeout(() => render({ scroll: false }), 180);
      }
    });

    // 排序
    document.addEventListener('change', e => {
      if (e.target.id === 'sortSel') { STATE.sort = e.target.value; render({ scroll: false }); }
    });

    // Modal
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalHost').addEventListener('click', e => { if (e.target === $('#modalHost')) closeModal(); });

    // 回到顶部（scroll 用 rAF 节流，避免滚动时每像素都触发一次）
    $('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    let scrollTick = false;
    window.addEventListener('scroll', () => {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        $('#toTop').classList.toggle('is-show', window.scrollY > 500);
        scrollTick = false;
      });
    }, { passive: true });

    // 键盘
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
      trapFocus(e);
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '/') {
        e.preventDefault();
        const el = $('#heroSearch') || $('#modelSearch');
        if (el) { el.focus(); el.select(); }
      }
      if (e.key === 't' || e.key === 'T') toggleTheme();
    });
  }

  /** ID 类型隔离：必须显式指定集合，不让 id 自己承担类型判断。
      这是 Agent 批量导入时避免「跨集合误伤」的关键。 */
  function findObj(kind, id) {
    if (!kind || !KINDS.hasOwnProperty(kind) && KINDS.indexOf(kind) < 0) return null;
    const arr = DB[kind] || [];
    for (let i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    lsSet(LS_THEME, next);
    toast(next === 'dark' ? '已切换到深色' : '已切换到浅色');
  }

  /* ================================================= 公共 API（Agent 入口）
     挂在 window 上，浏览器控制台、书签脚本、Playwright / Puppeteer 脚本都能直接调。
     设计原则：Agent 能自动做的全部走这里；只有需要登录、验证码、人机校验的才留给人。 */
  window.FMR = {
    version: APP.version,

    /** 按 id 合并导入。opts: { persist: true 落盘, append: false 只更新不新增 } */
    ingest: function (payload, opts) {
      opts = opts || {};
      const v = this.validate(payload);
      if (!v.ok) return { ok: false, errors: v.errors, warnings: v.warnings };

      const rep = { added: 0, updated: 0, skipped: 0, sections: {} };
      const KEYS = ['models', 'deals', 'codes', 'radar'];

      KEYS.forEach(k => {
        if (!payload[k] || !payload[k].length) return;
        payload[k].forEach(item => {
          if (!item || !item.id) { rep.skipped++; return; }
          let idx = -1;
          for (let i = 0; i < DB[k].length; i++) { if (DB[k][i].id === item.id) { idx = i; break; } }
          if (idx >= 0) {
            DB[k][idx] = Object.assign({}, DB[k][idx], item);
            rep.updated++;
          } else if (opts.append === false) {
            rep.skipped++;
          } else {
            DB[k].push(item);
            rep.added++;
          }
        });
        rep.sections[k] = payload[k].length;
      });

      if (payload.tools && payload.tools.length) DB.tools = payload.tools;

      // 热闻单独存，Agent 每天只更这一个文件即可
      if (payload.headlines && payload.headlines.groups) {
        DB.headlines = payload.headlines;
        lsSet(LS_HEAD, payload.headlines);
        rep.sections.headlines = payload.headlines.groups.length + ' 组';
      }

      DB = normalize(DB);   // 重算 Free Score / 验证状态 / 倒计时

      // 只把「改了什么」写进 patch，绝不写整份快照
      if (opts.persist !== false) {
        KEYS.forEach(k => {
          (payload[k] || []).forEach(item => {
            if (!item || !item.id) return;
            const changes = {};
            Object.keys(item).forEach(f => { if (f !== 'id') changes[f] = item[f]; });
            delete changes.ago;                       // 派生字段不入库
            if (!changes.verifiedAt) changes.verifiedAt = new Date().toISOString();
            writePatch(k, item.id, changes);
          });
        });
      }
      render({ scroll: false });
      return { ok: true, report: rep, warnings: v.warnings };
    },

    /** 只校验不落盘，Agent 可以先 validate 再 ingest */
    validate: function (p) {
      const errors = [], warnings = [];
      const RULE = {
        models: ['id', 'name', 'vendor', 'country', 'caps', 'freeType', 'summary', 'quota', 'url'],
        deals:  ['id', 'title', 'vendor', 'country', 'free', 'how', 'url'],
        codes:  ['id', 'title', 'vendor', 'code', 'reward', 'url']
      };
      const TYPES = ['free', 'quota', 'limited', 'newuser', 'code', 'apifree'];
      const CAPS  = ['chat', 'api', 'coding', 'agent', 'image', 'video', 'audio', 'embedding'];

      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        errors.push('payload 必须是对象');
        return { ok: false, errors: errors, warnings: warnings };
      }

      const hasId = (arr, id) => {
        for (let i = 0; i < arr.length; i++) { if (arr[i].id === id) return true; }
        return false;
      };

      Object.keys(RULE).forEach(k => {
        (p[k] || []).forEach((it, i) => {
          if (!it || typeof it !== 'object') { errors.push(k + '[' + i + '] 不是对象'); return; }
          if (!it.id) { errors.push(k + '[' + i + '] 缺少必填字段 id'); return; }
          // 已存在的条目按「增量补丁」处理 —— Agent 只想改个截止日期或额度时，
          // 不该被逼着把全部必填字段重新发一遍。
          if (hasId(DB[k], it.id)) {
            warnings.push(k + '[' + i + '] (' + it.id + ') 已存在，按增量更新处理');
            return;
          }
          RULE[k].forEach(f => {
            if (f === 'id') return;
            if (it[f] === undefined || it[f] === null || it[f] === '') {
              errors.push(k + '[' + i + '] 缺少必填字段 ' + f);
            }
          });
        });
      });

      (p.models || []).forEach((m, i) => {
        if (m.freeType && TYPES.indexOf(m.freeType) < 0) {
          errors.push('models[' + i + '] freeType 非法：' + m.freeType + '（应为 ' + TYPES.join('/') + '）');
        }
        if (Array.isArray(m.caps)) {
          m.caps.forEach(c => {
            if (CAPS.indexOf(c) < 0) warnings.push('models[' + i + '] 未识别的能力标签：' + c);
          });
        } else if (m.caps !== undefined) {
          errors.push('models[' + i + '] caps 必须是数组');
        }
        if (m.end && !/^\d{4}-\d{2}-\d{2}$/.test(m.end)) {
          warnings.push('models[' + i + '] end 建议用 YYYY-MM-DD 格式，当前：' + m.end);
        }
        if (m.capability != null && (m.capability < 0 || m.capability > 100)) {
          warnings.push('models[' + i + '] capability 应在 0-100');
        }
      });

      (p.radar || []).forEach((r, i) => { if (!r.text) errors.push('radar[' + i + '] 缺少 text'); });

      if (p.headlines && p.headlines.groups) {
        p.headlines.groups.forEach((g, i) => {
          if (!g.theme) errors.push('headlines.groups[' + i + '] 缺少 theme');
          if (!g.items || !g.items.length) warnings.push('headlines.groups[' + i + '] 没有条目');
        });
      }

      if (!errors.length) {
        const known = ['models', 'deals', 'codes', 'radar', 'tools', 'headlines', 'meta'];
        Object.keys(p).forEach(k => {
          if (known.indexOf(k) < 0) warnings.push('未识别的顶层字段：' + k + '（会被忽略）');
        });
      }
      return { ok: errors.length === 0, errors: errors, warnings: warnings };
    },

    export: DBexport,
    toPatch: DBpatch,
    refresh: function () { render({ scroll: false }); },
    find: function (q) {
      return DB.models.filter(m => matchQ(m, q || '')).map(m => ({
        id: m.id, name: m.name, vendor: m.vendor, country: m.country,
        freeType: m.freeType, score: m.score, url: m.url
      }));
    },
    state: function () { return JSON.parse(JSON.stringify(STATE)); },
    votes: function () { return JSON.parse(JSON.stringify(VOTES)); },
    /** 只清掉本机的增量与投票，回到 data.js 的官方基准 */
    reset: function () {
      lsDel(LS_VOTES); lsDel(LS_PATCH); lsDel(LS_DATA); lsDel(LS_HEAD);
      location.reload();
    }
  };

  /* ============================================================ 启动 */
  function boot() {
    /* 主题：本机选择 > 系统偏好 > 深色兜底（不写死 dark） */
    let theme = lsGet(LS_THEME);
    if (!theme) {
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);

    // 用户没手动选过时，跟着系统主题走
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = function (e) {
        if (!lsGet(LS_THEME)) document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);   // 老 Safari
    }

    // ?data=<url> —— Agent 场景：启动时自动从本地服务拉一次数据
    try {
      const u = new URLSearchParams(location.search).get('data');
      if (u) DATA_URL = u;
    } catch (e) {}

    loadVotes();
    migrateSnapshot();   // 旧版全量快照 → 增量 patch（只跑一次，跑完即删快照）

    loadData().then(src => {
      DB = normalize(src);
      bind();
      window.addEventListener('hashchange', render);
      render();

      // 首屏骨架退场
      const bs = $('#bootSkeleton');
      if (bs) bs.remove();
      const fv = $('#footVersion');
      if (fv) {
        const ts = DB.meta && DB.meta.updatedAt ? new Date(DB.meta.updatedAt).getTime() : 0;
        let age = '';
        if (ts) {
          // 站点承诺每日更新，所以阈值按「小时」算：超过 24 小时就是没跟上节奏
          const hours = Math.floor((Date.now() - ts) / HOUR);
          age = ' · 数据核实于 ' + relTime(ts) +
                (hours >= 24 ? ' ⚠️ 已超 24 小时，今日更新尚未执行' : '');
        }
        fv.textContent = APP.name + ' · v' + APP.version + age
          + ' · ' + UPDATE_CADENCE + ' · 数据层可替换为后端 API / 爬虫自动更新';
      }

      // 每分钟重算倒计时与验证状态（保持滚动位置）
      setInterval(function () { render({ scroll: false }); }, 60000);
      if (DATA_URL) fetchRemote(DATA_URL);
    }).catch(err => {
      const bs = $('#bootSkeleton');
      if (bs) bs.remove();
      document.querySelector('main').innerHTML =
        '<div class="empty"><div class="empty-mark">⚠</div><p>数据加载失败：' + esc(err && err.message) + '</p></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
