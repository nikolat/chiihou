<script lang="ts">
	import type { RxNostr } from 'rx-nostr';
	import type { NostrEvent } from 'nostr-tools/pure';
	import * as nip19 from 'nostr-tools/nip19';
	import { canTsumo, getAnkanHai, getTagsReply, sendMention } from '$lib/utils';
	import { addHai } from '$lib/mjlib/mj_common';
	import { canRichi, getChiMaterial, getKakanHai } from '$lib/mjlib/mj_ai';
	import Pai from '$lib/components/Pai.svelte';

	let {
		requestedCommand,
		lastEventsToReply,
		last_created_at,
		rxNostr,
		mahjongChannelId,
		mahjongServerPubkey,
		mahjongKind,
		geohash,
		loginPubkey,
		status,
		nakuKinds,
		tehai,
		sutehaiSaved,
		doras,
		isSutehaiTurn,
		sutehaiCommand,
		tsumohai,
		nokori,
		setSutehai,
		isRichi,
		callSendDapai,
		isKyokuEnd,
		isGameEnd
	}: {
		requestedCommand: string | undefined;
		lastEventsToReply: Map<string, NostrEvent>;
		last_created_at: number;
		rxNostr: RxNostr | undefined;
		mahjongChannelId: string;
		mahjongServerPubkey: string;
		mahjongKind: number;
		geohash: string;
		loginPubkey: string;
		status: string | undefined;
		nakuKinds: Map<string, string[] | undefined>;
		tehai: Map<string, string>;
		sutehaiSaved: string;
		doras: string[];
		isSutehaiTurn: boolean;
		sutehaiCommand: string;
		tsumohai: Map<string, string>;
		nokori: number | undefined;
		setSutehai: (value: string) => void;
		isRichi: boolean;
		callSendDapai: (pai: string | undefined) => void;
		isKyokuEnd: boolean;
		isGameEnd: boolean;
	} = $props();

	const sendReply = (message: string) => {
		const ev = lastEventsToReply.get(loginPubkey);
		if (ev === undefined) return;
		const now = Math.floor(Date.now() / 1000);
		const tags = getTagsReply(ev);
		const event = {
			kind: mahjongKind,
			content: `nostr:${nip19.npubEncode(ev.pubkey)} naku? ${message}`,
			tags,
			created_at: ev.created_at < now ? now : ev.created_at + 1
		};
		rxNostr?.send(event);
	};

	const isNakuTurn = $derived(
		loginPubkey !== undefined && lastEventsToReply.has(loginPubkey) && requestedCommand === 'naku?'
	);
</script>

{#if isNakuTurn}
	naku?
	<br /><button
		disabled={status !== '対局中'}
		onclick={() => {
			sendReply('no');
		}}>no</button
	>
	{#if nakuKinds.get(loginPubkey)?.includes('pon')}
		<br /><button
			disabled={status !== '対局中'}
			onclick={() => {
				sendReply('pon');
			}}>pon</button
		>
	{/if}
	{#if nakuKinds.get(loginPubkey)?.includes('chi')}
		{#each getChiMaterial(tehai.get(loginPubkey) ?? '', sutehaiSaved) as cm (cm)}
			{@const pai1 = cm.slice(0, 2)}
			{@const pai2 = cm.slice(2, 4)}
			<br /><button
				disabled={status !== '対局中'}
				onclick={() => {
					sendReply(`chi ${pai1} ${pai2}`);
				}}>chi</button
			><Pai
				pai={pai1}
				isDora={doras.includes(pai1)}
				isRemoved={false}
				isNaku={false}
				isAtari={false}
				isHidden={false}
				isRotated={false}
				isKakan={false}
				isSkipped={false}
			/><Pai
				pai={pai2}
				isDora={doras.includes(pai2)}
				isRemoved={false}
				isNaku={false}
				isAtari={false}
				isHidden={false}
				isRotated={false}
				isKakan={false}
				isSkipped={false}
			/>
		{/each}
	{/if}
	{#if nakuKinds.get(loginPubkey)?.includes('kan')}
		<br /><button
			disabled={status !== '対局中'}
			onclick={() => {
				sendReply('kan');
			}}>kan</button
		>
	{/if}
	{#if nakuKinds.get(loginPubkey)?.includes('ron')}
		<br /><button
			disabled={status !== '対局中'}
			onclick={() => {
				sendReply('ron');
			}}>ron</button
		>
	{/if}
{/if}
{#if isSutehaiTurn}
	{@const cTehai = tehai.get(loginPubkey) ?? ''}
	{@const cTsumohai = tsumohai.get(loginPubkey) ?? ''}
	sutehai?
	{#each getAnkanHai(addHai(cTehai, cTsumohai)) as h (h)}
		<br /><button
			disabled={status !== '対局中'}
			onclick={() => {
				setSutehai('ankan');
				callSendDapai(h);
			}}>ankan</button
		><Pai
			pai={h}
			isDora={doras.includes(h)}
			isRemoved={false}
			isNaku={false}
			isAtari={false}
			isHidden={false}
			isRotated={false}
			isKakan={false}
			isSkipped={false}
		/>
	{/each}
	{#each getKakanHai(addHai(cTehai, cTsumohai)) as h (h)}
		<br /><button
			disabled={status !== '対局中'}
			onclick={() => {
				setSutehai('kakan');
				callSendDapai(h);
			}}>kakan</button
		><Pai
			pai={h}
			isDora={doras.includes(h)}
			isRemoved={false}
			isNaku={false}
			isAtari={false}
			isHidden={false}
			isRotated={false}
			isKakan={false}
			isSkipped={false}
		/>
	{/each}
	{#if nokori !== undefined && canRichi(cTehai, cTsumohai, isRichi, nokori)}
		<br /><button
			disabled={status !== '対局中' || sutehaiCommand === 'richi'}
			onclick={() => {
				setSutehai('richi');
			}}>richi</button
		>
	{/if}
	{#if canTsumo(cTehai, cTsumohai)}
		<br /><button
			onclick={() => {
				setSutehai('tsumo');
				callSendDapai('');
			}}>tsumo</button
		>
	{/if}
{/if}
{#if isKyokuEnd && !isGameEnd}
	<button
		disabled={status !== 'next待ち'}
		onclick={() => {
			sendMention(
				rxNostr,
				mahjongChannelId,
				mahjongKind,
				geohash,
				mahjongServerPubkey,
				'next',
				last_created_at
			);
		}}>Next</button
	>
{/if}
