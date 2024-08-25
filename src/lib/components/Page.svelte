<script lang="ts">
  import { createRxNostr, type RxNostr } from 'rx-nostr';
  import { verifier } from 'rx-nostr-crypto';
  import type { NostrEvent } from 'nostr-tools/pure';
  import * as nip19 from 'nostr-tools/nip19';
  import { onMount } from 'svelte';
  import { defaultRelays, linkGitHub, mahjongServerPubkey } from '$lib/config';
  import {
    fetchEventsToReplay,
    sendDapai,
    setAnkan,
    setFuro,
    setKakan,
    sleep,
    zap,
  } from '$lib/utils';
  import {
    addHai,
    getDoraFromDorahyouji,
    removeHai,
    stringToArrayPlain,
  } from '$lib/mjlib/mj_common';
  import Menu from '$lib/components/Menu.svelte';
  import Info from '$lib/components/Info.svelte';
  import Player from '$lib/components/Player.svelte';

  let events: NostrEvent[] = [];
  let players: Map<string, NostrEvent | undefined> = new Map<
    string,
    NostrEvent | undefined
  >();
  let sekijun: string[] = [];
  let kaze: Map<string, string> = new Map<string, string>();
  let points: Map<string, number> = new Map<string, number>();
  let pointDiff: Map<string, string> = new Map<string, string>();
  let tehai: Map<string, string> = new Map<string, string>();
  let tsumohai: Map<string, string> = new Map<string, string>();
  let sutehai: Map<string, string> = new Map<string, string>();
  let say: Map<string, string> = new Map<string, string>();
  let richiJunme: Map<string, number> = new Map<string, number>();
  let furoJunme: Map<string, number[]> = new Map<string, number[]>();
  let nakuKinds: Map<string, string[] | undefined> = new Map<
    string,
    string[] | undefined
  >();
  let bafu: string;
  let kyoku: number;
  let tsumibou: number;
  let kyoutaku: number;
  let nokori: number;
  let dorahyoujihai: string;
  let uradorahyoujihai: string;
  let result: string;
  let sutehaiSaved: string;
  let sutehaiPlayerSaved: string;
  let sutehaiCommand: string;
  let loginPubkey: string | undefined;
  let lastEventsToReply: Map<string, NostrEvent> = new Map<
    string,
    NostrEvent
  >();
  let requestedCommand: string | undefined;
  let rxNostr: RxNostr;
  const sleepInterval = 500;
  let enableFastForward: boolean = false;

  const setLoginPubkey = (value: string | undefined) => {
    loginPubkey = value;
  };
  const setEnableFastForward = (value: boolean) => {
    enableFastForward = value;
  };
  const setSutehaiCommand = (value: string) => {
    sutehaiCommand = value;
  };
  const setSutehai = (value: string) => {
    sutehaiCommand = value;
  };
  const setPlayers = (value: Map<string, NostrEvent | undefined>) => {
    players = value;
  };
  const setEvents = (value: NostrEvent[]) => {
    events = value;
  };
  const callSendDapai = (pai: string | undefined) => {
    if (pai === undefined) return;
    if (loginPubkey === undefined) return;
    const ev = lastEventsToReply.get(loginPubkey);
    if (ev === undefined) return;
    sendDapai(rxNostr, pai, ev, sutehaiCommand, setSutehaiCommand);
  };

  onMount(() => {
    rxNostr = createRxNostr({ verifier, eoseTimeout: 2000 });
    rxNostr.setDefaultRelays(defaultRelays);
    fetchEventsToReplay(
      rxNostr,
      players,
      events,
      replay,
      sleepInterval,
      setPlayers,
      setEvents,
    );
  });

  const replay = async (events: NostrEvent[], sleepInterval?: number) => {
    for (const ev of events) {
      if (ev.content.includes('GET')) {
        const p = ev.tags
          .find((tag) => tag.length >= 2 && tag[0] === 'p')
          ?.at(1);
        if (p === undefined) return;
        lastEventsToReply.set(p, ev);
        lastEventsToReply = lastEventsToReply;
        const m = ev.content.match(
          /GET\s(\S+)\s?(\S+)?\s?(\S+)?\s?(\S+)?\s?(\S+)?/,
        );
        if (m === null) return;
        const command = m[1];
        requestedCommand = command;
        if (command === 'naku?') {
          let i = 2;
          const ks = [];
          while (m[i] !== undefined) {
            ks.push(m[i]);
            i++;
          }
          const p = ev.tags
            .find((tag) => tag.length >= 2 && tag[0] === 'p')
            ?.at(1);
          if (p === undefined) return;
          nakuKinds.set(p, ks);
        }
        continue;
      }
      if (ev.content.includes('NOTIFY')) {
        if (
          sleepInterval !== undefined &&
          !enableFastForward &&
          !/gamestart|point/.test(ev.content)
        )
          await sleep(sleepInterval);
        lastEventsToReply = new Map<string, NostrEvent>();
        requestedCommand = undefined;
        const p = ev.tags
          .find((tag) => tag.length >= 2 && tag[0] === 'p')
          ?.at(1);
        if (p === undefined) return;
        nakuKinds.set(p, undefined);
        const m = ev.content.match(
          /NOTIFY\s(\S+)\s?(\S+)?\s?(\S+)?\s?(\S+)?\s?(\S+)?/,
        );
        if (m === null) return;
        const command = m[1];
        switch (command) {
          case 'gamestart':
            const p = ev.tags
              .find((tag) => tag.length >= 2 && tag[0] === 'p')
              ?.at(1);
            if (p === undefined) return;
            const mG = ev.content.match(/NOTIFY\sgamestart\s(東|南|西|北)/);
            if (mG === null) return;
            const seki: number = ['東', '南', '西', '北'].indexOf(mG[1]);
            sekijun[seki] = p;
            break;
          case 'kyokustart':
            bafu = m[2];
            const oya = nip19.decode(m[3].replace('nostr:', '')).data as string;
            tsumibou = parseInt(m[4]);
            kyoutaku = parseInt(m[5]);
            tehai = new Map<string, string>();
            tsumohai = new Map<string, string>();
            sutehai = new Map<string, string>();
            say = new Map<string, string>();
            richiJunme = new Map<string, number>();
            furoJunme = new Map<string, number[]>();
            pointDiff = new Map<string, string>();
            nakuKinds = new Map<string, string[] | undefined>();
            dorahyoujihai = '';
            uradorahyoujihai = '';
            sutehaiCommand = 'sutehai';
            result = '';
            const idx = sekijun.indexOf(oya);
            kyoku = idx + 1;
            kaze.set(sekijun[idx], '東');
            kaze.set(sekijun[(idx + 1) % 4], '南');
            kaze.set(sekijun[(idx + 2) % 4], '西');
            kaze.set(sekijun[(idx + 3) % 4], '北');
            kaze = kaze;
            break;
          case 'point':
            const playerName = m[2];
            const sign = m[3];
            const point = parseInt(m[4]);
            const npub = playerName.replace('nostr:', '');
            const pubkey = nip19.decode(npub).data as string;
            if (sign === '=') {
              points.set(pubkey, point);
              points = points;
            } else {
              pointDiff.set(pubkey, `${sign}${point}`);
              pointDiff = pointDiff;
            }
            break;
          case 'haipai':
            const playerNameH = m[2];
            const haipai = m[3];
            const npubH = playerNameH.replace('nostr:', '');
            const pubkeyH = nip19.decode(npubH).data as string;
            tehai.set(pubkeyH, haipai);
            tehai = tehai;
            break;
          case 'dora':
            const sayValues = Array.from(say.values());
            if (
              sayValues.length > 0 &&
              sayValues.some((s) => ['tsumo', 'ron'].includes(s))
            ) {
              uradorahyoujihai = (uradorahyoujihai ?? '') + m[2];
            } else {
              dorahyoujihai = (dorahyoujihai ?? '') + m[2];
            }
            break;
          case 'tsumo':
            const playerNameT = m[2];
            nokori = parseInt(m[3]);
            const paiT = m[4];
            const npubT = playerNameT.replace('nostr:', '');
            const pubkeyT = nip19.decode(npubT).data as string;
            tsumohai.set(pubkeyT, paiT);
            tsumohai = tsumohai;
            say.set(pubkeyT, '');
            say = say;
            sutehaiSaved = '';
            sutehaiPlayerSaved = '';
            break;
          case 'sutehai':
            const playerNameS = m[2];
            const paiS = m[3];
            const npubS = playerNameS.replace('nostr:', '');
            const pubkeyS = nip19.decode(npubS).data as string;
            let newTehai = addHai(
              tehai.get(pubkeyS) ?? '',
              tsumohai.get(pubkeyS) ?? '',
            );
            newTehai = removeHai(newTehai, paiS);
            tehai.set(pubkeyS, newTehai);
            tsumohai.set(pubkeyS, '');
            sutehai.set(pubkeyS, (sutehai.get(pubkeyS) ?? '') + paiS);
            tehai = tehai;
            tsumohai = tsumohai;
            sutehai = sutehai;
            sutehaiSaved = paiS;
            sutehaiPlayerSaved = pubkeyS;
            break;
          case 'say':
            const playerNameSS = m[2];
            const saySS = m[3];
            const npubSS = playerNameSS.replace('nostr:', '');
            const pubkeySS = nip19.decode(npubSS).data as string;
            say.set(pubkeySS, saySS);
            say = say;
            if (saySS === 'richi') {
              kyoutaku += 1000;
              const point = points.get(pubkeySS);
              if (point === undefined) return;
              points.set(pubkeySS, point - 1000);
              points = points;
              richiJunme.set(
                pubkeySS,
                (sutehai.get(pubkeySS)?.length ?? 0) / 2,
              );
            }
            break;
          case 'open':
            const playerNameO = m[2];
            const paiOpen = m[3];
            const npubO = playerNameO.replace('nostr:', '');
            const pubkeyO = nip19.decode(npubO).data as string;
            const t = tehai.get(pubkeyO);
            if (t === undefined) return;
            if (paiOpen.length == 2) {
              //加槓
              const newTehai = setKakan(t, paiOpen);
              tehai.set(pubkeyO, newTehai);
            } else {
              if (sutehaiSaved === '') {
                //暗槓
                const pai = paiOpen.slice(0, 2);
                const newTehai = setAnkan(t, pai);
                tehai.set(pubkeyO, newTehai);
              } else {
                //チー、ポン、大明槓
                const opened = paiOpen.replace(sutehaiSaved, '');
                const newTehai = setFuro(t, sutehaiSaved, opened);
                tehai.set(pubkeyO, newTehai);
                furoJunme.set(
                  sutehaiPlayerSaved,
                  (furoJunme.get(sutehaiPlayerSaved) ?? []).concat(
                    (sutehai.get(sutehaiPlayerSaved)?.length ?? 0) / 2 - 1,
                  ),
                );
                furoJunme = furoJunme;
              }
            }
            tehai = tehai;
            break;
          case 'agari':
            const playerNameA = m[2];
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
            break;
          case 'ryukyoku':
            result = '流局';
            break;
          case 'kyokuend':
            break;
          case 'gameend':
            const itr = ev.content.matchAll(/nostr:(npub1\w+)\s(-?\d+)/g);
            const scoremap = new Map<string, number>();
            for (const m of itr) {
              const pubkeyG = nip19.decode(m[1]).data as string;
              const score = parseInt(m[2]);
              scoremap.set(pubkeyG, score);
            }
            let i = 0;
            const rank = ['🥇', '🥈', '🥉', '🏅'];
            const r2 = [];
            const sortedScoreMap = new Map(
              [...scoremap].sort((a, b) => b[1] - a[1]),
            );
            for (const [k, v] of sortedScoreMap) {
              const profile = JSON.parse(players.get(k)?.content || '{}');
              r2.push(`${rank[i]} @${profile.name ?? ''}: ${v}`);
              i++;
            }
            result = r2.join('\n');
            break;
          default:
            break;
        }
      }
    }
  };

  $: doras = stringToArrayPlain(
    getDoraFromDorahyouji(`${dorahyoujihai ?? ''}${uradorahyoujihai ?? ''}`),
  );
</script>

<svelte:head>
  <script
    type="module"
    src="https://cdn.jsdelivr.net/npm/nostr-zap@1.1.0"
  ></script>
  <title>地鳳</title>
</svelte:head>

<header>
  <h1>地鳳</h1>
  <Menu {rxNostr} {loginPubkey} {setEnableFastForward} {setLoginPubkey} />
</header>
<main>
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
    {result}
  />
  <h2>Players</h2>
  <dl class="players">
    {#each Array.from(players.entries()) as [key, value]}
      <Player
        {key}
        {value}
        {tehai}
        {sutehai}
        {lastEventsToReply}
        {requestedCommand}
        {kaze}
        {points}
        {pointDiff}
        {loginPubkey}
        {rxNostr}
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
        {result}
        {furoJunme}
        {sutehaiPlayerSaved}
      />
    {/each}
  </dl>
  <h2 id="log">Log</h2>
  <dl class="log">
    {#each events as event}
      <dt><time>{new Date(1000 * event.created_at).toLocaleString()}</time></dt>
      <dd>{event.content}</dd>
    {/each}
  </dl>
</main>
<footer>
  <a href={linkGitHub} target="_blank" rel="noopener noreferrer">GitHub</a>
  <button
    class="zap"
    title="Zap!"
    on:click={() => zap(mahjongServerPubkey, defaultRelays)}>⚡️</button
  >
  牌画像 (c)
  <a
    href="https://awayuki.github.io/emojis.html#mahjong"
    target="_blank"
    rel="noopener noreferrer">awayuki</a
  >
</footer>

<style>
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
</style>
