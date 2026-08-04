/**
 * 内置作文模板（成考专升本英语）
 * type: LETTER 书信 / ARGUMENT 议论文 / NOTICE 通知 / APPLICATION 申请信
 */
export interface BuiltinEssayTemplate {
  type: string;
  title: string;
  outline: string;
  content: string;
  keywords: string[];
  sortOrder: number;
}

export const BUILTIN_ESSAY_TEMPLATES: BuiltinEssayTemplate[] = [
  {
    type: 'LETTER',
    title: '书信（通用）',
    outline: '① 称呼 ② 开头表明写信目的 ③ 正文 2-3 段（分点） ④ 结尾表达期待 ⑤ 落款',
    content: `Dear [XXX],

I am writing to [tell you about / invite you to / thank you for / ask you about] ...

First of all, ... What's more, ... In addition, ...

I would appreciate it if you could [do sth.]. I am looking forward to your reply.

Yours sincerely,
Li Ming`,
    keywords: [
      'I am writing to... 我写信是为了……',
      'I would appreciate it if you could... 如果您能……我将非常感激',
      'I am looking forward to your reply. 期待您的回信',
      'First of all / What\'s more / In addition / Last but not least 表示递进',
    ],
    sortOrder: 1,
  },
  {
    type: 'ARGUMENT',
    title: '议论文（三段式）',
    outline: '① 引出话题/观点 ② 论据 2-3 点（每点：观点句+例子） ③ 总结升华',
    content: `As is known to all, [topic] has become a hot topic in our daily life.

On the one hand, ... On the other hand, ... Moreover, ...

In my opinion, we should [do sth.]. Only in this way can we [achieve ...].

In conclusion, it is high time that we took measures to [deal with the problem].`,
    keywords: [
      'As is known to all... 众所周知',
      'On the one hand... On the other hand... 一方面……另一方面……',
      'Only in this way can we... 只有这样我们才能……（倒装加分句）',
      'It is high time that we took measures to... 是时候采取措施了',
      'In my opinion / As far as I am concerned 在我看来',
    ],
    sortOrder: 2,
  },
  {
    type: 'NOTICE',
    title: '通知（活动）',
    outline: '① 标题 NOTICE ② 时间/地点/内容 ③ 报名/注意事项 ④ 落款与日期',
    content: `NOTICE

In order to [enrich students' campus life / improve our English], the [Student Union] is going to hold [an English Speech Contest].

Details are as follows:
Time: [2:00 p.m.], [May 20th]
Place: [School Hall]
Content: [Topic: My Dream]

Those who are interested are welcome to [sign up at the office before May 10th]. For more information, please contact [us by email].

The Student Union
May 10th, 2026`,
    keywords: [
      'In order to... 为了……',
      'Those who are interested are welcome to... 感兴趣的同学欢迎……',
      'For more information, please contact... 详情请联系……',
      'Details are as follows: 具体安排如下',
    ],
    sortOrder: 3,
  },
  {
    type: 'APPLICATION',
    title: '申请信（求职/申请）',
    outline: '① 表明申请职位/理由 ② 介绍自身优势（教育/经历/能力） ③ 请求面试机会',
    content: `Dear Sir or Madam,

I am writing to apply for the position of [XXX] advertised on [the website].

I am [a graduate of ... / a student of ...]. During the past few years, I have [gained rich experience in ...] and [developed strong ability in ...]. Besides, I am [hardworking / responsible / good at teamwork].

I would be grateful if you could give me an opportunity for an interview. My resume is enclosed for your reference.

Yours faithfully,
Li Ming`,
    keywords: [
      'I am writing to apply for... 我写信申请……',
      'I would be grateful if you could give me an opportunity... 如能给我机会我将不胜感激',
      'Besides / Moreover / Furthermore 此外',
      'My resume is enclosed for your reference. 随信附上简历供您参考',
    ],
    sortOrder: 4,
  },
];
