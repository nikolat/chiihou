<script lang="ts">
  import type { RxNostr } from 'rx-nostr';
  import type { NostrEvent } from 'nostr-tools/pure';
  import { stringToArrayPlain } from '$lib/mjlib/mj_common';
  import { awayuki_mahjong_emojis, sendChatMessage } from '$lib/utils';
  import Pai from '$lib/components/Pai.svelte';
  import { chatHashtag, getRoboHashURL } from '$lib/config';

  export let bafu: string | undefined;
  export let kyoku: number | undefined;
  export let tsumibou: number | undefined;
  export let kyoutaku: number | undefined;
  export let nokori: number | undefined;
  export let dorahyoujihai: string | undefined;
  export let uradorahyoujihai: string | undefined;
  export let doras: string[];
  export let result: string | undefined;
  export let chatEvents: NostrEvent[];
  export let chatMembers: Map<string, NostrEvent>;
  export let rxNostr: RxNostr | undefined;

  let inputText: string;
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
<div class="info result">
  {result ?? ''}
</div>
<div class="info chat">
  <input type="text" bind:value={inputText} />
  <button
    on:click={() => {
      sendChatMessage(rxNostr, inputText);
      inputText = '';
    }}
    disabled={!inputText}>Post</button
  >
  <dl>
    {#each chatEvents as event}
      {@const kind0 = chatMembers.get(event.pubkey)}
      {@const profile = JSON.parse(kind0?.content || '{}')}
      <dt>
        <img
          class="player"
          alt={profile.name ?? ''}
          title={new Date(1000 * event.created_at).toLocaleString()}
          src={profile.picture ?? getRoboHashURL(event.pubkey)}
        />{profile.display_name ?? ''} @{profile.name ?? ''}
        <time>{new Date(1000 * event.created_at).toLocaleString()}</time>
      </dt>
      <dd>{event.content.replace(`#${chatHashtag}`, '').trim()}</dd>
    {/each}
  </dl>
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
  .result {
    white-space: pre-wrap;
  }
  .chat dl {
    margin: 0;
  }
  .chat dt img {
    height: 16px;
  }
  .chat dd {
    white-space: pre-wrap;
  }
  @media all and (min-width: 480px) {
    .info {
      width: calc(99% / 3);
    }
  }
</style>
