<script lang="ts">
  import type { RxNostr } from 'rx-nostr';
  import * as nip19 from 'nostr-tools/nip19';
  import {
    mahjongPlayerPubkeys,
    mahjongRoomId,
    mahjongServerPubkey,
  } from '$lib/config';
  import { getNpubWithNIP07, sleep } from '$lib/utils';

  export let rxNostr: RxNostr | undefined;
  export let loginPubkey: string | undefined;
  export let setEnableFastForward: (value: boolean) => void;
  export let setLoginPubkey: (value: string | undefined) => void;

  const sendMention = (
    message: string,
    pubkey: string = mahjongServerPubkey,
  ) => {
    rxNostr?.send({
      kind: 42,
      content: `nostr:${nip19.npubEncode(pubkey)} ${message}`,
      tags: [
        ['e', mahjongRoomId, '', 'root'],
        ['p', pubkey, ''],
      ],
    });
  };

  const gamestartByForce = async () => {
    setEnableFastForward(true);
    sendMention('reset');
    await sleep(200);
    sendMention('gamestart');
    for (let i = 0; i <= 2; i++) {
      await sleep(200);
      sendMention('join', mahjongPlayerPubkeys[i]);
    }
  };
</script>

{#if loginPubkey === undefined}
  <button on:click={() => getNpubWithNIP07(setLoginPubkey)}>NIP-07 Login</button
  >
{:else}
  <button
    on:click={() => {
      setLoginPubkey(undefined);
    }}>Logout</button
  >
  <button
    title="早送り"
    on:click={() => {
      setEnableFastForward(true);
    }}>⏩</button
  >
  {nip19.npubEncode(loginPubkey)}
  <br />
  <button
    on:click={() => {
      sendMention('ping');
    }}>Ping</button
  >
  <button
    on:click={() => {
      sendMention('help');
    }}>Help</button
  >
  <button
    on:click={() => {
      sendMention('reset');
    }}>Reset</button
  >
  <button
    on:click={() => {
      sendMention('gamestart');
    }}>GameStart</button
  >
  <button
    on:click={() => {
      sendMention('join');
    }}>Join</button
  >
  <button
    on:click={() => {
      sendMention('join', mahjongPlayerPubkeys[0]);
    }}>Join rinrin</button
  >
  <button
    on:click={() => {
      sendMention('join', mahjongPlayerPubkeys[1]);
    }}>Join chunchun</button
  >
  <button
    on:click={() => {
      sendMention('join', mahjongPlayerPubkeys[2]);
    }}>Join whanwhan</button
  >
  <button
    on:click={() => {
      sendMention('status');
    }}>Status</button
  >
  <button
    on:click={() => {
      sendMention('next');
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
