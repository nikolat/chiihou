//数値のみの配列に変換
export const stringArrayToNumArray = (haiArray: string[]): number[] => {
  const ret: number[] = [];
  for (const hai of haiArray) {
    ret.push(Number.parseInt(hai.slice(0, 1)));
  }
  return ret;
};

//1-9までの個数の配列に変換
export const numArrayToCountArray = (haiArray: number[]): number[] => {
  const a = [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //a[0]はreserved
  for (const hai of haiArray) {
    a[hai] += 1;
  }
  return a;
};

//NumArrayToCountArrayの逆変換
export const countArrayToNumArray = (haiArray: number[]) => {
  const a: number[] = [];
  for (let i = 1; i < haiArray.length; i++) {
    for (let j = 0; j < haiArray[i]; j++) {
      a.push(i);
    }
  }
  return a;
};

//配列に変換
export const stringToArray = (tehai: string): string[] => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  return [...hai_normal, ...hai_furo, ...hai_ankan];
};

//配列に変換(副露を分離)
export const stringToArrayWithFuro = (tehai: string): [string[], string[], string[]] => {
  const m = tehai.match(/^(([1-9][mspz])*)(<([1-9][mspz]){3,4}>|\(([1-9][mspz]){4}\))*$/);
  if (m === null) {
    throw new TypeError(`${tehai} is invalid`);
  }
  const [_, normal] = m;
  const furo: string[] = [];
  const ankan: string[] = [];
  const matchesIteratorFuro = tehai.matchAll(/<(([1-9][mspz]){3,4})>/g);
  for (const match of matchesIteratorFuro) {
    furo.push(match[1]);
  }
  const matchesIteratorAnkan = tehai.matchAll(/\((([1-9][mspz]){4})\)/g);
  for (const match of matchesIteratorAnkan) {
    ankan.push(match[1]);
  }
  const nm = normal.matchAll(/[1-9][mspz]/g);
  const r: string[] = [];
  for (const m of nm) {
    r.push(m[0]);
  }
  return [r, furo, ankan];
};

//配列に変換(副露を区別しない)
export const stringToArrayPlain = (tehai: string): string[] => {
  const [hai_normal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  return hai_normal.concat(stringToArrayWithFuro(hai_furo.join('') + hai_ankan.join(''))[0]);
};

export const addHai = (tehai: string, hai: string): string => {
  const [arTehaiBaseNormal, hai_furo, hai_ankan] = stringToArrayWithFuro(tehai);
  const arTehaiNewNormal = arTehaiBaseNormal.concat(hai);
  arTehaiNewNormal.sort(compareFn);
  const strTehaiNew = arTehaiNewNormal.join('') + hai_furo.map((h) => `<${h}>`).join('') + hai_ankan.map((h) => `(${h})`).join('');
  return strTehaiNew;
};

export const removeHai = (tehai: string, hai: string): string => {
  let r = tehai;
  for (const p of stringToArrayWithFuro(hai)[0]) {
    r = r.replace(new RegExp(p), '');
  }
  return r;
};

//指定した要素を削除
export const removeElementByName = (ary: string[], name: string, count: number) => {
  const ret: string[] = [];
  let n = 0;
  for (const elm of ary) {
    if (elm === name && n < count) {
      n++;
    } else {
      ret.push(elm);
    }
  }
  return ret;
};

//重複した要素を削除
export const uniq = (ary: string[][]) => {
  const ret: string[][] = [];
  const retCheck: string[] = [];
  for (let elm of ary) {
    const key = removeElementByName(elm, '', 1);
    key.sort();
    if (!retCheck.includes(key.join(','))) {
      retCheck.push(key.join(','));
      ret.push(elm);
    }
  }
  return ret;
};

export const paikind = [
  '1m',
  '2m',
  '3m',
  '4m',
  '5m',
  '6m',
  '7m',
  '8m',
  '9m',
  '1p',
  '2p',
  '3p',
  '4p',
  '5p',
  '6p',
  '7p',
  '8p',
  '9p',
  '1s',
  '2s',
  '3s',
  '4s',
  '5s',
  '6s',
  '7s',
  '8s',
  '9s',
  '1z',
  '2z',
  '3z',
  '4z',
  '5z',
  '6z',
  '7z',
];

export const compareFn = (a: string, b: string) => {
  if (paikind.indexOf(a) < paikind.indexOf(b)) {
    return -1;
  } else if (paikind.indexOf(a) > paikind.indexOf(b)) {
    return 1;
  }
  return 0;
};

export const getDoraFromDorahyouji = (hai: string): string => {
  const a: string[] = stringToArrayWithFuro(hai)[0];
  const r: string[] = [];
  for (const p of a) {
    r.push(doraConvert(p));
  }
  return r.join('');
};

const doraConvert = (hai: string): string => {
  const d = new Map<string, string>([
    ['1m', '2m'],
    ['2m', '3m'],
    ['3m', '4m'],
    ['4m', '5m'],
    ['5m', '6m'],
    ['6m', '7m'],
    ['7m', '8m'],
    ['8m', '9m'],
    ['9m', '1m'],
    ['1p', '2p'],
    ['2p', '3p'],
    ['3p', '4p'],
    ['4p', '5p'],
    ['5p', '6p'],
    ['6p', '7p'],
    ['7p', '8p'],
    ['8p', '9p'],
    ['9p', '1p'],
    ['1s', '2s'],
    ['2s', '3s'],
    ['3s', '4s'],
    ['4s', '5s'],
    ['5s', '6s'],
    ['6s', '7s'],
    ['7s', '8s'],
    ['8s', '9s'],
    ['9s', '1s'],
    ['1z', '2z'],
    ['2z', '3z'],
    ['3z', '4z'],
    ['4z', '1z'],
    ['5z', '6z'],
    ['6z', '7z'],
    ['7z', '5z'],
  ]);
  return d.get(hai) ?? '';
};
