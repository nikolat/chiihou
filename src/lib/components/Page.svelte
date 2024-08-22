<script lang="ts">
  import {
    createRxNostr,
    createRxForwardReq,
    createRxBackwardReq,
    uniq,
    type EventPacket,
    type RxNostr,
  } from 'rx-nostr';
  import { verifier } from 'rx-nostr-crypto';
  import { onMount } from 'svelte';
  import {
    defaultRelays,
    getRoboHashURL,
    linkGitHub,
    mahjongPlayerPubkeys,
    mahjongRoomId,
    mahjongServerPubkey,
  } from '$lib/config';
  import {
    awayuki_mahjong_emojis,
    getTagsReply,
    insertEventIntoDescendingList,
    setAnkan,
    setFuro,
    setKakan,
  } from '$lib/utils';
  import {
    addHai,
    getDoraFromDorahyouji,
    removeHai,
    stringToArrayPlain,
    stringToArrayWithFuro,
  } from '$lib/mjlib/mj_common';
  import Pai from '$lib/components/Pai.svelte';
  import Command from '$lib/components/Command.svelte';
  import { nip19, type NostrEvent } from 'nostr-tools';
  import { Subject } from 'rxjs';
  import { getShanten } from '$lib/mjlib/mj_shanten';

  let events: NostrEvent[] = [];
  let players: Map<string, NostrEvent | undefined> = new Map<
    string,
    NostrEvent | undefined
  >();
  let sekijun: string[] = [];
  let kyoku: number;
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
  let tsumibou: number;
  let kyoutaku: number;
  let dorahyoujihai: string;
  let uradorahyoujihai: string;
  let result: string;
  let sutehaiSaved: string;
  let sutehaiPlayerSaved: string;
  let sutehaiCommand: string;
  let nokori: number;

  let loginPubkey: string | undefined;
  let lastEventsToReply: Map<string, NostrEvent> = new Map<
    string,
    NostrEvent
  >();
  let requestedCommand: string | undefined;

  let rxNostr: RxNostr;

  const sleep = (time: number) => new Promise((r) => setTimeout(r, time));
  const sleepInterval = 500;
  let enableFastForward: boolean = false;

  const getNpubWithNIP07 = async (): Promise<void> => {
    const nostr = window.nostr;
    let pubkey: string | undefined;
    if (nostr?.getPublicKey) {
      try {
        pubkey = await nostr.getPublicKey();
      } catch (error) {
        console.error(error);
        return;
      }
      loginPubkey = pubkey;
    }
  };

  const sendDapai = (pai: string) => {
    if (loginPubkey === undefined) return;
    const ev = lastEventsToReply.get(loginPubkey);
    if (ev === undefined) return;
    const now = Math.floor(Date.now() / 1000);
    rxNostr.send({
      kind: 42,
      content: `nostr:${nip19.npubEncode(mahjongServerPubkey)} sutehai? ${sutehaiCommand} ${pai}`,
      tags: getTagsReply(ev),
      created_at: ev.created_at < now ? now : ev.created_at + 1,
    });
    sutehaiCommand = 'sutehai';
  };

  const sendMention = (
    message: string,
    pubkey: string = mahjongServerPubkey,
  ) => {
    rxNostr.send({
      kind: 42,
      content: `nostr:${nip19.npubEncode(pubkey)} ${message}`,
      tags: [
        ['e', mahjongRoomId, '', 'root'],
        ['p', pubkey, ''],
      ],
    });
  };

  const gamestartByForce = async () => {
    enableFastForward = true;
    sendMention('reset');
    await sleep(200);
    sendMention('gamestart');
    for (let i = 0; i <= 2; i++) {
      await sleep(200);
      sendMention('join', mahjongPlayerPubkeys[i]);
    }
  };

  const setSutehai = (value: string) => {
    sutehaiCommand = value;
  };

  onMount(() => {
    rxNostr = createRxNostr({ verifier, eoseTimeout: 2000 });
    rxNostr.setDefaultRelays(defaultRelays);

    const rxReqB = createRxBackwardReq();
    const rxReqF = createRxForwardReq();
    const now = Math.floor(Date.now() / 1000);

    const flushes$ = new Subject<void>();

    const next = (packet: EventPacket) => {
      const event = packet.event;
      switch (event.kind) {
        case 0:
          if (
            !players.has(event.pubkey) ||
            players.get(event.pubkey) === undefined ||
            players.get(event.pubkey)!.created_at < event.created_at
          ) {
            players.set(event.pubkey, event);
            players = players;
          }
          break;
        case 42:
          events = insertEventIntoDescendingList(events, event);
          break;
        default:
          break;
      }
    };
    const complete1 = async () => {
      const lastKyokuStartEvent = events.find((ev) =>
        ev.tags.some(
          (tag) => tag.length >= 2 && tag[0] === 't' && tag[1] === 'kyokustart',
        ),
      );
      if (lastKyokuStartEvent === undefined) {
        console.warn('#kyokustart is not found');
        return;
      }
      players = new Map<string, NostrEvent>();
      const pubkeys = lastKyokuStartEvent.tags
        .filter((tag) => tag.length >= 2 && tag[0] === 'p')
        .map((tag) => tag[1]);
      for (const pubkey of pubkeys) {
        players.set(pubkey, undefined);
      }
      const rxReqB2 = createRxBackwardReq();
      const subscriptionB2 = rxNostr
        .use(rxReqB2)
        .pipe(uniq(flushes$))
        .subscribe(next);
      rxReqB2.emit({ kinds: [0], authors: pubkeys, until: now });
      rxReqB2.over();
      const rxReqB3 = createRxBackwardReq();
      const subscriptionB3 = rxNostr
        .use(rxReqB3)
        .pipe(uniq(flushes$))
        .subscribe({ next, complete: complete2 });
      rxReqB3.emit({
        kinds: [42],
        authors: [mahjongServerPubkey],
        '#e': [mahjongRoomId],
        since: lastKyokuStartEvent.created_at - 1,
        until: now,
      });
      rxReqB3.over();
    };
    const complete2 = async () => {
      const isKyokuEnd = events.some((ev) =>
        ev.content.includes('NOTIFY kyokuend'),
      );
      await replay(events.toReversed(), isKyokuEnd ? sleepInterval : 0);
      rxReqF.emit({
        kinds: [42],
        authors: [mahjongServerPubkey],
        '#e': [mahjongRoomId],
        since: now,
      });
    };
    const subscriptionB = rxNostr
      .use(rxReqB)
      .pipe(uniq(flushes$))
      .subscribe({ next, complete: complete1 });
    const subscriptionF = rxNostr
      .use(rxReqF)
      .pipe(uniq(flushes$))
      .subscribe((packet) => {
        events = insertEventIntoDescendingList(events, packet.event);
        replay([packet.event]);
      });
    rxReqB.emit({
      kinds: [42],
      authors: [mahjongServerPubkey],
      '#e': [mahjongRoomId],
      '#t': ['gamestart'],
      limit: 4,
      until: now,
    });
    rxReqB.emit({
      kinds: [42],
      authors: [mahjongServerPubkey],
      '#e': [mahjongRoomId],
      '#t': ['kyokustart'],
      limit: 1,
      until: now,
    });
    rxReqB.over();

    const replay = async (events: NostrEvent[], sleepInterval?: number) => {
      for (const ev of events) {
        if (ev.content.includes('GET')) {
          const p = ev.tags
            .find((tag) => tag.length >= 2 && tag[0] === 'p')
            ?.at(1);
          if (p === undefined) return;
          lastEventsToReply.set(p, ev);
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
              .find((tag) => tag.length >= 2 && tag[0] === 'p')!
              .at(1)!;
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
            .find((tag) => tag.length >= 2 && tag[0] === 'p')!
            .at(1)!;
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
              const oya = nip19.decode(m[3].replace('nostr:', ''))
                .data as string;
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
                points.set(pubkeySS, points.get(pubkeySS)! - 1000);
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
              let t = tehai.get(pubkeyO)!;
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
  });

  $: isSutehaiTurn =
    loginPubkey !== undefined &&
    lastEventsToReply.has(loginPubkey) &&
    requestedCommand === 'sutehai?';
  $: isNakuTurn =
    loginPubkey !== undefined &&
    lastEventsToReply.has(loginPubkey) &&
    requestedCommand === 'naku?';
  $: doras = stringToArrayPlain(
    getDoraFromDorahyouji(`${dorahyoujihai ?? ''}${uradorahyoujihai ?? ''}`),
  );
</script>

<svelte:head>
  <title>地鳳</title>
</svelte:head>

<header>
  <h1>地鳳</h1>
  {#if loginPubkey === undefined}
    <button on:click={getNpubWithNIP07}>NIP-07 Login</button>
  {:else}
    <button
      on:click={() => {
        loginPubkey = undefined;
      }}>Logout</button
    >
    <button
      on:click={() => {
        enableFastForward = true;
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
</header>
<main>
  <h2>Info</h2>
  <p>
    {bafu ?? '?'}{kyoku ?? '0'}局
    <img
      src={awayuki_mahjong_emojis.mahjong_stick100}
      alt="積み棒"
      class="pai"
    />x{tsumibou ?? '0'}
    <img
      src={awayuki_mahjong_emojis.mahjong_stick1000}
      alt="供託"
      class="pai"
    />x{kyoutaku === undefined ? '0' : kyoutaku / 1000} 残り{nokori ?? 0}枚
    <br />
    {#each stringToArrayPlain(dorahyoujihai ?? '') as p}<Pai
        pai={p}
        isDora={doras.includes(p)}
        isRemoved={false}
        hide={false}
      />{/each}{#each new Array((10 - (dorahyoujihai ?? '').length) / 2).fill('back') as p}<Pai
        pai={p}
        isDora={false}
        isRemoved={false}
        hide={true}
      />{/each}
    {#if uradorahyoujihai !== undefined && uradorahyoujihai.length > 0}
      <br />
      {#each stringToArrayPlain(uradorahyoujihai) as p}<Pai
          pai={p}
          isDora={doras.includes(p)}
          isRemoved={false}
          hide={false}
        />{/each}{#each new Array((10 - uradorahyoujihai.length) / 2).fill('back') as p}<Pai
          pai={p}
          isDora={false}
          isRemoved={false}
          hide={true}
        />{/each}
    {/if}
  </p>
  <pre>{result ?? ''}</pre>
  <h2>Players</h2>
  <dl class="players">
    {#each Array.from(players.entries()) as [key, value]}
      {@const profile = JSON.parse(value?.content || '{}')}
      {@const paigazouTehai = stringToArrayWithFuro(tehai.get(key) ?? '')}
      {@const paigazouSutehai = stringToArrayPlain(sutehai.get(key) ?? '')}
      <dt class={lastEventsToReply.has(key) ? 'player turn' : 'player'}>
        {kaze.get(key) ?? '?'}家
        {profile.display_name ?? ''} @{profile.name ?? ''}
        {points.get(key) ?? 0}点 {pointDiff.get(key) ?? ''}
        <br /><img
          class="player"
          alt={profile.name ?? ''}
          title={profile.name ?? ''}
          src={profile.picture ?? getRoboHashURL(key)}
        />
        <div class="command">
          {#if loginPubkey !== undefined && loginPubkey === key}<Command
              {isNakuTurn}
              {lastEventsToReply}
              {rxNostr}
              {loginPubkey}
              {nakuKinds}
              {tehai}
              {sutehaiSaved}
              {doras}
              {isSutehaiTurn}
              {sutehaiCommand}
              {tsumohai}
              {nokori}
              {setSutehai}
              isRichi={(richiJunme.get(loginPubkey) ?? -1) >= 0}
              {sendDapai}
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
                class="dapai"
                disabled={sutehaiCommand === 'richi' &&
                  getShanten(
                    removeHai(
                      addHai(tehai.get(key) ?? '', tsumohai.get(key) ?? ''),
                      pai,
                    ),
                  )[0] > 0}
                on:click={() => sendDapai(pai)}
                ><Pai
                  {pai}
                  isDora={doras.includes(pai)}
                  isRemoved={false}
                  hide={loginPubkey !== undefined &&
                    loginPubkey !== key &&
                    result === ''}
                /></button
              >
            {:else}
              <Pai
                {pai}
                isDora={doras.includes(pai)}
                isRemoved={false}
                hide={loginPubkey !== undefined &&
                  loginPubkey !== key &&
                  result === ''}
              />
            {/if}
          {/each}
          {#each paigazouTehai?.at(1) ?? [] as pai}
            {@const pa = stringToArrayPlain(pai)}
            &lt;
            {#each pa as p}
              <Pai
                pai={p}
                isDora={doras.includes(p)}
                isRemoved={false}
                hide={false}
              />
            {/each}
            &gt;
          {/each}
          {#each paigazouTehai?.at(2) ?? [] as pai}
            {@const pa = stringToArrayPlain(pai)}
            (
            {#each pa as p}
              <Pai
                pai={p}
                isDora={doras.includes(p)}
                isRemoved={false}
                hide={false}
              />
            {/each}
            )
          {/each}
          {#if tsumohai.get(key)?.length ?? 0 > 0}
            {#if isSutehaiTurn && loginPubkey === key}
              <button
                class="dapai"
                disabled={sutehaiCommand === 'richi' &&
                  getShanten(
                    removeHai(
                      addHai(tehai.get(key) ?? '', tsumohai.get(key) ?? ''),
                      tsumohai.get(key) ?? '',
                    ),
                  )[0] > 0}
                on:click={() => sendDapai(tsumohai.get(key) ?? '')}
                ><Pai
                  pai={tsumohai.get(key) ?? ''}
                  isDora={doras.includes(tsumohai.get(key) ?? '')}
                  isRemoved={false}
                  hide={loginPubkey !== undefined &&
                    loginPubkey !== key &&
                    result === ''}
                /></button
              >
            {:else}
              <Pai
                pai={tsumohai.get(key) ?? ''}
                isDora={doras.includes(tsumohai.get(key) ?? '')}
                isRemoved={false}
                hide={loginPubkey !== undefined &&
                  loginPubkey !== key &&
                  result === ''}
              />
            {/if}
          {/if}
        </div>
        <br />
        <div class="kawa">
          {#each paigazouSutehai as p, i}{#if richiJunme.get(key) === i}<img
                src={awayuki_mahjong_emojis.mahjong_stick1000}
                alt=""
                class="pai"
              />{/if}{#if [6, 12].includes(i)}<br />{/if}<Pai
              pai={p}
              isDora={doras.includes(p)}
              isRemoved={furoJunme.get(key)?.includes(i) ?? false}
              hide={false}
            />{/each}
        </div>
      </dd>
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
  牌画像 (c)
  <a
    href="https://awayuki.github.io/emojis.html#mahjong"
    target="_blank"
    rel="noopener noreferrer">awayuki</a
  >
</footer>

<style>
  .player {
    height: 64px;
  }
  .pai {
    height: 30px;
  }
  .players dt {
    height: 130px;
    width: 15em;
  }
  .players dt.turn {
    box-shadow: 1px 1px 5px 1px purple;
  }
  .players dt img.player {
    float: left;
  }
  .players dt div.command {
    margin-left: 64px;
  }
  .players dd {
    height: 130px;
  }
  .players dd .tehai {
    display: inline-block;
  }
  .players dd .kawa {
    display: inline-block;
    line-height: 66%;
  }
  .log {
    border: 1px gray solid;
    height: 10em;
    overflow-y: auto;
  }
  button.dapai {
    background-color: transparent;
    border: none;
    outline: none;
    padding: 0;
    height: 30px;
    cursor: pointer;
  }
  button.dapai:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  @media all and (min-width: 480px) {
    .players dt {
      float: left;
      clear: both;
    }
    #log {
      clear: both;
    }
    .players dd {
      margin-inline-start: 16em;
    }
  }
</style>
