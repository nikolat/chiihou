import { addHai, compareFn, getDoraFromDorahyouji, removeHai, stringToArrayWithFuro } from './mj_common.js';
import { getMachi } from './mj_machi.js';
import { getScore } from './mj_score.js';
import { getShanten, getShantenYaku, removeKoritsuHai } from './mj_shanten.js';

export const naniwokiru = (
  strTehai13: string,
  strTsumo: string,
  strKawa: string,
  strBafuhai: string,
  strJifuhai: string,
  strDorahyouji: string,
  aryPlayerRichi: boolean[],
  aryPlayerGenbutsu: string[],
  strVisiblePai: string,
): string => {
  const arVisiblePai: string[] = stringToArrayWithFuro(strVisiblePai)[0];
  const arVisibleNum = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const sortCode = '1m,2m,3m,4m,5m,6m,7m,8m,9m,1p,2p,3p,4p,5p,6p,7p,8p,9p,1s,2s,3s,4s,5s,6s,7s,8s,9s,1z,2z,3z,4z,5z,6z,7z'.split(',');
  for (const p of arVisiblePai) {
    arVisibleNum[sortCode.indexOf(p)]++;
  }
  //副露を除く
  const strTehai14 = addHai(strTehai13, strTsumo);
  const arTehai14Normal = stringToArrayWithFuro(strTehai14)[0];
  const arSutehaiKouho = new Set(arTehai14Normal);
  //ドラ
  const arDorahyouji = stringToArrayWithFuro(strDorahyouji)[0];
  const arDora: string[] = arDorahyouji.map((d) => getDoraFromDorahyouji(d));
  let arDahai: string[] = [];
  //孤立牌
  const arKoritsuhai = removeKoritsuHai(arTehai14Normal)[1];
  let point = -1;
  for (const sutehai of arSutehaiKouho) {
    const strTehaiRemoved = removeHai(strTehai14, sutehai);
    const shanten = getShantenYaku(strTehaiRemoved, strBafuhai, strJifuhai)[0];
    let shantenPoint = 1000 * (10 - shanten);
    let machiPoint = 0;
    let elementMaxPoint = 0;
    //テンパイ時は待ちの広さ・和了点の高さを考慮
    if (shanten === 0) {
      const arMachi = stringToArrayWithFuro(getMachi(strTehaiRemoved))[0];
      for (const machi of arMachi) {
        const isTsumo = true; //ツモった場合を想定
        const score = getScore(strTehaiRemoved, machi, strBafuhai, strJifuhai, arDora.join(''), isTsumo)[0];
        if (score > 0) {
          const nNokori = 4 - arVisibleNum[sortCode.indexOf(machi)];
          machiPoint += score * nNokori;
        }
      }
      if (machiPoint > 0) {
        shantenPoint += 10000; //テンパイを崩してまでオリないこととする
      } else {
        shantenPoint -= 100000; //待ち牌が無いならむしろテンパイを崩して立て直すべき
      }
    } else {
      const arMentsuPattern = getShanten(strTehaiRemoved)[1];
      for (const strMentsu of arMentsuPattern) {
        let elementPoint = 0;
        if (strMentsu === 'chitoitsu' || strMentsu === 'kokushimusou') {
          elementPoint = 0;
        } else {
          const ap = strMentsu.split(',');
          const arTatsu = [];
          if (ap[0] !== '') {
            //雀頭
            const nNokori = 4 - arVisibleNum[sortCode.indexOf(ap[0].slice(0, 2))];
            elementPoint += 20 * nNokori;
          }
          ap.shift();
          for (const p of ap) {
            if (p.length === 6) {
              //面子
              elementPoint += 90;
            } else if (p.length === 4) {
              //塔子・対子
              arTatsu.push(p);
            }
          }
          for (const tatsu of arTatsu) {
            const t1 = Number.parseInt(tatsu.slice(0, 1));
            const t2 = Number.parseInt(tatsu.slice(2, 3));
            const color = tatsu.slice(1, 2);
            if (t1 !== 1 && t1 + 1 === t2 && t2 !== 9) {
              //両面
              const nNokori1 = 4 - arVisibleNum[sortCode.indexOf(`${t1 - 1}${color}`)];
              const nNokori2 = 4 - arVisibleNum[sortCode.indexOf(`${t2 + 1}${color}`)];
              elementPoint += 10 * (nNokori1 + nNokori2);
            } else if (t1 === t2) {
              //対子
              const nNokori = 4 - arVisibleNum[sortCode.indexOf(`${t1}${color}`)];
              elementPoint += 20 * nNokori;
            } else if ((t1 === 1 && t2 === 2) || (t1 === 8 && t2 === 9)) {
              //辺張
              let nNokori = 0;
              if (t1 === 1) {
                nNokori = 4 - arVisibleNum[sortCode.indexOf(`3${color}`)];
              } else {
                nNokori = 4 - arVisibleNum[sortCode.indexOf(`7${color}`)];
              }
              elementPoint += 10 * nNokori - 5;
            } else {
              //嵌張
              const nNokori = 4 - arVisibleNum[sortCode.indexOf(`${t1 + 1}${color}`)];
              elementPoint += 10 * nNokori;
            }
          }
        }
        if (elementMaxPoint < elementPoint) {
          elementMaxPoint = elementPoint;
        }
      }
    }
    //孤立牌を優先的に切る
    let koritsuPoint = 0;
    if (arKoritsuhai.includes(sutehai)) {
      koritsuPoint = 500;
    }
    //既に捨てた牌を優先的に切る
    let furitenPoint = 0;
    if (strKawa.includes(sutehai)) {
      furitenPoint = 10;
    }
    //ドラは残しておきたい
    let doraPoint = 0;
    if (arDora.includes(sutehai)) {
      doraPoint = -50;
    }
    //現物を優先的に切る
    let genbutsuPoint = 0;
    for (let i = 0; i < aryPlayerRichi.length; i++) {
      if (aryPlayerRichi[i]) {
        if (aryPlayerGenbutsu[i].includes(sutehai)) {
          genbutsuPoint += 4000;
          if (i === 0) {
            //親のリーチは特に避けたい
            genbutsuPoint += 2000;
          }
        }
      }
    }
    const dahaiPoint = shantenPoint + machiPoint + elementMaxPoint + koritsuPoint + furitenPoint + doraPoint + genbutsuPoint;
    if (point < dahaiPoint) {
      point = dahaiPoint;
      arDahai = [sutehai];
    } else if (point === dahaiPoint) {
      arDahai.push(sutehai);
    }
  }
  return any(arDahai);
};

const any = (array: string[]): string => {
  return array[Math.floor(Math.random() * array.length)];
};

export const getAnkanHaiBest = (
  tehai: string,
  tsumoHai: string,
  isRichi: boolean,
  isRichiOther: boolean,
  bafuHai: string,
  jifuHai: string,
): string => {
  const tehaiAddTsumo = addHai(tehai, tsumoHai);
  const arAnkanHai = getAnkanHai(tehaiAddTsumo);
  //自身がリーチしている場合OK
  if (isRichi && arAnkanHai.includes(tsumoHai)) {
    return tsumoHai;
  }
  const shantenBefore = getShantenYaku(tehaiAddTsumo, bafuHai, jifuHai)[0];
  const arAnkanHaiUseful = [];
  for (const h of arAnkanHai) {
    const strTehai = removeHai(tehaiAddTsumo, h.repeat(4)) + `(${h.repeat(4)})`;
    const shantenAfter = getShantenYaku(strTehai, bafuHai, jifuHai)[0];
    if (shantenAfter <= shantenBefore) arAnkanHaiUseful.push(h);
  }
  //シャンテン数が増えてしまうならNG
  if (arAnkanHaiUseful.length == 0) {
    return '';
  }
  //三槓子・四槓子狙いはOK
  if (countKantsu(tehai) >= 2) {
    return any(arAnkanHaiUseful);
  }
  //他家がリーチしている場合NG
  if (isRichiOther) {
    return '';
  }
  //基本OK
  return any(arAnkanHaiUseful);
};

export const getAnkanHai = (hai: string): string[] => {
  const arHai: string[] = stringToArrayWithFuro(hai)[0];
  const arRet: string[] = [];
  for (const h of new Set<string>(arHai)) {
    if (arHai.filter((e) => e === h).length >= 4) arRet.push(h);
  }
  return arRet;
};

export const getKakanHaiBest = (tehai: string, tsumoHai: string, bafuHai: string, jifuHai: string, isRichiOther: boolean): string => {
  const tehaiAddTsumo = addHai(tehai, tsumoHai);
  const arKakanHai: string[] = getKakanHai(tehaiAddTsumo);
  const shantenBefore = getShantenYaku(tehaiAddTsumo, bafuHai, jifuHai)[0];
  const arKakanHaiUseful: string[] = [];
  for (const h of arKakanHai) {
    let strTehai = tehaiAddTsumo.replace(`<${h.repeat(3)}>`, `<${h.repeat(4)}>`);
    strTehai = removeHai(strTehai, h);
    const shantenAfter = getShantenYaku(strTehai, bafuHai, jifuHai)[0];
    if (shantenAfter <= shantenBefore) arKakanHaiUseful.push(h);
  }
  //シャンテン数が増えてしまうならNG
  if (arKakanHaiUseful.length === 0) {
    return '';
  }
  //三槓子・四槓子狙いはOK
  if (countKantsu(tehai) >= 2) {
    return any(arKakanHaiUseful);
  }
  //他家がリーチしている場合NG
  if (isRichiOther) {
    return '';
  }
  //基本OK
  return any(arKakanHaiUseful);
};

export const getKakanHai = (tehai: string): string[] => {
  const arHai: string[] = stringToArrayWithFuro(tehai)[0];
  const arRet: string[] = [];
  for (const h of arHai) {
    if (tehai.includes(`<${h.repeat(3)}>`)) {
      arRet.push(h);
    }
  }
  return arRet;
};

export const shouldRichi = (
  tehai: string,
  tsumoHai: string,
  isRichi: boolean,
  nokori: number,
  dahai: string,
  bafuHai: string,
  jifuHai: string,
): boolean => {
  if (!canRichi(tehai, tsumoHai, isRichi, nokori, dahai)) {
    return false;
  }
  //別の役について一向聴である場合はリーチしない
  const yaku = getShantenYaku(addHai(tehai, tsumoHai), bafuHai, jifuHai)[1];
  if (Array.from(yaku.values()).includes(1)) {
    return false;
  }
  return true;
};

export const canRichi = (tehai: string, tsumoHai: string, isRichi: boolean, nokori: number, sutehai?: string): boolean => {
  let tehai2 = addHai(tehai, tsumoHai);
  if (sutehai !== undefined) {
    tehai2 = removeHai(tehai2, sutehai);
  }
  const shanten = getShanten(tehai2)[0];
  if (!tehai.includes('<') && shanten === 0 && !isRichi && nokori >= 4) {
    return true;
  }
  return false;
};

export const shouldDaiminkan = (): boolean => {
  return false;
};

export const countKantsu = (tehai: string) => {
  const [normal, furo, ankan] = stringToArrayWithFuro(tehai);
  return furo.filter((s) => s.length === 8).length + ankan.length;
};

export const shouldPon = (tehai: string, sutehai: string, bafuHai: string, jifuHai: string, isRichiOther: boolean): boolean => {
  const h = sutehai;
  const tehaiNew = removeHai(tehai, h.repeat(2)) + `<${h.repeat(3)}>`;
  const shantenBefore = getShantenYaku(tehai, bafuHai, jifuHai)[0];
  const shantenAfter = getShantenYaku(tehaiNew, bafuHai, jifuHai)[0];
  //それでテンパイするなら鳴く
  if (shantenAfter < shantenBefore && shantenAfter === 0) {
    return true;
  }
  //誰かがリーチしていたら鳴かない
  if (isRichiOther) {
    return false;
  }
  //鳴いてもよしとする
  if (shantenAfter < shantenBefore) {
    return true;
  }
  return false;
};

export const getChiMaterialBest = (tehai: string, sutehai: string, bafuHai: string, jifuHai: string, isRichiOther: boolean): string => {
  const arChi: string[] = getChiMaterial(tehai, sutehai);
  const shantenBefore = getShantenYaku(tehai, bafuHai, jifuHai)[0];
  const r: string[] = [];
  const rTenpai: string[] = [];
  for (const c of arChi) {
    const furoArray = [sutehai, c.slice(0, 2), c.slice(2, 4)];
    furoArray.sort(compareFn);
    const tehaiNew = removeHai(tehai, c) + `<${furoArray.join('')}>`;
    const shantenAfter = getShantenYaku(tehaiNew, bafuHai, jifuHai)[0];
    if (shantenAfter < shantenBefore && shantenAfter === 0) {
      r.push(c);
      if (shantenAfter === 0) {
        rTenpai.push(c);
      }
    }
  }
  if (r.length === 0) return '';
  //それでテンパイするなら鳴く
  if (rTenpai.length > 0) {
    return any(rTenpai);
  }
  //誰かがリーチしていたら鳴かない
  if (isRichiOther) {
    return '';
  }
  //鳴いてもよしとする
  return any(r);
};

export const getChiMaterial = (tehai: string, sutehai: string): string[] => {
  const n = Number.parseInt(sutehai.slice(0, 1));
  const color = sutehai.slice(1, 2);
  if (color === 'z') return [];
  const arTehai = stringToArrayWithFuro(tehai)[0];
  const a: number[] = [];
  for (const hai of arTehai) {
    if (hai.slice(1, 2) === color) a.push(Number.parseInt(hai.slice(0, 1)));
  }
  const arRet: string[] = [];
  for (const [n1, n2] of [
    [n - 2, n - 1],
    [n - 1, n + 1],
    [n + 1, n + 2],
  ]) {
    if (a.includes(n1) && a.includes(n2)) arRet.push(`${n1}${color}${n2}${color}`);
  }
  return arRet;
  //喰い替え禁止ルールでは手配が禁止牌のみの場合は除外すべきだが、レアケースのため未実装
  //例: 1m2m3m4m<1p1p1p><1s1s1s><9s9s9s>で1mをチーした場合などは詰む
};
