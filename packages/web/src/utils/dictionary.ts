/**
 * 在线词典查询美式音标（IPA）。
 * 使用 Free Dictionary API（dictionaryapi.dev），优先取美式发音对应音标。
 * 网络不可用时返回 null，可手动填写。
 */
interface PhoneticEntry {
  text?: string;
  audio?: string;
}

export async function fetchUsPhonetic(word: string): Promise<string | null> {
  const clean = word.trim();
  if (!clean) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : data;
    const phonetics: PhoneticEntry[] = Array.isArray(entry?.phonetics) ? entry.phonetics : [];
    // 优先美式音频（-us.mp3）对应的音标
    const us =
      phonetics.find((p) => typeof p.audio === 'string' && /-us\.mp3|_us\.mp3/i.test(p.audio) && p.text) ??
      phonetics.find((p) => p.text);
    return us?.text?.trim() ?? null;
  } catch {
    return null;
  }
}
