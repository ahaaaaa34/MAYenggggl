import { initTts, speak } from './tts.js';

// ════════════════════════════════════════════
// WORD DATA  (id は 0 始まり連番)
// ════════════════════════════════════════════
const WORDS = [
  // 英検3級
  { id:  0, en: 'species',     ja: '種',               lv: '3級',   lvCls: 'lv-3',    ex: 'Many species are nearly extinct.',                                  exJa: '多くの種が絶滅の危機に瀕している。',               jaHl: '種' },
  { id:  1, en: 'extinct',     ja: '絶滅した',           lv: '3級',   lvCls: 'lv-3',    ex: 'Many species are nearly extinct.',                                  exJa: '多くの種が絶滅の危機に瀕している。',               jaHl: '絶滅' },
  { id:  2, en: 'disappear',   ja: '消える',             lv: '3級',   lvCls: 'lv-3',    ex: 'Species could disappear from the Earth very soon.',                 exJa: '種はごく間もなく地球から姿を消すかもしれない。',   jaHl: '姿を消す' },
  { id:  3, en: 'save',        ja: '救う',               lv: '3級',   lvCls: 'lv-3',    ex: 'We must do something to save them.',                               exJa: '私たちは彼らを救うために何かをしなければならない。', jaHl: '救う' },
  { id:  4, en: 'reason',      ja: '理由',               lv: '3級',   lvCls: 'lv-3',    ex: 'Habitat destruction is the main reason.',                          exJa: '生息地の破壊が主な理由だ。',                       jaHl: '理由' },
  { id:  5, en: 'harm',        ja: '害',                 lv: '3級',   lvCls: 'lv-3',    ex: 'Most harm to species is due to human activities.',                 exJa: '種に対するほとんどの害は人間の活動によるものだ。', jaHl: '害' },
  { id:  6, en: 'activity',    ja: '活動',               lv: '3級',   lvCls: 'lv-3',    ex: 'Most harm is due to human activities.',                            exJa: 'ほとんどの害は人間の活動によるものだ。',           jaHl: '活動' },
  { id:  7, en: 'destruction', ja: '破壊',               lv: '3級',   lvCls: 'lv-3',    ex: 'Habitat destruction is the main reason.',                          exJa: '生息地の破壊が主な理由だ。',                       jaHl: '破壊' },
  { id:  8, en: 'hunting',     ja: '狩猟',               lv: '3級',   lvCls: 'lv-3',    ex: 'Endangered species are also the result of hunting.',               exJa: '絶滅危惧種は狩猟の結果でもある。',                 jaHl: '狩猟' },
  { id:  9, en: 'destroy',     ja: '破壊する',           lv: '3級',   lvCls: 'lv-3',    ex: "This destroys the animals' habitat.",                              exJa: 'これが動物たちの生息地を破壊する。',               jaHl: '破壊する' },
  { id: 10, en: 'natural',     ja: '自然の',             lv: '3級',   lvCls: 'lv-3',    ex: 'We should try not to pollute natural areas.',                      exJa: '私たちは自然の地域を汚染しないように努めるべきだ。', jaHl: '自然の' },
  { id: 11, en: 'environment', ja: '環境',               lv: '3級',   lvCls: 'lv-3',    ex: 'It is the natural environment where plants live.',                  exJa: 'それは植物が生きる自然環境だ。',                   jaHl: '環境' },
  { id: 12, en: 'pollution',   ja: '汚染',               lv: '3級',   lvCls: 'lv-3',    ex: 'Animal habitats are also destroyed because of pollution.',         exJa: '動物の生息地は汚染の理由でも破壊される。',         jaHl: '汚染' },
  { id: 13, en: 'factory',     ja: '工場',               lv: '3級',   lvCls: 'lv-3',    ex: 'Dirty water from factories contains chemicals.',                   exJa: '工場からの汚水には化学物質が含まれている。',       jaHl: '工場' },
  { id: 14, en: 'contain',     ja: '含む',               lv: '3級',   lvCls: 'lv-3',    ex: 'Dirty water from factories contains chemicals.',                   exJa: '工場からの汚水には化学物質が含まれている。',       jaHl: '含まれている' },
  { id: 15, en: 'area',        ja: '地域',               lv: '3級',   lvCls: 'lv-3',    ex: 'Humans move into a new area.',                                     exJa: '人間が新しい地域に移り住む。',                     jaHl: '地域' },
  { id: 16, en: 'result',      ja: '結果',               lv: '3級',   lvCls: 'lv-3',    ex: 'Endangered species are also the result of hunting.',               exJa: '絶滅危惧種は狩猟の結果でもある。',                 jaHl: '結果' },
  { id: 17, en: 'price',       ja: '価格',               lv: '3級',   lvCls: 'lv-3',    ex: 'This is because of the high price of meat.',                       exJa: 'これは肉の価格が高いためだ。',                     jaHl: '価格' },
  { id: 18, en: 'example',     ja: '例',                 lv: '3級',   lvCls: 'lv-3',    ex: 'For example, some seal species are almost extinct.',               exJa: '例えば、一部のアザラシの種はほぼ絶滅している。',   jaHl: '例' },
  { id: 19, en: 'almost',      ja: 'ほとんど・もう少しで', lv: '3級',   lvCls: 'lv-3',    ex: 'Some seal species are now almost extinct.',                        exJa: '一部のアザラシの種は現在ほぼ絶滅している。',       jaHl: 'ほぼ' },
  { id: 20, en: 'medicine',    ja: '薬',                 lv: '3級',   lvCls: 'lv-3',    ex: 'Tigers are shot to make medicine.',                                exJa: 'トラは薬を作るために撃たれる。',                   jaHl: '薬' },
  { id: 21, en: 'creature',    ja: '生き物',             lv: '3級',   lvCls: 'lv-3',    ex: 'Large sea creatures have become endangered species.',              exJa: '大型の海洋生物が絶滅危惧種になっている。',         jaHl: '生物' },
  { id: 22, en: 'special',     ja: '特別な',             lv: '3級',   lvCls: 'lv-3',    ex: 'They are caught to make special dishes.',                          exJa: 'それらは特別な料理を作るために捕まえられる。',     jaHl: '特別な' },
  { id: 23, en: 'dish',        ja: '料理',               lv: '3級',   lvCls: 'lv-3',    ex: 'They are caught to make special dishes.',                          exJa: 'それらは特別な料理を作るために捕まえられる。',     jaHl: '料理' },
  { id: 24, en: 'step',        ja: '手段',               lv: '3級',   lvCls: 'lv-3',    ex: 'What steps can individuals and governments take?',                 exJa: '個人や政府はどのような対策（手段）を取ることができるか？', jaHl: '対策' },
  { id: 25, en: 'protect',     ja: '守る',               lv: '3級',   lvCls: 'lv-3',    ex: 'These protect animals from extinction.',                           exJa: 'これらが動物を絶滅から保護する。',                 jaHl: '保護する' },
  { id: 26, en: 'refuse',      ja: '拒む',               lv: '3級',   lvCls: 'lv-3',    ex: 'The public can help out by refusing to buy.',                      exJa: '一般の人々は買うのを拒否することで協力できる。',   jaHl: '拒否する' },
  { id: 27, en: 'product',     ja: '製品',               lv: '3級',   lvCls: 'lv-3',    ex: 'Refuse to buy products made from animals.',                        exJa: '動物から作られた製品を買うのを拒否しなさい。',     jaHl: '製品' },
  { id: 28, en: 'against',     ja: '〜に反して',         lv: '3級',   lvCls: 'lv-3',    ex: 'Governments can make it against the law.',                         exJa: '政府はそれを法律違反（〜に反して）にすることができる。', jaHl: '違反' },
  { id: 29, en: 'law',         ja: '法律',               lv: '3級',   lvCls: 'lv-3',    ex: 'Governments can make it against the law.',                         exJa: '政府はそれを法律違反にすることができる。',         jaHl: '法律' },
  { id: 30, en: 'provide',     ja: '提供する',           lv: '3級',   lvCls: 'lv-3',    ex: 'They can also provide funding for zoos.',                          exJa: '彼らは動物園への資金を提供することもできる。',     jaHl: '提供する' },
  { id: 31, en: 'cooperate',   ja: '協力する',           lv: '3級',   lvCls: 'lv-3',    ex: 'If we all cooperate by taking these steps.',                       exJa: 'もし私たちが皆、これらの手段をとって協力すれば。', jaHl: '協力すれば' },
  { id: 32, en: 'planet',      ja: '星・地球',           lv: '3級',   lvCls: 'lv-3',    ex: 'We will protect our planet.',                                      exJa: '私たちは自分たちの地球（惑星）を保護するだろう。', jaHl: '地球' },
  { id: 33, en: 'enjoy',       ja: '楽しむ',             lv: '3級',   lvCls: 'lv-3',    ex: 'Our children can enjoy it, too.',                                  exJa: '私たちの子供たちもそれを楽しむことができる。',     jaHl: '楽しむ' },
  // 英検準2級
  { id: 34, en: 'endangered',  ja: '絶滅危惧の',         lv: '準2級', lvCls: 'lv-pre2', ex: 'Habitat destruction is why animals become endangered.',            exJa: '生息地の破壊が、動物が絶滅の危機に瀕する理由だ。', jaHl: '絶滅の危機に瀕する' },
  { id: 35, en: 'extinction',  ja: '絶滅',               lv: '準2級', lvCls: 'lv-pre2', ex: 'Sanctuaries protect animals from extinction.',                     exJa: '保護区は動物を絶滅から守る。',                     jaHl: '絶滅' },
  { id: 36, en: 'habitat',     ja: '生息地',             lv: '準2級', lvCls: 'lv-pre2', ex: "This destroys the animals' habitat.",                              exJa: 'これが動物たちの生息地を破壊する。',               jaHl: '生息地' },
  { id: 37, en: 'overfishing', ja: '乱獲',               lv: '準2級', lvCls: 'lv-pre2', ex: 'Whales have become endangered because of overfishing.',            exJa: 'クジラは乱獲のせいで絶滅の危機に瀕している。',     jaHl: '乱獲' },
  { id: 38, en: 'chemical',    ja: '化学物質',           lv: '準2級', lvCls: 'lv-pre2', ex: 'Dirty water from factories contains chemicals.',                   exJa: '工場からの汚水には化学物質が含まれている。',       jaHl: '化学物質' },
  { id: 39, en: 'poison',      ja: '毒',                 lv: '準2級', lvCls: 'lv-pre2', ex: 'Poisons used on farmland may kill animals.',                       exJa: '農地で使われる毒が動物を殺すかもしれない。',       jaHl: '毒' },
  { id: 40, en: 'fur',         ja: '毛皮',               lv: '準2級', lvCls: 'lv-pre2', ex: 'Other animals are killed for their fur.',                          exJa: '他の動物は毛皮のために殺される。',                 jaHl: '毛皮' },
  { id: 41, en: 'bone',        ja: '骨',                 lv: '準2級', lvCls: 'lv-pre2', ex: 'Other animals are killed for their bones.',                        exJa: '他の動物は骨のために殺される。',                   jaHl: '骨' },
  { id: 42, en: 'skin',        ja: '皮',                 lv: '準2級', lvCls: 'lv-pre2', ex: 'Other animals are killed for their skin.',                         exJa: '他の動物は皮のために殺される。',                   jaHl: '皮' },
  { id: 43, en: 'sport',       ja: 'スポーツ・娯楽',     lv: '準2級', lvCls: 'lv-pre2', ex: 'Other animals are killed just for sport.',                         exJa: '他の動物は単なるスポーツ（娯楽）のために殺される。', jaHl: '娯楽' },
  { id: 44, en: 'seal',        ja: 'アザラシ',           lv: '準2級', lvCls: 'lv-pre2', ex: 'Some seal species are now almost extinct.',                        exJa: '一部のアザラシの種は現在ほぼ絶滅している。',       jaHl: 'アザラシ' },
  { id: 45, en: 'shoot',       ja: '撃つ',               lv: '準2級', lvCls: 'lv-pre2', ex: 'Tigers are shot to make medicine.',                                exJa: 'トラは薬を作るために撃たれる。',                   jaHl: '撃たれる' },
  { id: 46, en: 'whale',       ja: 'クジラ',             lv: '準2級', lvCls: 'lv-pre2', ex: 'Large sea creatures like whales are endangered.',                  exJa: 'クジラのような大型の海洋生物は絶滅の危機に瀕している。', jaHl: 'クジラ' },
  { id: 47, en: 'tuna',        ja: 'マグロ',             lv: '準2級', lvCls: 'lv-pre2', ex: 'Tuna have become endangered because of overfishing.',              exJa: 'マグロは乱獲のせいで絶滅の危機に瀕している。',     jaHl: 'マグロ' },
  { id: 48, en: 'shark',       ja: 'サメ',               lv: '準2級', lvCls: 'lv-pre2', ex: 'Sharks have become endangered because of overfishing.',            exJa: 'サメは乱獲のせいで絶滅の危機に瀕している。',       jaHl: 'サメ' },
  { id: 49, en: 'individual',  ja: '個人',               lv: '準2級', lvCls: 'lv-pre2', ex: 'What steps can individuals and governments take?',                 exJa: '個人や政府はどのような対策を取ることができるか？', jaHl: '個人' },
  { id: 50, en: 'government',  ja: '政府',               lv: '準2級', lvCls: 'lv-pre2', ex: 'Governments can make it against the law.',                         exJa: '政府はそれを法律違反にすることができる。',         jaHl: '政府' },
  { id: 51, en: 'pollute',     ja: '汚染する',           lv: '準2級', lvCls: 'lv-pre2', ex: 'We should try not to pollute natural areas.',                      exJa: '私たちは自然の地域を汚染しないように努めるべきだ。', jaHl: '汚染しない' },
  { id: 52, en: 'farmer',      ja: '農家',               lv: '準2級', lvCls: 'lv-pre2', ex: 'Farmers who destroy habitats should face a penalty.',              exJa: '生息地を破壊する農家は罰則を受けるべきだ。',       jaHl: '農家' },
  { id: 53, en: 'company',     ja: '会社',               lv: '準2級', lvCls: 'lv-pre2', ex: 'Companies who destroy habitats should face a penalty.',            exJa: '生息地を破壊する企業は罰則を受けるべきだ。',       jaHl: '企業' },
  { id: 54, en: 'financial',   ja: '金銭的な',           lv: '準2級', lvCls: 'lv-pre2', ex: 'They should face a financial penalty.',                            exJa: '彼らは経済的な（金銭的な）罰則を受けるべきだ。',   jaHl: '経済的な' },
  { id: 55, en: 'penalty',     ja: '罰',                 lv: '準2級', lvCls: 'lv-pre2', ex: 'They should face a financial penalty.',                            exJa: '彼らは経済的な罰則を受けるべきだ。',               jaHl: '罰則' },
  { id: 56, en: 'public',      ja: '一般市民',           lv: '準2級', lvCls: 'lv-pre2', ex: 'The public can help out by refusing to buy.',                      exJa: '一般の人々は買うのを拒否することで協力できる。',   jaHl: '一般の人々' },
  { id: 57, en: 'trade',       ja: '取引する',           lv: '準2級', lvCls: 'lv-pre2', ex: 'Make it against the law to trade.',                                exJa: '取引することを法律違反にしなさい。',               jaHl: '取引する' },
  { id: 58, en: 'funding',     ja: '資金',               lv: '準2級', lvCls: 'lv-pre2', ex: 'They can also provide funding for zoos.',                          exJa: '彼らは動物園への資金を提供することもできる。',     jaHl: '資金' },
  { id: 59, en: 'sanctuary',   ja: '保護区',             lv: '準2級', lvCls: 'lv-pre2', ex: 'They can provide funding for animal sanctuaries.',                 exJa: '彼らは動物保護区への資金を提供できる。',           jaHl: '保護区' },
  { id: 60, en: 'breed',       ja: '繁殖させる',         lv: '準2級', lvCls: 'lv-pre2', ex: 'Sanctuaries protect animals by breeding more.',                    exJa: '保護区はより多くを繁殖させることで動物を守る。',   jaHl: '繁殖させる' },
  { id: 61, en: 'release',     ja: '放つ',               lv: '準2級', lvCls: 'lv-pre2', ex: 'They can later be released into the wild.',                        exJa: 'それらは後で野生に放すことができる。',             jaHl: '放す' },
  { id: 62, en: 'wild',        ja: '野生',               lv: '準2級', lvCls: 'lv-pre2', ex: 'They can later be released into the wild.',                        exJa: 'それらは後で野生に放すことができる。',             jaHl: '野生' },
  // 英検2級
  { id: 63, en: 'oryx',        ja: 'オリックス（レイヨウの一種）', lv: '2級', lvCls: 'lv-2', ex: 'The Arabian oryx are nearly extinct.',                         exJa: 'アラビアオリックスはほぼ絶滅している。',           jaHl: 'オリックス' },
  { id: 64, en: 'crocodile',   ja: 'ワニ',               lv: '2級',   lvCls: 'lv-2',    ex: 'Crocodiles are caught to make bags and shoes.',                    exJa: 'ワニはバッグや靴を作るために捕まえられる。',       jaHl: 'ワニ' },
  // 英検準1級以上
  { id: 65, en: 'Arabian',     ja: 'アラビアの',         lv: '準1級+', lvCls: 'lv-pre1', ex: 'The Arabian oryx are nearly extinct.',                            exJa: 'アラビアオリックスはほぼ絶滅している。',           jaHl: 'アラビア' },
  // 追加単語
  { id: 66, en: 'Earth',       ja: '地球',               lv: '3級',   lvCls: 'lv-3',    ex: 'Species could disappear from the Earth very soon.',                exJa: '種はごく間もなく地球から姿を消すかもしれない。',   jaHl: '地球' },
  { id: 67, en: 'water',       ja: '水',                 lv: '3級',   lvCls: 'lv-3',    ex: 'Dirty water from factories contains chemicals.',                   exJa: '工場からの汚水には化学物質が含まれている。',       jaHl: '水' },
  { id: 68, en: 'river',       ja: '川',                 lv: '3級',   lvCls: 'lv-3',    ex: 'Dirty water from factories ends up in rivers.',                    exJa: '工場からの汚水は最終的に川に流れ込む。',           jaHl: '川' },
  { id: 69, en: 'tree',        ja: '木',                 lv: '3級',   lvCls: 'lv-3',    ex: 'They cut down trees to build houses.',                             exJa: '彼らは家を建てるために木を切り倒す。',             jaHl: '木' },
  { id: 70, en: 'sea',         ja: '海',                 lv: '3級',   lvCls: 'lv-3',    ex: 'Large sea creatures have become endangered species.',              exJa: '大型の海洋生物が絶滅危惧種になっている。',         jaHl: '海' },
  { id: 71, en: 'house',       ja: '家',                 lv: '3級',   lvCls: 'lv-3',    ex: 'They cut down trees to build houses.',                             exJa: '彼らは家を建てるために木を切り倒す。',             jaHl: '家' },
  { id: 72, en: 'farm',        ja: '農場',               lv: '3級',   lvCls: 'lv-3',    ex: 'They cut down trees to build farms.',                              exJa: '彼らは農場を作るために木を切り倒す。',             jaHl: '農場' },
  { id: 73, en: 'farmland',    ja: '農地',               lv: '3級',   lvCls: 'lv-3',    ex: 'Poisons used on farmland may kill animals.',                       exJa: '農地で使われる毒が動物を殺すかもしれない。',       jaHl: '農地' },
  { id: 74, en: 'zoo',         ja: '動物園',             lv: '3級',   lvCls: 'lv-3',    ex: 'They can also provide funding for zoos.',                          exJa: '彼らは動物園への資金を提供することもできる。',     jaHl: '動物園' },
  { id: 75, en: 'end up',      ja: '〜になる・〜に終わる', lv: '3級',  lvCls: 'lv-3',    ex: 'Dirty water from factories ends up in rivers.',                    exJa: '工場からの汚水は最終的に川に流れ込む。',           jaHl: '最終的に' },
  { id: 76, en: 'fin',         ja: 'ひれ',               lv: '準2級', lvCls: 'lv-pre2', ex: "People eat dishes such as shark's fin soup.",                      exJa: '人々はフカヒレスープのような料理を食べる。',       jaHl: 'ヒレ' },
];

// ════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════
const S = {
  dir: 'en-jp',   // 'en-jp' | 'jp-en'
  deck: [],
  idx: 0,
  flipped: false,
  wrong: [],
  correct: [],
};

// ════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function highlightWord(sentence, word) {
  if (!sentence) return '';
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped}(?:s|es|ed|ing|er|ly)?)`, 'gi');
  return sentence.replace(re, '<mark>$1</mark>');
}

function highlightJa(sentence, hl) {
  if (!sentence) return '';
  if (!hl) return sentence;
  const escaped = hl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sentence.replace(new RegExp(`(${escaped})`), '<mark>$1</mark>');
}

// ════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function renderCard() {
  const word = WORDS[S.deck[S.idx]];
  const total = S.deck.length;
  const current = S.idx + 1;

  // Progress
  document.getElementById('fc-progress').textContent = `${current} / ${total}`;
  document.getElementById('fc-bar').style.width = `${(current / total) * 100}%`;

  // Level badge
  const badge = document.getElementById('fc-level');
  badge.textContent = word.lv;
  badge.className = 'level-badge ' + word.lvCls;

  // Front face
  document.getElementById('fc-front-word').textContent =
    S.dir === 'en-jp' ? word.en : word.ja;

  // Back face
  document.getElementById('fc-back-answer').textContent =
    S.dir === 'en-jp' ? word.ja : word.en;

  const exEl = document.getElementById('fc-back-ex');
  const exJaEl = document.getElementById('fc-back-exja');
  if (word.ex) {
    exEl.innerHTML = highlightWord(word.ex, word.en);
    exEl.style.display = '';
    exJaEl.innerHTML = highlightJa(word.exJa, word.jaHl);
    exJaEl.style.display = word.exJa ? '' : 'none';
  } else {
    exEl.style.display = 'none';
    exJaEl.style.display = 'none';
  }

  // Reset flip
  S.flipped = false;
  document.querySelector('.fc-front').style.display = '';
  document.querySelector('.fc-back').style.display = 'none';
  document.getElementById('fc-btn-show').style.display = '';
  document.getElementById('fc-btn-row').style.display = 'none';

  // 英語が表示されるタイミングで発音
  if (S.dir === 'en-jp') speak(word.en, 'en');
}

// ════════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════════
function startSession(dir) {
  S.dir = dir;
  S.deck = shuffle(WORDS.map(w => w.id));
  S.idx = 0;
  S.wrong = [];
  S.correct = [];
  showScreen('screen-fc');
  renderCard();
}

function flipCard() {
  const wasFlipped = S.flipped;
  S.flipped = !S.flipped;

  document.querySelector('.fc-front').style.display = S.flipped ? 'none' : '';
  document.querySelector('.fc-back').style.display = S.flipped ? 'flex' : 'none';

  if (!wasFlipped) {
    document.getElementById('fc-btn-show').style.display = 'none';
    document.getElementById('fc-btn-row').style.display = 'flex';

    if (S.dir === 'jp-en') {
      const word = WORDS[S.deck[S.idx]];
      speak(word.en, 'en');
    }
  }
}

function markCard(known) {
  const wordId = S.deck[S.idx];
  if (known) S.correct.push(wordId);
  else S.wrong.push(wordId);

  S.idx++;
  if (S.idx >= S.deck.length) {
    showResult();
  } else {
    renderCard();
  }
}

function showResult() {
  document.getElementById('res-correct').textContent = S.correct.length;
  document.getElementById('res-wrong').textContent = S.wrong.length;
  // わからなかった単語ボタン：0件なら非表示
  const btnWrong = document.getElementById('btn-retry-wrong');
  if (S.wrong.length > 0) {
    btnWrong.style.display = '';
    btnWrong.textContent = `✗ わからなかった ${S.wrong.length} 単語だけ`;
  } else {
    btnWrong.style.display = 'none';
  }
  showScreen('screen-result');
}

function retryWrong() {
  S.deck = shuffle([...S.wrong]);
  S.idx = 0;
  S.wrong = [];
  S.correct = [];
  showScreen('screen-fc');
  renderCard();
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTts(); // バックグラウンドで初期化、完了を待たない
  document.getElementById('btn-en-jp').addEventListener('click', () => startSession('en-jp'));
  document.getElementById('btn-jp-en').addEventListener('click', () => startSession('jp-en'));
  document.getElementById('fc-card').addEventListener('click', flipCard);
  document.getElementById('fc-btn-show').addEventListener('click', flipCard);
  document.getElementById('fc-btn-wrong').addEventListener('click', () => markCard(false));
  document.getElementById('fc-btn-correct').addEventListener('click', () => markCard(true));
  document.getElementById('fc-speak-front').addEventListener('click', e => {
    e.stopPropagation();
    const word = WORDS[S.deck[S.idx]];
    speak(word.en, 'en');
  });
  document.getElementById('fc-speak-back').addEventListener('click', e => {
    e.stopPropagation();
    const word = WORDS[S.deck[S.idx]];
    speak(word.en, 'en');
  });
  document.getElementById('btn-back-home').addEventListener('click', () => showScreen('screen-home'));
  document.getElementById('btn-result-home').addEventListener('click', () => showScreen('screen-home'));
  document.getElementById('btn-retry').addEventListener('click', () => startSession(S.dir));
  document.getElementById('btn-retry-wrong').addEventListener('click', retryWrong);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
