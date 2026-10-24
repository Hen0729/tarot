/** 牌資料（明確 export，供模組或掛到全域） */

export const MA = [
  { z: "愚者", e: "The Fool", u: "新開始、自由、冒險", r: "魯莽、猶豫、天真過頭" },
  { z: "魔術師", e: "The Magician", u: "創造力、行動力、善用資源", r: "操弄、欺瞞、才能浪費" },
  { z: "女祭司", e: "The High Priestess", u: "直覺、潛意識、神祕", r: "忽視直覺、隱藏動機" },
  { z: "皇后", e: "The Empress", u: "豐盛、滋養、感官享受", r: "過度依賴、停滯、過度保護" },
  { z: "皇帝", e: "The Emperor", u: "權威、秩序、穩定", r: "專制、僵化、失控" },
  { z: "教皇", e: "The Hierophant", u: "傳統、信仰、指引", r: "打破常規、盲從" },
  { z: "戀人", e: "The Lovers", u: "愛、選擇、和諧", r: "失衡、錯誤抉擇" },
  { z: "戰車", e: "The Chariot", u: "意志、勝利、前進", r: "失控、方向不明" },
  { z: "力量", e: "Strength", u: "勇氣、耐心、柔韌", r: "自我懷疑、軟弱" },
  { z: "隱者", e: "The Hermit", u: "內省、獨處、智慧", r: "孤立、逃避" },
  { z: "命運之輪", e: "Wheel of Fortune", u: "轉機、循環、命運", r: "厄運、抗拒改變" },
  { z: "正義", e: "Justice", u: "公正、因果、真相", r: "不公、逃避責任" },
  { z: "倒吊人", e: "The Hanged Man", u: "犧牲、換位思考、暫停", r: "拖延、無謂犧牲" },
  { z: "死神", e: "Death", u: "結束、轉化、重生", r: "抗拒改變、停滯" },
  { z: "節制", e: "Temperance", u: "平衡、調和、耐心", r: "失衡、過度" },
  { z: "惡魔", e: "The Devil", u: "束縛、慾望、執著", r: "解脫、覺醒" },
  { z: "高塔", e: "The Tower", u: "突變、崩解、覺醒", r: "逃過一劫、延遲的災難" },
  { z: "星星", e: "The Star", u: "希望、療癒、靈感", r: "失望、失去信心" },
  { z: "月亮", e: "The Moon", u: "不安、幻象、潛意識", r: "迷霧散去、釐清恐懼" },
  { z: "太陽", e: "The Sun", u: "喜悅、成功、活力", r: "過度樂觀、短暫陰霾" },
  { z: "審判", e: "Judgement", u: "覺醒、召喚、重生", r: "自我懷疑、拒絕反省" },
  { z: "世界", e: "The World", u: "圓滿、完成、整合", r: "未竟、遲滯" },
];

/** 花色：{ z, e, sym, aspect } */
export const SU = [
  { z: "權杖", e: "Wands", sym: "🔥", aspect: "事業、熱情與行動" },
  { z: "聖杯", e: "Cups", sym: "💧", aspect: "情感與人際關係" },
  { z: "寶劍", e: "Swords", sym: "💨", aspect: "思想、溝通與衝突" },
  { z: "錢幣", e: "Pentacles", sym: "🪨", aspect: "金錢、工作與物質" },
];

export const RK = [
  { z: "王牌", e: "Ace", u: "新的起點、潛能萌芽", r: "延遲、錯失時機" },
  { z: "二", e: "Two", u: "抉擇、平衡、合作", r: "猶豫、失衡" },
  { z: "三", e: "Three", u: "成長、合作、初步成果", r: "受阻、意見分歧" },
  { z: "四", e: "Four", u: "穩定、休憩、鞏固", r: "停滯、不安" },
  { z: "五", e: "Five", u: "衝突、挑戰、損失", r: "緩和、走出低谷" },
  { z: "六", e: "Six", u: "和諧、過渡、獲得支援", r: "停滯、難以前進" },
  { z: "七", e: "Seven", u: "堅持、評估、考驗", r: "動搖、白費力氣" },
  { z: "八", e: "Eight", u: "行動、進展、專注", r: "受阻、分心" },
  { z: "九", e: "Nine", u: "接近完成、韌性、累積", r: "疲憊、過度防備" },
  { z: "十", e: "Ten", u: "圓滿、終點、承擔", r: "重擔、結束後的失落" },
  { z: "侍者", e: "Page", u: "好奇、消息、學習", r: "不成熟、壞消息" },
  { z: "騎士", e: "Knight", u: "追求、行動、衝勁", r: "躁進、半途而廢" },
  { z: "王后", e: "Queen", u: "成熟、關懷、內在掌握", r: "情緒化、失衡" },
  { z: "國王", e: "King", u: "掌控、責任、領導", r: "濫權、專橫" },
];

const COURT_N = ["P", "Kn", "Q", "K"];

export function buildDeck(ma = MA, su = SU, rk = RK) {
  const D = [];
  ma.forEach((m, i) => {
    D.push({
      id: i,
      z: m.z,
      e: m.e,
      sym: "✦",
      n: i,
      u: m.u,
      r: m.r,
      sub: "大阿爾卡納",
    });
  });
  su.forEach((suit, si) =>
    rk.forEach((rank, ri) => {
      D.push({
        id: 22 + si * 14 + ri,
        z: suit.z + rank.z,
        e: rank.e + " of " + suit.e,
        sym: suit.sym,
        n: ri < 10 ? (ri === 0 ? "A" : ri + 1) : COURT_N[ri - 10],
        u: suit.aspect + "面向：" + rank.u,
        r: suit.aspect + "面向：" + rank.r,
        sub: "小阿爾卡納・" + suit.z,
      });
    }),
  );
  return D;
}

export const D = buildDeck();

export const ELE = { 權杖: "火", 聖杯: "水", 寶劍: "風", 錢幣: "土" };

/** 掛到 window，供尚未改成 import 的腳本使用 */
export function installDataGlobals(target = globalThis) {
  target.MA = MA;
  target.SU = SU;
  target.RK = RK;
  target.D = D;
  target.ELE = ELE;
  return { MA, SU, RK, D, ELE };
}
