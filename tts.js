let voices = [];

export async function initTts() {
  if (!isAvailable()) return;

  voices = speechSynthesis.getVoices();
  if (voices.length > 0) return;

  await new Promise(resolve => {
    const timer = setTimeout(() => {
      voices = speechSynthesis.getVoices();
      resolve();
    }, 1000);
    speechSynthesis.addEventListener('voiceschanged', () => {
      clearTimeout(timer);
      voices = speechSynthesis.getVoices();
      resolve();
    }, { once: true });
  });
}

export function isAvailable() {
  return typeof speechSynthesis !== 'undefined';
}

export function cancel() {
  if (!isAvailable()) return;
  speechSynthesis.cancel();
}

export function speak(text, lang = 'en') {
  if (!isAvailable()) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(_makeUtterance(text, lang));
}

export function speakAndWait(text, lang = 'en') {
  return new Promise(resolve => {
    if (!isAvailable()) { resolve(); return; }
    speechSynthesis.cancel();
    const u = _makeUtterance(text, lang);
    const timer = setTimeout(resolve, Math.max(2000, text.length * 120));
    u.onend  = () => { clearTimeout(timer); resolve(); };
    u.onerror = () => { clearTimeout(timer); resolve(); };
    speechSynthesis.speak(u);
  });
}

// ─── internal ───

const LANG_MAP = { ja: 'ja-JP' };

function _langCode(lang) {
  return LANG_MAP[lang] ?? 'en-US';
}

function _pickVoice(langCode) {
  return (
    voices.find(v => v.lang === langCode) ??
    voices.find(v => v.lang.startsWith(langCode.split('-')[0])) ??
    null
  );
}

function _makeUtterance(text, lang) {
  const langCode = _langCode(lang);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode;
  u.rate = 0.9;
  const voice = _pickVoice(langCode);
  if (voice) u.voice = voice;
  return u;
}
