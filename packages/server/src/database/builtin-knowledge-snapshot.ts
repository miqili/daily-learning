import type { BuiltinKnowledge } from './builtin-knowledge';

/**
 * 2026-08-09 从当前 demo 知识库审计后固化的 74 条基线。
 * 这份快照保证新环境可重建，后续修订放在 builtin-knowledge-2026.ts 中覆盖。
 */
export const BUILTIN_KNOWLEDGE_SNAPSHOT: BuiltinKnowledge[] = [
  {
    "subject": "高等数学（一）",
    "title": "常用积分公式表（速查）",
    "content": "$$\\begin{aligned}\n\\int x^\\alpha dx&=\\frac{x^{\\alpha+1}}{\\alpha+1}+C & \\int \\frac{1}{x}dx&=\\ln|x|+C \\\\\n\\int e^x dx&=e^x+C & \\int a^x dx&=\\frac{a^x}{\\ln a}+C \\\\\n\\int \\cos x\\,dx&=\\sin x+C & \\int \\sin x\\,dx&=-\\cos x+C \\\\\n\\int \\sec^2 x\\,dx&=\\tan x+C & \\int \\frac{1}{1+x^2}dx&=\\arctan x+C \\\\\n\\int \\frac{1}{\\sqrt{1-x^2}}dx&=\\arcsin x+C & \\int \\frac{1}{\\sqrt{a^2-x^2}}dx&=\\arcsin\\frac{x}{a}+C \\\\\n\\int \\tan x\\,dx&=-\\ln|\\cos x|+C & \\int \\cot x\\,dx&=\\ln|\\sin x|+C \\\\\n\\end{aligned}$$",
    "tags": [
      "公式表",
      "积分"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "哲学与哲学的基本问题",
    "content": "哲学是理论化、系统化的世界观，是对自然知识、社会知识和思维知识的概括和总结。\n\n**哲学的基本问题**：思维和存在（意识和物质）的关系问题，包含两个方面：\n1. 何者为第一性 → 划分**唯物主义**与**唯心主义**；\n2. 二者有无同一性 → 划分**可知论**与**不可知论**。\n\n**唯物主义三种历史形态**：古代朴素唯物主义 → 近代形而上学唯物主义 → 辩证唯物主义（马克思主义哲学）。\n**唯心主义两种基本形式**：主观唯心主义（如\"心外无物\"）、客观唯心主义（如\"理在事先\"）。",
    "tags": [
      "马哲",
      "哲学基本问题"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "物质与意识",
    "content": "**物质**：不依赖于人的意识并能为人的意识所反映的客观实在。物质的唯一特性是**客观实在性**。\n**意识**：物质世界长期发展的产物，是人脑的机能，是客观世界的主观映象。\n\n**物质与意识的关系**：\n- 物质决定意识；\n- 意识对物质具有能动的反作用（意识能动性：目的性、计划性、创造性、对人体生理活动的调控）。\n\n**方法论**：一切从实际出发，实事求是。",
    "tags": [
      "马哲",
      "物质",
      "意识"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "世界的物质统一性",
    "content": "世界的本原是物质，世界的真正统一性在于它的**物质性**。\n\n**运动**是物质的根本属性和存在方式；**静止**是运动的特殊状态（相对静止）。\n物质运动的基本形式：机械运动、物理运动、化学运动、生物运动、社会运动。",
    "tags": [
      "马哲",
      "世界统一性"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "凹凸性与拐点、渐近线",
    "content": "**凹凸性**：f''(x) > 0 ⇒ 凹（下凸）向上；f''(x) < 0 ⇒ 凸向下。\n**拐点**：凹凸性改变的点，f''(x₀)=0 或不存在且左右 f'' 变号。\n\n**渐近线**：\n- 水平渐近线：$\\lim_{x\\to\\infty}f(x)=b$ ⇒ y=b；\n- 垂直渐近线：$\\lim_{x\\to x_0}f(x)=\\infty$ ⇒ x=x₀。",
    "tags": [
      "凹凸性",
      "渐近线"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "对立统一规律（矛盾）",
    "content": "对立统一规律是唯物辩证法的**实质和核心**。\n\n**矛盾的基本属性**：\n- **同一性**：相互依存、相互贯通、相互转化；\n- **斗争性**：相互排斥、相互分离。\n\n**矛盾的普遍性与特殊性**（共性与个性）的关系是矛盾问题的精髓。\n\n**主次矛盾与矛盾主次方面** → 坚持**两点论与重点论**的统一。\n**方法论**：具体问题具体分析。",
    "tags": [
      "马哲",
      "矛盾",
      "对立统一"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "质量互变规律",
    "content": "**质**：一事物区别于其他事物的内在规定性。\n**量**：事物的规模、程度、速度等可以用数量表示的规定性。\n**度**：保持事物质的量的限度、界限。\n\n**量变与质变**：量变是质变的必要准备，质变是量变的必然结果，二者相互渗透、相互转化。\n\n**方法论**：重视量的积累；不失时机促成飞跃；坚持适度原则。",
    "tags": [
      "马哲",
      "质量互变"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "否定之否定规律",
    "content": "辩证否定是事物的**自我否定**，是**扬弃**（既克服又保留），既是发展的环节又是联系的环节。\n\n事物发展呈现**螺旋式上升、波浪式前进**：总方向是前进的，道路是曲折的。\n\n**方法论**：对待一切事物采取科学分析态度，不肯定一切、不否定一切。",
    "tags": [
      "马哲",
      "否定之否定"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "实践与认识",
    "content": "**实践**的基本形式：生产实践、处理社会关系的实践、科学实验。\n实践决定认识：实践是认识的**来源、动力、目的**，也是检验认识真理性的**唯一标准**。\n\n**认识的发展过程**：\n1. 第一次飞跃：感性认识（感觉、知觉、表象）→ 理性认识（概念、判断、推理）；\n2. 第二次飞跃：理性认识回到实践。\n\n感性认识与理性认识的关系：理性认识依赖于感性认识，感性认识有待于发展到理性认识。",
    "tags": [
      "马哲",
      "认识论",
      "实践"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "真理及其检验标准",
    "content": "**真理**：人们对客观事物及其规律的正确反映。特性：客观性、绝对性、相对性。\n\n**实践是检验真理的唯一标准**：由真理的本性和实践的特点决定。\n\n真理与谬误：既对立又统一，在一定条件下相互转化。",
    "tags": [
      "马哲",
      "真理"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "社会存在与社会意识",
    "content": "**社会存在**：社会物质生活条件，包括地理环境、人口因素和物质资料生产方式（其中**物质资料生产方式**起决定作用）。\n**社会意识**：社会生活的精神方面。\n\n关系：社会存在决定社会意识；社会意识具有**相对独立性**，对社会存在有能动的反作用（先进的社会意识起促进作用）。",
    "tags": [
      "马哲",
      "唯物史观",
      "社会存在"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "社会基本矛盾",
    "content": "**社会基本矛盾**：生产力与生产关系的矛盾、经济基础与上层建筑的矛盾。\n\n- 生产力决定生产关系，生产关系反作用于生产力（适合则促进，不适合则阻碍）；\n- 经济基础决定上层建筑，上层建筑反作用于经济基础。\n\n**生产力是社会发展的最终决定力量**。生产关系一定要适合生产力状况的规律是人类社会发展的根本规律。",
    "tags": [
      "马哲",
      "唯物史观",
      "社会基本矛盾"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "阶级、国家与革命",
    "content": "**阶级**：历史范畴，其实质是一个集团占有另一个集团的劳动。\n**国家**：阶级矛盾不可调和的产物，本质是**阶级统治的工具**。\n**国体**：国家的阶级内容（谁统治）；**政体**：政权的组织形式（怎样统治）。\n**社会革命**：阶级斗争的最高形式，是历史发展的火车头。",
    "tags": [
      "马哲",
      "阶级",
      "国家"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "人民群众与个人（群众观点与群众路线）",
    "content": "**人民群众是历史的创造者**：是社会物质财富、精神财富的创造者，是社会变革的决定力量。\n\n**群众路线**：一切为了群众，一切依靠群众，从群众中来，到群众中去。",
    "tags": [
      "马哲",
      "人民群众",
      "群众路线"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "毛泽东思想（活的灵魂）",
    "content": "毛泽东思想是马克思列宁主义基本原理与中国具体实际相结合的**第一次历史性飞跃**。\n**活的灵魂**：实事求是、群众路线、独立自主（三个基本方面）。\n\n1945 年党的七大把毛泽东思想确立为党的指导思想。",
    "tags": [
      "毛概",
      "毛泽东思想"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "新民主主义革命理论",
    "content": "**总路线**：无产阶级领导的，人民大众的，反对帝国主义、封建主义和官僚资本主义的革命。\n**三大法宝**：统一战线、武装斗争、党的建设。\n**革命道路**：农村包围城市、武装夺取政权。\n新民主主义革命与社会主义革命的区别：革命对象、任务、性质不同。",
    "tags": [
      "毛概",
      "新民主主义"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "社会主义改造理论（过渡时期总路线）",
    "content": "**过渡时期总路线**：\"一化三改\"——逐步实现社会主义工业化，逐步实现对农业、手工业、资本主义工商业的社会主义改造。\n\n1956 年三大改造基本完成，标志着**社会主义基本制度**在我国确立，进入社会主义初级阶段。",
    "tags": [
      "毛概",
      "社会主义改造"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "社会主义社会矛盾理论",
    "content": "毛泽东《关于正确处理人民内部矛盾的问题》（1957）：\n- 社会主义社会存在**敌我矛盾**和**人民内部矛盾**两类不同性质的矛盾；\n- 正确处理人民内部矛盾成为国家政治生活的主题；\n- 方法：民主的方法、团结—批评—团结的方法。",
    "tags": [
      "毛概",
      "社会矛盾"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "邓小平理论",
    "content": "邓小平理论回答\"**什么是社会主义、怎样建设社会主义**\"。\n- **精髓**：解放思想、实事求是；\n- **社会主义本质**：解放生产力，发展生产力，消灭剥削，消除两极分化，最终达到共同富裕；\n- **社会主义初级阶段基本路线**：\"一个中心、两个基本点\"（以经济建设为中心，坚持四项基本原则，坚持改革开放）。\n\n1997 年党的十五大把邓小平理论确立为党的指导思想。",
    "tags": [
      "邓论",
      "邓小平理论"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "“三个代表”重要思想",
    "content": "始终代表中国先进生产力的发展要求，代表中国先进文化的前进方向，代表中国最广大人民的根本利益。\n回答\"**建设什么样的党、怎样建设党**\"。党的十六大确立为指导思想。",
    "tags": [
      "三个代表"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "科学发展观",
    "content": "**第一要义是发展**，核心是**以人为本**，基本要求是**全面协调可持续**，根本方法是**统筹兼顾**。\n回答\"实现什么样的发展、怎样发展\"。",
    "tags": [
      "科学发展观"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "习近平新时代中国特色社会主义思想",
    "content": "回答\"**新时代坚持和发展什么样的中国特色社会主义、怎样坚持和发展中国特色社会主义**\"等重大时代课题。\n\n核心内容：\n- **十个明确**（总任务、社会主要矛盾、总体布局\"五位一体\"、战略布局\"四个全面\"、全面深化改革总目标、全面推进依法治国总目标、强军目标、大国外交、党的建设总要求等）；\n- **十四个坚持**（基本方略）。\n\n\"**两个确立**\"：确立习近平同志党中央的核心、全党的核心地位；确立习近平新时代中国特色社会主义思想的指导地位。",
    "tags": [
      "新时代思想"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "中国式现代化",
    "content": "中国式现代化是中国共产党领导的社会主义现代化，既有各国现代化的共同特征，更有基于自己国情的中国特色：\n1. 人口规模巨大的现代化；\n2. 全体人民共同富裕的现代化；\n3. 物质文明和精神文明相协调的现代化；\n4. 人与自然和谐共生的现代化；\n5. 走和平发展道路的现代化。\n\n**本质要求**：坚持中国共产党领导，坚持中国特色社会主义，实现高质量发展，发展全过程人民民主，丰富人民精神世界，实现全体人民共同富裕，促进人与自然和谐共生，推动构建人类命运共同体，创造人类文明新形态。",
    "tags": [
      "新时代思想",
      "中国式现代化"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "全国两会与中央经济工作会议要点（时政）",
    "content": "**2026 年政府工作报告要点**（复习方向，以考试当年时政为准）：\n- 经济增长预期目标、稳就业（城镇新增就业）；\n- 扩大内需：消费与投资；\n- 新质生产力：科技创新引领产业创新；\n- 民生保障：教育、医疗、养老；\n- 改革开放、乡村振兴、绿色低碳。\n\n**方法论**：时政题以当年重要会议（两会、中央经济工作会议、二十届全会）精神为主，记\"目标数字 + 关键词\"。",
    "tags": [
      "时政"
    ],
    "source": "时事政治（以当年时政为准）"
  },
  {
    "subject": "英语",
    "title": "语音规则（语音知识）",
    "content": "**元音字母读音**：a/e/i/o/u 在重读开音节读字母音（如 make、he、bike），在重读闭音节读短音（如 bag、bed、big、box、bus）。\n**常见字母组合**：\n- 元音组合：ee→/iː/，ea→/iː/或/e/，oo→/uː/或/ʊ/，ai/ay→/eɪ/，ou→/aʊ/等；\n- 辅音组合：th→/θ/或/ð/，sh→/ʃ/，ch→/tʃ/，ph→/f/，ng→/ŋ/，wh→/w/或/h/等。\n\n**重音与语调**：多音节词重音位置（如 `photo /ˈfoʊtoʊ/`）；疑问句、陈述句语调。\n**题型**：每题给 4 个词，找出划线部分读音不同的一个。",
    "tags": [
      "语音"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "名词（可数与不可数、复数、所有格）",
    "content": "**可数名词复数**：一般加 -s（books）；以 s/x/ch/sh 结尾加 -es（boxes）；辅音+y 变 y 为 i 加 -es（cities）；f/fe 变 v 加 -es（knives）；不规则变化（man→men, child→children, mouse→mice）。\n**不可数名词**：water, information, advice, news 等，无复数，用 much/a little 修饰。\n**名词所有格**：有生命用 's（Tom's book）；无生命用 of（the door of the room）；时间/距离用 's（today's news, two miles' walk）。",
    "tags": [
      "语法",
      "名词"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "冠词（a/an/the/零冠词）",
    "content": "**不定冠词 a/an**：表示\"一个/每一\"，a 用于辅音音素前（a university），an 用于元音音素前（an hour, an apple）。\n**定冠词 the**：特指、上文提到过、独一无二（the sun）、序数词最高级前（the first, the best）、乐器前（play the piano）。\n**零冠词**：球类/三餐/学科/人名地名前（play football, have breakfast, in China）。",
    "tags": [
      "语法",
      "冠词"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "代词（人称、物主、反身、指示、不定代词）",
    "content": "**人称代词**：主格（I, you, he, she, it, we, they）作主语；宾格（me, you, him, her, it, us, them）作宾语。\n**物主代词**：形容词性（my, your...）+ 名词；名词性（mine, yours...）单独使用（This book is mine.）。\n**反身代词**：myself, yourself, himself...（enjoy oneself, by oneself）。\n**指示代词**：this/these（近），that/those（远）。\n**不定代词**：some/any, many/much, few/a few, little/a little, both/all, either/neither, each/every, another/other, something/anything/nothing 等。\n\n**高频考点**：a few + 可数（几个），a little + 不可数（一点）；few/little 表否定。",
    "tags": [
      "语法",
      "代词"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "形容词与副词（比较级、最高级）",
    "content": "**比较级/最高级构成**：单音节加 -er/-est（taller）；多音节加 more/most（more beautiful）；不规则（good/well→better→best, bad→worse→worst, many/much→more→most, little→less→least, far→farther/further）。\n\n**句型**：\n- 同级比较：as + 原级 + as（...和...一样）；not as/so + 原级 + as；\n- 比较级 + than；the + 比较级, the + 比较级（越...越...）；\n- 最高级：the + 最高级 + 范围（in/of）。\n\n**注意**：修饰比较级用 much/even/a lot；倍数 + as...as（twice as long as）。",
    "tags": [
      "语法",
      "形容词副词"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "数词与连词",
    "content": "**数词**：基数词（one, two...）与序数词（first, second...）；分数（分子基数词、分母序数词，分子>1分母加 s：two thirds）；hundred/thousand/million 前有具体数字用单数，表\"许多\"用复数（hundreds of）。\n**连词**：\n- 并列连词：and, but, or, so, for, both...and, not only...but also, either...or, neither...nor；\n- 从属连词：when, while, because, if, although, as soon as, since, until, so that 等。",
    "tags": [
      "语法",
      "数词",
      "连词"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "介词与介词短语",
    "content": "**时间介词**：at（时刻/节日 at 6 o'clock）、on（具体某天 on Monday）、in（年月季节 in 2026, in summer）；since/for 与完成时连用。\n**地点介词**：at（小地点）、in（大地点/内部）、on（表面）；above/over、below/under、between/among、in front of/in the front of。\n**常考搭配**：depend on, look forward to, be good at, be interested in, take part in, pay attention to, agree with/to, consist of, belong to 等。",
    "tags": [
      "语法",
      "介词"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "常用求导公式表（速查）",
    "content": "$$\\begin{aligned}\n(C)'&=0 & (x^\\alpha)'&=\\alpha x^{\\alpha-1} \\\\\n(a^x)'&=a^x\\ln a & (e^x)'&=e^x \\\\\n(\\log_a x)'&=\\frac{1}{x\\ln a} & (\\ln x)'&=\\frac{1}{x} \\\\\n(\\sin x)'&=\\cos x & (\\cos x)'&=-\\sin x \\\\\n(\\tan x)'&=\\sec^2 x & (\\cot x)'&=-\\csc^2 x \\\\\n(\\arcsin x)'&=\\frac{1}{\\sqrt{1-x^2}} & (\\arctan x)'&=\\frac{1}{1+x^2} \\\\\n\\end{aligned}$$",
    "tags": [
      "公式表",
      "求导"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "空间解析几何（向量、平面、直线）",
    "content": "**向量运算**：点积 $\\vec a\\cdot\\vec b=|\\vec a||\\vec b|\\cos\\theta$；叉积（法向量）。两向量垂直 ⇒ 点积为 0；平行 ⇒ 对应成比例。\n**平面方程**：过点 $(x_0,y_0,z_0)$、法向量 $(A,B,C)$：\n$$A(x-x_0)+B(y-y_0)+C(z-z_0)=0$$\n**直线方程**：方向向量 $(m,n,p)$：\n$$\\frac{x-x_0}{m}=\\frac{y-y_0}{n}=\\frac{z-z_0}{p}$$\n**常见曲面**：球面 $x^2+y^2+z^2=R^2$；柱面（如 $x^2+y^2=1$ 缺哪个变量就是沿哪个轴方向的柱面）；旋转抛物面 $z=x^2+y^2$。",
    "tags": [
      "空间解析几何",
      "向量"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "无穷级数",
    "content": "**正项级数审敛法**：\n- 比较审敛法；\n- 比值审敛法：$\\lim\\frac{u_{n+1}}{u_n}=\\rho$，ρ<1 收敛，ρ>1 发散；\n- 根值审敛法：$\\lim\\sqrt[n]{u_n}=\\rho$。\n\n**交错级数**：莱布尼茨判别法（|u_n| 单调递减趋于 0 则收敛）。\n**p-级数**：$\\sum\\frac{1}{n^p}$，p>1 收敛，p≤1 发散。\n\n**幂级数**：收敛半径 $R=\\lim\\left|\\frac{a_n}{a_{n+1}}\\right|$，收敛区间 (-R, R) 再验端点。\n**泰勒/麦克劳林展开**：\n$$e^x=1+x+\\frac{x^2}{2!}+\\cdots+\\frac{x^n}{n!}+\\cdots\\quad(|x|<\\infty)$$\n$$\\frac{1}{1-x}=1+x+x^2+\\cdots+x^n+\\cdots\\quad(|x|<1)$$\n$$\\ln(1+x)=x-\\frac{x^2}{2}+\\frac{x^3}{3}-\\cdots\\quad(-1<x\\le1)$$",
    "tags": [
      "无穷级数",
      "幂级数"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "常微分方程",
    "content": "**可分离变量**：$\\frac{dy}{dx}=g(x)h(y)$ ⇒ 分离后两边积分。\n**一阶线性方程**：$y'+p(x)y=q(x)$，通解\n$$y=e^{-\\int p(x)dx}\\left(\\int q(x)e^{\\int p(x)dx}dx+C\\right)$$\n\n**二阶常系数齐次**：$y''+py'+qy=0$，特征方程 $r^2+pr+q=0$：\n- 两不等实根 $r_1\\ne r_2$：$y=C_1e^{r_1x}+C_2e^{r_2x}$；\n- 两相等实根 r：$y=(C_1+C_2x)e^{rx}$；\n- 共轭复根 $\\alpha\\pm\\beta i$：$y=e^{\\alpha x}(C_1\\cos\\beta x+C_2\\sin\\beta x)$。",
    "tags": [
      "微分方程"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "二重积分",
    "content": "**直角坐标**：\n- 先 y 后 x：$\\iint_D f(x,y)dxdy=\\int_a^b dx\\int_{y_1(x)}^{y_2(x)} f(x,y)dy$\n- 先 x 后 y：类似（看 D 的形状选择次序）。\n\n**极坐标**（圆域、含 $x^2+y^2$ 的被积函数）：\n$$\\iint_D f\\,dxdy=\\int_{\\alpha}^{\\beta}d\\theta\\int_{r_1(\\theta)}^{r_2(\\theta)} f(r\\cos\\theta,r\\sin\\theta)\\,r\\,dr$$\n\n**常见区域**：圆形、环形、由曲线围成——先画图定限。",
    "tags": [
      "二重积分"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "多元函数（偏导数、全微分、复合与隐函数求导）",
    "content": "**偏导数**：对 x 求偏导时把 y 当常数，$f_x=\\frac{\\partial z}{\\partial x}$。\n**高阶偏导**：$z_{xy}$（先 x 后 y，混合偏导连续则相等 $z_{xy}=z_{yx}$）。\n**全微分**：\n$$dz=\\frac{\\partial z}{\\partial x}dx+\\frac{\\partial z}{\\partial y}dy$$\n**复合函数求导（链式法则）**：z=f(u,v)，u=u(x,y)，v=v(x,y) 时按链式展开。\n**隐函数求导**：$F(x,y)=0$ ⇒ $\\frac{dy}{dx}=-\\frac{F_x}{F_y}$。",
    "tags": [
      "多元函数",
      "偏导数",
      "全微分"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "政治",
    "title": "联系与发展（唯物辩证法的总特征）",
    "content": "**联系**的特征：客观性、普遍性、多样性、条件性。\n**发展**：前进的、上升的运动，发展的实质是**新事物的产生和旧事物的灭亡**。\n新事物必然战胜旧事物（新事物符合客观规律、具有强大生命力）。\n\n**方法论**：用联系、发展、全面的观点看问题。",
    "tags": [
      "马哲",
      "辩证法",
      "联系发展"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "定积分应用（平面图形面积、旋转体体积）",
    "content": "**平面图形面积**：曲线 y=f(x) 与 x=a, x=b, x 轴所围面积\n$$S=\\int_a^b |f(x)|\\,dx$$\n两曲线 y=f(x)、y=g(x) 之间的面积：$S=\\int_a^b |f(x)-g(x)|\\,dx$（先求交点定限）。\n\n**旋转体体积**：绕 x 轴旋转\n$$V=\\pi\\int_a^b [f(x)]^2\\,dx$$\n绕 y 轴旋转：$V=2\\pi\\int_a^b x f(x)\\,dx$。",
    "tags": [
      "定积分应用",
      "面积",
      "体积"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "定积分（牛顿-莱布尼茨公式、换元、分部）",
    "content": "**牛顿-莱布尼茨公式**（核心）：\n$$\\int_a^b f(x)dx=F(b)-F(a)$$\n\n**性质**：线性性、区间可加性（$\\int_a^b=\\int_a^c+\\int_c^b$）、奇偶性（奇函数在对称区间积分为 0；偶函数 = 2 倍半边）。\n\n**换元与分部**：与不定积分相同，但换元要换限（变量代换 x→t 时上下限同时换）。\n**反常积分**：无穷区间（$\\int_a^{+\\infty}$）与无界函数（瑕积分）——按极限计算。",
    "tags": [
      "定积分",
      "牛顿莱布尼茨"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "不定积分（基本公式、换元、分部）",
    "content": "**定义**：$\\int f(x)dx=F(x)+C$，其中 $F'(x)=f(x)$。\n\n**基本积分公式**（必背）：\n$\\int x^\\alpha dx=\\frac{x^{\\alpha+1}}{\\alpha+1}+C$，$\\int \\frac{1}{x}dx=\\ln|x|+C$，$\\int e^x dx=e^x+C$，$\\int \\cos x\\,dx=\\sin x+C$，$\\int \\sin x\\,dx=-\\cos x+C$，$\\int \\frac{1}{1+x^2}dx=\\arctan x+C$，$\\int \\frac{1}{\\sqrt{1-x^2}}dx=\\arcsin x+C$。\n\n**换元法**：\n- 第一类（凑微分）：$\\int f[\\varphi(x)]\\varphi'(x)dx$ 令 $u=\\varphi(x)$；\n- 第二类：根式换元、三角换元（$\\sqrt{a^2-x^2}$ 令 x=a sin t）。\n\n**分部积分法**：$\\int u\\,dv=uv-\\int v\\,du$（适用：幂×指数、幂×三角、幂×对数）。",
    "tags": [
      "不定积分",
      "积分公式"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "动词时态（16 种中常考 8 种）",
    "content": "**一般现在时**：客观事实/经常动作，第三人称单数加 -s（He works.）。\n**一般过去时**：过去发生，用过去式（worked）。\n**一般将来时**：will + 动词原形；be going to + 原形。\n**现在进行时**：am/is/are + doing（正在）。\n**过去进行时**：was/were + doing。\n**现在完成时**：have/has + done，标志词 since, for, already, yet, just, ever, never；**短暂动词不与 for/since 连用**（have been to 去过 / have gone to 去了未回）。\n**过去完成时**：had + done（过去的过去）。\n**过去将来时**：would + 原形。",
    "tags": [
      "语法",
      "时态"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "被动语态",
    "content": "**构成**：be + 过去分词（be 随人称时态变化）。\n- 一般现在：am/is/are + done\n- 一般过去：was/were + done\n- 一般将来：will be + done\n- 现在完成：have/has been + done\n- 含情态动词：can/must be + done\n\n**注意**：感官动词和使役动词（make/let/have sb do）变被动后 to 要还原（be made to do）；短语动词被动时保留介词（The children were taken care of.）。",
    "tags": [
      "语法",
      "语态"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "情态动词",
    "content": "**can/could**：能力、可能、请求（could 更委婉）；**may/might**：允许、可能；**must**：必须（否定 mustn't 禁止）；**have to**：不得不；**should/ought to**：应该；**need**：需要（作情态动词多用于否定疑问）。\n\n**推测**：must（一定，肯定句）、may/might（可能）、can't（不可能，否定）。\n**高频考点**：must 的否定回答用 needn't/don't have to；\"情态动词 + have done\"表对过去的推测（must have done 一定做过，can't have done 不可能做过，needn't have done 本不必做）。",
    "tags": [
      "语法",
      "情态动词"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "非谓语动词（不定式、动名词、分词）",
    "content": "**不定式 to do**：表目的、将来；want/decide/hope/plan/refuse + to do；make/let/have sb do（省 to）；疑问词 + to do（how to do it）。\n**动名词 doing**：作主语宾语；enjoy/finish/mind/keep/practice/avoid/suggest + doing；介词后 + doing（be good at doing）；固定搭配：look forward to doing, be used to doing。\n**分词**：现在分词 doing（主动/进行），过去分词 done（被动/完成）；作定语（the falling leaves / the fallen leaves）、状语（Seeing the teacher, he stopped. / Given more time, we could do better.）。\n\n**区分**：stop to do（停下来去做）vs stop doing（停止做）；remember/forget/regret + to do（未做）vs + doing（已做）。",
    "tags": [
      "语法",
      "非谓语动词"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "句子成分与基本句型",
    "content": "**五种基本句型**：\n1. 主 + 谓（S+V）：He works.\n2. 主 + 谓 + 宾（S+V+O）：I like English.\n3. 主 + 系 + 表（S+V+P）：She is a teacher. （系动词：be, become, feel, look, seem, smell, taste, sound）\n4. 主 + 谓 + 间宾 + 直宾（S+V+IO+DO）：He gave me a book.\n5. 主 + 谓 + 宾 + 宾补（S+V+O+C）：We made him monitor.\n\n**There be 句型**：There is/are + 主语 + 地点；就近原则（There is a pen and two books.）。",
    "tags": [
      "语法",
      "句型"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "定语从句",
    "content": "**关系代词**：who（人，主/宾）、whom（人，宾）、whose（人/物，定语）、which（物）、that（人/物）。\n**关系副词**：when（时间）、where（地点）、why（原因）。\n\n**只能用 that**：先行词为不定代词（all, everything, nothing）、被序数词/最高级修饰、被 the only/the very 修饰、既有人又有物时。\n**只能用 which**：非限制性定语从句、介词 + which（in which = where）。\n\n**考点**：that/which 在从句中作宾语可省略；as 引导非限制性定语从句（as we know）。",
    "tags": [
      "语法",
      "定语从句"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "名词性从句（主语/宾语/表语/同位语从句）",
    "content": "**连接词**：that（无词义）、whether/if（是否）、疑问词（what, which, who, when, where, why, how）。\n\n**宾语从句三要素**：\n1. 语序用陈述语序（He asked where I lived.）；\n2. 时态呼应（主句过去，从句过去相应时态；客观真理用一般现在）；\n3. 引导词选择。\n\n**it 作形式主语/宾语**：It is important that...；I think it necessary that...",
    "tags": [
      "语法",
      "名词性从句"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "状语从句",
    "content": "**时间**：when, while, as, before, after, until, since, as soon as, the moment（主将从现：I will call you as soon as I arrive.）。\n**条件**：if, unless, as long as（主将从现）。\n**原因**：because, since, as, now that。\n**让步**：although/though（不与 but 连用）, even if, no matter + 疑问词。\n**目的**：so that, in order that。\n**结果**：so...that, such...that。\n**比较**：than, as...as。",
    "tags": [
      "语法",
      "状语从句"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "虚拟语气",
    "content": "**与现在事实相反**：If + 过去式（be→were），主句 would/could/might + 动词原形。\n**与过去事实相反**：If + had done，主句 would/could/might + have done。\n**与将来事实相反**：If + were to/should + 原形，主句 would + 原形。\n\n**其他**：\n- wish + 从句（虚拟）：I wish I were a bird.；\n- suggest/insist/demand/order/require + that + (should) + 动词原形；\n- It is (high) time that + did（该做...了）；\n- if only + 虚拟（要是...就好了）。",
    "tags": [
      "语法",
      "虚拟语气"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "倒装句与强调句",
    "content": "**倒装**：\n- 否定词开头：Never/Seldom/Hardly/Little/Not only + 助动词 + 主语（Never have I seen such a film.）；\n- only + 状语开头：Only then did he realize...；\n- so/neither/nor 开头表\"也/也不\"：So do I. / Neither can he.；\n- here/there/now 开头：Here comes the bus.（主语为代词不倒装：Here it comes.）。\n\n**强调句**：It is/was + 被强调部分 + that/who + 其余（It was yesterday that he left.）。判断方法：去掉 It is...that 句子仍完整。",
    "tags": [
      "语法",
      "倒装",
      "强调"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "主谓一致",
    "content": "**就近原则**：either...or, neither...nor, not only...but also, There be（There is a pen and two books.）。\n**就远原则**：with, together with, along with, as well as, except, but + 名词不影响主语单复数（The teacher with his students is...）。\n**其他**：each/everyone/everything 用单数；the number of（...的数量，单数）vs a number of（许多，复数）；时间/距离/金额作整体用单数（Three years is a long time.）。",
    "tags": [
      "语法",
      "主谓一致"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "完形填空解题技巧",
    "content": "**命题特点**：一篇约 200 词的短文，挖 15 空（每空 2 分，共 30 分），考查**词汇辨析、固定搭配、语法、上下文逻辑**。\n\n**步骤**：\n1. 先通读全文（跳空读），抓主旨与人物/事件线；\n2. 逐空选择，优先上下文线索（前文暗示、后文照应、转折词 but/however）；\n3. 复查：把选项代入通读，检查逻辑与搭配。\n\n**高频**：动词短语搭配（turn on/off, give up, look after, take off）、连词逻辑（and/but/so/or）、代词指代、时态一致。",
    "tags": [
      "题型技巧",
      "完形填空"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "阅读理解解题技巧",
    "content": "**命题特点**：5 篇短文 × 4 题 = 20 题，每篇约 250-350 词，题型以细节题、主旨题、推断题、词义猜测题为主。\n\n**方法**：\n1. **先题后文**：读题干划关键词（专有名词/数字/时间/人名）；\n2. **定位回文**：按关键词回原文找答案句，注意同义替换（正确答案常是原文的改写，很少原词照搬）；\n3. **主旨题**看首尾段与段首句；**推断题**选\"言外之意\"；**词义题**看上下文与构词法；\n4. 绝对化选项（all, never, only）通常错；与原文相反/偷换概念的排除。\n\n**限时**：每篇 8-10 分钟。",
    "tags": [
      "题型技巧",
      "阅读理解"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "英语",
    "title": "写作模板（书信/通知/议论文）",
    "content": "**书信/申请信（常考）**：\n```\nDear XXX,\nI am writing to ... （目的）\nFirst, ...（要点1） Second, ...（要点2） Besides, ...（要点3）\nI would appreciate it if ... （期望）\nYours sincerely,\nLi Yuan\n```\n**通知（NOTICE）**：标题 + 正文（活动时间地点内容）+ The Student Union。\n**议论文**：开头（Nowadays, ...）/ 主体（On the one hand... On the other hand...）/ 结尾（In my opinion, ...）。\n\n**提分点**：高级词汇（important→crucial/significant）、复杂句（定语从句/状语从句）、过渡词（however, moreover, therefore）、字数 100-120 词。",
    "tags": [
      "写作",
      "作文"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "函数（定义域、复合函数、反函数）",
    "content": "**定义域**：分式分母 ≠ 0；偶次根式被开方数 ≥ 0；对数真数 > 0；arcsin/arccos 内 |x| ≤ 1。\n\n**基本初等函数**：幂函数、指数函数、对数函数、三角函数、反三角函数。\n**复合函数**：y = f[g(x)]，先内后外（如 $y=\\sqrt{\\ln x}$）。\n**反函数**：y = f(x) 与 x = f⁻¹(y) 图像关于直线 $y=x$ 对称；求法：解出 x 再互换 x、y。\n\n**常用性质**：奇函数 f(-x) = -f(x)（关于原点对称）；偶函数 f(-x) = f(x)（关于 y 轴对称）。",
    "tags": [
      "函数"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "极限（定义、四则运算、两个重要极限、无穷小）",
    "content": "**极限定义**：$\\lim_{x\\to x_0} f(x)=A$ 表示 x 无限接近 $x_0$ 时 f(x) 无限接近 A。\n\n**四则运算法则**：极限存在时可拆（和差积商，分母极限不为 0）。\n**求极限常用方法**：\n1. 直接代入；\n2. 约去零因子（因式分解）；\n3. 除以最高次幂（x→∞ 分式）；\n4. 等价无穷小替换；\n5. 洛必达法则（见专门条目）。\n\n**两个重要极限**：\n$$\\lim_{x\\to 0}\\frac{\\sin x}{x}=1,\\qquad \\lim_{x\\to\\infty}\\left(1+\\frac{1}{x}\\right)^x=e$$\n\n**无穷小**：以 0 为极限的变量；等价无穷小：x→0 时 $\\sin x\\sim x$，$\\tan x\\sim x$，$\\ln(1+x)\\sim x$，$e^x-1\\sim x$，$1-\\cos x\\sim \\frac{x^2}{2}$。",
    "tags": [
      "极限",
      "无穷小"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "函数的连续性",
    "content": "**连续定义**：$\\lim_{x\\to x_0}f(x)=f(x_0)$（三条件：有定义、极限存在、极限值=函数值）。\n\n**间断点分类**：\n- 第一类（左右极限都存在）：可去间断点（相等但 ≠ f(x₀)）、跳跃间断点（不相等）；\n- 第二类（至少一个不存在）：无穷间断点、振荡间断点。\n\n**闭区间上连续函数的性质**：最值定理、介值定理、零点定理（f(a)·f(b)<0 ⇒ 存在 ξ∈(a,b) 使 f(ξ)=0）。",
    "tags": [
      "连续",
      "间断点"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "导数与微分",
    "content": "**导数定义**：\n$$f'(x_0)=\\lim_{\\Delta x\\to 0}\\frac{f(x_0+\\Delta x)-f(x_0)}{\\Delta x}$$\n\n**基本求导公式**（必背）：\n$(C)'=0$，$(x^\\alpha)'=\\alpha x^{\\alpha-1}$，$(a^x)'=a^x\\ln a$，$(e^x)'=e^x$，$(\\ln x)'=\\frac{1}{x}$，$(\\sin x)'=\\cos x$，$(\\cos x)'=-\\sin x$，$(\\tan x)'=\\sec^2 x$，$(\\arctan x)'=\\frac{1}{1+x^2}$，$(\\arcsin x)'=\\frac{1}{\\sqrt{1-x^2}}$。\n\n**求导法则**：四则运算法则、复合函数链式法则 $\\frac{dy}{dx}=\\frac{dy}{du}\\cdot\\frac{du}{dx}$。\n**隐函数求导**：方程两边对 x 求导，把 y 看作 y(x)。\n**参数方程求导**：$\\frac{dy}{dx}=\\frac{dy/dt}{dx/dt}$。\n**高阶导数**：连续求导（y''、y'''）。\n**微分**：$dy=f'(x)dx$。",
    "tags": [
      "导数",
      "微分",
      "求导公式"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "中值定理与洛必达法则",
    "content": "**罗尔定理**：f 在 [a,b] 连续、在 (a,b) 可导、f(a)=f(b) ⇒ 存在 ξ∈(a,b) 使 f'(ξ)=0。\n**拉格朗日中值定理**：存在 ξ∈(a,b) 使 $f(b)-f(a)=f'(\\xi)(b-a)$。\n\n**洛必达法则**：$\\frac{0}{0}$ 或 $\\frac{\\infty}{\\infty}$ 型未定式，\n$$\\lim\\frac{f(x)}{g(x)}=\\lim\\frac{f'(x)}{g'(x)}$$\n（反复使用直至可求；其他型如 $0\\cdot\\infty$、$\\infty-\\infty$、$1^\\infty$ 先化为 $\\frac{0}{0}$ 或 $\\frac{\\infty}{\\infty}$）。",
    "tags": [
      "中值定理",
      "洛必达"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "函数的单调性、极值与最值",
    "content": "**单调性**：f'(x) > 0 ⇒ 单调递增；f'(x) < 0 ⇒ 单调递减（区间内）。\n\n**极值**：\n- 必要条件：可导极值点处 f'(x)=0（驻点）；\n- 第一充分条件：左右导数变号（+→- 极大，-→+ 极小）；\n- 第二充分条件：f'(x₀)=0 且 f''(x₀)<0 ⇒ 极大；f''(x₀)>0 ⇒ 极小。\n\n**闭区间最值**：比较端点值与所有驻点值。\n**最值应用**：求最大面积/最小成本——列函数 → 求导 → 找驻点 → 比较。",
    "tags": [
      "极值",
      "单调性",
      "最值"
    ],
    "source": "《全国各类成人高等学校招生复习考试大纲（专科起点升本科）》"
  },
  {
    "subject": "高等数学（一）",
    "title": "求导公式表（高频）",
    "content": "**基本求导公式**：\n\n$$\\begin{aligned}\n(C)'&=0, & (x^n)'&=nx^{n-1},\\\\\n(\\sin x)'&=\\cos x, & (\\cos x)'&=-\\sin x\n\\end{aligned}$$\n\n$$\\begin{aligned}\n(e^x)'&=e^x, & (a^x)'&=a^x\\ln a,\\\\\n(\\ln x)'&=\\dfrac{1}{x}\n\\end{aligned}$$\n\n**复合函数链式法则**：$y=f(g(x))$，则\n\n$$y'=f'(g(x))\\cdot g'(x)$$\n\n每天默写一遍公式表，考试送分题。",
    "tags": [
      "高等数学（一）"
    ],
    "source": null
  },
  {
    "subject": "高等数学（一）",
    "title": "不定积分与凑微分",
    "content": "积分是求导的逆运算。\n\n**凑微分核心**：把被积表达式的一部分放进 d 后面，凑成基本积分公式。\n\n例：\n\n$$\\begin{aligned}\n\\int 2x\\,e^{x^2}\\,dx &= \\int e^{x^2}\\,d(x^2)\\\\\\\n&= e^{x^2} + C\n\\end{aligned}$$\n\n多做类型题，熟能生巧。",
    "tags": [
      "高等数学（一）"
    ],
    "source": null
  },
  {
    "subject": "政治",
    "title": "论述题高分结构",
    "content": "**结构**：\n1. 概念界定\n2. 理论依据\n3. 联系实际\n4. 总结升华\n\n**技巧**：结合材料（材料中提到的政策/事件必须呼应），理论 + 材料 + 结论三件套。",
    "tags": [
      "政治"
    ],
    "source": null
  },
  {
    "subject": "政治",
    "title": "高频考点：根本原因/首要问题类",
    "content": "**答题套路**：这类题答案多在\"经济基础 / 生产力 / 人民 / 党的领导\"里选。\n\n**记忆口诀**：根本原因找经济，首要问题看民生，领导核心是党，发展动力靠改革。",
    "tags": [
      "政治"
    ],
    "source": null
  },
  {
    "subject": "英语",
    "title": "高频词汇记忆法",
    "content": "**方法**：\n1. 每天 40 个新词，先混个眼熟（认识为主）\n2. 用间隔复习（1/2/4/7 天）巩固\n3. 结合短语记忆（词不离句）\n4. 睡前快速过一遍\n\n**重点**：阅读高频词优先，拼写只练作文常用词。",
    "tags": [
      "英语"
    ],
    "source": null
  },
  {
    "subject": "英语",
    "title": "作文万能模板（书信/议论文）",
    "content": "**书信**：Dear…, / I am writing to… / First of all… / What's more… / I would appreciate it if… / Yours sincerely, XXX\n\n**议论文**：As is known to all… / On the one hand… On the other hand… / In my opinion… / In conclusion…\n\n考前背熟 2-3 个模板，考场上套用改内容。",
    "tags": [
      "英语"
    ],
    "source": null
  },
  {
    "subject": "英语",
    "title": "阅读理解定位技巧",
    "content": "**步骤**：\n1. 先读题干划关键词（专有名词 / 数字 / 时间）\n2. 回原文定位\n3. 对比选项做排除\n\n**技巧**：\n- 正确选项通常是原文的同义替换\n- 绝对化选项（all / never / only）多为错\n- 细节题不靠推理",
    "tags": [
      "英语"
    ],
    "source": null
  },
  {
    "subject": "英语",
    "title": "高频语法：时态与语态",
    "content": "**常考时态**：一般现在（客观事实）、一般过去、现在完成（对现在有影响）、过去完成（过去的过去）、将来。\n\n**被动语态**：be + 过去分词，时态体现在 be 上。\n\n**标志词**：\n- since / for+时间段 → 完成时\n- yesterday / last → 过去时",
    "tags": [
      "英语"
    ],
    "source": null
  },
  {
    "subject": "高等数学（一）",
    "title": "牛顿-莱布尼茨公式（定积分）",
    "content": "若 $F(x)$ 是 $f(x)$ 的一个原函数，则\n\n$$\\int_a^b f(x)\\,dx = F(b) - F(a)$$\n\n**应用**：先求不定积分得到原函数，再代入上下限相减。\n\n注意：求平面图形面积时，面积 $= \\int_a^b |f(x)|\\,dx$，先画图确定被积函数与上下限。",
    "tags": [
      "高等数学（一）"
    ],
    "source": null
  },
  {
    "subject": "高等数学（一）",
    "title": "罗必达法则",
    "content": "用于求 $\\dfrac{0}{0}$ 或 $\\dfrac{\\infty}{\\infty}$ 型未定式的极限。\n\n**步骤**：\n\n1. 判断是否为未定式\n2. 分子分母分别求导\n3. 再求极限（可重复使用）\n\n$$\\lim_{x\\to a}\\frac{f(x)}{g(x)} = \\lim_{x\\to a}\\frac{f'(x)}{g'(x)}$$\n\n注意：只有未定式才能用罗必达，非未定式直接代入。",
    "tags": [
      "高等数学（一）"
    ],
    "source": null
  },
  {
    "subject": "高等数学（一）",
    "title": "极限的定义与四则运算法则",
    "content": "极限是微积分的基础。\n\n**四则运算法则**：若 $\\lim f(x)=A$、$\\lim g(x)=B$ 均存在，则\n\n1. $\\lim[f(x)\\pm g(x)] = A\\pm B$\n2. $\\lim[f(x)\\cdot g(x)] = A\\cdot B$\n3. $\\lim\\dfrac{f(x)}{g(x)} = \\dfrac{A}{B}$（$B\\neq 0$）\n\n**重要极限**：\n\n$$\\lim_{x \\to 0}\\frac{\\sin x}{x} = 1$$\n\n做题先判断是否为 $\\dfrac{0}{0}$ 或 $\\dfrac{\\infty}{\\infty}$ 型，再选择直接代入、约分或重要极限。",
    "tags": [
      "高等数学（一）"
    ],
    "source": null
  },
  {
    "subject": "政治",
    "title": "简答题答题框架",
    "content": "**框架**：观点句（总）→ 展开 2-3 点（分，每点 1 句论据）→ 小结（总）。\n\n**得分点**：关键词齐全、分点作答、术语规范。宁可多写要点，不写废话。",
    "tags": [
      "政治"
    ],
    "source": null
  },
  {
    "subject": "政治",
    "title": "新时代思想核心要义",
    "content": "**十个明确**（记主线）：中国共产党领导、以人民为中心、中国式现代化、全面深化改革、依法治国、全面从严治党等。\n\n**答题要点**：先答\"是什么\"，再答\"为什么/意义\"，最后\"怎么办\"。",
    "tags": [
      "政治"
    ],
    "source": null
  }
];

