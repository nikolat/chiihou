import {
  compareFn,
  countArrayToNumArray,
  numArrayToCountArray,
  removeElementByName,
  stringArrayToNumArray,
  stringToArrayWithFuro,
  uniq,
} from './mj_common.js';

const SHANTEN_MAX = 99;

//シャンテン数の取得
export const getShanten = (tehai: string): [number, string[]] => {
  const r1 = getShantenChitoitsu(tehai);
  const r2 = getShantenKokushimusou(tehai);
  const [r3, ret_composition_normal] = getShantenNormal(tehai);
  const r = Math.min(r1, r2, r3);
  let ret_composition: string[] = [];
  if (r === r3) ret_composition = ret_composition_normal;
  if (r === r1) ret_composition.push('chitoitsu');
  if (r === r2) ret_composition.push('kokushimusou');
  return [r, ret_composition];
};

//シャンテン数の取得(役あり)
export const getShantenYaku = (
  tehai: string,
  bafu_hai: string,
  jifu_hai: string,
): [number, Map<string, number>] => {
  const r_chitoitsu = getShantenChitoitsu(tehai);
  const r_kokushimusou = getShantenKokushimusou(tehai);
  const r_menzen = getShantenMenzen(tehai);
  const r_yakuhai = getShantenYakuhai(tehai, bafu_hai, jifu_hai);
  const r_tanyao = getShantenTanyao(tehai);
  const r_toitoi = getShantenToitoi(tehai);
  const r_honitsu = getShantenHonitsu(tehai);
  const r = Math.min(
    r_chitoitsu,
    r_kokushimusou,
    r_menzen,
    r_yakuhai,
    r_tanyao,
    r_toitoi,
    r_honitsu,
  );
  const yaku_info = new Map<string, number>();
  yaku_info.set('七対子', r_chitoitsu);
  yaku_info.set('国士無双', r_kokushimusou);
  yaku_info.set('門前清自摸和', r_menzen);
  yaku_info.set('役牌', r_yakuhai);
  yaku_info.set('断ヤオ九', r_tanyao);
  yaku_info.set('対々和', r_toitoi);
  yaku_info.set('混一色', r_honitsu);
  const yaku = new Map<string, number>();
  for (const [k, v] of yaku_info) {
    if (v < SHANTEN_MAX) yaku.set(k, v);
  }
  return [r, yaku];
};

//シャンテン数の取得(一般手)
export const getShantenNormal = (tehai: string): [number, string[]] => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  hai_normal.sort(compareFn);
  //孤立牌の除去
  const [hai_without_koritsuhai, koritsu_hai] = removeKoritsuHai(hai_normal);
  //雀頭候補
  const atama_kouho = getToitsu(hai_without_koritsuhai);
  //雀頭無しの場合も追加
  atama_kouho.push('');
  let shanten = SHANTEN_MAX;
  let ret_composition: string[] = [];
  for (const atama of atama_kouho) {
    const hai_without_atama = removeElementByName(
      hai_without_koritsuhai,
      atama,
      2,
    );
    const [man, pin, sou, jihai] = separateColor(hai_without_atama);
    const composition_man = getComposition(man);
    const composition_pin = getComposition(pin);
    const composition_sou = getComposition(sou);
    const composition_jihai = getCompositionJihai(jihai);
    for (let jm = 0; jm < composition_man.length; jm++) {
      for (let jp = 0; jp < composition_pin.length; jp++) {
        for (let js = 0; js < composition_sou.length; js++) {
          let count_mentsu = 0;
          let count_tatsu = 0;
          let count_koritsu = 0;
          for (const cm of composition_man[jm]) {
            if (cm.length == 3) count_mentsu++;
            else if (cm.length == 2) count_tatsu++;
            else if (cm.length == 1) count_koritsu++;
          }
          for (const cp of composition_pin[jp]) {
            if (cp.length == 3) count_mentsu++;
            else if (cp.length == 2) count_tatsu++;
            else if (cp.length == 1) count_koritsu++;
          }
          for (const cs of composition_sou[js]) {
            if (cs.length == 3) count_mentsu++;
            else if (cs.length == 2) count_tatsu++;
            else if (cs.length == 1) count_koritsu++;
          }
          for (const cj of composition_jihai[0]) {
            if (cj.length == 3) count_mentsu++;
            else if (cj.length == 2) count_tatsu++;
            else if (cj.length == 1) count_koritsu++;
          }
          count_mentsu += hai_furo.length;
          count_mentsu += hai_ankan.length;
          count_koritsu += koritsu_hai.length;
          const has_atama = atama.length > 0;
          const shanten_kouho: number = calcShanten(
            count_mentsu,
            count_tatsu,
            count_koritsu,
            has_atama,
          );
          //シャンテン数が小さい方を選択
          if (shanten_kouho < shanten) {
            shanten = shanten_kouho;
            ret_composition = [
              makeCompositionString(
                atama,
                composition_man[jm],
                composition_pin[jp],
                composition_sou[js],
                composition_jihai[0],
              ),
            ];
          } else if (shanten_kouho == shanten) {
            ret_composition.push(
              makeCompositionString(
                atama,
                composition_man[jm],
                composition_pin[jp],
                composition_sou[js],
                composition_jihai[0],
              ),
            );
          }
        }
      }
    }
  }
  ret_composition = Array.from(new Set(ret_composition));
  //最初に除いた孤立牌を加える
  for (let i = 0; i < ret_composition.length; i++) {
    for (const kh of koritsu_hai) {
      ret_composition[i] += ',' + kh;
    }
  }
  //重複を除く
  let ret_composition_split: string[][] = [];
  for (let rc of ret_composition) {
    ret_composition_split.push(rc.split(','));
  }
  ret_composition_split = uniq(ret_composition_split);
  //副露を追加
  const furo_string: string =
    (hai_furo.length > 0 ? ',' + hai_furo.map((h) => `<${h}>`).join(',') : '') +
    (hai_ankan.length > 0
      ? ',' + hai_ankan.map((h) => `<${h}>`).join(',')
      : '');
  ret_composition = [];
  for (const rcs of ret_composition_split) {
    ret_composition.push(rcs.join(',') + furo_string);
  }
  return [shanten, ret_composition];
};

//孤立牌の除去
export const removeKoritsuHai = (haiArray: string[]): [string[], string[]] => {
  const ret_removed_hai: string[] = [];
  const ret_koritsu_hai: string[] = [];
  for (const hai of haiArray) {
    const num = Number.parseInt(hai.slice(0, 1));
    const color = hai.slice(1, 2);
    if ('mps'.includes(color)) {
      const hai_p2 = String(num - 2) + color;
      const hai_p1 = String(num - 1) + color;
      const hai_n1 = String(num + 1) + color;
      const hai_n2 = String(num + 2) + color;
      if (
        haiArray.includes(hai_p2) ||
        haiArray.includes(hai_p1) ||
        haiArray.filter((h) => h === hai).length > 1 ||
        haiArray.includes(hai_n1) ||
        haiArray.includes(hai_n2)
      ) {
        ret_removed_hai.push(hai);
      } else {
        ret_koritsu_hai.push(hai);
      }
    } else if (color === 'z') {
      if (haiArray.filter((h) => h === hai).length > 1) {
        ret_removed_hai.push(hai);
      } else {
        ret_koritsu_hai.push(hai);
      }
    }
  }
  return [ret_removed_hai, ret_koritsu_hai];
};

//シャンテン数の計算
const calcShanten = (
  count_mentsu: number,
  count_tatsu: number,
  count_koritsu: number,
  has_atama: boolean,
): number => {
  let c_mentsu = count_mentsu;
  let c_tatsu = count_tatsu;
  let c_koritsu = count_koritsu;
  //雀頭がない場合は5ブロック必要
  const max_block = has_atama ? 4 : 5;
  //面子過多の補正
  if (c_mentsu > 4) {
    c_tatsu += c_mentsu - 4;
    c_mentsu = 4;
  }
  //搭子過多の補正
  if (c_mentsu + c_tatsu > 4) {
    c_koritsu += c_mentsu + c_tatsu - 4;
    c_tatsu = 4 - c_mentsu;
  }
  //孤立牌過多の補正
  if (c_mentsu + c_tatsu + c_koritsu > max_block) {
    c_koritsu = max_block - c_mentsu - c_tatsu;
  }
  //雀頭がある場合は搭子として数える
  if (has_atama) c_tatsu++;
  return 13 - c_mentsu * 3 - c_tatsu * 2 - c_koritsu;
};

//戻り値となる雀頭・面子・塔子を表す文字列の作成
const makeCompositionString = (
  atama: string,
  composition_man: number[][],
  composition_pin: number[][],
  composition_sou: number[][],
  composition_jihai: number[][],
): string => {
  const ret_atama = atama + atama;
  let ret_m = '';
  for (const cm of composition_man) {
    ret_m += ',';
    for (const cme of cm) {
      ret_m += String(cme) + 'm';
    }
  }
  let ret_p = '';
  for (const cp of composition_pin) {
    ret_p += ',';
    for (const cpe of cp) {
      ret_p += String(cpe) + 'p';
    }
  }
  let ret_s = '';
  for (const cs of composition_sou) {
    ret_s += ',';
    for (const cse of cs) {
      ret_s += String(cse) + 's';
    }
  }
  let ret_j = '';
  for (const cj of composition_jihai) {
    ret_j += ',';
    for (const cje of cj) {
      ret_j += String(cje) + 'z';
    }
  }
  return ret_atama + ret_m + ret_p + ret_s + ret_j;
};

//数牌・字牌の分離
const separateColor = (haiArray: string[]) => {
  const ret: [string[], string[], string[], string[]] = [[], [], [], []];
  for (const hai of haiArray) {
    const color = hai.slice(1, 2);
    if (color === 'm') ret[0].push(hai);
    else if (color === 'p') ret[1].push(hai);
    else if (color === 's') ret[2].push(hai);
    else if (color === 'z') ret[3].push(hai);
  }
  return ret;
};

//面子・塔子/対子・孤立牌(数牌)の取得
const getComposition = (haiArray: string[]): number[][][] => {
  const hai_count_array = numArrayToCountArray(stringArrayToNumArray(haiArray));
  const start = 1;
  let composition_a: number[][][] = [];
  let composition_b: number[][][] = [];
  let max: number[][];
  [max, composition_a, composition_b] = getCompositionRecursion(
    hai_count_array,
    start,
    composition_a,
    composition_b,
  );
  const ret: number[][][] = [...composition_a, ...composition_b];
  return ret;
};

//面子・塔子/対子・孤立牌(数牌)の再帰的取得
const getCompositionRecursion = (
  hai: number[],
  n: number,
  composition_a: number[][][],
  composition_b: number[][][],
): [number[][], number[][][], number[][][]] => {
  let max: number[][];
  let ret_a: number[][][];
  let ret_b: number[][][];
  //面子の抜き取りが終わったら搭子/対子の数を数える
  if (n > 9) {
    const start = 1;
    const [count_tatsu, ret_tatsu_and_koritsu] = getTatsuAndKoritsu(
      structuredClone(hai),
      start,
      [[]],
    );
    ret_a = [];
    ret_b = [];
    for (const tkelm of ret_tatsu_and_koritsu) {
      for (const retaelm of composition_a) {
        const t = structuredClone(retaelm);
        for (const tkelmelm of tkelm) {
          t.push(tkelmelm);
        }
        ret_a.push(t);
      }
      if (composition_a.length === 0) ret_a.push(tkelm);
      for (const retbelm of composition_b) {
        const t = structuredClone(retbelm);
        for (const tkelmelm of tkelm) {
          t.push(tkelmelm);
        }
        ret_b.push(t);
      }
      if (composition_b.length === 0) ret_b.push(tkelm);
    }
    max = [
      [0, count_tatsu],
      [0, count_tatsu],
    ];
    return [max, ret_a, ret_b];
  }

  //まずは面子を抜かず位置を1つ進め試行
  [max, ret_a, ret_b] = getCompositionRecursion(
    structuredClone(hai),
    n + 1,
    structuredClone(composition_a),
    structuredClone(composition_b),
  ); //仮の最適値とする

  //順子抜き取り
  if (n <= 7 && hai[n] > 0 && hai[n + 1] > 0 && hai[n + 2] > 0) {
    let ret_a_shuntsu: number[][][] = structuredClone(composition_a);
    let ret_b_shuntsu: number[][][] = structuredClone(composition_b);
    if (ret_a_shuntsu.length === 0) ret_a_shuntsu.push([]);
    if (ret_b_shuntsu.length === 0) ret_b_shuntsu.push([]);
    hai[n]--;
    hai[n + 1]--;
    hai[n + 2]--;
    for (let i = 0; i < ret_a_shuntsu.length; i++) {
      ret_a_shuntsu[i].push([n, n + 1, n + 2]);
    }
    for (let i = 0; i < ret_b_shuntsu.length; i++) {
      ret_b_shuntsu[i].push([n, n + 1, n + 2]);
    }
    let r;
    [r, ret_a_shuntsu, ret_b_shuntsu] = getCompositionRecursion(
      structuredClone(hai),
      n,
      structuredClone(ret_a_shuntsu),
      structuredClone(ret_b_shuntsu),
    ); //抜き取ったら同じ位置でもう一度試行
    hai[n]++;
    hai[n + 1]++;
    hai[n + 2]++;
    r[0][0]++;
    r[1][0]++; //各パターンの面子の数を1増やす
    //必要であれば最適値の入替えをする
    if (r[0][0] * 2 + r[0][1] > max[0][0] * 2 + max[0][1]) {
      max[0] = r[0];
      ret_a = ret_a_shuntsu;
    } else if (r[0][0] * 2 + r[0][1] === max[0][0] * 2 + max[0][1]) {
      for (const raselm of ret_a_shuntsu) {
        ret_a.push(raselm);
      }
    }
    if (r[1][0] * 10 + r[1][1] > max[1][0] * 10 + max[1][1]) {
      max[1] = r[1];
      ret_b = ret_b_shuntsu;
    } else if (r[1][0] * 10 + r[1][1] === max[1][0] * 10 + max[1][1]) {
      for (const rbselm of ret_b_shuntsu) {
        ret_b.push(rbselm);
      }
    }
  }

  //刻子抜き取り
  if (hai[n] >= 3) {
    let ret_a_kotsu: number[][][] = structuredClone(composition_a);
    let ret_b_kotsu: number[][][] = structuredClone(composition_b);
    if (ret_a_kotsu.length === 0) ret_a_kotsu.push([]);
    if (ret_b_kotsu.length === 0) ret_b_kotsu.push([]);
    hai[n] -= 3;
    for (let i = 0; i < ret_a_kotsu.length; i++) {
      ret_a_kotsu[i].push([n, n, n]);
    }
    for (let i = 0; i < ret_b_kotsu.length; i++) {
      ret_b_kotsu[i].push([n, n, n]);
    }
    let r;
    [r, ret_a_kotsu, ret_b_kotsu] = getCompositionRecursion(
      structuredClone(hai),
      n,
      structuredClone(ret_a_kotsu),
      structuredClone(ret_b_kotsu),
    ); //抜き取ったら同じ位置でもう一度試行
    hai[n] += 3;
    r[0][0]++;
    r[1][0]++; //各パターンの面子の数を1増やす
    //必要であれば最適値の入替えをする
    if (r[0][0] * 2 + r[0][1] > max[0][0] * 2 + max[0][1]) {
      max[0] = r[0];
      ret_a = ret_a_kotsu;
    } else if (r[0][0] * 2 + r[0][1] == max[0][0] * 2 + max[0][1]) {
      for (const rakelm of ret_a_kotsu) {
        ret_a.push(rakelm);
      }
    }
    if (r[1][0] * 10 + r[1][1] > max[1][0] * 10 + max[1][1]) {
      max[1] = r[1];
      ret_b = ret_b_kotsu;
    } else if (r[1][0] * 10 + r[1][1] === max[1][0] * 10 + max[1][1]) {
      for (const rbkelm of ret_b_kotsu) {
        ret_b.push(rbkelm);
      }
    }
  }
  return [max, ret_a, ret_b];
};

//塔子/対子・孤立牌(数牌)の再帰的取得
const getTatsuAndKoritsu = (
  hai: number[],
  n: number,
  ret_tatsu_and_koritsu: number[][][],
): [number, number[][][]] => {
  let max: number;
  let ret: number[][][];
  //搭子/対子の抜き取りが終わったら孤立牌を加える
  if (n > 9) {
    const koritsu: number[] = countArrayToNumArray(hai);
    ret = structuredClone(ret_tatsu_and_koritsu);
    if (koritsu.length > 0) {
      const ret_koritsu: number[][][] = [];
      for (const er of structuredClone(ret_tatsu_and_koritsu)) {
        const a: number[][] = er;
        for (const ek of koritsu) {
          a.push([ek]);
        }
        ret_koritsu.push(a);
      }
      ret = ret_koritsu;
    }
    max = 0;
    return [max, ret];
  }

  //まずは塔子/対子を抜かず位置を1つ進め試行
  [max, ret] = getTatsuAndKoritsu(
    structuredClone(hai),
    n + 1,
    structuredClone(ret_tatsu_and_koritsu),
  ); //仮の最適値とする

  //嵌張抜き取り
  if (n <= 7 && hai[n] > 0 && hai[n + 2] > 0) {
    let ret1: number[][][] = structuredClone(ret_tatsu_and_koritsu);
    hai[n]--;
    hai[n + 2]--;
    if (ret1.length === 0) ret1.push([]);
    for (let i = 0; i < ret1.length; i++) {
      ret1[i].push([n, n + 2]);
    }
    let r: number;
    [r, ret1] = getTatsuAndKoritsu(
      structuredClone(hai),
      n,
      structuredClone(ret1),
    ); //抜き取ったら同じ位置でもう一度試行
    hai[n]++;
    hai[n + 2]++;
    r++; //塔子の数を1増やす
    //必要であれば最適値の入替えをする
    if (r > max) {
      max = r;
      ret = ret1;
    } else if (r === max) {
      for (const ret1elm of ret1) {
        ret.push(ret1elm);
      }
    }
  }

  //両面、辺張抜き取り
  if (n <= 8 && hai[n] > 0 && hai[n + 1] > 0) {
    let ret2: number[][][] = structuredClone(ret_tatsu_and_koritsu);
    hai[n]--;
    hai[n + 1]--;
    if (ret2.length === 0) ret2.push([]);
    for (let i = 0; i < ret2.length; i++) {
      ret2[i].push([n, n + 1]);
    }
    let r: number;
    [r, ret2] = getTatsuAndKoritsu(
      structuredClone(hai),
      n,
      structuredClone(ret2),
    ); //抜き取ったら同じ位置でもう一度試行
    hai[n]++;
    hai[n + 1]++;
    r++; //塔子の数を1増やす
    //必要であれば最適値の入替えをする
    if (r > max) {
      max = r;
      ret = ret2;
    } else if (r === max) {
      for (const ret2elm of ret2) {
        ret.push(ret2elm);
      }
    }
  }

  //対子抜き取り
  if (hai[n] >= 2) {
    let ret3: number[][][] = structuredClone(ret_tatsu_and_koritsu);
    hai[n] -= 2;
    if (ret3.length === 0) ret3.push([]);
    for (let i = 0; i < ret3.length; i++) {
      ret3[i].push([n, n]);
    }
    let r;
    [r, ret3] = getTatsuAndKoritsu(
      structuredClone(hai),
      n,
      structuredClone(ret3),
    ); //抜き取ったら同じ位置でもう一度試行
    hai[n] += 2;
    r++; //塔子の数を1増やす
    //必要であれば最適値の入替えをする
    if (r > max) {
      max = r;
      ret = ret3;
    } else if (r === max) {
      for (const ret3elm of ret3) {
        ret.push(ret3elm);
      }
    }
  }
  return [max, ret];
};

//面子(字牌)の取得
const getCompositionJihai = (hai: string[]): number[][][] => {
  let hai_num: number[] = stringArrayToNumArray(hai);
  const kotsu: number[] = getKotsu(hai_num.map((h) => String(h))).map((h) =>
    Number.parseInt(h),
  );
  //面子の配列を作成
  const composition: number[][] = [];
  for (const n of kotsu) {
    composition.push([n, n, n]);
  }
  for (const n of kotsu) {
    hai_num = removeElementByName(
      hai_num.map((h) => String(h)),
      String(n),
      3,
    ).map((h) => Number.parseInt(h));
  }
  const toitsu: number[] = getToitsu(hai_num.map((h) => String(h))).map((h) =>
    Number.parseInt(h),
  );
  for (const n of toitsu) {
    composition.push([n, n]);
  }
  return [composition];
};

const getKotsu = (hai: string[]) => {
  return getDuplicatedElement(hai, 3);
};

const getToitsu = (hai: string[]) => {
  return getDuplicatedElement(hai, 2);
};

const getDuplicatedElement = (ary: string[], n: number): string[] => {
  const m = new Map<string, number>();
  for (const str of ary) {
    m.set(str, (m.get(str) ?? 0) + 1);
  }
  const r: string[] = [];
  for (const [k, v] of m) {
    if (v >= n) {
      r.push(k);
    }
  }
  return r;
};

//七対子
export const getShantenChitoitsu = (tehai: string): number => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  if (hai_furo.length > 0 || hai_ankan.length > 0) {
    return SHANTEN_MAX;
  }
  let count_toitsu = getToitsu(hai_normal).length;
  let count_koritsu = new Set(hai_normal).size - count_toitsu;
  if (count_toitsu > 7) count_toitsu = 7;
  if (count_toitsu + count_koritsu > 7) count_koritsu = 7 - count_toitsu;
  return 13 - 2 * count_toitsu - count_koritsu;
};

//国士無双
export const getShantenKokushimusou = (tehai: string): number => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  if (hai_furo.length > 0 || hai_ankan.length > 0) {
    return SHANTEN_MAX;
  }
  const yaochu_string = '1m9m1p9p1s9s1z2z3z4z5z6z7z';
  const hai_yaochu: string[] = [];
  for (const hai of hai_normal) {
    if (yaochu_string.includes(hai)) {
      hai_yaochu.push(hai);
    }
  }

  const count_toitsu = getToitsu(hai_yaochu).length;
  const count_type = new Set(hai_yaochu).size;
  let has_toitsu = 0;
  if (count_toitsu > 0) {
    has_toitsu = 1;
  }
  return 13 - count_type - has_toitsu;
};

//門前清自摸和
const getShantenMenzen = (tehai: string): number => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  if (hai_furo.length > 0) return SHANTEN_MAX;
  return getShanten(tehai)[0];
};

//役牌
const getShantenYakuhai = (
  tehai: string,
  bafu_hai: string,
  jifu_hai: string,
): number => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  const kotsu: string[] = getKotsu(hai_normal);
  const yakuhai = ['5z', '6z', '7z'];
  if (bafu_hai !== '') yakuhai.push(bafu_hai);
  if (jifu_hai !== '') yakuhai.push(jifu_hai);
  let has_yakuhai_kotsu = false;
  for (const k of kotsu) {
    if (yakuhai.includes(k)) has_yakuhai_kotsu = true;
  }
  for (const h of hai_furo) {
    const hai = h.slice(0, 2);
    if (yakuhai.includes(hai)) has_yakuhai_kotsu = true;
  }
  for (const h of hai_ankan) {
    const hai = h.slice(0, 2);
    if (yakuhai.includes(h)) has_yakuhai_kotsu = true;
  }
  if (has_yakuhai_kotsu) return getShanten(tehai)[0];
  const toitsu = getToitsu(hai_normal);
  let has_yakuhai_toitsu = false;
  let yakuhai_target = '';
  for (const t of toitsu) {
    if (yakuhai.includes(t)) {
      has_yakuhai_toitsu = true;
      yakuhai_target = t;
      break;
    }
  }
  if (!has_yakuhai_toitsu) return SHANTEN_MAX;
  const tehai_pon =
    tehai.replace(new RegExp(yakuhai_target), '') +
    `<${yakuhai_target.repeat(3)}>`;
  return getShanten(tehai_pon)[0] + 1;
};

//断么九
const getShantenTanyao = (tehai: string): number => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  const yaochu = '1m9m1p9p1s9s1z2z3z4z5z6z7z';
  for (const h of hai_furo) {
    const ary = stringToArrayWithFuro(h)[0];
    for (const a of ary) {
      if (yaochu.includes(a)) return SHANTEN_MAX;
    }
  }
  for (const h of hai_ankan) {
    if (yaochu.includes(h.slice(0, 2))) return SHANTEN_MAX;
  }
  const new_tehai =
    hai_normal.filter((h) => !yaochu.includes(h)).join('') +
    (hai_furo.length > 0)
      ? hai_furo.map((h) => `<${h}>`).join('')
      : '' + (hai_ankan.length > 0)
        ? hai_ankan.map((h) => `(${h})`).join('')
        : '';
  return getShanten(new_tehai)[0];
};

//対々和
const getShantenToitoi = (tehai: string): number => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  for (const h of hai_furo) {
    const ary = stringToArrayWithFuro(h)[0];
    if (ary[0] !== ary[1]) return SHANTEN_MAX;
  }
  const count_kotsu =
    hai_furo.length + hai_ankan.length + getKotsu(hai_normal).length;
  let count_toitsu = getToitsu(hai_normal).length - getKotsu(hai_normal).length;
  if (count_kotsu + count_toitsu > 5) count_toitsu = 5 - count_kotsu;
  return 8 - 2 * count_kotsu - count_toitsu;
};

//混一色
const getShantenHonitsu = (tehai: string): number => {
  const m = getShantenHonitsuByColor(tehai, 'm');
  const p = getShantenHonitsuByColor(tehai, 'p');
  const s = getShantenHonitsuByColor(tehai, 's');
  return Math.min(m, p, s);
};

//混一色(色指定)
const getShantenHonitsuByColor = (tehai: string, color: string): number => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  for (const h of hai_furo) {
    if (h.slice(1, 2) !== color) return SHANTEN_MAX;
  }
  for (const h of hai_ankan) {
    if (h.slice(1, 2) !== color) return SHANTEN_MAX;
  }
  const new_tehai =
    hai_normal.filter((h) => [color, 'z'].includes(h.slice(1, 2))).join('') +
    (hai_furo.length > 0)
      ? hai_furo.map((h) => `<${h}>`).join('')
      : '' + (hai_ankan.length > 0)
        ? hai_ankan.map((h) => `(${h})`).join('')
        : '';
  return getShanten(new_tehai)[0];
};
