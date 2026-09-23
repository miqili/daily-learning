# 项目长期记忆 —— daily-learning

上海成考专升本（理工类），2026-10-17 考政治/英语/高等数学一。链路：真题入库(MySQL)→考点分析→必备题集→知识点清单→5周冲刺→Web做题系统（PC + H5）。

> 查表类内容（试卷结构数字、对话答案序、首灌明细、四桶元数据、验收清单、outputs 存量清单）见同目录 **`参考台账.md`**。

## 1. 库 / 部署
- MySQL `8.218.204.8:43306 daily_learning`，user `study_app`，pwd 只存仓库根 `.env`。`exam_papers` 无 total_questions/total_score；`knowledge_items` 字段是 `extra_json`；用户表 `sys_users`（demo=1/lyq=4）。科目精确值 `政治`/`英语`/`高等数学（一）`，展示统一「高等数学一」；PDF 源 `~/Downloads/{高等数学一,政治,英语}/`。
- Docker（mysql:8.4+api+web，8080→80，nginx 反代 /api/）：镜像内不编译——web 拷 web/dist，server 容器内 pnpm install 后拷 shared+server dist；构筑前本地 build 并同步 dist。dist 在 .gitignore。

## 2. 本地联调（连远程库，必须非沙箱）
- server 从仓库根启：`node packages/server/dist/main.js`（在 packages/server 内启会拿不到根 .env → JWT 默认 secret → 全站 401）。vite：`cd packages/web && node node_modules/vite/bin/vite.js --port 5173`；沙箱里 `vite build` 清 dist 会被拦 → 加 `--emptyOutDir false`。
- 起长驻服务：① `run_in_background`；② 与验收写同一条命令——`node … & API_PID=$!` → 跑完 Playwright → 末尾 `kill $API_PID`。`(node … &)` 单独一次调用必失败（父 shell 退出即回收）。
- ⚠️⚠️ 绝不按端口盲杀：2026-09-23 用 `for p in $(lsof -ti -iTCP:3000); do kill -9 $p` 清「残留」，`76075` 实为宿主 node 服务 → 把 WorkBuddy 一起杀掉（该次调用连 `echo` 都无输出＝shell 中途被杀）。先 `lsof -p <pid>` 确认属主，身份不明不 kill；查占用 `lsof -nP -iTCP:$p -sTCP:LISTEN`；curl 探测带 `NO_PROXY=127.0.0.1,localhost`。
- JWT 2h 过期→全站 401 空态（易误判页面坏）；自签 payload `{id,username,role}` HS256，secret 取根 `.env` 的 JWT_SECRET。venv `~/.workbuddy/binaries/python/envs/default/bin/python`；远程池偶发断连 500 → 重启 API。

## 3. Playwright 冒烟
- 显式 `executable_path=~/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`。
- 登录态双重：`add_init_script` 写 `shck_token`（否则 `restore()` 失败即跳 /login）+ `page.route('**/api/v1/**')` 拦截，handler 内 URL 改写到 `http://127.0.0.1:3000/api/v1`（vite proxy 默认指生产容器 8.218.204.8:8080，secret 不同 → 自签 token 必 401）。`route.fetch` 参数是 `post_data` 不是 `data`。
- 测「点击后滚动位置」用 JS `el.click()`——`page.click()` 会先把元素滚进视口，掩盖跳顶 bug。van-collapse 展开点 `.van-cell`；隐藏章节元素 `bounding_box()` 为 None，用 `:visible`。

## 4. 产出 / 脚本约定
- 报告出 outputs/（2026-09-23 清理后仅存 8 份，见 `参考台账.md` §H），中间脚本/JSON 放 /tmp。公式一律 LaTeX（禁 `<sup>/<sub>`，中文不进数学模式）；报告用 MathJax（assets/mathjax 本地优先），Web 用 KaTeX。
- 考点统计只看 content 不看 answer。
- 易错事实：① 2024/2025 是 18 题新结构非残卷 ② 大纲=2024 年版 ③ 机构 28 题「2026 冲刺卷」是旧题库贴新标签 ④ 高数一解答题二重积分 11 套 100% 命中 ⑤ 以用户给的 PDF 为准，不擅自补录。
- ✅ 2020 高数一（paper_id=43）已按真题册实拍全量重录：选择1-10/填空11-20/解答21-28，答案 `D C A A B B D A C B`；卷名去「网友回忆版」，`source_type=VERIFIED_OFFICIAL`（其余年份仍 VERIFIED_RECALL）。必背卡题号已重映射；builtin-must-read.ts 与 DB 双侧同步。

## 5. 英语 / 政治数据要点
- 单词配音标+中文+点读（speechSynthesis 离线，en-GB rate=0.9，事件委托 `[data-say]/[data-read]`，勿引外部音频/CDN）。英文一词不删只增量。
- 补全对话库内无正文（`/tmp/dlg_all.json`），用形状法判功能；规则与逐年答案序见 `参考台账.md` §B。
- 政治必背已全部在库（`builtin-must-read.ts` 111 条）；历史口径「离线 HTML 102 条/16 组」的那份 HTML 已于 2026-09-23 删除。人工归纳高频卡，不得说「逐题统计得出」。

## 6. 设计令牌与 UI 约定
- PC 用 `--wb-*`（assets/design-system.css，已在 :root 勿写回）；移动端用 `--app-*`/`--study-*`（main.css，蓝 #2563eb）。薄荷绿 #28B894／墨 #191A23／正文 #4A4C58／弱 #858699／描边 #D2D3E0·#E8E8EE／紫 #6C4DFF。圆角 4/8/12/16。科目色 数学#28B894／英语#6C4DFF／政治#F97316。
- PC 新建页面自绘原生 button/input（禁 antd）；半透明悬浮用 rgba+backdrop-filter；空态 AppEmptyState。CSS 块注释里不能出现 `*/`。断言前先打印实测 getComputedStyle。
- 选 DOM 别写 `el.querySelector('div div')`：el 自身是 div 时其子 div 全命中；判嵌套用 `kids.some(k => k.querySelector('div'))`。
- ⚠️ **输入框聚焦统一样式（2026-09-23 用户定规，后续勿破）**：只允许改**容器边框色**，**禁止 `box-shadow` 光圈与 `outline`**；PC 统一 `--wb-brand`，移动端统一 `--app-primary`（选择器全表见 `参考台账.md` §G）。按钮/链接的键盘 `:focus-visible` 轮廓**保留**（可访问性，非输入框）。
- 已知站点级问题：无 `public/` 且 index.html 未声明 favicon → `/favicon.ico` 恒 404，全站都有，验收放行。

## 7. 做题系统（PC + H5）
- 路由：PC `/papers`、`/papers/:paperId`（PapersView 双模式）；H5 `/m/papers`、`/m/papers/:paperId`。共用 `utils/paperQuestion.ts`（officialNumber/answerKeyOf 支持 A–H/isObjective/objectiveTally）。
- PC 侧栏展开196px（≤1080→176）/折叠68px，默认收起，动画只收宽度；RouterLink 不能加 aria-label/title。列表=Hero+sticky筛选条+年份卡；详情=232px粘性目录+题目流；深链 `?no=` 原卷题号；滚动联动「越过判定线的最后一个」+rAF。hover：品牌描边+上浮2px。
- 答题模式：practiceKey=`shck_practice_paper_{id}`（跨端续答）；判题只走 paperQuestion.ts；`.is-answer`=正解/`.is-right|.is-wrong`=作答；`.papers-page.is-practice` 前缀零布局改动；快捷键 A–H/1–8、←→、Enter交卷、R重做、Space；错题本按 source 去重；主观题自评键 `shck_paper_self_{id}`。`.q-option` 有 .3s 过渡，断言前 wait 500ms。H5 用 van-swipe（`.van-swipe-item.is-current-q`）、答题卡 van-popup 按板块分组、红上标=未答客观题数。

## 8. 必背考点模块（PC `/must-read` + H5 `/m/must-read`）
- 数据=章节 MATERIAL + 必背卡 MUST_READ，`extra.origin='sprint5w'`，取数只认 origin。条数 政治111/英语95/数学74；排序=sort_order。
- extra 契约：chapter/chapterIntro/section/group；政治 refs/priority、英语 ipa/say/cn、数学 tex/note/tail（formula/method/table）。`note` 走 KatexRenderer（纯文本禁 HTML）；`notes`/`texNote`/`chapterIntro` 走 KatexHtml（可 HTML）；table 卡 `rowMeta.level=hot/mid` 上色；refs 走 MustReadRefs / MobileMustReadRefs 跳 `?no=`。
- ⚠️ **灌库链路已变（2026-09-23）**：源 HTML（3 份 5周冲刺保底方案）与 /tmp 抽取脚本均已随 outputs/ 清理删除 → **`builtin-must-read.ts` 现即权威源**：改内容直接改它，再 `pnpm db:must-read`（按 origin 先删后插）；DB 与 TS 须双侧同步，只改一边会被覆盖。TypeORM 坑：含点的 orderBy 当路径→500，用 addSelect CASE 再排序。
- 正文分层：`utils/prose.ts` 的 `decorateProse()` 渲染前给裸 HTML 打 `.p-*` 语义类，PC 用 `.mr-rich`、H5 用 `.mmr-rich` 承接；判定保守（≥2 项且占比≥70%，猜不中退化成 `p-box`）；序号徽标 `.mr-chapter-no` 32px 实心科目色（H5 `.mmr-ch-no` 21px），色调经 `--ch-tone`/`--mmr-tone` 注入。类名清单与回归脚本见 `参考台账.md` §E。
- KaTeX 双通道勿混（KatexRenderer 纯文本 / KatexHtml 已清洗 HTML）；裸 `\quad` 用 utils/texSpacing.ts 归一化（先 escape 后归一，display 不归一）。mysql2 JSON 列返回对象，JSON.parse 前判 typeof；多行 JSON 别 grep，先 parse。
- 排序契约（勿当 bug 改）：章节按投入产出比（毛中特→习概→哲学→时政），组内按知识点逻辑链——刻意不按卷面题号。「排序说明」导语现只存在于 `builtin-must-read.ts` 的 chapterIntro（离线 HTML 已删）。
- 验收脚本见 `参考台账.md` §F。

## 9. H5（移动端）页面与红线
- 路由 `/m/*`（MobileLayout 三 tab：今日/检索/我的）。页面一律独立实现，不复用 PC 页面（TaskExecutionView 除外）；PC 组件另建 `components/mobile/*`。
- 已建：`/m/must-read`、`/m/mistakes`、做题页（错题入本+主观题自评+`?no=` 深链）、真题列表年份 chip+搜索；入口在 MobileMeView「我的学习」菜单。仍未做（P2）：H5 计划配置页（PC /plan）、学习计时、短语簿卡组。
- 样式：`.study-page`/`.study-screen`/`.study-segmented`/`.study-filter`(44px pill)/`.study-primary`/`.study-secondary`；vant 全局注册（main.ts `app.use(Vant)`，4.10），组件直接用不用 import。
- 红线：① 不复用 PC 组件 ② 数据表不用原生 `<table>`，改「首列标题+键值块」 ③ 禁止整卡 `overflow-x:auto`，只让公式/表格自己滚 ④ 不自造按钮，用 `.study-*` 保 44px 触控 ⑤ 不裸写 hex，只用 `--app-*` ⑥ 不重复声明 min-height ⑦ 必带 `@media (max-width:370px)` 与 `:active` 反馈。
- 接口返回体统一 `{code,message,data}`，`unwrap` 已处理；手写冒烟脚本要自己取 `data`。

## 10. 考点增补模块（PC `/tradeoff`）
- 页面名＝考点增补（用户 2026-09-22 指正：「取舍台账」是内部工作语）。路由名 `tradeoff`／表名 `tradeoff_items`／接口 `/api/v1/tradeoff`／文件名一律不动，只改用户可见文案。
- 定位：必背清单之外但仍会考的那部分（实测每年约 12 题），按可回收性分四桶；只解客观题（35×2=70 分），不碰主观题。科目维度暂时只有政治（`TradeoffView.vue` 的 `SUBJECT_ORDER`）。
- 2026-09-23 面向学习者重做（用户原话「我在增补记录切换 不需要你向上滚动 你不觉得现在的设计很鸡肋吗 这是一个学习平台诶」）：主体＝按桶分组的背诵卡（组可折叠，卡上「不熟／已掌握」二态）；顶部只放学习指标（距考试/考点/未看/不熟/已掌握 + 进度条）＋学习态筛选（全部考点/不熟清单/已掌握/未看）；台账信息（题/年损失/可回收/折合分、流程状态、条目管理）收进默认折叠的「补录管理」，考场技巧另设折叠区。
- `mastery` 字段（迁移 `2026092301-tradeoff-mastery.ts`）：`TINYINT NOT NULL DEFAULT 0`，0未标记/1不熟/2已掌握，与 `status`(pending/done/verified) 正交。共享常量 `TRADEOFF_MASTERY*` 在 `packages/shared/src/index.ts`；DTO 支持 `mastery`(0/1/2) 与 `unmastered=1`（→ `mastery < 2`）；`summary()` 返回 `byMastery`+`unmastered`；seed 一律 `mastery: 0`。
- 滚动跳顶根因（已修）：筛选时列表被 `v-if="busy"` 骨架屏替换 → DOM 高度塌陷 → 浏览器把 `scrollY` 夹回 0。两处修：① `router/index.ts` 的 `scrollBehavior` 对纯 query 变更返回 `false`；② `TradeoffView` 加 `firstLoad`，骨架屏只在首屏出现，重新取数时 `.tp-groups` 保持挂载只降透明度（`.is-refreshing`）。
- 数据：表 `tradeoff_items`（迁移 `2026092201-tradeoff-ledger.ts`，实体 `entities/tradeoff-item.entity.ts`）。字段 `bucket`(xigai/shizheng/zhexue/maozhongte)、`entry_date`、`title`、`content`(纯文本禁 Markdown)、`source`、`keywords`(逗号串)、`status`、`mastery`、`important`(历史列，UI 已改用 mastery)、`sort_order`、`origin`。
- 接口 `/api/v1/tradeoff`（GET 列表+四桶 summary／POST／PATCH:id／DELETE:id）。`@Get('summary')` 必须声明在 `@Get(':id')` 之前。
- 幂等灌库：`pnpm db:tradeoff` → `builtin-tradeoff.ts` + `import-tradeoff.ts`。只删 `origin='tradeoff-seed'` 的行，用户补录的（origin=NULL）不清。**支持分批**：条目级 `entryDate`（缺省落 `TRADEOFF_SEED_DATE`），自检按「日期集合 + 每批条数」。当前 20 条 × 2 账号（user 1→subject 1，user 4→subject 7）：习概 10／时政 6／哲学 3／毛中特 1，批次一 `2026-09-22` 15 条 + 批次二 `2026-09-23` 5 条；明细见 `参考台账.md` §C。
- 正文口径（红线）：`content` 必须是给学生直接读、直接背的原文 + 关键要素 + 出处，不是给助手的采集说明；方法论一律放 `tradeoffPlan.ts` 的 `ENTRY_RULES`（页面「方案与口径」面板）。自检 SQL：`content LIKE '%采集窗口%' OR LIKE '%从哪收%'` 必须为 0；「可回收约 0.8 题/年」这类台账语也禁入正文。
- UI 红线：卡片（`.tp-group`/`.tp-item`，旧名 `.to-bucket`/`.to-entry`）禁止 border-left 3px 色条——只允许行内内容块（`.q-answer`/`.mr-chapter-intro`/页内 `.to-stage` 时间线）。桶标识一律「卡内小色点 + 名称着色」（`.tp-group-name::before` 9px、`.tp-mini-name::before` 6px），色值只取 `--wb-*`（见 `参考台账.md` §D）。验收断言 `borderLeftWidth === '1px'`。
- 时政窗口以考纲为准＝「上一年 7/1 ～ 考试当年 6/30」→ 本年度 `2025-07-01 → 2026-06-30`。旧口径「考前约 12 个月滚动 → 2025.10–2026.9」是错的（漏 2025 年 7—9 月的上合天津峰会、抗战 80 周年）。口径唯一权威处＝`tradeoffPlan.ts` 的 `SZ_WINDOW`（原先同步订正的离线报告已于 2026-09-23 删除）。
- ⚠️ **窗口已于 2026-06-30 闭合**（2026-09-23 起），补录重心从「等新事件」变为「窗口内全量收口」。**窗口外条目必须在该条正文里明写「窗口外，只作参考」并说明理由**（已按此处理：七一勋章颁授 2026-07-01、世界技能大赛 2026-09 上海 → 均标注；窗口内替代项＝第三届全国技能大赛 2025-09-19 郑州）。
- 四桶元数据（每年损失/可回收/折合分/时间窗/`ENTRY_RULES`/考场规则/被否技巧/25天日程）是前端常量，不入库；清单见 `参考台账.md` §D。
- 筛选走 `router.replace`（无历史记录，测试别 `go_back()`，点「全部考点」）。

## 11. 已交付与 outputs 现状
- 已交付：三科真题入库 + 考点分析 + 30题必备题集 + 知识点清单 + 5周冲刺；PC 真题页（重构+答题模式）/整站换肤/必背考点/考点增补；H5 做题页/必背/错题本；2020 高数一真题核对。
- ⚠️ **outputs/ 于 2026-09-23 大清理**：57 文件 24MB → **8 份 HTML + `assets/`，4.3MB**。现存 8 份＝知识点清单×3、必备题集×3（**L1–L4 难度分级的独立复习资料、未入库**，与库内标题仅重合 10%）+ 政治-主观题命题规律分析 + 英语-发音题满分攻略。已删 34 份＝「已入库」（3 份 5周冲刺→must_read 280 条 等）＋「分析/验证已完结」。**判定法：python 比对 HTML 条目标题 vs server `builtin-*.ts`，别凭文件名猜**；全清单与 assets 依赖见 `参考台账.md` §H。

## 12. 文档现状
- 7 份 md 全部**停在 2026-08-11**，此后新增的路由·模块·表·命令均未记；**无接口文档（刻意）**。缺口清单见 `参考台账.md` §I。
