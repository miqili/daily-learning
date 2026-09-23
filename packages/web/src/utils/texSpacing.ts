/**
 * 正文里「裸 LaTeX 间距命令」的归一化。
 *
 * 问题背景：
 *   章节正文（`章节正文` 类 MATERIAL）允许把 `\quad`、`\qquad` 当排版间隔直接写在 HTML 文本里，
 *   例如 `3.1\quad 先定保底线`、`2024 第 6/7/8 题\quad 2025 第 5/6/7/8/9 题`、`……\quad <span>2025 选择第 11 题</span>`。
 *   这些命令落在 `$…$` / `$$…$$` **之外**，KaTeX 的 auto-render 与 renderToString 都不会处理它们，
 *   于是页面上把源码 "\quad" 原样吐出来——这就是「转换没做好」的根因。
 *
 * 处理方式：
 *   渲染前把定界符之外的间距命令就地换成等宽实体间隔元素 `<span class="tex-gap is-*">`，
 *   数学定界符**内部**一律原样保留，交给 KaTeX 自己排版。
 *
 * 三条不透传原则：
 *   1. 只认白名单里的 6 个间距命令，其余反斜杠序列原样返回，避免误伤正文里的普通反斜杠；
 *   2. `\\`（转义反斜杠）不参与匹配，`\\quad` 不会被当成间距；
 *   3. 间隔元素是纯装饰，带 aria-hidden，不污染可访问性名称。
 */

/** 白名单：命令 → 间隔宽度修饰类（宽度在 design-system.css 的 .tex-gap 里定义）。 */
const SPACING_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ['\\qquad', 'is-wide'], // 2 em
  ['\\quad', 'is-mid'], // 1 em
  ['\\enspace', 'is-en'], // 0.5 em
  ['\\;', 'is-thick'], // 5/18 em
  ['\\:', 'is-med'], // 4/18 em
  ['\\,', 'is-thin'], // 3/18 em
];

/** 仅匹配数学定界符：$$\n…\n$$ 与 $…$（行内不允许跨行，与项目其它渲染器保持一致）。 */
const MATH_SEGMENT = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g;

function gapHtml(modifier: string): string {
  return `<span class="tex-gap ${modifier}" aria-hidden="true"></span>`;
}

/** 纯文本段（定界符之外）逐个字符扫描：这样能正确处理相邻命令，也不会误吃 `\\`。 */
function normalizeTextSegment(text: string): string {
  let out = '';
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char !== '\\') {
      out += char;
      index += 1;
      continue;
    }
    // 转义反斜杠原样保留（`\\quad` 是字面文本，不是间距命令）
    if (text[index + 1] === '\\') {
      out += '\\\\';
      index += 2;
      continue;
    }
    const hit = SPACING_TOKENS.find(([command]) => text.startsWith(command, index));
    if (hit) {
      out += gapHtml(hit[1]);
      index += hit[0].length;
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

/**
 * 把正文里数学定界符之外的 LaTeX 间距命令替换为实体间隔元素。
 *
 * - 传入 HTML 片段（KatexHtml）：直接调用，间隔元素会参与 v-html；
 * - 传入纯文本（KatexRenderer / markdown.ts）：**必须先 escapeHtml 再调用**，
 *   否则新插入的 `<span>` 会被随后的转义步骤打回字面量。
 */
export function normalizeBareTexSpacing(source: string | null | undefined): string {
  if (!source) return '';
  let out = '';
  let last = 0;
  let match: RegExpExecArray | null;
  MATH_SEGMENT.lastIndex = 0;
  while ((match = MATH_SEGMENT.exec(source)) !== null) {
    out += normalizeTextSegment(source.slice(last, match.index));
    out += match[0]; // 公式段整体保留
    last = match.index + match[0].length;
  }
  out += normalizeTextSegment(source.slice(last));
  return out;
}
