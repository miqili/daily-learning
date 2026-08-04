/**
 * 内置知识点（三科），支持 Markdown + KaTeX（$...$ 行内、$$...$$ 块级）
 * 使用模板字符串，保留真实换行。
 */
export interface BuiltinKnowledge {
  subject: string;
  title: string;
  content: string;
}

export const BUILTIN_KNOWLEDGE: BuiltinKnowledge[] = [
  {
    subject: '高等数学（一）',
    title: '极限的定义与四则运算法则',
    content: `极限是微积分的基础。

**四则运算法则**：若 $\\lim f(x)=A$、$\\lim g(x)=B$ 均存在，则

1. $\\lim[f(x)\\pm g(x)] = A\\pm B$
2. $\\lim[f(x)\\cdot g(x)] = A\\cdot B$
3. $\\lim\\dfrac{f(x)}{g(x)} = \\dfrac{A}{B}$（$B\\neq 0$）

**重要极限**：

$$\\lim_{x \\to 0}\\frac{\\sin x}{x} = 1$$

做题先判断是否为 $\\dfrac{0}{0}$ 或 $\\dfrac{\\infty}{\\infty}$ 型，再选择直接代入、约分或重要极限。`,
  },
  {
    subject: '高等数学（一）',
    title: '求导公式表（高频）',
    content: `**基本求导公式**：

$$\\begin{aligned}
(C)'&=0, & (x^n)'&=nx^{n-1},\\\\
(\\sin x)'&=\\cos x, & (\\cos x)'&=-\\sin x
\\end{aligned}$$

$$\\begin{aligned}
(e^x)'&=e^x, & (a^x)'&=a^x\\ln a,\\\\
(\\ln x)'&=\\dfrac{1}{x}
\\end{aligned}$$

**复合函数链式法则**：$y=f(g(x))$，则

$$y'=f'(g(x))\\cdot g'(x)$$

每天默写一遍公式表，考试送分题。`,
  },
  {
    subject: '高等数学（一）',
    title: '罗必达法则',
    content: `用于求 $\\dfrac{0}{0}$ 或 $\\dfrac{\\infty}{\\infty}$ 型未定式的极限。

**步骤**：

1. 判断是否为未定式
2. 分子分母分别求导
3. 再求极限（可重复使用）

$$\\lim_{x\\to a}\\frac{f(x)}{g(x)} = \\lim_{x\\to a}\\frac{f'(x)}{g'(x)}$$

注意：只有未定式才能用罗必达，非未定式直接代入。`,
  },
  {
    subject: '高等数学（一）',
    title: '不定积分与凑微分',
    content: `积分是求导的逆运算。

**凑微分核心**：把被积表达式的一部分放进 d 后面，凑成基本积分公式。

例：

$$\\begin{aligned}
\\int 2x\\,e^{x^2}\\,dx &= \\int e^{x^2}\\,d(x^2)\\\\\\
&= e^{x^2} + C
\\end{aligned}$$

多做类型题，熟能生巧。`,
  },
  {
    subject: '高等数学（一）',
    title: '牛顿-莱布尼茨公式（定积分）',
    content: `若 $F(x)$ 是 $f(x)$ 的一个原函数，则

$$\\int_a^b f(x)\\,dx = F(b) - F(a)$$

**应用**：先求不定积分得到原函数，再代入上下限相减。

注意：求平面图形面积时，面积 $= \\int_a^b |f(x)|\\,dx$，先画图确定被积函数与上下限。`,
  },
  {
    subject: '英语',
    title: '高频语法：时态与语态',
    content: `**常考时态**：一般现在（客观事实）、一般过去、现在完成（对现在有影响）、过去完成（过去的过去）、将来。

**被动语态**：be + 过去分词，时态体现在 be 上。

**标志词**：
- since / for+时间段 → 完成时
- yesterday / last → 过去时`,
  },
  {
    subject: '英语',
    title: '阅读理解定位技巧',
    content: `**步骤**：
1. 先读题干划关键词（专有名词 / 数字 / 时间）
2. 回原文定位
3. 对比选项做排除

**技巧**：
- 正确选项通常是原文的同义替换
- 绝对化选项（all / never / only）多为错
- 细节题不靠推理`,
  },
  {
    subject: '英语',
    title: '作文万能模板（书信/议论文）',
    content: `**书信**：Dear…, / I am writing to… / First of all… / What's more… / I would appreciate it if… / Yours sincerely, XXX

**议论文**：As is known to all… / On the one hand… On the other hand… / In my opinion… / In conclusion…

考前背熟 2-3 个模板，考场上套用改内容。`,
  },
  {
    subject: '英语',
    title: '高频词汇记忆法',
    content: `**方法**：
1. 每天 40 个新词，先混个眼熟（认识为主）
2. 用间隔复习（1/2/4/7 天）巩固
3. 结合短语记忆（词不离句）
4. 睡前快速过一遍

**重点**：阅读高频词优先，拼写只练作文常用词。`,
  },
  {
    subject: '政治',
    title: '新时代思想核心要义',
    content: `**十个明确**（记主线）：中国共产党领导、以人民为中心、中国式现代化、全面深化改革、依法治国、全面从严治党等。

**答题要点**：先答"是什么"，再答"为什么/意义"，最后"怎么办"。`,
  },
  {
    subject: '政治',
    title: '简答题答题框架',
    content: `**框架**：观点句（总）→ 展开 2-3 点（分，每点 1 句论据）→ 小结（总）。

**得分点**：关键词齐全、分点作答、术语规范。宁可多写要点，不写废话。`,
  },
  {
    subject: '政治',
    title: '论述题高分结构',
    content: `**结构**：
1. 概念界定
2. 理论依据
3. 联系实际
4. 总结升华

**技巧**：结合材料（材料中提到的政策/事件必须呼应），理论 + 材料 + 结论三件套。`,
  },
  {
    subject: '政治',
    title: '高频考点：根本原因/首要问题类',
    content: `**答题套路**：这类题答案多在"经济基础 / 生产力 / 人民 / 党的领导"里选。

**记忆口诀**：根本原因找经济，首要问题看民生，领导核心是党，发展动力靠改革。`,
  },
];
