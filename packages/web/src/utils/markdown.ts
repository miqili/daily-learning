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

export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return '';

  const katexBlocks: string[] = [];
  const katexInline: string[] = [];

  let html = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_m, latex: string) => {
      katexBlocks.push(renderKatex(latex, true));
      return `@@KB${katexBlocks.length - 1}@@`;
    })
    .replace(/\$([^$\n]+?)\$/g, (_m, latex: string) => {
      katexInline.push(renderKatex(latex, false));
      return `@@KI${katexInline.length - 1}@@`;
    });

  // 转义 HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 行内格式
  html = html
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  // 标题
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // 列表：先标类，再按连续行分组
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="md-ul">$1</li>');
  html = html.replace(/^\s*(\d+[.、)])\s+(.*)$/gm, '<li class="md-ol">$2</li>');
  html = html.replace(/^\s*([\u2460-\u2473])\s*(.*)$/gm, '<li class="md-ol">$2</li>');
  html = html.replace(/((?:<li class="md-ol">[\s\S]*?<\/li>\n?)+)/g, '<ol>$1</ol>');
  html = html.replace(/((?:<li class="md-ul">[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/ class="md-[ou]l"/g, '');

  // 分段：空行分隔；段内换行转 <br>
  const blocks = html
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  html = blocks
    .map((block) => {
      if (/^<(h[123]|ul|ol|li)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('');

  // 还原 KaTeX
  html = html.replace(/@@KB(\d+)@@/g, (_m, i: string) => katexBlocks[Number(i)]);
  html = html.replace(/@@KI(\d+)@@/g, (_m, i: string) => katexInline[Number(i)]);
  return html;
}
