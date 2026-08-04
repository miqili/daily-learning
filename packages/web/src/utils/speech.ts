/**
 * 浏览器 TTS 朗读，优先使用美式标准发音（en-US）。
 * 兼容 Chrome(Google US English) / Edge(Natural) / Safari(Samantha) / macOS 系统音色。
 */
export function speak(text: string, lang = 'en-US'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  // 优先选明确的 en-US 美式音色
  const voices = synth.getVoices();
  const isUs = (v: SpeechSynthesisVoice) => v.lang.toLowerCase() === 'en-us';
  const preferred =
    voices.find((v) => isUs(v) && /samantha|zira|aria|jenny|google us english|natural|female/i.test(v.name)) ??
    voices.find(isUs) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  if (preferred) utterance.voice = preferred;

  synth.speak(utterance);
}

/** 预加载音色列表（部分浏览器需触发 voiceschanged 后才返回） */
export function warmupVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.getVoices();
  if (!('onvoiceschanged' in window.speechSynthesis)) return;
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
