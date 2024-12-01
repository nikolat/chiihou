<script lang="ts">
	import { createRxNostr, type RxNostr } from 'rx-nostr';
	import { verifier } from 'rx-nostr-crypto';
	import { Subscription } from 'rxjs';
	import type { NostrEvent } from 'nostr-tools/pure';
	import * as nip19 from 'nostr-tools/nip19';
	import { onMount } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { defaultRelays, linkGitHub, mahjongChannelIds, mahjongServerPubkeys } from '$lib/config';
	import {
		canAnkan,
		canTsumo,
		fetchEventsOfChannel,
		fetchEventsToReplay,
		fetchProfiles,
		RxReqMode,
		sendDapai,
		setAnkan,
		setFuro,
		setKakan,
		sleep,
		zap
	} from '$lib/utils';
	import {
		addHai,
		getDoraFromDorahyouji,
		removeHai,
		stringToArrayPlain
	} from '$lib/mjlib/mj_common';
	import Menu from '$lib/components/Menu.svelte';
	import Info from '$lib/components/Info.svelte';
	import Player from '$lib/components/Player.svelte';

	const mahjongServerPubkey = mahjongServerPubkeys.at(0)!;
	let mahjongChannelId: string = $state('');
	let mahjongChannelEvents: SvelteMap<string, NostrEvent | undefined> = $state(
		new SvelteMap<string, NostrEvent | undefined>()
	);
	let events: NostrEvent[] = $state([]);
	let chatEvents: NostrEvent[] = $state([]);
	let status: SvelteMap<string, NostrEvent | undefined> = $state(
		new SvelteMap<string, NostrEvent | undefined>()
	);
	let players: SvelteMap<string, NostrEvent | undefined> = $state(
		new SvelteMap<string, NostrEvent | undefined>()
	);
	let chatMembers: SvelteMap<string, NostrEvent> = $state(new SvelteMap<string, NostrEvent>());
	let sekijun: string[] = $state([]);
	let kaze: SvelteMap<string, string> = $state(new SvelteMap<string, string>());
	let points: SvelteMap<string, number> = $state(new SvelteMap<string, number>());
	let pointDiff: SvelteMap<string, string> = $state(new SvelteMap<string, string>());
	let tehai: SvelteMap<string, string> = $state(new SvelteMap<string, string>());
	let tsumohai: SvelteMap<string, string> = $state(new SvelteMap<string, string>());
	let sutehai: SvelteMap<string, string> = $state(new SvelteMap<string, string>());
	let say: SvelteMap<string, string> = $state(new SvelteMap<string, string>());
	let richiJunme: SvelteMap<string, number> = $state(new SvelteMap<string, number>());
	let furoJunme: SvelteMap<string, number[]> = $state(new SvelteMap<string, number[]>());
	let furoHistory: SvelteMap<string, [{ sutehai: string; pubkey: string }]> = $state(
		new SvelteMap<string, [{ sutehai: string; pubkey: string }]>()
	);
	let kakanHistory: SvelteMap<string, string[]> = $state(new SvelteMap<string, string[]>());
	let nakuKinds: SvelteMap<string, string[] | undefined> = $state(
		new SvelteMap<string, string[] | undefined>()
	);
	let bafu: string | undefined = $state();
	let kyoku: number | undefined = $state();
	let tsumibou: number | undefined = $state();
	let kyoutaku: number | undefined = $state();
	let nokori: number | undefined = $state();
	let dorahyoujihai: string | undefined = $state();
	let uradorahyoujihai: string | undefined = $state();
	let result: string | undefined = $state();
	let agariPlayer: string | undefined = $state();
	let furikomiPlayer: string | undefined = $state();
	let pubkeysToOpenTehai: SvelteSet<string> = $state(new SvelteSet<string>());
	let sutehaiSaved: string = $state('');
	let sutehaiPlayerSaved: string = $state('');
	let sutehaiCommand: string = $state('');
	let loginPubkey: string | undefined = $state();
	let lastEventsToReply: SvelteMap<string, NostrEvent> = $state(
		new SvelteMap<string, NostrEvent>()
	);
	let last_created_at: number = $state(0);
	let requestedCommand: string | undefined = $state();
	let rxNostr: RxNostr | undefined = $state();
	const subscriptions: Subscription[] = [];
	const defaultSleepInterval = 500;
	let sleepInterval = defaultSleepInterval;
	let isStoppedReplay: boolean = $state(false);
	let isKyokuEnd: boolean = $state(false);
	let isGameEnd: boolean = $state(false);

	const reset = async () => {
		for (const s of subscriptions) {
			s.unsubscribe();
		}
		subscriptions.length = 0;
		sleepInterval = 0;
		await sleep(defaultSleepInterval);
		events = [];
		chatEvents = [];
		status.clear();
		players.clear();
		chatMembers.clear();
		sekijun = [];
		kaze.clear();
		points.clear();
		pointDiff.clear();
		tehai.clear();
		tsumohai.clear();
		sutehai.clear();
		say.clear();
		richiJunme.clear();
		furoJunme.clear();
		furoHistory.clear();
		kakanHistory.clear();
		nakuKinds.clear();
		bafu = undefined;
		kyoku = undefined;
		tsumibou = undefined;
		kyoutaku = undefined;
		nokori = undefined;
		dorahyoujihai = undefined;
		uradorahyoujihai = undefined;
		result = undefined;
		agariPlayer = undefined;
		furikomiPlayer = undefined;
		pubkeysToOpenTehai.clear();
		sutehaiSaved = '';
		sutehaiPlayerSaved = '';
		sutehaiCommand = '';
		lastEventsToReply.clear();
		last_created_at = 0;
		requestedCommand = undefined;
		isKyokuEnd = false;
		isGameEnd = false;
		isStoppedReplay = false;
		sleepInterval = defaultSleepInterval;
	};

	const pushSubscription = (value: Subscription) => {
		subscriptions.push(value);
	};
	const setMahjongChannelId = (value: string) => {
		mahjongChannelId = value;
	};
	const setMahjongChannelEvents = (value: Map<string, NostrEvent | undefined>) => {
		mahjongChannelEvents.clear();
		for (const [k, v] of value) {
			mahjongChannelEvents.set(k, v);
		}
	};
	const setLoginPubkey = (value: string | undefined) => {
		loginPubkey = value;
	};
	const setSleepInterval = (value: number) => {
		sleepInterval = value;
	};
	const setIsStoppedReplay = (value: boolean) => {
		isStoppedReplay = value;
	};
	const setSutehaiCommand = (value: string) => {
		sutehaiCommand = value;
	};
	const setSutehai = (value: string) => {
		sutehaiCommand = value;
	};
	const setChatMembers = (value: Map<string, NostrEvent>) => {
		chatMembers.clear();
		for (const [k, v] of value) {
			chatMembers.set(k, v);
		}
	};
	const setEvents = (value: NostrEvent[]) => {
		events = value;
	};
	const setChatEvents = (value: NostrEvent[]) => {
		chatEvents = value;
	};
	const setStatus = (value: Map<string, NostrEvent>) => {
		status.clear();
		for (const [k, v] of value) {
			status.set(k, v);
		}
	};
	const callSendDapai = (pai: string | undefined) => {
		if (pai === undefined) return;
		if (loginPubkey === undefined) return;
		const ev = lastEventsToReply.get(loginPubkey);
		if (ev === undefined) return;
		sendDapai(rxNostr, pai, ev, sutehaiCommand, setSutehaiCommand);
	};

	onMount(() => {
		document.addEventListener('nlAuth', (e) => {
			const ce: CustomEvent = e as CustomEvent;
			if (ce.detail.type === 'login' || ce.detail.type === 'signup') {
				setLoginPubkey(ce.detail.pubkey);
			} else {
				setLoginPubkey(undefined);
			}
		});
		rxNostr = createRxNostr({ verifier, eoseTimeout: 2000 });
		rxNostr.setDefaultRelays(defaultRelays);
		mahjongChannelId = mahjongChannelIds.at(0)!;
		fetchEventsOfChannel(rxNostr, mahjongChannelIds, setMahjongChannelEvents);
		refetch();
	});

	const refetch = async (): Promise<void> => {
		await reset();
		fetchEventsToReplay(
			rxNostr!,
			mahjongChannelId,
			mahjongServerPubkey,
			pushSubscription,
			setEvents,
			setChatEvents,
			setStatus,
			setChatMembers,
			replay,
			setSleepInterval
		);
	};

	const replay = async (events: NostrEvent[], mode: RxReqMode) => {
		for (const ev of events) {
			last_created_at = ev.created_at;
			if (ev.content.includes('GET')) {
				const p = ev.tags.find((tag) => tag.length >= 2 && tag[0] === 'p')?.at(1);
				if (p === undefined) return;
				lastEventsToReply.set(p, ev);
				lastEventsToReply = lastEventsToReply;
				const m = ev.content.match(/GET\s(\S+)\s?(\S+)?\s?(\S+)?\s?(\S+)?\s?(\S+)?/);
				if (m === null) return;
				const command = m[1];
				requestedCommand = command;
				if (command === 'naku?') {
					let i = 2;
					const ks: string[] = [];
					while (m[i] !== undefined) {
						ks.push(m[i]);
						i++;
					}
					const p = ev.tags.find((tag) => tag.length >= 2 && tag[0] === 'p')?.at(1);
					if (p === undefined) return;
					nakuKinds.set(p, ks);
					nakuKinds = nakuKinds;
				} else if (command === 'sutehai?') {
					//リーチ済
					if (p === loginPubkey && richiJunme.get(p) !== undefined) {
						const cTehai = tehai.get(loginPubkey)!;
						const cTsumohai = tsumohai.get(loginPubkey)!;
						if (!(canTsumo(cTehai, cTsumohai) || canAnkan(cTehai, cTsumohai, nokori ?? 0))) {
							//オートで自摸切り
							if (mode === RxReqMode.Forward) {
								await sleep(defaultSleepInterval);
								callSendDapai(cTsumohai);
							}
						}
					}
				}
				continue;
			}
			while (isStoppedReplay) {
				await sleep(sleepInterval);
			}
			if (ev.content.includes('NOTIFY')) {
				if (!/gamestart|kyokustart|point/.test(ev.content) && sleepInterval !== 0)
					await sleep(sleepInterval);
				lastEventsToReply.clear();
				requestedCommand = undefined;
				const p = ev.tags.find((tag) => tag.length >= 2 && tag[0] === 'p')?.at(1);
				if (p === undefined) return;
				nakuKinds.set(p, undefined);
				const m = ev.content.match(/NOTIFY\s(\S+)\s?(\S+)?\s?(\S+)?\s?(\S+)?\s?(\S+)?/);
				if (m === null) return;
				const command = m[1];
				const pubkey: string | null = /^nostr:npub1\w{58}$/.test(m[2])
					? (nip19.decode(m[2].replace('nostr:', '')).data as string)
					: null;
				switch (command) {
					case 'gamestart': {
						const p = ev.tags.find((tag) => tag.length >= 2 && tag[0] === 'p')?.at(1);
						if (p === undefined) return;
						if (0 < players.size && players.size < 4) {
							players.set(p, undefined);
							if (players.size === 4) {
								fetchProfiles(rxNostr!, players);
							}
						} else {
							players.clear();
							players.set(p, undefined);
						}
						const mG = ev.content.match(/NOTIFY\sgamestart\s(東|南|西|北)/);
						if (mG === null) return;
						const seki: number = ['東', '南', '西', '北'].indexOf(mG[1]);
						sekijun[seki] = p;
						isGameEnd = false;
						break;
					}
					case 'kyokustart': {
						bafu = m[2];
						const oya = nip19.decode(m[3].replace('nostr:', '')).data as string;
						tsumibou = parseInt(m[4]);
						kyoutaku = parseInt(m[5]);
						tehai.clear();
						tsumohai.clear();
						sutehai.clear();
						say.clear();
						richiJunme.clear();
						furoJunme.clear();
						furoHistory.clear();
						kakanHistory.clear();
						pointDiff.clear();
						nakuKinds.clear();
						dorahyoujihai = '';
						uradorahyoujihai = '';
						sutehaiCommand = 'sutehai';
						result = '';
						agariPlayer = '';
						furikomiPlayer = '';
						pubkeysToOpenTehai.clear();
						isKyokuEnd = false;
						const idx = sekijun.indexOf(oya);
						kyoku = idx + 1;
						kaze.set(sekijun[idx], '東');
						kaze.set(sekijun[(idx + 1) % 4], '南');
						kaze.set(sekijun[(idx + 2) % 4], '西');
						kaze.set(sekijun[(idx + 3) % 4], '北');
						kaze = kaze;
						break;
					}
					case 'point': {
						if (pubkey === null) return;
						const sign = m[3];
						const point = parseInt(m[4]);
						if (sign === '=') {
							points.set(pubkey, point);
							points = points;
						} else {
							pointDiff.set(pubkey, `${sign}${point}`);
							pointDiff = pointDiff;
						}
						break;
					}
					case 'haipai': {
						if (pubkey === null) return;
						const haipai = m[3];
						tehai.set(pubkey, haipai);
						tehai = tehai;
						break;
					}
					case 'dora': {
						const sayValues = Array.from(say.values());
						if (sayValues.length > 0 && sayValues.some((s) => ['tsumo', 'ron'].includes(s))) {
							uradorahyoujihai = (uradorahyoujihai ?? '') + m[2];
						} else {
							dorahyoujihai = (dorahyoujihai ?? '') + m[2];
						}
						break;
					}
					case 'tsumo': {
						if (pubkey === null) return;
						nokori = parseInt(m[3]);
						const paiT = m[4];
						tsumohai.set(pubkey, paiT);
						tsumohai = tsumohai;
						say.set(pubkey, '');
						say = say;
						sutehaiSaved = '';
						sutehaiPlayerSaved = '';
						break;
					}
					case 'sutehai': {
						if (pubkey === null) return;
						const paiS = m[3];
						let newTehai = addHai(tehai.get(pubkey) ?? '', tsumohai.get(pubkey) ?? '');
						newTehai = removeHai(newTehai, paiS);
						tehai.set(pubkey, newTehai);
						tsumohai.set(pubkey, '');
						sutehai.set(pubkey, (sutehai.get(pubkey) ?? '') + paiS);
						tehai = tehai;
						tsumohai = tsumohai;
						sutehai = sutehai;
						sutehaiSaved = paiS;
						sutehaiPlayerSaved = pubkey;
						break;
					}
					case 'say': {
						if (pubkey === null) return;
						const saySS = m[3];
						say.set(pubkey, saySS);
						say = say;
						if (saySS === 'richi') {
							if (kyoutaku === undefined) return;
							const point = points.get(pubkey);
							if (point === undefined) return;
							kyoutaku += 1000;
							points.set(pubkey, point - 1000);
							points = points;
							richiJunme.set(pubkey, (sutehai.get(pubkey)?.length ?? 0) / 2);
							richiJunme = richiJunme;
						} else if (saySS === 'tenpai') {
							pubkeysToOpenTehai.add(pubkey);
							pubkeysToOpenTehai = pubkeysToOpenTehai;
						}
						break;
					}
					case 'open': {
						if (pubkey === null) return;
						const paiOpen = m[3];
						const t = tehai.get(pubkey);
						if (t === undefined) return;
						if (paiOpen.length == 2) {
							//加槓
							tehai.set(pubkey, setKakan(t, paiOpen));
							const history = kakanHistory.get(pubkey);
							if (history === undefined) {
								kakanHistory.set(pubkey, [paiOpen]);
							} else {
								history.unshift(paiOpen);
							}
							kakanHistory = kakanHistory;
						} else {
							if (sutehaiSaved === '') {
								//暗槓
								const pai = paiOpen.slice(0, 2);
								let newTehai = addHai(t, tsumohai.get(pubkey) ?? '');
								newTehai = setAnkan(newTehai, pai);
								tehai.set(pubkey, newTehai);
							} else {
								//チー、ポン、大明槓
								const opened = paiOpen.replace(sutehaiSaved, '');
								const newTehai = setFuro(t, sutehaiSaved, opened);
								tehai.set(pubkey, newTehai);
								furoJunme.set(
									sutehaiPlayerSaved,
									(furoJunme.get(sutehaiPlayerSaved) ?? []).concat(
										(sutehai.get(sutehaiPlayerSaved)?.length ?? 0) / 2 - 1
									)
								);
								furoJunme = furoJunme;
								const history = furoHistory.get(pubkey);
								if (history === undefined) {
									furoHistory.set(pubkey, [{ sutehai: sutehaiSaved, pubkey: sutehaiPlayerSaved }]);
								} else {
									history.unshift({
										sutehai: sutehaiSaved,
										pubkey: sutehaiPlayerSaved
									});
								}
								furoHistory = furoHistory;
							}
						}
						tehai = tehai;
						break;
					}
					case 'agari': {
						if (pubkey === null) return;
						const fu = m[3];
						const m2 = ev.content.match(/NOTIFY\s\S+\s\S+\s\S+\s(.+)$/);
						let r = '';
						let c = 0;
						for (const s of m2?.at(1)?.split(' ') ?? []) {
							const [k, v] = s.split(',');
							r += `${k} ${v}翻\n`;
							c += parseInt(v);
						}
						r += `${fu}符${c}翻`;
						result = r;
						agariPlayer = pubkey;
						furikomiPlayer = sutehaiPlayerSaved;
						pubkeysToOpenTehai.add(pubkey);
						pubkeysToOpenTehai = pubkeysToOpenTehai;
						break;
					}
					case 'ryukyoku': {
						result = '流局';
						break;
					}
					case 'kyokuend': {
						isKyokuEnd = true;
						break;
					}
					case 'gameend': {
						const itr = ev.content.matchAll(/nostr:(npub1\w{58})\s(-?\d+)/g);
						const scoremap = new Map<string, number>();
						for (const m of itr) {
							const pubkeyG = nip19.decode(m[1]).data as string;
							const score = parseInt(m[2]);
							scoremap.set(pubkeyG, score);
						}
						let i = 0;
						const rank = ['🥇', '🥈', '🥉', '🏅'];
						const r2 = [];
						const sortedScoreMap = new Map([...scoremap].sort((a, b) => b[1] - a[1]));
						for (const [k, v] of sortedScoreMap) {
							const profile = JSON.parse(players.get(k)?.content || '{}');
							r2.push(`${rank[i]} @${profile.name ?? ''}: ${v}`);
							i++;
						}
						result = r2.join('\n');
						isGameEnd = true;
						break;
					}
					default:
						break;
				}
			}
		}
	};

	const doras = $derived(
		stringToArrayPlain(getDoraFromDorahyouji(`${dorahyoujihai ?? ''}${uradorahyoujihai ?? ''}`))
	);
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css" />
	<script type="module" src="https://cdn.jsdelivr.net/npm/nostr-zap@1.1.0"></script>
	<script type="module" src="https://www.unpkg.com/nostr-login@latest/dist/unpkg.js"></script>
	<title>地鳳</title>
</svelte:head>

<header>
	<h1>地鳳</h1>
	<Menu
		{rxNostr}
		{mahjongChannelId}
		{mahjongServerPubkey}
		{mahjongChannelEvents}
		{loginPubkey}
		status={status.get(mahjongChannelId)?.content}
		{isStoppedReplay}
		{setMahjongChannelId}
		{setIsStoppedReplay}
		{setSleepInterval}
		{replay}
		{refetch}
		{events}
		{last_created_at}
	/>
</header>
<main>
	<section id="info">
		<h2>Info</h2>
		<Info
			{bafu}
			{kyoku}
			{tsumibou}
			{kyoutaku}
			{nokori}
			{dorahyoujihai}
			{uradorahyoujihai}
			{doras}
			{loginPubkey}
			status={status.get(mahjongChannelId)?.content}
			{result}
			{chatEvents}
			{chatMembers}
			{rxNostr}
			{mahjongChannelId}
			{mahjongServerPubkey}
			{isGameEnd}
		/>
	</section>
	<section id="players">
		<h2>Players</h2>
		<dl class="players">
			{#each Array.from(players.entries()) as [key, value]}
				{@const isAgariPlayer = agariPlayer !== undefined && agariPlayer === key}
				{@const isFurikomiPlayer = furikomiPlayer !== undefined && furikomiPlayer === key}
				<Player
					{key}
					{value}
					{sekijun}
					{tehai}
					{sutehai}
					{lastEventsToReply}
					{last_created_at}
					{requestedCommand}
					{kaze}
					{points}
					{pointDiff}
					{rxNostr}
					{mahjongChannelId}
					{mahjongServerPubkey}
					{loginPubkey}
					status={status.get(mahjongChannelId)?.content}
					{nakuKinds}
					{sutehaiSaved}
					{doras}
					{sutehaiCommand}
					{tsumohai}
					{nokori}
					{setSutehai}
					{richiJunme}
					{callSendDapai}
					{say}
					{pubkeysToOpenTehai}
					{furoJunme}
					{furoHistory}
					{kakanHistory}
					{sutehaiPlayerSaved}
					{isAgariPlayer}
					{isFurikomiPlayer}
					{isKyokuEnd}
					{isGameEnd}
				/>
			{/each}
		</dl>
	</section>
	<section id="log" class={loginPubkey === undefined ? '' : 'hidden'}>
		<h2>Log</h2>
		<dl class="log">
			{#each events as event}
				<dt>
					<time>{new Date(1000 * event.created_at).toLocaleString()}</time>
				</dt>
				<dd>{event.content}</dd>
			{/each}
		</dl>
	</section>
</main>
<footer>
	<a href={linkGitHub} target="_blank" rel="noopener noreferrer">GitHub</a>
	<button
		class="zap"
		title="Zap!"
		disabled={!loginPubkey}
		onclick={() => zap(mahjongServerPubkey, defaultRelays)}>⚡️</button
	>
	牌画像 (c)
	<a href="https://awayuki.github.io/emojis.html#mahjong" target="_blank" rel="noopener noreferrer"
		>awayuki</a
	>
</footer>

<style>
	#players {
		clear: both;
	}
	.hidden {
		display: none;
	}
	.log {
		border: 1px gray solid;
		height: 10em;
		overflow-y: auto;
	}
	@media all and (min-width: 480px) {
		#log {
			clear: both;
		}
	}
	:global(body button) {
		margin: 0 0 1px 0;
		padding: 1px 3px;
		border-radius: 3px;
	}
	:global(body input, body select) {
		padding: 0;
		display: inline-block;
	}
</style>
