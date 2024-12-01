<script lang="ts">
	import type { RxNostr } from 'rx-nostr';
	import type { NostrEvent } from 'nostr-tools/pure';
	import { defaultRelays, getRoboHashURL } from '$lib/config';
	import { zap } from '$lib/utils';
	import {
		addHai,
		removeHai,
		stringToArrayPlain,
		stringToArrayWithFuro
	} from '$lib/mjlib/mj_common';
	import { getShanten } from '$lib/mjlib/mj_shanten';
	import Command from '$lib/components/Command.svelte';
	import Pai from '$lib/components/Pai.svelte';

	let {
		key,
		value,
		sekijun,
		tehai,
		sutehai,
		lastEventsToReply,
		last_created_at,
		requestedCommand,
		kaze,
		points,
		pointDiff,
		rxNostr,
		mahjongChannelId,
		mahjongServerPubkey,
		loginPubkey,
		status,
		nakuKinds,
		sutehaiSaved,
		doras,
		sutehaiCommand,
		tsumohai,
		nokori,
		setSutehai,
		richiJunme,
		callSendDapai,
		say,
		pubkeysToOpenTehai,
		furoJunme,
		furoHistory,
		kakanHistory,
		sutehaiPlayerSaved,
		isAgariPlayer,
		isFurikomiPlayer,
		isKyokuEnd,
		isGameEnd
	}: {
		key: string;
		value: NostrEvent | undefined;
		sekijun: string[];
		tehai: Map<string, string>;
		sutehai: Map<string, string>;
		lastEventsToReply: Map<string, NostrEvent>;
		last_created_at: number;
		requestedCommand: string | undefined;
		kaze: Map<string, string>;
		points: Map<string, number>;
		pointDiff: Map<string, string>;
		rxNostr: RxNostr | undefined;
		mahjongChannelId: string;
		mahjongServerPubkey: string;
		loginPubkey: string | undefined;
		status: string | undefined;
		nakuKinds: Map<string, string[] | undefined>;
		sutehaiSaved: string;
		doras: string[];
		sutehaiCommand: string;
		tsumohai: Map<string, string>;
		nokori: number | undefined;
		setSutehai: (value: string) => void;
		richiJunme: Map<string, number>;
		callSendDapai: (pai: string | undefined) => void;
		say: Map<string, string>;
		pubkeysToOpenTehai: Set<string>;
		furoJunme: Map<string, number[]>;
		furoHistory: Map<string, [{ sutehai: string; pubkey: string }]>;
		kakanHistory: Map<string, string[]>;
		sutehaiPlayerSaved: string;
		isAgariPlayer: boolean;
		isFurikomiPlayer: boolean;
		isKyokuEnd: boolean;
		isGameEnd: boolean;
	} = $props();

	const getSekijunIndex = (pubkey: string): number => {
		const selfIndex = sekijun.indexOf(key);
		const otherIndex = sekijun.indexOf(pubkey);
		return (selfIndex - otherIndex - 1 + 4) % 4;
	};

	const selectDapai = (
		event: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		}
	) => {
		for (const e of document.querySelectorAll<HTMLButtonElement>('button.selectable')) {
			e.classList.remove('selectable');
			e.disabled = true;
		}
		event.currentTarget.classList.remove('exist');
	};

	const profile = $derived(JSON.parse(value?.content || '{}'));
	const paigazouTehai = $derived(stringToArrayWithFuro(tehai.get(key) ?? ''));
	const paigazouSutehai = $derived(stringToArrayPlain(sutehai.get(key) ?? ''));
	const isSutehaiTurn = $derived(
		loginPubkey !== undefined &&
			lastEventsToReply.has(loginPubkey) &&
			requestedCommand === 'sutehai?'
	);
	const isRichi = $derived((richiJunme.get(loginPubkey ?? '') ?? -1) >= 0);
</script>

<dt
	class={'player' +
		(lastEventsToReply.has(key) && requestedCommand === 'sutehai?' ? ' sutehai_turn' : '') +
		(lastEventsToReply.has(key) &&
		requestedCommand === 'naku?' &&
		(loginPubkey === undefined || (loginPubkey !== undefined && loginPubkey === key))
			? ' naku_turn'
			: '') +
		(isAgariPlayer ? ' is_agari' : '') +
		(isFurikomiPlayer ? ' is_furikomi' : '')}
>
	{kaze.get(key) ?? '?'}家
	{profile.display_name ?? ''} @{profile.name ?? ''}
	<br />
	<button
		class="zap"
		title="Zap!"
		disabled={!(profile.lud06 || profile.lud16) || !loginPubkey}
		onclick={() => zap(key, defaultRelays)}>⚡️</button
	>
	{points.get(key) ?? 0}点 {pointDiff.get(key) ?? ''}
	<br /><img
		class="player"
		alt={profile.name ?? ''}
		title={profile.name ?? ''}
		src={profile.picture ?? getRoboHashURL(key)}
	/>
	<div class="command">
		{#if loginPubkey !== undefined && loginPubkey === key}<Command
				{requestedCommand}
				{lastEventsToReply}
				{last_created_at}
				{rxNostr}
				{mahjongChannelId}
				{mahjongServerPubkey}
				{loginPubkey}
				{status}
				{nakuKinds}
				{tehai}
				{sutehaiSaved}
				{doras}
				{isSutehaiTurn}
				{sutehaiCommand}
				{tsumohai}
				{nokori}
				{setSutehai}
				{isRichi}
				{callSendDapai}
				{isKyokuEnd}
				{isGameEnd}
			/>{/if}
		<br />
		{say.get(key) ? `＜ [${say.get(key)}]` : ''}
	</div>
</dt>
<dd>
	<div class="tehai">
		{#each paigazouTehai?.at(0) ?? [] as pai}
			{#if isSutehaiTurn && loginPubkey === key}
				<button
					class={'dapai exist' + (isRichi ? '' : ' selectable')}
					disabled={(sutehaiCommand === 'richi' &&
						getShanten(removeHai(addHai(tehai.get(key) ?? '', tsumohai.get(key) ?? ''), pai))[0] >
							0) ||
						isRichi}
					onclick={(event) => {
						selectDapai(event);
						callSendDapai(pai);
					}}
					><Pai
						{pai}
						isDora={doras.includes(pai)}
						isRemoved={false}
						isNaku={false}
						isAtari={false}
						isHidden={loginPubkey !== undefined &&
							loginPubkey !== key &&
							!pubkeysToOpenTehai.has(key)}
						isRotated={false}
						isKakan={false}
						isSkipped={false}
					/></button
				>
			{:else}
				<Pai
					{pai}
					isDora={doras.includes(pai)}
					isRemoved={false}
					isNaku={false}
					isAtari={false}
					isHidden={loginPubkey !== undefined &&
						loginPubkey !== key &&
						!pubkeysToOpenTehai.has(key)}
					isRotated={false}
					isKakan={false}
					isSkipped={false}
				/>
			{/if}
		{/each}
		{#each paigazouTehai?.at(1) ?? [] as pai, index}
			{@const sutehai = furoHistory.get(key)?.at(index)?.sutehai ?? ''}
			{@const sutehaiPlayer = furoHistory.get(key)?.at(index)?.pubkey ?? ''}
			{@const pa = stringToArrayPlain(pai)}
			{@const paWithoutSutehai = stringToArrayPlain(pai.replace(sutehai, ''))}
			{@const sutehaiPlayerIndex = getSekijunIndex(sutehaiPlayer)}
			{@const isKakan = kakanHistory.get(key)?.includes(sutehai) ?? false}
			{#each pa as p, i}
				{@const pai =
					i === sutehaiPlayerIndex ? sutehai : i < sutehaiPlayerIndex ? p : paWithoutSutehai[i - 1]}
				<Pai
					{pai}
					isDora={doras.includes(pai)}
					isRemoved={false}
					isNaku={false}
					isAtari={false}
					isHidden={false}
					isRotated={pa.length === 3 || i <= 1
						? i === sutehaiPlayerIndex
						: (i === 3 && sutehaiPlayerIndex === 2) ||
							(i === 2 && sutehaiPlayerIndex === 2 && isKakan)}
					isKakan={i === sutehaiPlayerIndex && isKakan}
					isSkipped={i - 1 === sutehaiPlayerIndex && isKakan}
				/>
			{/each}
		{/each}
		{#each paigazouTehai?.at(2) ?? [] as pai}
			{@const pa = stringToArrayPlain(pai)}
			{#each pa as p, i}
				<Pai
					pai={p}
					isDora={doras.includes(p)}
					isRemoved={false}
					isNaku={false}
					isAtari={false}
					isHidden={[0, 3].includes(i)}
					isRotated={false}
					isKakan={false}
					isSkipped={false}
				/>
			{/each}
		{/each}
		{#if tsumohai.get(key)?.length ?? 0 > 0}
			{#if isSutehaiTurn && loginPubkey === key}
				<button
					class="dapai exist selectable"
					disabled={sutehaiCommand === 'richi' &&
						getShanten(
							removeHai(
								addHai(tehai.get(key) ?? '', tsumohai.get(key) ?? ''),
								tsumohai.get(key) ?? ''
							)
						)[0] > 0}
					onclick={(event) => {
						selectDapai(event);
						callSendDapai(tsumohai.get(key));
					}}
					><Pai
						pai={tsumohai.get(key) ?? ''}
						isDora={doras.includes(tsumohai.get(key) ?? '')}
						isRemoved={false}
						isNaku={false}
						isAtari={false}
						isHidden={loginPubkey !== undefined &&
							loginPubkey !== key &&
							!pubkeysToOpenTehai.has(key)}
						isRotated={false}
						isKakan={false}
						isSkipped={false}
					/></button
				>
			{:else}
				<Pai
					pai={tsumohai.get(key) ?? ''}
					isDora={doras.includes(tsumohai.get(key) ?? '')}
					isRemoved={false}
					isNaku={false}
					isAtari={false}
					isHidden={loginPubkey !== undefined &&
						loginPubkey !== key &&
						!pubkeysToOpenTehai.has(key)}
					isRotated={false}
					isKakan={false}
					isSkipped={false}
				/>
			{/if}
		{/if}
	</div>
	<br />
	<div class="kawa">
		{#each paigazouSutehai as p, i}
			{#if [6, 12].includes(i)}<br />{/if}<Pai
				pai={p}
				isDora={doras.includes(p)}
				isRemoved={furoJunme.get(key)?.includes(i) ?? false}
				isNaku={requestedCommand === 'naku?' &&
					sutehaiPlayerSaved === key &&
					i === paigazouSutehai.length - 1 &&
					(loginPubkey === undefined ||
						(loginPubkey !== undefined && lastEventsToReply.has(loginPubkey)))}
				isAtari={Array.from(say.values()).some((s) => s === 'ron') &&
					sutehaiPlayerSaved === key &&
					i === paigazouSutehai.length - 1}
				isHidden={false}
				isRotated={richiJunme.get(key) === i}
				isKakan={false}
				isSkipped={false}
			/>{/each}
	</div>
</dd>

<style>
	dt {
		height: 135px;
		width: 15em;
		overflow-y: auto;
	}
	dt.sutehai_turn {
		box-shadow: 1px 1px 5px 1px purple;
	}
	dt.naku_turn {
		box-shadow: 1px 1px 5px 1px green;
	}
	dt.is_agari {
		box-shadow: 1px 1px 5px 1px orange;
	}
	dt.is_furikomi {
		box-shadow: 1px 1px 5px 1px red;
	}
	dt img.player {
		height: 64px;
		border-radius: 10%;
		float: left;
	}
	dt div.command {
		margin-left: 64px;
	}
	dd {
		height: 135px;
	}
	dd div.tehai {
		display: inline-block;
	}
	dd div.kawa {
		display: inline-block;
		line-height: 66%;
	}
	button.dapai {
		background-color: transparent;
		border: none;
		outline: none;
		padding: 0;
		height: 30px;
		cursor: pointer;
	}
	button.dapai.selectable:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	button.dapai:not(.exist):disabled {
		cursor: default;
		opacity: 0;
	}
	.tehai button.dapai.exist:not(.selectable):disabled {
		cursor: default;
		opacity: 1;
	}
	@media all and (min-width: 480px) {
		dt {
			float: left;
			clear: both;
		}
		dd {
			margin-inline-start: 16em;
		}
	}
</style>
