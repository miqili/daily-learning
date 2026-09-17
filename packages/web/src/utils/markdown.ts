import katex from 'katex';

/**
 * 轻量 Markdown + KaTeX 渲染：
 * - 支持 **加粗**、*斜体*、`代码`、# 标题、- 无序列表、数字/①② 有序列表、空行分段、换行
 * - 支持 LaTeX 公式：$$...$$ 块级、$...$ 行内（KaTeX 渲染）
 * 先转义 HTML 再应用格式，避免注入；公式先提取占位，避免被误伤。
 */
function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), { throwOnError: false, displayMode });
  } catch {
    return latex;
  }
}

function renderBase(text: string) {
  const katexBlocks: string[] = [];
  const katexInline: string[] = [];
  const underline: string[] = [];

  let html = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_m, latex: string) => {
      katexBlocks.push(renderKatex(latex, true));
      return `@@KB${katexBlocks.length - 1}@@`;
    })
    .replace(/\$([^$\n]+?)\$/g, (_m, latex: string) => {
      katexInline.push(renderKatex(latex, false));
      return `@@KI${katexInline.length - 1}@@`;
    })
    // 题库用 <u>…</u> 标注重读字母（英语语音题），只放行这一种标签，其余 HTML 仍一律转义
    .replace(/<\/?u>/g, (tag) => {
      underline.push(tag);
      return `@@UL${underline.length - 1}@@`;
    });

  // 转义 HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 还原白名单内的 <u> 标签
  html = html.replace(/@@UL(\d+)@@/g, (_m, i: string) => underline[Number(i)]);

  // 行内格式
  html = html
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  return { html, katexBlocks, katexInline };
}

function restoreKatex(
  html: string,
  katexBlocks: string[],
  katexInline: string[],
): string {
  html = html.replace(/@@KB(\d+)@@/g, (_m, i: string) => katexBlocks[Number(i)]);
  html = html.replace(/@@KI(\d+)@@/g, (_m, i: string) => katexInline[Number(i)]);
  return html;
}

export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return '';

  const { html, katexBlocks, katexInline } = renderBase(text);

  let processed = html;

  // 标题
  processed = processed.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  processed = processed.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  processed = processed.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // 列表：先标类，再按连续行分组
  processed = processed.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="md-ul">$1</li>');
  processed = processed.replace(/^\s*(\d+[.、)])\s+(.*)$/gm, '<li class="md-ol">$2</li>');
  processed = processed.replace(/^\s*([\u2460-\u2473])\s*(.*)$/gm, '<li class="md-ol">$2</li>');
  processed = processed.replace(/((?:<li class="md-ol">[\s\S]*?<\/li>\n?)+)/g, '<ol>$1</ol>');
  processed = processed.replace(/((?:<li class="md-ul">[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>');
  processed = processed.replace(/ class="md-[ou]l"/g, '');

  // 分段：空行分隔；段内换行转 <br>
  const blocks = processed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  processed = blocks
    .map((block) => {
      if (/^<(h[123]|ul|ol|li)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('');

  return restoreKatex(processed, katexBlocks, katexInline);
}

/**
 * 行内渲染：只处理 $...$ 行内公式和 **加粗** / *斜体* / `代码`，
 * 不包段落、不处理标题/列表/块级公式。适合选项、按钮、标题等短文本。
 */
export function renderInlineMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  const { html, katexBlocks, katexInline } = renderBase(text);
  // 段内换行仅转 <br>，不包 <p>
  const processed = html.replace(/\n/g, '<br />');
  return restoreKatex(processed, katexBlocks, katexInline);
}
