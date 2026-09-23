/**
 * 章节正文（MATERIAL.content）排版增强。
 *
 * 背景：库里的正文是三份冲刺方案 HTML 的反向抽取，结构是「裸 <div> 套 <div>」——
 * 原来的指标卡网格、周计划行、小节都被剥成了无语义的 div，直接渲染出来就是一整片
 * 同样字号、同样颜色的文字，看不出层次。
 *
 * 这里不改数据，只在渲染前给顶层块打上语义 class，由 CSS 负责分层：
 *   .p-h        小节标题（h2–h6）
 *   .p-sec      含小标题的小节（白卡）
 *   .p-formula  含 $$…$$ 的公式块
 *   .p-stats    指标网格（原「70 分 / 35 题」这类数值卡）
 *   .p-rows     行列表（原「第 1 周 · 计划」这类标题 + 说明）
 *   .p-box      普通文本块   / .p-sub  小节内的子块
 *   .p-table    表格容器（统一补一层，负责圆角与横向滚动）
 *   .p-list     列表        / .p-p    段落
 *
 * 判定全部是「猜不中就不改」的保守规则：条件不满足时退化为普通块，
 * 最坏情况只是没有增强，不会破坏结构。
 */

const HEADING = /^H[1-6]$/;
const BLOCKY = 'table,ul,ol,h1,h2,h3,h4,h5,h6';

const text = (el: Element) => (el.textContent ?? '').trim();
const children = (el: Element) => Array.from(el.children);
const isDiv = (el: Element) => el.tagName === 'DIV';

/** 指标项：2–3 个 div 子；第 1 个是短标签，第 2 个是短数值（必须含数字） */
function isStatItem(el: Element): boolean {
  if (!isDiv(el)) return false;
  const kids = children(el);
  if (kids.length < 2 || kids.length > 3) return false;
  if (!kids.every(isDiv)) return false;
  // 注意不能写 el.querySelector('div div')：el 自身是 div 时，它的子 div 全部会被匹配上
  if (el.querySelector(BLOCKY) || kids.some((k) => k.querySelector('div'))) return false;
  const label = text(kids[0]);
  const value = text(kids[1]);
  return !!label && label.length <= 16 && !!value && value.length <= 20 && /\d/.test(value);
}

/**
 * 容器是否属于某一类「并列项」：命中数 ≥2 且占比 ≥70%。
 * 用比例而不是 every，是因为原 HTML 里常在并列项后面夹一两句补充说明——
 * 严格 every 会让整组判定失败，退化成一叠普通块，反而更乱。
 */
function collect(el: Element, test: (item: Element) => boolean): Element[] | null {
  if (!isDiv(el)) return null;
  const kids = children(el).filter(isDiv);
  if (kids.length < 2) return null;
  const hit = kids.filter(test);
  if (hit.length < 2 || hit.length / kids.length < 0.7) return null;
  return hit;
}

/** 指标网格：原「70 分 / 35 题」这类数值卡 */
function markStatGrid(el: Element) {
  el.classList.add('p-stats');
  for (const item of children(el)) {
    if (!isStatItem(item)) {
      item.classList.add('p-stat-x');
      continue;
    }
    item.classList.add('p-stat');
    const kids = children(item);
    kids[0]?.classList.add('p-stat-k');
    kids[1]?.classList.add('p-stat-v');
    if (kids[2]) kids[2].classList.add('p-stat-n');
  }
}

/** 行列表项：恰好 2 个 div 子，前短后长（标题 + 说明） */
function isRowItem(el: Element): boolean {
  if (!isDiv(el)) return false;
  const kids = children(el);
  if (kids.length !== 2 || !kids.every(isDiv)) return false;
  if (el.querySelector(BLOCKY) || kids.some((k) => k.querySelector('div'))) return false;
  const head = text(kids[0]);
  const body = text(kids[1]);
  return !!head && head.length <= 42 && body.length >= 12 && body.length >= head.length;
}

/** 行列表：原「第 1 周 · 计划」这类「标题 + 说明」 */
function markRowList(el: Element) {
  el.classList.add('p-rows');
  for (const item of children(el)) {
    if (!isRowItem(item)) {
      item.classList.add('p-row-x');
      continue;
    }
    item.classList.add('p-row');
    const kids = children(item);
    kids[0]?.classList.add('p-row-t');
    kids[1]?.classList.add('p-row-d');
  }
}

/** 给一个层级内的直接子元素分类打标；depth 0 = 顶层，越深越轻量 */
function decorateLevel(container: Element, depth: number) {
  for (const child of children(container)) {
    const tag = child.tagName;
    if (tag === 'TABLE') continue; // 表格统一在最后包一层容器
    if (HEADING.test(tag)) {
      child.classList.add('p-h');
      continue;
    }
    if (tag === 'UL' || tag === 'OL') {
      child.classList.add('p-list');
      continue;
    }
    if (tag === 'P') {
      child.classList.add('p-p');
      continue;
    }
    if (!isDiv(child)) continue;

    // 先看是不是「小节」：含小标题的块优先，否则小节里的 $$ 会把它误判成纯公式块
    if (child.querySelector('h3,h4,h5,h6')) {
      child.classList.add('p-sec');
      if (depth < 2) decorateLevel(child, depth + 1);
      continue;
    }
    if ((child.textContent ?? '').includes('$$')) {
      child.classList.add('p-formula');
      continue;
    }
    if (depth === 0 && collect(child, isStatItem)) {
      markStatGrid(child);
      continue;
    }
    if (depth === 0 && collect(child, isRowItem)) {
      markRowList(child);
      continue;
    }
    if (depth === 0) {
      child.classList.add('p-box');
      // 纯文本块且源码里带换行的（如作文模板正文），保留换行
      if (!child.querySelector('div,ul,ol,table') && /\n/.test(child.innerHTML)) {
        child.classList.add('is-pre');
      }
    } else {
      child.classList.add('p-sub');
    }
  }
}

/** 表格外包一层 .p-table，负责圆角、描边与横向滚动 */
function wrapTables(root: Element) {
  for (const table of Array.from(root.querySelectorAll('table'))) {
    const parent = table.parentElement;
    if (!parent || parent.classList.contains('p-table')) continue;
    const wrap = table.ownerDocument.createElement('div');
    wrap.className = 'p-table';
    parent.insertBefore(wrap, table);
    wrap.appendChild(table);
  }
}

/**
 * 把一段裸 HTML 正文切成有层次的块。渲染前调用，输出仍是可直接 v-html 的字符串。
 */
export function decorateProse(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html;
  // 已经是增强过的（重复调用保护，也避免 SSR / 测试环境二次处理）
  if (/\bclass="[^"]*\bp-(?:h|sec|box|stats|rows|table|formula)\b/.test(html)) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  decorateLevel(doc.body, 0);
  wrapTables(doc.body);
  return doc.body.innerHTML;
}
