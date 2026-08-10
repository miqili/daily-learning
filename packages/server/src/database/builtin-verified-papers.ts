import type { QuestionOption } from '../entities/exam-question.entity';

export type PaperSourceType = 'OFFICIAL' | 'VERIFIED_RECALL' | 'SINGLE_SOURCE_RECALL' | 'USER_PROVIDED' | 'SIMULATION' | 'UNVERIFIED';

export interface VerifiedPaperQuestion {
  content: string;
  passage?: string;
  options?: QuestionOption[];
  answer: string;
  score: number;
}

export interface VerifiedPaper {
  subject: string;
  year: number;
  title: string;
  source: string;
  sourceUrl: string;
  sourceType: PaperSourceType;
  isComplete: boolean;
  expectedQuestionCount: number;
  verificationNotes: string;
  questions: VerifiedPaperQuestion[];
}

function q(content: string, values: string[], answer: string, score: number, passage?: string): VerifiedPaperQuestion {
  return {
    content,
    passage,
    options: values.map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
    answer,
    score,
  };
}

const clozePassage = `Who has the keener sense of smell, dogs or humans? Most of us would (21) the dog's nose is much more sensitive than man's. After all, dogs are used to (22) criminals, and the police sometimes use dogs to smell out drugs.

The (23) is that your nose is probably as sensitive as any dog's - (24) you were trained to use your nose (25). And since your brain is much better than the dog's, you would be much (26) to fool than a dog would be. However, if you wanted to (27) someone's smell, you would have to crawl about (28) your hands and knees with your nose to the (29) as the dog does.

In its own way, however, your nose is as sensitive to (30) smells as your ear is to the softest of sounds. Most wine companies employ professional tasters who (31) the quality of their products. These tasters take very small amounts of the (32), and roll it around in their mouths while (33) chewing movements. This "mouthing" of the liquid forces the air up the back entrance to the nasal cavity toward the olfactory membrane, a place (34) smells can best be caught. If the wine suits their taste, they may nod (35).`;

const handkerchiefPassage = `My mother raised me with several fixed rules. One was that a gentleman always has a clean handkerchief in his rear pocket. I can recall being a ten-year-old on the school playground, feeling the piece of cloth directly over my bottom and wondering what it was there for. Time would tell.

Every night for most of my life, I have removed from my trousers the things I'm going to need the next day - keys, wallet, and handkerchief. After 60 years, my body weight feels wrong if I'm heading out of the house with an empty back pocket.

This rule of behavior, of course, did not apply to one's children in the late 20th century. When my three kids were growing up, they all let me know that my handkerchief was ridiculously old-fashioned. They had their arguments. If you have to be prepared every day for a cold, why not carry a little packet of tissues, which saves you from that disgusting business of blowing your nose in the thing and then stuffing it back in your trousers?

But a handkerchief is a lot more durable than tissue, creates no waste, and has a far wider variety of uses. One reason my kids saw that handkerchief so often is because of the large number of chocolate mouths and skinned knees that handkerchief wiped. Can you hold the handle of a boiling pot with a tissue? Now that I am a grandfather of five, my handkerchief again has been put to use. When friends become grandfathers for the first time, I often send them a dozen handkerchiefs as a small gift. In fact, for Father's Day last year my wife gave me several new handkerchiefs. Neither of us can count the number of times she was in tears at a movie and said quietly, "Can I borrow your handkerchief?"`;

const eighthGradePassage = `Ask any group of parents to describe their eighth graders, and you'll get a surprising - and often contradictory - range of responses. Eighth graders are often quiet and shy, yet they're often loud and frank. They keep pushing you away, yet they're still deeply influenced by everything you say and do. They can make a perfectly reasonable argument as to why they should be allowed to date, yet they can't seem to understand your perfectly reasonable argument for why they should wait. They want to be individuals, yet they want desperately to fit in.

Welcome to the eighth grade! Your child is now a full-grown teenager, and she'll experience great physical, emotional, and intellectual changes during this dramatic year. As she moves from childhood to adulthood, she'll begin to look like a young woman, and she'll begin to struggle for the independence of adulthood, for which she's not quite ready yet. Your teenager will experience changes and feel emotions she won't always understand. As a result, she'll sometimes feel a little lost or scared, and often very confused as she struggles to figure out who she is and who she wants to be.

That is where you come in. As much as your eighth grader may push you away, as much as you may feel she doesn't want you around, she does want you to be involved in her life. She needs you to know what's happening to her and around her, especially in school where she may face pressure to fit in and where she'll face a curriculum that challenges her developing reasoning skills. As the saying goes, "Little kids, little problems; big kids, big problems." And your big kid will need you to help her work those problems out.`;

const macbethPassage = `Many years ago, when I was working in a school in Buenos Aires, I was required to teach Macbeth to a class of Spanish-speaking schoolboys. I was a bit worried at being given such a task, because Shakespeare's language is not always easy, even for the native speaker. The language of Macbeth is particularly rich and strange to the modern reader. I myself had seen and read the play for the first time at an early age, and had been carried away by the story. So, I decided to concentrate first on the action and plot, and as far as possible let the language take care of itself.

I read the play to my students, scene by scene, taking the different parts myself. I did not let my pupils read it aloud for themselves, as I thought they lacked necessary experience and skill to benefit from this. At the end of each scene, I saw to it that everybody understood what had happened, and we briefly summarized this in writing. After this, I went through the scene again, explaining those language points that might prevent essential comprehension, and then I read the scene straight through once more.

This was not a very exciting approach. The pupils' participation was largely passive. I was in fact doing most of the work. However, when we had gone through about half of the play in this manner, I discovered to my great surprise that the class had taken the book home and finished it for themselves. Through my efforts, they had woken up to the idea that the story was exciting, and wanted to know how it turned out in the end.

We went ahead and finished the play, working more rapidly, and went on to discuss and read parts of the play again, focusing on the characters, plots, themes, etc. Without noticing it, we did a lot of practice in oral and written English.`;

const wildhoodPassage = `In their recent book, "Wildhood," Harvard biologist Barbara Natterson-Horowitz and science journalist Kathryn Bowers point out that adolescent animals and human teenagers go through the same sorts of challenges. With little life experience, adolescent animals engage in dangerous but beneficial behaviors. For example, they watch, smell and learn about the animals that eat them, gathering all kinds of information that can keep them safer as adults. Similarly, human teenagers try to have as many experiences as they can before they leave the nest.

Another key aspect of adolescents is the amount of time they spend in groups. This period is marked by peak levels of peer pressure and near-disaster. Scientists have found that adolescents of all kinds tend to make dangerous moves while with peers. Laurence Steinberg, a psychology professor, set up two experiments. One involved mice, half of which were adolescents, drinking alcoholic water. In the other experiment, human teenagers played a driving video game. The results were surprisingly similar. "We found that in the presence of peers, adolescent mice drank more than they do when they're alone," Steinberg said. The teenagers in the driving study also took more risks when others were around. Just knowing there were other teenagers watching appeared to make the one behind the wheel act more carelessly. These findings reveal another adolescent quality: the desire to socialize. "For the most part, adolescents like to be with other adolescents," Steinberg said.

While writing the book, both Natterson-Horowitz and Bowers were raising a human teenager in their homes. Their desire to understand the wild was driven by wanting to understand their own children.`;

const americansPassage = `Americans like to be straightforward when it comes to getting to know someone. Their personal questions might seem offensive in some cultures. For example, "Where did you go to school?" might annoy an Englishman, because the answer reveals his social status. Here, it is simply an attempt to speed up the getting-to-know-you process.

While many Americans are very well-traveled, they're in the minority. Don't be offended if a comment about your country or culture seems insulting - it's usually just a lack of information, and a gentle correction will be well accepted. What if the conversation goes wrong to a topic that you find private, such as health or politics? Americans can't always take a subtle hint when they're being disturbing - a light-hearted comment and a change of subject will probably work. If you're from Europe, expect to hear how many famous ancestors of your country appear in their family tree. And if you're from Britain, that sudden odd way of speaking is probably an American's attempt to imitate your accent - it's meant to be joking. These days there is little in the United States that truly offends. As a universal rule, it is also wise to avoid talking about religion, money, and politics.

So, now that you know what to expect, how do you go about meeting one of those 315 million Americans? As we have seen, Americans are doers, joiners, and organizers. According to the old joke, if you put two British people on a desert island, they'll form a committee. Two Americans are more likely to set up a boat-building club, or a professional association for survivors. They can't resist talking to someone who shares their particular passion, so whatever your professional or leisure interest, find a group and get involved.`;

const hotelDialogue = `A. I have a reservation
B. How do you do
C. What's the name, please
D. Here you are
E. How may I help you
F. I have a very nice stay here
G. Did you have a pleasant trip
H. May I see your ID, please

Clerk: Hello, welcome to North Park Hotel! (56)?
David: Hi, yes. (57). My assistant booked a room for me three days ago.
Clerk: (58)?
David: Sarah Gatesby.
Clerk: Ah, yes. She has booked a standard double room, non-smoking for David Black.
David: Yes, that's me.
Clerk: (59)?
David: Sure. (60).
Clerk: Thank you.`;

const hotelOptions = ['I have a reservation', 'How do you do', "What's the name, please", 'Here you are', 'How may I help you', 'I have a very nice stay here', 'Did you have a pleasant trip', 'May I see your ID, please'];

const english2023Questions: VerifiedPaperQuestion[] = [
  q('1. 选出标记部分读音与其他三个不同的选项（方括号内为原卷画线字母）。', ['pa[s]t', 'fa[s]t', 'grand[s]on', 'rea[s]on'], 'D', 1),
  q('2. 选出标记部分读音与其他三个不同的选项（方括号内为原卷画线字母）。', ['lun[ch]', 'stoma[ch]', 'tou[ch]', 'spee[ch]'], 'B', 1),
  q('3. 选出标记部分读音与其他三个不同的选项（方括号内为原卷画线字母）。', ['bom[b]', 'tom[b]', 'clim[b]er', 'num[b]er'], 'D', 1),
  q('4. 选出标记部分读音与其他三个不同的选项（方括号内为原卷画线字母）。', ['[a]live', '[a]ware', '[a]gent', '[a]ttract'], 'C', 1),
  q('5. 选出标记部分读音与其他三个不同的选项（方括号内为原卷画线字母）。', ['f[ou]r', 'h[ou]r', 's[ou]r', '[ou]r'], 'A', 1),
  q('6. The world will be different, and we have to be prepared to ____ to the change.', ['agree', 'turn', 'adapt', 'move'], 'C', 1),
  q('7. Not only the students but also their foreign teacher ____ watching romantic movies.', ['enjoy', 'enjoys', 'to enjoy', 'enjoying'], 'B', 1),
  q('8. The mayor said that the development would not have any bad ____ upon wildlife in the area.', ['effect', 'image', 'result', 'power'], 'A', 1),
  q('9. John has no idea ____ this dog has been following him all the way.', ['what', 'when', 'where', 'why'], 'D', 1),
  q('10. The committee insisted that the proposal ____ without delay.', ['be discussed', 'to be discussed', 'is discussed', 'is to be discussed'], 'A', 1),
  q('11. You ____ hand in your paper on Monday or you will lose 10 percent of your final score.', ['can', 'should', 'may', 'would'], 'B', 1),
  q("12. The university's academic board will ____ this issue first before coming to a decision.", ['look up', 'look after', 'look for', 'look into'], 'D', 1),
  q('13. She had been taking singing lessons since she was a child and was ____ in winning the competition.', ['confident', 'proud', 'good', 'capable'], 'A', 1),
  q('14. The girl spent as much time in watching TV as she ____ in studying.', ['does', 'had', 'was', 'did'], 'D', 1),
  q('15. An estimated 50,000 farmers ____ the new method by the end of this year.', ['are adopting', 'have adopted', 'will have adopted', 'have been adopting'], 'C', 1),
  q('16. I have a very busy work schedule, and have almost no time to ____ to body building.', ['appeal', 'devote', 'supply', 'contribute'], 'B', 1),
  q('17. ____ a great dancer, Diana often receives invitations to give performances in different countries.', ['Has been', 'Being', 'Be', 'To be'], 'B', 1),
  q('18. Nancy has been reading a long novel ____ the past two weeks.', ['for', 'from', 'before', 'till'], 'A', 1),
  q('19. The journey to the lake was terrible, but after we ____ there, we had a wonderful time.', ['have arrived', 'could arrive', 'would arrive', 'had arrived'], 'D', 1),
  q('20. My elder sister says I can borrow her newly-bought dress for parties ____ I like.', ['since', 'if', 'whether', 'though'], 'B', 1),
  q('21. 选择最佳选项填入第 21 空。', ['remind', 'believe', 'persuade', 'doubt'], 'B', 2, clozePassage),
  q('22. 选择最佳选项填入第 22 空。', ['track down', 'look at', 'calm down', 'knock at'], 'A', 2, clozePassage),
  q('23. 选择最佳选项填入第 23 空。', ['reason', 'science', 'truth', 'rule'], 'C', 2, clozePassage),
  q('24. 选择最佳选项填入第 24 空。', ['if', 'as', 'although', 'unless'], 'A', 2, clozePassage),
  q('25. 选择最佳选项填入第 25 空。', ['freely', 'properly', 'wildly', 'slowly'], 'B', 2, clozePassage),
  q('26. 选择最佳选项填入第 26 空。', ['stronger', 'smarter', 'faster', 'harder'], 'D', 2, clozePassage),
  q('27. 选择最佳选项填入第 27 空。', ['cover', 'follow', 'count', 'leave'], 'B', 2, clozePassage),
  q('28. 选择最佳选项填入第 28 空。', ['in', 'above', 'on', 'for'], 'C', 2, clozePassage),
  q('29. 选择最佳选项填入第 29 空。', ['soil', 'earth', 'land', 'ground'], 'D', 2, clozePassage),
  q('30. 选择最佳选项填入第 30 空。', ['faint', 'strong', 'thick', 'thin'], 'A', 2, clozePassage),
  q('31. 选择最佳选项填入第 31 空。', ['change', 'keep', 'release', 'judge'], 'D', 2, clozePassage),
  q('32. 选择最佳选项填入第 32 空。', ['coffee', 'juice', 'alcohol', 'tea'], 'C', 2, clozePassage),
  q('33. 选择最佳选项填入第 33 空。', ['mastering', 'processing', 'making', 'producing'], 'C', 2, clozePassage),
  q('34. 选择最佳选项填入第 34 空。', ['which', 'where', 'how', 'why'], 'B', 2, clozePassage),
  q('35. 选择最佳选项填入第 35 空。', ['approvingly', 'sadly', 'gratefully', 'reluctantly'], 'A', 2, clozePassage),
  q('36. Which of the following is true about the writer when he was a ten-year-old?', ['He wanted to become a gentleman.', "He didn't get along with his mother well.", "He didn't know the uses of a handkerchief.", "He thought his mother's rules old-fashioned."], 'C', 3, handkerchiefPassage),
  q("37. How did the writer's kids react to his handkerchief?", ['They thought he should get rid of it.', 'They convinced him of its ridiculous trouble.', 'They argued with him about its harmful effect.', 'They assured him it would be replaced by tissues.'], 'A', 3, handkerchiefPassage),
  q("38. Why does the writer use the quotation from his wife in the last paragraph?", ["To express gratitude for his wife's gift.", 'To indicate that his wife was easily moved.', 'To demonstrate a role of handkerchiefs in life.', 'To show a change of attitude towards handkerchiefs.'], 'C', 3, handkerchiefPassage),
  q('39. What is the best title for the passage?', ['Handkerchief: A Family Tie', 'Handkerchief: A Gift for Grandfathers', 'Handkerchief: Old-fashioned but Useful', 'Handkerchief: Necessary for Gentlemen'], 'C', 3, handkerchiefPassage),
  q('40. Which of the following statements about eighth graders is true?', ['They fit into society well.', 'They show conflicting characters.', 'They push each other away.', 'They become increasingly reasonable.'], 'B', 3, eighthGradePassage),
  q("41. Why is an eighth grader's life so dramatic?", ['She has many roles to play.', 'She is losing her independence.', 'She has become a grown-up woman.', 'She is experiencing many changes.'], 'D', 3, eighthGradePassage),
  q('42. For whom is the passage written?', ["Eighth graders' parents.", "Eighth graders' doctors.", "Eighth graders' teachers.", 'Eighth graders themselves.'], 'A', 3, eighthGradePassage),
  q('43. What is the writer most probably going to do next?', ['To criticize eighth graders.', 'To introduce a famous teacher.', 'To discuss the current educational policy.', 'To explain how to help eighth graders.'], 'D', 3, eighthGradePassage),
  q('44. What made the teaching of Macbeth a worrying task?', ['The story is very boring.', "The teacher hadn't read the play.", "Shakespeare's language is difficult.", "The students hadn't watched the play."], 'C', 3, macbethPassage),
  q('45. When did the language of Macbeth start to be dealt with?', ['Before the teacher read the play.', 'After the pupils read the play aloud.', 'After the pupils understood the plot.', 'Before the teacher explained the writing skills.'], 'C', 3, macbethPassage),
  q('46. What surprised the teacher greatly?', ['The pupils started to learn actively.', 'The pupils summarized the plot orally.', 'The pupils began to enjoy the language.', 'The pupils became very excited in class.'], 'A', 3, macbethPassage),
  q('47. What can be learned from the teaching practice in the passage?', ['Group work is useful for learning a language.', 'Good teachers focus on teaching language points.', "Shakespeare's plays are suitable for foreign students.", "Proper teaching methods might arouse pupils' interest."], 'D', 3, macbethPassage),
  q('48. What do adolescent animals and human teenagers have in common?', ['They like to stay in the nest for safety.', 'They are interested in the adult world.', 'They are good at gathering information.', 'They tend to take risks to gain experience.'], 'D', 3, wildhoodPassage),
  q("49. What is found in Steinberg's experiments about peer pressure?", ['Adolescent mice take fewer risks in a peer group.', 'Adolescent mice drink more when they are alone.', 'Teenagers drive more carelessly with peers around.', 'Teenagers play more video games with their friends.'], 'C', 3, wildhoodPassage),
  q('50. Which of the following is closest in meaning to "socialize" in Paragraph 2?', ['Live alone.', 'Help each other.', 'Take responsibilities.', 'Spend time with others.'], 'D', 3, wildhoodPassage),
  q('51. Why did Natterson-Horowitz and Bowers write the book?', ['To better educate human teenagers.', 'To better understand their own children.', 'To research on adolescent peer pressure.', 'To get to know adolescent drinking problem.'], 'B', 3, wildhoodPassage),
  q('52. What would Americans most probably do when they meet a European?', ['They would correct his English accent.', 'They would hear his opinion of America.', "They would inquire about Europe's health system.", 'They would boast about their European ancestors.'], 'D', 3, americansPassage),
  q('53. According to the writer, what should a European do to get along with Americans?', ['Join their groups.', 'Set up a club for them.', 'Talk about their history.', 'Keep them at a distance.'], 'A', 3, americansPassage),
  q("54. What is the writer's attitude towards Americans?", ['Indifferent.', 'Objective.', 'Critical.', 'Disappointed.'], 'B', 3, americansPassage),
  q('55. What is the best title for the passage?', ['Working with Europeans', "Finding out Americans' Passions", 'Getting to Know Americans', 'Learning about European Cultures'], 'C', 3, americansPassage),
  q('56. 选择最佳表达填入对话第 56 空。', hotelOptions, 'E', 3, hotelDialogue),
  q('57. 选择最佳表达填入对话第 57 空。', hotelOptions, 'A', 3, hotelDialogue),
  q('58. 选择最佳表达填入对话第 58 空。', hotelOptions, 'C', 3, hotelDialogue),
  q('59. 选择最佳表达填入对话第 59 空。', hotelOptions, 'H', 3, hotelDialogue),
  q('60. 选择最佳表达填入对话第 60 空。', hotelOptions, 'D', 3, hotelDialogue),
  {
    content: '61. 你（Li Yuan）要参加一次英语征文比赛，题目为 My Favorite Photo。请写一篇 100-120 词的短文，说明拍照时间和地点、照片中的人物或景物，以及喜欢这张照片的原因。',
    answer: '开放题。评分时检查：内容要点完整；格式与题意相符；语法和拼写基本准确；词数约 100-120 词。',
    score: 25,
  },
];

export const VERIFIED_PAPERS: VerifiedPaper[] = [
  {
    subject: '英语',
    year: 2023,
    title: '2023 年英语真题（核验回忆版）',
    source: '东科教育整理版（题面与答案解析）',
    sourceUrl: 'https://18876197.s21i.faiusr.com/61/ABUIABA9GAAg4cyFtwYoiOy09AU.pdf',
    sourceType: 'VERIFIED_RECALL',
    isComplete: true,
    expectedQuestionCount: 61,
    verificationNotes: '题面与爱真题网页逐题交叉核对；另与成人学历报考中心的语音、语法、完形及对话答案核对。官方未公开原卷，因此只能标记为多来源核验的考生回忆版。',
    questions: english2023Questions,
  },
];
