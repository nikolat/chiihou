<script lang="ts">
	import type { RxNostr } from 'rx-nostr';
	import type { NostrEvent } from 'nostr-tools/pure';
	import { awayuki_mahjong_emojis, sendChatMessage, zap } from '$lib/utils';
	import { chatHashtag, defaultRelays, getRoboHashURL } from '$lib/config';
	import { stringToArrayPlain } from '$lib/mjlib/mj_common';
	import Pai from '$lib/components/Pai.svelte';

	let {
		bafu,
		kyoku,
		tsumibou,
		kyoutaku,
		nokori,
		dorahyoujihai,
		uradorahyoujihai,
		doras,
		loginPubkey,
		status,
		result,
		chatEvents,
		chatMembers,
		rxNostr,
		mahjongChannelId,
		mahjongServerPubkey,
		isGameEnd
	}: {
		bafu: string | undefined;
		kyoku: number | undefined;
		tsumibou: number | undefined;
		kyoutaku: number | undefined;
		nokori: number | undefined;
		dorahyoujihai: string | undefined;
		uradorahyoujihai: string | undefined;
		doras: string[];
		loginPubkey: string | undefined;
		status: string | undefined;
		result: string | undefined;
		chatEvents: NostrEvent[];
		chatMembers: Map<string, NostrEvent>;
		rxNostr: RxNostr | undefined;
		mahjongChannelId: string;
		mahjongServerPubkey: string;
		isGameEnd: boolean;
	} = $props();

	let inputText: string = $state('');
</script>

<div class="info base">
	{bafu ?? '?'}{kyoku ?? 0}局
	<img src={awayuki_mahjong_emojis.mahjong_stick100} alt="積み棒" class="pai" />x{tsumibou ?? 0}
	<img src={awayuki_mahjong_emojis.mahjong_stick1000} alt="供託" class="pai" />x{kyoutaku ===
	undefined
		? 0
		: kyoutaku / 1000} 残り{nokori ?? 0}枚
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
	status: {status || '空席'}<br />{result ?? ''}
	{#if isGameEnd}
		<br />
		<button
			class="zap"
			title="Zap!"
			disabled={!loginPubkey}
			onclick={() => zap(mahjongServerPubkey, defaultRelays)}>⚡️</button
		>
	{/if}
</div>
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="info chat"
	onclick={(e) => {
		e.stopPropagation();
	}}
>
	<input
		type="text"
		bind:value={inputText}
		onkeydown={(e) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				sendChatMessage(rxNostr, mahjongChannelId, inputText);
				inputText = '';
			}
		}}
	/>
	<button
		onclick={() => {
			sendChatMessage(rxNostr, mahjongChannelId, inputText);
			inputText = '';
		}}
		disabled={!inputText || !loginPubkey}>Post</button
	>
	<dl>
		{#each chatEvents as event}
			{@const kind0 = chatMembers.get(event.pubkey)}
			{@const profile = JSON.parse(kind0?.content || '{}')}
			<dt>
				<img
					class="player"
					alt={profile.name ?? ''}
					title={profile.name ?? ''}
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
		height: 140px;
		overflow-y: auto;
		border: 1px gray solid;
		float: left;
	}
	.base {
		width: 28%;
	}
	.result {
		width: 25%;
		white-space: pre-wrap;
	}
	.chat {
		width: 45%;
	}
	.chat input {
		width: calc(100% - 5em);
	}
	.chat dl {
		margin: 0;
	}
	.chat dt img {
		height: 16px;
		border-radius: 10%;
	}
	.chat dd {
		white-space: pre-wrap;
	}
</style>
