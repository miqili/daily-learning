import { VocabularyPhrase } from '../entities/vocabulary-phrase.entity';
import { VocabularyWord } from '../entities/vocabulary-word.entity';

export interface VocabularyMemoryPart {
  text: string;
  type: 'PREFIX' | 'ROOT' | 'SUFFIX' | 'BASE';
  meaning: string;
}

export interface VocabularyMemory {
  strategy: 'MORPHEME' | 'FAMILY' | 'PHRASE';
  family_key: string | null;
  parts: VocabularyMemoryPart[];
  literal_bridge: string | null;
  memory_note: string;
  family_words: Array<{ word: string; meaning: string }>;
  phrase: { text: string; meaning: string | null } | null;
  reviewed: boolean;
}

const REVIEWED_MEMORY: Record<string, Omit<VocabularyMemory, 'reviewed' | 'phrase'>> = {
  ability: {
    strategy: 'MORPHEME', family_key: 'able',
    parts: [{ text: 'able', type: 'BASE', meaning: '能够' }, { text: '-ity', type: 'SUFFIX', meaning: '名词后缀：状态' }],
    literal_bridge: '能够的状态 → 能力', memory_note: 'able 加名词后缀 -ity，表示“能够的状态”。',
    family_words: [{ word: 'able', meaning: '能够的' }, { word: 'unable', meaning: '不能的' }],
  },
  basic: {
    strategy: 'MORPHEME', family_key: 'base',
    parts: [{ text: 'base', type: 'BASE', meaning: '基础' }, { text: '-ic', type: 'SUFFIX', meaning: '形容词后缀' }],
    literal_bridge: '与基础有关的 → 基本的', memory_note: 'base 加形容词后缀 -ic。',
    family_words: [{ word: 'base', meaning: '基础' }, { word: 'basis', meaning: '基础；依据' }],
  },
  include: {
    strategy: 'MORPHEME', family_key: 'clude',
    parts: [{ text: 'in-', type: 'PREFIX', meaning: '进入；在内' }, { text: 'clude', type: 'ROOT', meaning: '关闭；围住' }],
    literal_bridge: '放在范围之内 → 包括', memory_note: '把某物放在一个范围之内，联想到“包括”。',
    family_words: [{ word: 'exclude', meaning: '排除' }, { word: 'conclude', meaning: '得出结论' }],
  },
  predict: {
    strategy: 'MORPHEME', family_key: 'dict',
    parts: [{ text: 'pre-', type: 'PREFIX', meaning: '在……之前' }, { text: 'dict', type: 'ROOT', meaning: '说' }],
    literal_bridge: '事情发生前先说出 → 预测', memory_note: 'pre- 表示“之前”，dict 表示“说”。',
    family_words: [{ word: 'dictionary', meaning: '词典' }, { word: 'contradict', meaning: '反驳' }],
  },
  construct: {
    strategy: 'MORPHEME', family_key: 'struct',
    parts: [{ text: 'con-', type: 'PREFIX', meaning: '共同；一起' }, { text: 'struct', type: 'ROOT', meaning: '建造' }],
    literal_bridge: '把各部分建在一起 → 构建', memory_note: 'struct 是常见的“建造、结构”词根。',
    family_words: [{ word: 'structure', meaning: '结构' }, { word: 'instruction', meaning: '指示；说明' }],
  },
  inspect: {
    strategy: 'MORPHEME', family_key: 'spect',
    parts: [{ text: 'in-', type: 'PREFIX', meaning: '向内；仔细' }, { text: 'spect', type: 'ROOT', meaning: '看' }],
    literal_bridge: '仔细向里看 → 检查', memory_note: 'spect 表示“看”，帮助关联 respect、inspect。',
    family_words: [{ word: 'respect', meaning: '尊重' }, { word: 'perspective', meaning: '视角' }],
  },
  transport: {
    strategy: 'MORPHEME', family_key: 'port',
    parts: [{ text: 'trans-', type: 'PREFIX', meaning: '跨越；到另一边' }, { text: 'port', type: 'ROOT', meaning: '携带' }],
    literal_bridge: '携带到另一处 → 运输；运送', memory_note: 'trans- 表示跨越，port 表示携带。',
    family_words: [{ word: 'import', meaning: '进口' }, { word: 'export', meaning: '出口' }, { word: 'portable', meaning: '便携的' }],
  },
  create: {
    strategy: 'FAMILY', family_key: 'create', parts: [], literal_bridge: 'create 是词族中的核心动词',
    memory_note: '先记 create“创造”，再识别不同词性。',
    family_words: [{ word: 'creation', meaning: '创造；作品' }, { word: 'creative', meaning: '有创造力的' }, { word: 'creator', meaning: '创造者' }],
  },
  decide: {
    strategy: 'FAMILY', family_key: 'decide', parts: [], literal_bridge: 'decide 是动词，decision 是名词',
    memory_note: '用 decide → decision 记住“决定”这一组。',
    family_words: [{ word: 'decision', meaning: '决定' }, { word: 'decisive', meaning: '决定性的' }],
  },
  develop: {
    strategy: 'FAMILY', family_key: 'develop', parts: [], literal_bridge: 'develop 表示发展或开发',
    memory_note: '先掌握动词 develop，再识别名词和人物形式。',
    family_words: [{ word: 'development', meaning: '发展' }, { word: 'developer', meaning: '开发者' }, { word: 'developing', meaning: '发展中的' }],
  },
  difference: {
    strategy: 'FAMILY', family_key: 'differ', parts: [], literal_bridge: 'differ 是动词，difference 是名词',
    memory_note: 'differ“不同”与 difference“差异”放在一起记。',
    family_words: [{ word: 'differ', meaning: '不同' }, { word: 'different', meaning: '不同的' }],
  },
  direction: {
    strategy: 'FAMILY', family_key: 'direct', parts: [], literal_bridge: 'direct 指向某处，direction 是方向',
    memory_note: '从 direct“指向”联想到 direction“方向”。',
    family_words: [{ word: 'direct', meaning: '直接的；指引' }, { word: 'director', meaning: '负责人；导演' }],
  },
  discuss: {
    strategy: 'FAMILY', family_key: 'discuss', parts: [], literal_bridge: 'discuss 是动作，discussion 是讨论这件事',
    memory_note: '动词 discuss 与名词 discussion 成组记忆。',
    family_words: [{ word: 'discussion', meaning: '讨论' }],
  },
  explain: {
    strategy: 'FAMILY', family_key: 'explain', parts: [], literal_bridge: 'explain 是动作，explanation 是解释内容',
    memory_note: '把 explain 和 explanation 放在一起识别。',
    family_words: [{ word: 'explanation', meaning: '解释；说明' }],
  },
  express: {
    strategy: 'FAMILY', family_key: 'express', parts: [], literal_bridge: 'express 是表达，expression 是表达方式',
    memory_note: '先记动词 express，再识别名词 expression。',
    family_words: [{ word: 'expression', meaning: '表达；表情' }, { word: 'expressive', meaning: '有表现力的' }],
  },
  improve: {
    strategy: 'FAMILY', family_key: 'improve', parts: [], literal_bridge: 'improve 是改进，improvement 是改进结果',
    memory_note: '动词和名词放在同一条记忆线上。',
    family_words: [{ word: 'improvement', meaning: '改进；提高' }],
  },
};

export function vocabularyMemory(word: VocabularyWord, phrases: VocabularyPhrase[]): VocabularyMemory {
  const reviewed = REVIEWED_MEMORY[word.word.toLowerCase()];
  const phrase = phrases[0] ? { text: phrases[0].phrase, meaning: phrases[0].meaning } : null;
  if (reviewed) return { ...reviewed, phrase, reviewed: true };

  if (word.root?.trim()) {
    return {
      strategy: 'MORPHEME', family_key: null, parts: [], literal_bridge: null,
      memory_note: word.root.trim(), family_words: [], phrase, reviewed: false,
    };
  }

  return {
    strategy: 'PHRASE', family_key: null, parts: [], literal_bridge: null,
    memory_note: phrase ? `${phrase.text}${phrase.meaning ? `：${phrase.meaning}` : ''}` : (word.exampleSentence ?? word.meaning),
    family_words: [], phrase, reviewed: true,
  };
}
