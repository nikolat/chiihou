<script lang="ts">
  import { mahjongServerPubkey } from '$lib/config';
  import { canRichi, getChiMaterial } from '$lib/mjlib/mj_ai';
  import { canAnkan, canKakan, canTsumo, getTagsReply } from '$lib/utils';
  import { nip19, type NostrEvent } from 'nostr-tools';
  import type { RxNostr } from 'rx-nostr';
  import Pai from '$lib/components/Pai.svelte';

  export let isNakuTurn: boolean;
  export let lastEventsToReply: NostrEvent[] | undefined;
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
  export let isRichi: Map<string, boolean>;
  export let sendDapai: (pai: string) => void;

  const sendReply = (message: string) => {
    if (lastEventsToReply === undefined) return;
    rxNostr.send({
      kind: 42,
      content: `nostr:${nip19.npubEncode(mahjongServerPubkey)} naku? ${message}`,
      tags: getTagsReply(
        lastEventsToReply.find((ev) =>
          ev.tags.some(
            (tag) =>
              tag.length >= 2 && tag[0] === 'p' && tag[1] === loginPubkey,
          ),
        )!,
      ),
    });
  };
</script>

{#if isNakuTurn}
  naku?
  <button
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
  sutehai?
  {#if canAnkan(tehai.get(loginPubkey) ?? '', tsumohai.get(loginPubkey) ?? '', nokori) || canKakan(tehai.get(loginPubkey) ?? '', tsumohai.get(loginPubkey) ?? '', nokori)}
    <br /><button
      disabled={['ankan', 'kakan'].includes(sutehaiCommand)}
      on:click={() => {
        if (loginPubkey === undefined) return;
        if (
          canAnkan(
            tehai.get(loginPubkey) ?? '',
            tsumohai.get(loginPubkey) ?? '',
            nokori,
          )
        ) {
          setSutehai('ankan');
        } else if (
          canKakan(
            tehai.get(loginPubkey) ?? '',
            tsumohai.get(loginPubkey) ?? '',
            nokori,
          )
        ) {
          setSutehai('kakan');
        }
      }}>kan</button
    >
  {/if}
  {#if canRichi(tehai.get(loginPubkey) ?? '', tsumohai.get(loginPubkey) ?? '', isRichi.get(loginPubkey) ?? false, nokori)}
    <br /><button
      disabled={sutehaiCommand === 'richi'}
      on:click={() => {
        setSutehai('richi');
      }}>richi</button
    >
  {/if}
  {#if canTsumo(tehai.get(loginPubkey) ?? '', tsumohai.get(loginPubkey) ?? '')}
    <br /><button
      on:click={() => {
        setSutehai('tsumo');
        sendDapai('');
      }}>tsumo</button
    >
  {/if}
{/if}
