<script lang="ts">
  import type { RxNostr } from 'rx-nostr';
  import type { NostrEvent } from 'nostr-tools/pure';
  import * as nip19 from 'nostr-tools/nip19';
  import { mahjongChannelIds, mahjongPlayerPubkeys, urlNIP07guide } from '$lib/config';
  import { getNpubWithNIP07, RxReqMode, sendMention, sleep } from '$lib/utils';

  export let rxNostr: RxNostr | undefined;
  export let mahjongChannelId: string;
  export let mahjongServerPubkey: string;
  export let mahjongChannelEvents: Map<string, NostrEvent | undefined>;
  export let loginPubkey: string | undefined;
  export let status: string | undefined;
  export let isStoppedReplay: boolean;
  export let setMahjongChannelId: (value: string) => void;
  export let setIsStoppedReplay: (value: boolean) => void;
  export let setSleepInterval: (value: number) => void;
  export let setLoginPubkey: (value: string | undefined) => void;
  export let replay: (events: NostrEvent[], mode: RxReqMode) => Promise<void>;
  export let refetch: () => Promise<void>;
  export let events: NostrEvent[];
  export let last_created_at: number;

  let selectedChannelId: string;

  const gamestartByForce = async () => {
    setSleepInterval(0);
    sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'reset', last_created_at);
    await sleep(500);
    sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'gamestart', last_created_at);
    for (let i = 0; i <= 2; i++) {
      await sleep(500);
      sendMention(rxNostr, mahjongChannelId, mahjongPlayerPubkeys[i], 'join', last_created_at);
    }
  };
</script>

{#if loginPubkey === undefined}
  <button
    on:click={() => {
      if (window.nostr === undefined) {
        window.location.href = urlNIP07guide;
      } else {
        getNpubWithNIP07(setLoginPubkey);
      }
    }}>NIP-07 Login</button
  >
{:else}
  <button
    on:click={() => {
      setLoginPubkey(undefined);
    }}>Logout</button
  >
  {nip19.npubEncode(loginPubkey)}
{/if}
<br />
<select
  id="select-channel"
  bind:value={selectedChannelId}
  on:change={() => {
    setMahjongChannelId(selectedChannelId);
    refetch();
  }}
>
  {#each mahjongChannelIds as id}
    {@const ev = mahjongChannelEvents.get(id)}
    {@const obj = JSON.parse(ev?.content ?? '{}')}
    {@const name = obj.name}
    <option value={id}>{name ?? id}</option>
  {/each}
</select>
<button
  title="最初から"
  on:click={async () => {
    setIsStoppedReplay(false);
    setSleepInterval(0);
    await sleep(500);
    setSleepInterval(500);
    await replay(events.toReversed(), RxReqMode.Backward);
  }}>⏮</button
>
<button
  title={isStoppedReplay ? '再生' : '一時停止'}
  on:click={() => {
    setIsStoppedReplay(!isStoppedReplay);
    setSleepInterval(500);
  }}>{isStoppedReplay ? '▶️' : '⏸️'}</button
>
<button
  title="早送り"
  on:click={() => {
    setIsStoppedReplay(false);
    setSleepInterval(100);
  }}>⏩</button
>
<button
  title="結果を見る"
  on:click={() => {
    setIsStoppedReplay(false);
    setSleepInterval(0);
  }}>⏭️</button
>
{#if loginPubkey !== undefined}
  <br />
  <button
    disabled={!status}
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'reset', last_created_at);
    }}>Reset</button
  >
  <button
    disabled={!!status}
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'gamestart', last_created_at);
    }}>GameStart</button
  >
  <button
    disabled={!status?.startsWith('募集中')}
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'join', last_created_at);
    }}>Join</button
  >
  <button
    disabled={!status?.startsWith('募集中')}
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongPlayerPubkeys[0], 'join', last_created_at);
    }}>Join rinrin</button
  >
  <button
    disabled={!status?.startsWith('募集中')}
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongPlayerPubkeys[1], 'join', last_created_at);
    }}>Join chunchun</button
  >
  <button
    disabled={!status?.startsWith('募集中')}
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongPlayerPubkeys[2], 'join', last_created_at);
    }}>Join whanwhan</button
  >
  <button
    disabled={status !== '対局中'}
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'status', last_created_at);
    }}>Status</button
  >
  <button
    disabled={status !== 'next待ち'}
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'next', last_created_at);
    }}>Next</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'ping', last_created_at);
    }}>Ping</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'help', last_created_at);
    }}>Help</button
  >
  <br />
  <button on:click={gamestartByForce}
    >GameStart With <img class="player" src="https://nikolat.github.io/avatar/rinrin.png" alt="rinrin" />
    <img class="player" src="https://nikolat.github.io/avatar/chunchun.png" alt="chunchun" />
    <img class="player" src="https://nikolat.github.io/avatar/whanwhan.png" alt="whanwhan" />
  </button>
{/if}

<style>
  .player {
    height: 64px;
  }
  #select-channel {
    width: 10em;
  }
</style>
