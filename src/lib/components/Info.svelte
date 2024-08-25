<script lang="ts">
  import { stringToArrayPlain } from '$lib/mjlib/mj_common';
  import { awayuki_mahjong_emojis } from '$lib/utils';
  import Pai from '$lib/components/Pai.svelte';

  export let bafu: string;
  export let kyoku: number;
  export let tsumibou: number;
  export let kyoutaku: number;
  export let nokori: number;
  export let dorahyoujihai: string;
  export let uradorahyoujihai: string;
  export let doras: string[];
  export let result: string;
</script>

<p>
  {bafu ?? '?'}{kyoku ?? '0'}局
  <img
    src={awayuki_mahjong_emojis.mahjong_stick100}
    alt="積み棒"
    class="pai"
  />x{tsumibou ?? '0'}
  <img
    src={awayuki_mahjong_emojis.mahjong_stick1000}
    alt="供託"
    class="pai"
  />x{kyoutaku === undefined ? '0' : kyoutaku / 1000} 残り{nokori ?? 0}枚
  <br />
  {#each stringToArrayPlain(dorahyoujihai ?? '') as p}<Pai
      pai={p}
      isDora={doras.includes(p)}
      isRemoved={false}
      hide={false}
      atari={false}
    />{/each}{#each new Array((10 - (dorahyoujihai ?? '').length) / 2).fill('back') as p}<Pai
      pai={p}
      isDora={false}
      isRemoved={false}
      hide={true}
      atari={false}
    />{/each}
  {#if uradorahyoujihai !== undefined && uradorahyoujihai.length > 0}
    <br />
    {#each stringToArrayPlain(uradorahyoujihai) as p}<Pai
        pai={p}
        isDora={doras.includes(p)}
        isRemoved={false}
        hide={false}
        atari={false}
      />{/each}{#each new Array((10 - uradorahyoujihai.length) / 2).fill('back') as p}<Pai
        pai={p}
        isDora={false}
        isRemoved={false}
        hide={true}
        atari={false}
      />{/each}
  {/if}
</p>
<pre>{result ?? ''}</pre>

<style>
  .pai {
    height: 30px;
  }
</style>
