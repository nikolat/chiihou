<script lang="ts">
  import type { RxNostr } from 'rx-nostr';
  import type { NostrEvent } from 'nostr-tools/pure';
  import * as nip19 from 'nostr-tools/nip19';
  import { mahjongPlayerPubkeys, urlNIP07guide } from '$lib/config';
  import { getNpubWithNIP07, RxReqMode, sendMention, sleep } from '$lib/utils';

  export let rxNostr: RxNostr | undefined;
  export let loginPubkey: string | undefined;
  export let isStoppedReplay: boolean;
  export let setIsStoppedReplay: (value: boolean) => void;
  export let setSleepInterval: (value: number) => void;
  export let setLoginPubkey: (value: string | undefined) => void;
  export let replay: (events: NostrEvent[], mode: RxReqMode) => Promise<void>;
  export let events: NostrEvent[];

  const gamestartByForce = async () => {
    setSleepInterval(0);
    sendMention(rxNostr, 'reset');
    await sleep(500);
    sendMention(rxNostr, 'gamestart');
    for (let i = 0; i <= 2; i++) {
      await sleep(500);
      sendMention(rxNostr, 'join', mahjongPlayerPubkeys[i]);
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
  <button
    on:click={() => {
      sendMention(rxNostr, 'ping');
    }}>Ping</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'help');
    }}>Help</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'reset');
    }}>Reset</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'gamestart');
    }}>GameStart</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'join');
    }}>Join</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'join', mahjongPlayerPubkeys[0]);
    }}>Join rinrin</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'join', mahjongPlayerPubkeys[1]);
    }}>Join chunchun</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'join', mahjongPlayerPubkeys[2]);
    }}>Join whanwhan</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'status');
    }}>Status</button
  >
  <button
    on:click={() => {
      sendMention(rxNostr, 'next');
    }}>Next</button
  >
  <br />
  <button on:click={gamestartByForce}
    >GameStart With <img
      class="player"
      src="https://nikolat.github.io/avatar/rinrin.png"
      alt="rinrin"
    />
    <img
      class="player"
      src="https://nikolat.github.io/avatar/chunchun.png"
      alt="chunchun"
    />
    <img
      class="player"
      src="https://nikolat.github.io/avatar/whanwhan.png"
      alt="whanwhan"
    />
  </button>
{/if}

<style>
  .player {
    height: 64px;
  }
</style>
