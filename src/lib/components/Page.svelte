<script lang="ts">
  import {
    createRxNostr,
    createRxForwardReq,
    createRxBackwardReq,
    uniq,
    type EventPacket,
  } from 'rx-nostr';
  import { verifier } from 'rx-nostr-crypto';
  import { onMount } from 'svelte';
  import { defaultRelays, getRoboHashURL } from '$lib/config';
  import {
    getEmojiUrl,
    insertEventIntoAscendingList,
    setFuro,
    sortEvents,
  } from '$lib/utils';
  import {
    addHai,
    removeHai,
    stringToArrayPlain,
    stringToArrayWithFuro,
  } from '$lib/mjlib/mj_common';
  import { nip19, type NostrEvent } from 'nostr-tools';
  import { Subject } from 'rxjs';

  let events: NostrEvent[] = [];
  let players: Map<string, NostrEvent> = new Map<string, NostrEvent>();
  let points: Map<string, number> = new Map<string, number>();
  let pointDiff: Map<string, string> = new Map<string, string>();
  let tehai: Map<string, string> = new Map<string, string>();
  let tsumohai: Map<string, string> = new Map<string, string>();
  let sutehai: Map<string, string> = new Map<string, string>();
  let say: Map<string, string> = new Map<string, string>();
  let bafu: string;
  let tsumibou: number;
  let kyoutaku: number;
  let dorahyoujihai: string;
  let result: string;
  let sutehaiSaved: string;

  const sleep = (time: number) => new Promise((r) => setTimeout(r, time));
  const sleepInterval = 500;

  onMount(() => {
    const mahjongRoomId =
      'c8d5c2709a5670d6f621ac8020ac3e4fc3057a4961a15319f7c0818309407723';
    const mahjongServerPubkey =
      '93e68a5f7bf6d35f0cb1288160e42ecdb3396b80bb686a528199dfc5e58ceb25';
    const rxNostr = createRxNostr({ verifier });
    rxNostr.setDefaultRelays(defaultRelays);

    const rxReqB = createRxBackwardReq();
    const rxReqF = createRxForwardReq();
    const now = Math.floor(Date.now() / 1000);

    const flushes$ = new Subject<void>();

    const next = (packet: EventPacket) => {
      //console.log(packet);
      const event = packet.event;
      switch (event.kind) {
        case 0:
          if (
            !players.has(event.pubkey) ||
            players.get(event.pubkey)!.created_at < event.created_at
          ) {
            players.set(event.pubkey, event);
            players = players;
          }
          break;
        case 42:
          events.push(event);
          events = events;
          break;
        default:
          break;
      }
    };
    const complete = async () => {
      //console.log('Completed!');
      events = sortEvents(events);
      let startIndex = 0;
      for (const ev of events) {
        if (ev.content.includes('NOTIFY kyokustart')) {
          break;
        }
        startIndex++;
      }
      events = events.slice(0, startIndex + 1);
      await replay(events.toReversed());
      //rxReqF.emit({ kinds: [42], authors: [mahjongServerPubkey], '#e': [mahjongRoomId], since: now })
    };
    const subscriptionB = rxNostr
      .use(rxReqB)
      .pipe(uniq(flushes$))
      .subscribe({ next, complete });
    const subscriptionF = rxNostr
      .use(rxReqF)
      .pipe(uniq(flushes$))
      .subscribe((packet) => {
        console.log(packet);
        events.push(packet.event);
        events = insertEventIntoAscendingList(events, packet.event);
      });
    rxReqB.emit({
      kinds: [42],
      authors: [mahjongServerPubkey],
      '#e': [mahjongRoomId],
      limit: 200,
      until: now,
    });
    rxReqB.over();

    const replay = async (events: NostrEvent[]) => {
      for (const ev of events) {
        if (ev.content.includes('NOTIFY')) {
          await sleep(sleepInterval);
          const m = ev.content.match(
            /NOTIFY\s(\S+)\s?(\S+)?\s?(\S+)?\s?(\S+)?\s?(\S+)?/,
          );
          if (m === null) return;
          const command = m[1];
          //console.log(command);
          switch (command) {
            case 'kyokustart':
              bafu = m[2];
              tsumibou = parseInt(m[4]);
              kyoutaku = parseInt(m[5]);
              break;
            case 'point':
              const playerName = m[2];
              const sign = m[3];
              const point = parseInt(m[4]);
              const npub = playerName.replace('nostr:', '');
              const pubkey = nip19.decode(npub).data as string;
              if (sign === '=') {
                const rxReqB2 = createRxBackwardReq();
                const subscriptionB2 = rxNostr
                  .use(rxReqB2)
                  .pipe(uniq(flushes$))
                  .subscribe(next);
                rxReqB2.emit({ kinds: [0], authors: [pubkey], until: now });
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
              dorahyoujihai = (dorahyoujihai ?? '') + m[2];
              break;
            case 'tsumo':
              const playerNameT = m[2];
              const nokori = m[3];
              const paiT = m[4];
              const npubT = playerNameT.replace('nostr:', '');
              const pubkeyT = nip19.decode(npubT).data as string;
              tsumohai.set(pubkeyT, paiT);
              tsumohai = tsumohai;
              say.set(pubkeyT, '');
              say = say;
              sutehaiSaved = '';
              break;
            case 'sutehai':
              const playerNameS = m[2];
              const paiS = m[3];
              const npubS = playerNameS.replace('nostr:', '');
              const pubkeyS = nip19.decode(npubS).data as string;
              let newTehai = addHai(
                tehai.get(pubkeyS)!,
                tsumohai.get(pubkeyS)!,
              );
              newTehai = removeHai(newTehai, paiS);
              tehai.set(pubkeyS, newTehai);
              tsumohai.set(pubkeyS, '');
              sutehai.set(pubkeyS, (sutehai.get(pubkeyS) ?? '') + paiS);
              tehai = tehai;
              tsumohai = tsumohai;
              sutehai = sutehai;
              sutehaiSaved = paiS;
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
                points.set(pubkeySS, points.get(pubkeySS)! - 1000);
                points = points;
              }
              break;
            case 'open':
              const playerNameO = m[2];
              const paiOpen = m[3];
              const npubO = playerNameO.replace('nostr:', '');
              const pubkeyO = nip19.decode(npubO).data as string;
              let t = tehai.get(pubkeyO)!;
              if (paiOpen.length >= 6) {
                const opened = paiOpen.replace(sutehaiSaved, '');
                const newTehai = setFuro(t, sutehaiSaved, opened);
                tehai.set(pubkeyO, newTehai);
              } else {
                //TODO
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
            default:
              break;
          }
        }
      }
    };
  });
</script>

<svelte:head>
  <title>rs-nostr-practice</title>
</svelte:head>

<header><h1>rs-nostr-practice</h1></header>
<main>
  <h2>Info</h2>
  <p>
    {bafu ?? '?'}場 {tsumibou ?? '?'}本場 供託{kyoutaku ?? '?'}点 ドラ表示牌{#each stringToArrayPlain(dorahyoujihai ?? '') as p}<img
        class="pai"
        alt={p}
        src={getEmojiUrl(p)}
      />{/each}
  </p>
  <pre>{result ?? ''}</pre>
  <h2>Players</h2>
  <dl class="players">
    {#each players.entries() as [key, value]}
      {@const profile = JSON.parse(value.content)}
      {@const paigazouTehai = stringToArrayWithFuro(tehai.get(key) ?? '')}
      {@const paigazouSutehai = stringToArrayPlain(sutehai.get(key) ?? '')}
      <dt>
        <img
          class="player"
          alt=""
          src={profile.picture ?? getRoboHashURL(key)}
        />
        {profile.display_name ?? ''} @{profile.name ?? ''}
        {points.get(key)}点 {pointDiff.get(key) ?? ''}
        {say.get(key) ? `＜ [${say.get(key)}]` : ''}
      </dt>
      <dd>
        {#each paigazouTehai?.at(0) ?? [] as paigazou}
          <img class="pai" alt={paigazou} src={getEmojiUrl(paigazou)} />
        {/each}
        {#each paigazouTehai?.at(1) ?? [] as paigazou}
          {@const pa = stringToArrayPlain(paigazou)}
          &lt;
          {#each pa as p}
            <img class="pai" alt={paigazou} src={getEmojiUrl(p)} />
          {/each}
          &gt;
        {/each}
        {#each paigazouTehai?.at(2) ?? [] as paigazou}
          {@const pa = stringToArrayPlain(paigazou)}
          (
          {#each pa as p}
            <img class="pai" alt={paigazou} src={getEmojiUrl(p)} />
          {/each}
          )
        {/each}
        {#if tsumohai.get(key)?.length ?? 0 > 0}
          <img
            class="pai"
            alt={tsumohai.get(key)}
            src={getEmojiUrl(tsumohai.get(key) ?? '')}
          />
        {/if}
        <br />
        {#each paigazouSutehai as paigazou}
          <img class="pai" alt={paigazou} src={getEmojiUrl(paigazou)} />
        {/each}
      </dd>
    {/each}
  </dl>
  <h2>Log</h2>
  <dl class="log">
    {#each events.toReversed() as event}
      <dt><time>{new Date(1000 * event.created_at).toLocaleString()}</time></dt>
      <dd>{event.content}</dd>
    {/each}
  </dl>
</main>
<footer>
  牌画像 (c) <a
    href="https://awayuki.github.io/emojis.html#mahjong"
    target="_blank"
    rel="noopener noreferrer">awayuki</a
  >
</footer>

<style>
  .players dd {
    height: 80px;
  }
  .player {
    max-height: 64px;
  }
  .pai {
    max-height: 30px;
  }
  .log {
    border: 1px gray solid;
    max-height: 10em;
    overflow-y: auto;
  }
</style>
