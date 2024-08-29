<script lang="ts">
  import { stringToArrayPlain } from '$lib/mjlib/mj_common';
  import { awayuki_mahjong_emojis } from '$lib/utils';
  import Pai from '$lib/components/Pai.svelte';

  export let bafu: string | undefined;
  export let kyoku: number | undefined;
  export let tsumibou: number | undefined;
  export let kyoutaku: number | undefined;
  export let nokori: number | undefined;
  export let dorahyoujihai: string | undefined;
  export let uradorahyoujihai: string | undefined;
  export let doras: string[];
  export let result: string | undefined;
</script>

<div class="info">
  {bafu ?? '?'}{kyoku ?? 0}局
  <img
    src={awayuki_mahjong_emojis.mahjong_stick100}
    alt="積み棒"
    class="pai"
  />x{tsumibou ?? 0}
  <img
    src={awayuki_mahjong_emojis.mahjong_stick1000}
    alt="供託"
    class="pai"
  />x{kyoutaku === undefined ? 0 : kyoutaku / 1000} 残り{nokori ?? 0}枚
  <br />
  {#each stringToArrayPlain(dorahyoujihai ?? '') as p}<Pai
      pai={p}
      isDora={doras.includes(p)}
      isRemoved={false}
      isNaku={false}
      isAtari={false}
      isHidden={false}
      isRotated={false}
      isKakan={false}
      isSkipped={false}
    />{/each}{#each new Array((10 - (dorahyoujihai ?? '').length) / 2).fill('back') as p}<Pai
      pai={p}
      isDora={false}
      isRemoved={false}
      isNaku={false}
      isAtari={false}
      isHidden={false}
      isRotated={false}
      isKakan={false}
      isSkipped={false}
    />{/each}
  {#if uradorahyoujihai !== undefined && uradorahyoujihai.length > 0}
    <br />
    {#each stringToArrayPlain(uradorahyoujihai) as p}<Pai
        pai={p}
        isDora={doras.includes(p)}
        isRemoved={false}
        isNaku={false}
        isAtari={false}
        isHidden={false}
        isRotated={false}
        isKakan={false}
        isSkipped={false}
      />{/each}{#each new Array((10 - uradorahyoujihai.length) / 2).fill('back') as p}<Pai
        pai={p}
        isDora={false}
        isRemoved={false}
        isNaku={false}
        isAtari={false}
        isHidden={false}
        isRotated={false}
        isKakan={false}
        isSkipped={false}
      />{/each}
  {/if}
</div>
<div class="info">
  <pre>{result ?? ''}</pre>
</div>

<style>
  .pai {
    height: 30px;
  }
  .info {
    height: 120px;
    overflow-y: auto;
    border: 1px gray solid;
    float: left;
    width: calc(99% / 2);
  }
</style>
