import {
  addHai,
  compareFn,
  removeElementByName,
  stringArrayToNumArray,
  stringToArray,
  stringToArrayPlain,
  stringToArrayWithFuro,
} from './mj_common.js';
import { getShantenChitoitsu, getShantenKokushimusou, getShantenNormal } from './mj_shanten.js';

//点数の取得
export const getScore = (
  tehai: string,
  agari_hai: string,
  bafu_hai: string,
  jifu_hai: string,
  dora_hai: string = '',
  is_tsumo: boolean = false,
  richi: number = 0,
  is_ippatsu: boolean = false,
  is_chankan: boolean = false,
  is_rinshan: boolean = false,
  is_finalTileWin: boolean = false,
  is_1st_round: boolean = false,
): [number, number, Map<string, number>, Map<string, number>] => {
  const is_oya: boolean = jifu_hai === '1z';
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  const is_menzen: boolean = hai_furo.length === 0;
  const hai_normal_all: string[] = structuredClone(hai_normal);
  hai_normal_all.push(agari_hai);
  hai_normal_all.sort(compareFn);
  const hai_plain: string[] = stringToArrayPlain(addHai(tehai, agari_hai));
  hai_plain.sort(compareFn);
  const [shanten_normal, composition] = getShantenNormal(addHai(tehai, agari_hai));
  let is_normal = true;
  if (shanten_normal !== -1) {
    composition.length = 0;
    is_normal = false;
  }
  //仮に最初の面子セットで役判定
  let composition_group_first: string[];
  let atama_hai: string;
  let mentsu: string[][] = [];
  const count_kantsu = hai_furo.filter((s) => s.length === 8).length + hai_ankan.length;
  if (is_normal) {
    composition_group_first = composition[0].split(',');
    atama_hai = stringToArray(composition_group_first[0])[0];
    for (let i = 1; i < composition_group_first.length; i++) {
      const c = composition_group_first[i].replaceAll(/[<>\(\)]/g, '');
      mentsu.push(stringToArray(c));
    }
  }
  const ret_han = new Map<string, number>();
  const ret_yakuman = new Map<string, number>();
  //役満判定
  if (is_1st_round && is_tsumo && is_oya) {
    ret_yakuman.set('天和', 1);
  }
  if (is_1st_round && is_tsumo && !is_oya) {
    ret_yakuman.set('地和', 1);
  }
  if (is_normal && isRyuiso(hai_plain)) {
    ret_yakuman.set('緑一色', 1);
  }
  if (isTsuiso(hai_plain)) {
    ret_yakuman.set('字一色', 1);
  }
  if (is_normal && isDaisangen(mentsu)) {
    ret_yakuman.set('大三元', 1);
  }
  if (is_normal && isShousushi(mentsu)) {
    ret_yakuman.set('小四喜', 1);
  }
  if (is_normal && isDaisushi(mentsu)) {
    ret_yakuman.set('大四喜', 2);
  }
  if (!is_normal && getShantenKokushimusou(addHai(tehai, agari_hai)) === -1) {
    if (hai_normal.includes(agari_hai)) {
      ret_yakuman.set('国士無双', 2);
    } else {
      ret_yakuman.set('国士無双', 1);
    }
  }
  if (is_normal && is_menzen && isChuren(hai_normal_all)) {
    const n = hai_normal.reduce((accumulator: number, currentValue: string): number => {
      return accumulator + (currentValue === agari_hai ? 1 : 0);
    }, 0);
    if (n === 1 || n === 3) {
      ret_yakuman.set('九蓮宝燈', 2);
    } else {
      ret_yakuman.set('九蓮宝燈', 1);
    }
  }
  if (is_normal && isChinroutou(hai_plain)) {
    ret_yakuman.set('清老頭', 1);
  }
  if (count_kantsu === 4) {
    ret_yakuman.set('四槓子', 1);
  }
  //役判定
  if (is_tsumo && is_menzen) {
    ret_han.set('門前清自摸和', 1);
  }
  if (richi === 2) {
    ret_han.set('W立直', 2);
  } else if (richi === 1) {
    ret_han.set('立直', 1);
  }
  if (is_ippatsu) {
    ret_han.set('一発', 1);
  }
  if (isTanyao(hai_plain)) {
    ret_han.set('断ヤオ九', 1);
  }
  let count_yakuhai = 0;
  if (is_normal) count_yakuhai = countYakuhai(hai_plain, bafu_hai, jifu_hai);
  if (count_yakuhai >= 1) {
    ret_han.set('役牌', count_yakuhai);
  }
  if (is_finalTileWin && is_tsumo && !is_rinshan) {
    ret_han.set('海底撈月', 1);
  }
  if (is_finalTileWin && !is_tsumo && !is_chankan) {
    ret_han.set('河底撈魚', 1);
  }
  if (is_rinshan) {
    ret_han.set('嶺上開花', 1);
  }
  if (is_chankan) {
    ret_han.set('槍槓', 1);
  }
  let count_peko = 0;
  if (is_normal) count_peko = countPeko(mentsu);
  if (count_peko != 2 && getShantenChitoitsu(addHai(tehai, agari_hai)) == -1) {
    ret_han.set('七対子', 2);
  }
  const is_honrou = isHonroutou(hai_plain);
  if (is_honrou) {
    ret_han.set('混老頭', 2);
  }
  if (is_normal && isShousangen(mentsu)) {
    ret_han.set('小三元', 2);
  }
  if (count_kantsu == 3) {
    ret_han.set('三槓子', 2);
  }
  if (isHonitsu(hai_plain)) {
    if (is_menzen) ret_han.set('混一色', 3);
    else ret_han.set('混一色', 2);
  }
  if (isChinitsu(hai_plain)) {
    if (is_menzen) ret_han.set('清一色', 6);
    else ret_han.set('清一色', 5);
  }
  const count_dora = countDora(hai_plain, stringToArray(dora_hai));
  if (count_dora > 0) {
    ret_han.set('ドラ', count_dora);
  }
  //面子の形によって変わる役の判定
  let ret_han_sub = new Map<string, number>();
  let ret_yakuman_sub = new Map<string, number>();
  let yakuman_sub_max = -1;
  let han_sub_max = -1;
  let fu_sub_max = -1;
  for (const comp of composition) {
    const [fu_sub, ret_han_sub_tmp, ret_yakuman_sub_tmp] = getYakuInfoFromComposition(is_tsumo, agari_hai, bafu_hai, jifu_hai, comp);
    let yakuman_sub = 0;
    let han_sub = 0;
    for (const [k, v] of ret_yakuman_sub_tmp) {
      yakuman_sub += v;
    }
    for (const [k, v] of ret_han_sub_tmp) {
      han_sub += v;
    }
    if (
      yakuman_sub_max < yakuman_sub ||
      (yakuman_sub_max === yakuman_sub && han_sub_max < han_sub) ||
      (yakuman_sub_max === yakuman_sub && han_sub_max === han_sub && fu_sub_max < fu_sub)
    ) {
      yakuman_sub_max = yakuman_sub;
      han_sub_max = han_sub;
      fu_sub_max = fu_sub;
      ret_yakuman_sub = ret_yakuman_sub_tmp;
      ret_han_sub = ret_han_sub_tmp;
    }
  }
  //役の合成
  for (const [k, v] of ret_yakuman_sub) {
    ret_yakuman.set(k, v);
  }
  for (const [k, v] of ret_han_sub) {
    ret_han.set(k, v);
  }
  let count_yakuman = 0;
  for (const [k, v] of ret_yakuman) {
    count_yakuman += v;
  }
  let count_han = 0;
  for (const [k, v] of ret_han) {
    count_han += v;
  }

  let count_fu = 0;
  if (ret_han.has('平和') && ret_han.has('門前清自摸和')) count_fu = 20;
  else if (ret_han.has('七対子')) count_fu = 25;
  else if (!ret_yakuman.has('国士無双')) count_fu = fu_sub_max;
  const score = getScorePoint(count_yakuman, count_han, count_dora, count_fu, is_oya);
  return [score, count_fu, ret_yakuman, ret_han];
};

//面子の形によって変わる役の情報を取得
const getYakuInfoFromComposition = (
  is_tsumo: boolean,
  agari_hai: string,
  bafu_hai: string,
  jifu_hai: string,
  composition: string,
): [number, Map<string, number>, Map<string, number>] => {
  const ret_han = new Map<string, number>();
  const ret_yakuman = new Map<string, number>();

  const composition_array = composition.split(',');
  const atama_hai = stringToArray(composition_array[0])[0];
  const mentsu: string[][] = [];
  const mentsu_furo: string[][] = [];
  const mentsu_without_furo: string[][] = [];
  let is_menzen = true;
  for (let i = 1; i < composition_array.length; i++) {
    const c = composition_array[i];
    if (c.slice(0, 1) === '<') {
      const s = c.slice(1, 1 + c.length - 2);
      mentsu.push(stringToArray(s));
      mentsu_furo.push(stringToArray(s));
      is_menzen = false;
    } else if (c.slice(0, 1) === '(') {
      const s = c.slice(1, 9);
      mentsu.push(stringToArray(s));
      mentsu_without_furo.push(stringToArray(s));
    } else {
      mentsu.push(stringToArray(c));
      mentsu_without_furo.push(stringToArray(c));
    }
  }
  //役満判定
  const count_ankou = countAnkou(mentsu_without_furo, is_tsumo, agari_hai, atama_hai);
  if (count_ankou == 4) {
    if (agari_hai === atama_hai) {
      ret_yakuman.set('四暗刻', 2);
    } else {
      ret_yakuman.set('四暗刻', 1);
    }
  }
  //役判定
  if (is_menzen && isPinfu(atama_hai, mentsu, agari_hai, bafu_hai, jifu_hai)) {
    ret_han.set('平和', 1);
  }
  let count_peko = 0;
  if (is_menzen) count_peko = countPeko(mentsu);
  if (count_peko === 1) {
    ret_han.set('一盃口', 1);
  }
  if (count_ankou == 3) {
    ret_han.set('三暗刻', 2);
  }
  if (isSanshokudoukou(mentsu)) {
    ret_han.set('三色同刻', 2);
  }
  if (isSanshokudoujun(mentsu)) {
    if (is_menzen) ret_han.set('三色同順', 2);
    else ret_han.set('三色同順', 1);
  }
  if (isIkkitsuukan(mentsu)) {
    if (is_menzen) ret_han.set('一気通貫', 2);
    else ret_han.set('一気通貫', 1);
  }
  if (isToitoi(mentsu)) {
    ret_han.set('対々和', 2);
  }
  if (isChanta(mentsu, atama_hai)) {
    if (is_menzen) ret_han.set('混全帯ヤオ九', 2);
    else ret_han.set('混全帯ヤオ九', 1);
  }
  if (isJunchan(mentsu, atama_hai)) {
    if (is_menzen) ret_han.set('純全帯ヤオ九', 3);
    else ret_han.set('純全帯ヤオ九', 2);
  }
  if (count_peko == 2) {
    ret_han.set('二盃口', 3);
  }
  let fu: number;
  if (ret_han.has('平和') && is_tsumo) fu = 20;
  else if (ret_han.has('平和') && !is_tsumo) fu = 30;
  else fu = getFu(atama_hai, mentsu_without_furo, mentsu_furo, agari_hai, bafu_hai, jifu_hai, is_tsumo, is_menzen);
  return [fu, ret_han, ret_yakuman];
};

//符を取得
const getFu = (
  atama_hai: string,
  mentsu_without_furo: string[][],
  mentsu_furo: string[][],
  agari_hai: string,
  bafu_hai: string,
  jifu_hai: string,
  is_tsumo: boolean,
  is_menzen: boolean,
): number => {
  //(1)副底20符
  let fu = 20;
  //(2)門前加符 or ツモ符
  if (is_tsumo) fu += 2;
  else if (is_menzen) fu += 10;
  //(3)各面子
  const yaochu_string = '1m9m1p9p1s9s1z2z3z4z5z6z7z';
  for (const m of mentsu_without_furo) {
    if (m[0] === m[1]) {
      if (m.length === 4) {
        if (yaochu_string.includes(m[0])) fu += 32;
        else fu += 16;
      } else {
        if (yaochu_string.includes(m[0])) fu += 8;
        else fu += 4;
      }
    }
  }
  for (const m of mentsu_furo) {
    if (m[0] === m[1]) {
      if (m.length === 4) {
        if (yaochu_string.includes(m[0])) fu += 16;
        else fu += 8;
      } else {
        if (yaochu_string.includes(m[0])) fu += 4;
        else fu += 2;
      }
    }
  }
  //(4)雀頭
  if (atama_hai === bafu_hai) fu += 2;
  if (atama_hai === jifu_hai) fu += 2;
  if (['5z', '6z', '7z'].includes(atama_hai)) fu += 2;
  //(5)待ち
  //待ちの形を再現する
  const machi_tatsu: number[][] = [];
  let fu_machi;
  let fu_machi_add = -99;
  for (const m of mentsu_without_furo) {
    if (m.includes(agari_hai)) machi_tatsu.push(stringArrayToNumArray(removeElementByName(m, agari_hai, 1)));
  }
  for (const mt of machi_tatsu) {
    if (mt[0] !== 1 && mt[0] + 1 === mt[1] && mt[1] !== 9) {
      //両面待ち
      fu_machi = 0;
      if (fu_machi_add < fu_machi) fu_machi_add = fu_machi;
    } else if (mt[0] === mt[1]) {
      //シャボ待ち
      if (is_tsumo) {
        fu_machi = 0;
        if (fu_machi_add < fu_machi) fu_machi_add = fu_machi;
      } else {
        if (yaochu_string.includes(agari_hai)) {
          fu_machi = -4;
          if (fu_machi_add < fu_machi) fu_machi_add = fu_machi;
        } else {
          fu_machi = -2;
          if (fu_machi_add < fu_machi) fu_machi_add = fu_machi;
        }
      }
    } else if ((mt[0] === 1 && mt[1] === 2) || (mt[0] === 8 && mt[1] === 9)) {
      //ペンチャン待ち
      fu_machi = 2;
      if (fu_machi_add < fu_machi) fu_machi_add = fu_machi;
    } else if (mt[0] + 2 === mt[1]) {
      //カンチャン待ち
      fu_machi = 2;
      if (fu_machi_add < fu_machi) fu_machi_add = fu_machi;
    }
  }
  if (atama_hai === agari_hai) {
    //単騎待ち
    fu_machi = 2;
    if (fu_machi_add < fu_machi) fu_machi_add = fu_machi;
  }
  fu += fu_machi_add;
  //切り上げ
  const shou = Math.floor(fu / 10);
  const amari = fu % 10;
  if (amari > 0) fu = 10 * shou + 10;
  if (fu === 20) fu = 30;
  return fu;
};

//点数を取得
const getScorePoint = (count_yakuman: number, count_han: number, count_dora: number, count_fu: number, is_oya: boolean): number => {
  let r: number;
  if (count_yakuman > 0) {
    r = 32000 * count_yakuman;
  } else {
    if (count_han - count_dora === 0) r = 0;
    else if (count_han >= 13) r = 32000;
    else if (count_han >= 11) r = 24000;
    else if (count_han >= 8) r = 16000;
    else if (count_han >= 6) r = 12000;
    else if (count_han >= 5) r = 8000;
    else return getScorePointWithFu(count_han, count_fu, is_oya);
  }
  if (is_oya) r = r * 1.5;
  return r;
};

//符を用いた点数計算
const getScorePointWithFu = (count_han: number, count_fu: number, is_oya: boolean): number => {
  const key = `${count_fu}-${count_han}`;
  if (is_oya) {
    const d = new Map<string, number>([
      ['20-2', 2000],
      ['20-3', 3900],
      ['20-4', 7700],
      ['25-2', 2400],
      ['25-3', 4800],
      ['25-4', 9600],
      ['30-1', 1500],
      ['30-2', 2900],
      ['30-3', 5800],
      ['30-4', 11600],
      ['40-1', 2000],
      ['40-2', 3900],
      ['40-3', 7700],
      ['50-1', 2400],
      ['50-2', 4800],
      ['50-3', 9600],
      ['60-1', 2900],
      ['60-2', 5800],
      ['60-3', 11600],
      ['70-1', 3400],
      ['70-2', 6800],
      ['80-1', 3900],
      ['80-2', 7700],
      ['90-1', 4400],
      ['90-2', 8700],
      ['100-1', 4800],
      ['100-2', 9600],
      ['110-1', 5300],
      ['110-2', 10600],
    ]);
    let score: number;
    if (d.has(key)) score = d.get(key) ?? 0;
    else score = 12000;
    return score;
  } else {
    const d = new Map<string, number>([
      ['20-2', 1300],
      ['20-3', 2600],
      ['20-4', 5200],
      ['25-2', 1600],
      ['25-3', 3200],
      ['25-4', 6400],
      ['30-1', 1000],
      ['30-2', 2000],
      ['30-3', 3900],
      ['30-4', 7700],
      ['40-1', 1300],
      ['40-2', 2600],
      ['40-3', 5200],
      ['50-1', 1600],
      ['50-2', 3200],
      ['50-3', 6400],
      ['60-1', 2000],
      ['60-2', 3900],
      ['60-3', 7700],
      ['70-1', 2300],
      ['70-2', 4500],
      ['80-1', 2600],
      ['80-2', 5200],
      ['90-1', 2900],
      ['90-2', 5800],
      ['100-1', 3200],
      ['100-2', 6400],
      ['110-1', 3600],
      ['110-2', 7100],
    ]);
    let score: number;
    if (d.has(key)) score = d.get(key) ?? 0;
    else score = 8000;
    return score;
  }
};

//断么九判定
const isTanyao = (hai_plain: string[]): boolean => {
  const yaochu_string = '1m9m1p9p1s9s1z2z3z4z5z6z7z';
  for (const h of hai_plain) {
    if (yaochu_string.includes(h)) return false;
  }
  return true;
};

//盃口カウント
const countPeko = (mentsu: string[][]): number => {
  let count_peko = 0;
  const used_index: number[] = [];
  for (let i = 0; i < mentsu.length; i++) {
    if (used_index.includes(i)) continue;
    const prev = mentsu[i];
    for (let j = i + 1; j < mentsu.length; j++) {
      if (used_index.includes(j)) continue;
      const next = mentsu[j];
      if (prev[0] === next[0] && prev[1] === next[1] && prev[2] === next[2]) {
        count_peko++;
        used_index.push(i);
        used_index.push(j);
        break;
      }
    }
  }
  return count_peko;
};

//役牌カウント
const countYakuhai = (hai_plain: string[], bafu_hai: string, jifu_hai: string): number => {
  let count_yakuhai = 0;

  for (const yakuhai of [bafu_hai, jifu_hai, '5z', '6z', '7z']) {
    const n = hai_plain.reduce((accumulator: number, currentValue: string): number => {
      return accumulator + (currentValue === yakuhai ? 1 : 0);
    }, 0);
    if (n >= 3) {
      count_yakuhai++;
    }
  }
  return count_yakuhai;
};

//対々和判定
const isToitoi = (mentsu: string[][]): boolean => {
  if (mentsu.length < 4) return false;
  //すべて刻子
  for (const m of mentsu) {
    if (!(m[0] === m[1] && m[0] === m[2])) return false;
  }
  return true;
};

//混老頭判定
const isHonroutou = (hai_plain: string[]): boolean => {
  const yaochu_string = '1m9m1p9p1s9s1z2z3z4z5z6z7z';
  for (const h of hai_plain) {
    if (!yaochu_string.includes(h)) return false;
  }
  return true;
};

//混全帯么九、純全帯么九判定用
const subChanta = (mentsu: string[][], atama_hai: string): number => {
  if (mentsu.length < 4) return 0;
  const yaochu_string = '1m9m1p9p1s9s1z2z3z4z5z6z7z';
  const jihai_string = '1z2z3z4z5z6z7z';
  let has_jihai = false;
  let is_honrou = true;
  if (yaochu_string.includes(atama_hai)) {
    if (jihai_string.includes(atama_hai)) has_jihai = true;
  } else {
    return 0;
  }
  for (let i = 0; i < mentsu.length; i++) {
    let has_yaochu = false;
    if (mentsu[i][0] !== mentsu[i][1]) is_honrou = false;
    for (let j = 0; j < mentsu[i].length; j++) {
      if (yaochu_string.includes(mentsu[i][j])) {
        if (jihai_string.includes(mentsu[i][j])) has_jihai = true;
        has_yaochu = true;
        break;
      }
    }
    if (!has_yaochu) return 0;
  }
  //混老頭・清老頭とは複合しない
  if (is_honrou) return 0;
  if (has_jihai)
    return 1; //混全帯么九
  else return 2; //純全帯么九
};

//混全帯么九判定
const isChanta = (mentsu: string[][], atama_hai: string) => {
  const r = subChanta(mentsu, atama_hai);
  if (r === 1) return true;
  return false;
};

//純全帯么九判定
const isJunchan = (mentsu: string[][], atama_hai: string) => {
  const r = subChanta(mentsu, atama_hai);
  if (r === 2) return true;
  return false;
};

//小三元判定
const isShousangen = (mentsu: string[][]): boolean => {
  let count_sangenpai = 0;
  let use_atama = false;
  for (const m of mentsu) {
    if (m.length === 2) {
      if (['5z', '6z', '7z'].includes(m[0])) {
        count_sangenpai++;
        use_atama = true;
      }
    } else {
      if (['5z', '6z', '7z'].includes(m[0])) {
        count_sangenpai++;
      }
    }
  }
  if (count_sangenpai == 3 && use_atama) return true;
  return false;
};

//大三元判定
const isDaisangen = (mentsu: string[][]): boolean => {
  let count_sangenpai = 0;
  for (const m of mentsu) {
    if (m.length >= 3) {
      if (['5z', '6z', '7z'].includes(m[0])) count_sangenpai++;
    }
  }
  if (count_sangenpai === 3) return true;
  return false;
};

//混一色、清一色、字一色判定用
const getUsedHaiGroup = (hai: string[]): boolean[] => {
  const a = [false, false, false, false];
  for (const h of hai) {
    const s = h.slice(1, 2);
    if (s === 'm') a[0] = true;
    else if (s === 'p') a[1] = true;
    else if (s === 's') a[2] = true;
    else if (s === 'z') a[3] = true;
  }
  return a;
};

//混一色判定
const isHonitsu = (hai_plain: string[]): boolean => {
  const a = getUsedHaiGroup(hai_plain);
  if ((a[0] && a[1]) || (a[1] && a[2]) || (a[2] && a[0]) || !a[3]) return false;
  return true;
};

//清一色判定
const isChinitsu = (hai_plain: string[]): boolean => {
  const a = getUsedHaiGroup(hai_plain);
  if ((a[0] && a[1]) || (a[1] && a[2]) || (a[2] && a[0]) || a[3]) return false;
  return true;
};

//字一色判定
const isTsuiso = (hai_plain: string[]): boolean => {
  const a = getUsedHaiGroup(hai_plain);
  if (!a[0] && !a[1] && !a[2]) return true;
  return false;
};

//緑一色判定
const isRyuiso = (hai_plain: string[]): boolean => {
  const green_string = '2s3s4s6s8s6z';
  for (const hp of hai_plain) {
    if (!green_string.includes(hp)) return false;
  }
  return true;
};

//小四喜判定
const isShousushi = (mentsu: string[][]): boolean => {
  let count_fupai = 0;
  let use_atama = false;
  for (const m of mentsu) {
    if (m.length === 2) {
      if (['1z', '2z', '3z', '4z'].includes(m[0])) {
        count_fupai++;
        use_atama = true;
      }
    } else {
      if (['1z', '2z', '3z', '4z'].includes(m[0])) {
        count_fupai++;
      }
    }
  }
  if (count_fupai == 4 && use_atama) return true;
  return false;
};

//大四喜判定
const isDaisushi = (mentsu: string[][]): boolean => {
  let count_fupai = 0;
  for (const m of mentsu) {
    if (m.length >= 3) {
      if (['1z', '2z', '3z', '4z'].includes(m[0])) {
        count_fupai++;
      }
    }
  }
  if (count_fupai == 4) return true;
  return false;
};

//九蓮宝燈判定
const isChuren = (hai_plain: string[]): boolean => {
  //清一色でない
  if (!isChinitsu(hai_plain)) return false;
  const hai_num: number[] = stringArrayToNumArray(hai_plain);
  const hai_str = hai_num.join('');
  const churen_array = [
    '11112345678999',
    '11122345678999',
    '11123345678999',
    '11123445678999',
    '11123455678999',
    '11123456678999',
    '11123456778999',
    '11123456788999',
    '11123456789999',
  ];
  if (churen_array.includes(hai_str)) return true;
  return false;
};

//清老頭判定
const isChinroutou = (hai_plain: string[]): boolean => {
  const routou_string = '1m9m1p9p1s9s';
  for (const h of hai_plain) {
    if (!routou_string.includes(h)) return false;
  }
  return true;
};

//ドラ牌カウント
const countDora = (hai_plain: string[], dora: string[]): number => {
  let count = 0;
  for (const d of dora) {
    const n = hai_plain.reduce((accumulator: number, currentValue: string): number => {
      return accumulator + (currentValue === d ? 1 : 0);
    }, 0);
    count += n;
  }
  return count;
};

//暗刻カウント
const countAnkou = (mentsu: string[][], is_tsumo: boolean, agari_hai: string, atama_hai: string): number => {
  //暗刻をカウント
  let count_ankou = 0;
  let is_ankou = false;
  for (const m of mentsu) {
    if (m[0] === m[1]) {
      count_ankou++;
    } else {
      if (m.includes(agari_hai)) is_ankou = true; //順子に和了牌が含まれている
    }
  }
  //雀頭に和了牌が含まれている
  if (atama_hai === agari_hai) is_ankou = true;
  //自摸なら常に暗刻
  if (is_tsumo) is_ankou = true;
  //暗刻でなく明刻のパターン
  if (!is_ankou) count_ankou--;
  return count_ankou;
};

//三色同刻判定
const isSanshokudoukou = (mentsu: string[][]): boolean => {
  const kotsu_number: number[] = [];
  for (const m of mentsu) {
    if (m[0] === m[1] && m[0] === m[2]) {
      const n = Number.parseInt(m[0].slice(0, 1));
      const color = m[0].slice(1, 2);
      if (color !== 'z') kotsu_number.push(n);
    }
  }
  if (kotsu_number.length < 3) return false;
  for (let i = 0; i + 2 < kotsu_number.length; i++) {
    const n = kotsu_number.reduce((accumulator: number, currentValue: number): number => {
      return accumulator + (currentValue === kotsu_number[i] ? 1 : 0);
    }, 0);
    if (n === 3) return true;
  }
  return false;
};

//三色同順判定
const isSanshokudoujun = (mentsu: string[][]): boolean => {
  const shuntsu_string: string[] = [];
  const shuntsu_number: number[] = [];
  for (const m of mentsu) {
    if (m[0] !== m[1]) {
      const n = Number.parseInt(m[0].slice(0, 1));
      if (!shuntsu_string.includes(m[0])) {
        shuntsu_string.push(m[0]);
        shuntsu_number.push(n);
      }
    }
  }
  if (shuntsu_number.length < 3) return false;
  for (let i = 0; i + 2 < shuntsu_number.length; i++) {
    const n = shuntsu_number.reduce((accumulator: number, currentValue: number): number => {
      return accumulator + (currentValue === shuntsu_number[i] ? 1 : 0);
    }, 0);
    if (n === 3) return true;
  }
  return false;
};

//一気通貫判定
const isIkkitsuukan = (mentsu: string[][]): boolean => {
  const shuntsu_string: string[] = [];
  for (const m of mentsu) {
    if (m[0] !== m[1]) {
      const n = Number.parseInt(m[0].slice(0, 1));
      if (!shuntsu_string.includes(m[0]) && (n === 1 || n === 4 || n === 7)) {
        shuntsu_string.push(m[0]);
      }
    }
  }
  if (shuntsu_string.length < 3) return false;
  if (['1m', '4m', '7m'].every((h) => shuntsu_string.includes(h))) return true;
  if (['1p', '4p', '7p'].every((h) => shuntsu_string.includes(h))) return true;
  if (['1s', '4s', '7s'].every((h) => shuntsu_string.includes(h))) return true;
  return false;
};

//平和判定
const isPinfu = (atama_hai: string, mentsu: string[][], agari_hai: string, bafu_hai: string, jifu_hai: string): boolean => {
  //一般手の和了でない
  if (atama_hai === '') return false;
  //雀頭は役牌以外でないといけない
  if ([bafu_hai, jifu_hai, '5z', '6z', '7z'].includes(atama_hai)) return false;
  //待ちの形を再現する
  const machi_tatsu: number[][] = [];
  for (const m of mentsu) {
    //面子はすべて順子でなければならない
    if (m[0] === m[1]) return false;
    if (m.includes(agari_hai)) machi_tatsu.push(stringArrayToNumArray(removeElementByName(m, agari_hai, 1)));
  }
  for (const mt of machi_tatsu) {
    if (mt[0] !== 1 && mt[0] + 1 === mt[1] && mt[1] != 9)
      //両面待ち
      return true;
  }
  return false;
};
