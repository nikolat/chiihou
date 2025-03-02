<script lang="ts">
	import type { RxNostr } from 'rx-nostr';
	import type { NostrEvent } from 'nostr-tools/pure';
	import * as nip19 from 'nostr-tools/nip19';
	import { mahjongChannelIds, mahjongPlayerPubkeys } from '$lib/config';
	import { RxReqMode, sendMention, sleep } from '$lib/utils';

	let {
		rxNostr,
		mahjongChannelId,
		mahjongServerPubkey,
		mahjongChannelEvents,
		loginPubkey,
		status,
		isStoppedReplay,
		setMahjongChannelId,
		setIsStoppedReplay,
		setSleepInterval,
		replay,
		refetch,
		events,
		last_created_at
	}: {
		rxNostr: RxNostr | undefined;
		mahjongChannelId: string;
		mahjongServerPubkey: string;
		mahjongChannelEvents: Map<string, NostrEvent | undefined>;
		loginPubkey: string | undefined;
		status: string | undefined;
		isStoppedReplay: boolean;
		setMahjongChannelId: (value: string) => void;
		setIsStoppedReplay: (value: boolean) => void;
		setSleepInterval: (value: number) => void;
		replay: (events: NostrEvent[], mode: RxReqMode) => Promise<void>;
		refetch: () => Promise<void>;
		events: NostrEvent[];
		last_created_at: number;
	} = $props();

	let selectedChannelId: string | undefined = $state();

	const gamestartByForce = async () => {
		setSleepInterval(0);
		sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'reset', last_created_at);
		await sleep(1000);
		sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'gamestart', last_created_at);
		for (let i = 0; i <= 2; i++) {
			await sleep(1000);
			sendMention(rxNostr, mahjongChannelId, mahjongPlayerPubkeys[i], 'join', last_created_at);
		}
	};
</script>

{#if loginPubkey === undefined}
	<button
		onclick={() => {
			document.dispatchEvent(new CustomEvent('nlLaunch', { detail: '' }));
		}}>Nostr Login</button
	>
{:else}
	<button
		onclick={() => {
			document.dispatchEvent(new Event('nlLogout'));
		}}>Logout</button
	>
	{nip19.npubEncode(loginPubkey)}
{/if}
<br />
<select
	id="select-channel"
	bind:value={selectedChannelId}
	onchange={() => {
		if (selectedChannelId !== undefined) {
			setMahjongChannelId(selectedChannelId);
			refetch();
		}
	}}
>
	{#each mahjongChannelIds as id (id)}
		{@const ev = mahjongChannelEvents.get(id)}
		{@const obj = JSON.parse(ev?.content ?? '{}')}
		{@const name = obj.name}
		<option value={id}>{name ?? id}</option>
	{/each}
</select>
<button
	title="最初から"
	onclick={async () => {
		setIsStoppedReplay(false);
		setSleepInterval(0);
		await sleep(500);
		setSleepInterval(500);
		await replay(events.toReversed(), RxReqMode.Backward);
	}}>⏮</button
>
<button
	title={isStoppedReplay ? '再生' : '一時停止'}
	onclick={() => {
		setIsStoppedReplay(!isStoppedReplay);
		setSleepInterval(500);
	}}>{isStoppedReplay ? '▶️' : '⏸️'}</button
>
<button
	title="早送り"
	onclick={() => {
		setIsStoppedReplay(false);
		setSleepInterval(100);
	}}>⏩</button
>
<button
	title="結果を見る"
	onclick={() => {
		setIsStoppedReplay(false);
		setSleepInterval(0);
	}}>⏭️</button
>
{#if loginPubkey !== undefined}
	<br />
	<button
		disabled={!status}
		onclick={() => {
			sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'reset', last_created_at);
		}}>Reset</button
	>
	<button
		disabled={!!status}
		onclick={() => {
			sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'gamestart', last_created_at);
		}}>GameStart</button
	>
	<button
		disabled={!status?.startsWith('募集中')}
		onclick={() => {
			sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'join', last_created_at);
		}}>Join</button
	>
	<button
		disabled={!status?.startsWith('募集中')}
		onclick={() => {
			sendMention(rxNostr, mahjongChannelId, mahjongPlayerPubkeys[0], 'join', last_created_at);
		}}>Join rinrin</button
	>
	<button
		disabled={!status?.startsWith('募集中')}
		onclick={() => {
			sendMention(rxNostr, mahjongChannelId, mahjongPlayerPubkeys[1], 'join', last_created_at);
		}}>Join chunchun</button
	>
	<button
		disabled={!status?.startsWith('募集中')}
		onclick={() => {
			sendMention(rxNostr, mahjongChannelId, mahjongPlayerPubkeys[2], 'join', last_created_at);
		}}>Join whanwhan</button
	>
	<button
		disabled={status !== 'next待ち'}
		onclick={() => {
			sendMention(rxNostr, mahjongChannelId, mahjongServerPubkey, 'next', last_created_at);
		}}>Next</button
	>
	<br />
	<button onclick={gamestartByForce}
		>GameStart With <img
			class="player"
			src="https://nikolat.github.io/avatar/rinrin.png"
			alt="rinrin"
		/>
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
