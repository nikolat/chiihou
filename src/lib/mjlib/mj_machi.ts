import {
  compareFn,
  stringArrayToNumArray,
  stringToArrayWithFuro,
} from './mj_common.js';
import { getShanten } from './mj_shanten.js';

//待ちの取得
export const getMachi = (tehai: string): string => {
  const [shanten, composition] = getShanten(tehai);
  if (shanten !== 0) return '';
  const [hai_normal, _] = stringToArrayWithFuro(tehai);
  let machi: string[] = [];
  for (const comp of composition) {
    const composition_split = comp.split(',');
    if (comp === 'chitoitsu') {
      machi.push(getMachiChitoitsu(hai_normal));
    } else if (comp == 'kokushimusou') {
      return getMachiKokushimusou(hai_normal);
    } else if (composition_split[0] === '') {
      //雀頭無し
      for (const cs of composition_split) {
        if (cs.length === 2) {
          machi.push(cs); //単騎
          break;
        }
      }
    } else {
      for (let j = 1; j < composition_split.length; j++) {
        if (composition_split[j].length !== 4) continue;
        const [tatsu, _1, _2] = stringToArrayWithFuro(composition_split[j]);
        const tatsu_num = stringArrayToNumArray(tatsu);
        const color = tatsu[0].slice(1, 2);
        const n1 = tatsu_num[0];
        const n2 = tatsu_num[1];
        if (n1 === 1 && n2 === 2) {
          //辺張
          machi.push('3' + color);
        } else if (n1 === 8 && n2 === 9) {
          //辺張
          machi.push('7' + color);
        } else if (n1 + 1 === n2) {
          //両面
          machi.push(String(n1 - 1) + color);
          machi.push(String(n2 + 1) + color);
        } else if (n1 + 2 === n2) {
          //嵌張
          machi.push(String(n1 + 1) + color);
        } else if (n1 === n2) {
          //シャンポン
          machi.push(tatsu[0]);
          machi.push(composition_split[0].slice(0, 2));
        }
        break;
      }
    }
  }
  machi.sort(compareFn);
  machi = Array.from(new Set(machi));
  return machi.join('');
};

//待ちの取得(七対子)
const getMachiChitoitsu = (tehai: string[]): string => {
  const tehaiset = new Set(tehai);
  for (const hai of tehaiset) {
    if (tehai.indexOf(hai) === tehai.lastIndexOf(hai)) {
      return hai;
    }
  }
  return '';
};

//待ちの取得(国士無双)
const getMachiKokushimusou = (tehai: string[]) => {
  const yaochuhai_string = '1m9m1p9p1s9s1z2z3z4z5z6z7z';
  const [yaochuhai_array, _1, _2] = stringToArrayWithFuro(yaochuhai_string);
  for (const yao of yaochuhai_array) {
    if (!tehai.includes(yao)) return yao;
  }
  return yaochuhai_string;
};
