<script lang="ts">
  import { mahjongServerPubkey } from '$lib/config';
  import { canRichi, getChiMaterial, getKakanHai } from '$lib/mjlib/mj_ai';
  import { canTsumo, getAnkanHai, getTagsReply } from '$lib/utils';
  import { nip19, type NostrEvent } from 'nostr-tools';
  import type { RxNostr } from 'rx-nostr';
  import Pai from '$lib/components/Pai.svelte';
  import { addHai } from '$lib/mjlib/mj_common';

  export let isNakuTurn: boolean;
  export let lastEventsToReply: Map<string, NostrEvent>;
  export let rxNostr: RxNostr;
  export let loginPubkey: string;
  export let nakuKinds: Map<string, string[] | undefined>;
  export let tehai: Map<string, string>;
  export let sutehaiSaved: string;
  export let doras: string[];
  export let isSutehaiTurn: boolean;
  export let sutehaiCommand: string;
  export let tsumohai: Map<string, string>;
  export let nokori: number;
  export let setSutehai: (value: string) => void;
  export let isRichi: boolean;
  export let sendDapai: (pai: string) => void;

  const sendReply = (message: string) => {
    const ev = lastEventsToReply.get(loginPubkey);
    if (ev === undefined) return;
    const now = Math.floor(Date.now() / 1000);
    rxNostr.send({
      kind: 42,
      content: `nostr:${nip19.npubEncode(mahjongServerPubkey)} naku? ${message}`,
      tags: getTagsReply(ev),
      created_at: ev.created_at < now ? now : ev.created_at + 1,
    });
  };
</script>

{#if isNakuTurn}
  naku?
  <br /><button
    on:click={() => {
      sendReply('no');
    }}>no</button
  >
  {#if nakuKinds.get(loginPubkey)?.includes('pon')}
    <br /><button
      on:click={() => {
        sendReply('pon');
      }}>pon</button
    >
  {/if}
  {#if nakuKinds.get(loginPubkey)?.includes('chi')}
    {#each getChiMaterial(tehai.get(loginPubkey) ?? '', sutehaiSaved) as cm}
      {@const pai1 = cm.slice(0, 2)}
      {@const pai2 = cm.slice(2, 4)}
      <br /><button
        on:click={() => {
          sendReply(`chi ${pai1} ${pai2}`);
        }}>chi</button
      ><Pai pai={pai1} isDora={doras.includes(pai1)} hide={false} /><Pai
        pai={pai2}
        isDora={doras.includes(pai2)}
        hide={false}
      />
    {/each}
  {/if}
  {#if nakuKinds.get(loginPubkey)?.includes('kan')}
    <br /><button
      on:click={() => {
        sendReply('kan');
      }}>kan</button
    >
  {/if}
  {#if nakuKinds.get(loginPubkey)?.includes('ron')}
    <br /><button
      on:click={() => {
        sendReply('ron');
      }}>ron</button
    >
  {/if}
{/if}
{#if isSutehaiTurn}
  {@const cTehai = tehai.get(loginPubkey) ?? ''}
  {@const cTsumohai = tsumohai.get(loginPubkey) ?? ''}
  sutehai?
  {#each getAnkanHai(addHai(cTehai, cTsumohai)) as h}
    <br /><button
      on:click={() => {
        setSutehai('ankan');
        sendDapai(h);
      }}>ankan</button
    ><Pai pai={h} isDora={doras.includes(h)} hide={false} />
  {/each}
  {#each getKakanHai(addHai(cTehai, cTsumohai)) as h}
    <br /><button
      on:click={() => {
        setSutehai('kakan');
        sendDapai(h);
      }}>kakan</button
    ><Pai pai={h} isDora={doras.includes(h)} hide={false} />
  {/each}
  {#if canRichi(cTehai, cTsumohai, isRichi, nokori)}
    <br /><button
      disabled={sutehaiCommand === 'richi'}
      on:click={() => {
        setSutehai('richi');
      }}>richi</button
    >
  {/if}
  {#if canTsumo(cTehai, cTsumohai)}
    <br /><button
      on:click={() => {
        setSutehai('tsumo');
        sendDapai('');
      }}>tsumo</button
    >
  {/if}
{/if}
