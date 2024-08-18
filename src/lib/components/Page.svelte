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
    canAnkan,
    canKakan,
    canTsumo,
    getEmojiUrl,
    insertEventIntoDescendingList,
    setFuro,
    sortEvents,
  } from '$lib/utils';
  import {
    addHai,
    removeHai,
    stringToArrayPlain,
    stringToArrayWithFuro,
  } from '$lib/mjlib/mj_common';
  import { canRichi, getChiMaterial } from '$lib/mjlib/mj_ai';
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
  let isRichi: Map<string, boolean> = new Map<string, boolean>();
  let bafu: string;
  let tsumibou: number;
  let kyoutaku: number;
  let dorahyoujihai: string;
  let result: string;
  let sutehaiSaved: string;
  let sutehaiCommand: string;
  let nokori: number;

  let loginPubkey: string | undefined;
  let lastEventToReply: NostrEvent | undefined;
  let requestedCommand: string | undefined;
  let nakuKinds: string[] | undefined;

  let rxNostr: RxNostr;

  const sleep = (time: number) => new Promise((r) => setTimeout(r, time));
  const sleepInterval = 500;

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
    if (lastEventToReply === undefined) return;
    rxNostr.send({
      kind: 42,
      content: `nostr:${nip19.npubEncode(mahjongServerPubkey)} sutehai? ${sutehaiCommand} ${pai}`,
      tags: getTagsReply(lastEventToReply),
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

  const sendReply = (message: string) => {
    if (lastEventToReply === undefined) return;
    rxNostr.send({
      kind: 42,
      content: `nostr:${nip19.npubEncode(mahjongServerPubkey)} naku? ${message}`,
      tags: getTagsReply(lastEventToReply),
    });
  };

  const setSutehai = (value: string) => {
    sutehaiCommand = value;
  };

  const getTagsReply = (event: NostrEvent): string[][] => {
    const tagsReply: string[][] = [];
    const tagRoot = event.tags.find(
      (tag) => tag.length >= 3 && tag[0] === 'e' && tag[3] === 'root',
    );
    if (tagRoot !== undefined) {
      tagsReply.push(tagRoot);
      tagsReply.push(['e', event.id, '', 'reply']);
    } else {
      tagsReply.push(['e', event.id, '', 'root']);
    }
    for (const tag of event.tags.filter(
      (tag) => tag.length >= 2 && tag[0] === 'p' && tag[1] !== event.pubkey,
    )) {
      tagsReply.push(tag);
    }
    tagsReply.push(['p', event.pubkey, '']);
    return tagsReply;
  };

  onMount(() => {
    rxNostr = createRxNostr({ verifier });
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
      .subscribe({ next, complete });
    const subscriptionF = rxNostr
      .use(rxReqF)
      .pipe(uniq(flushes$))
      .subscribe((packet) => {
        //console.log(packet);
        events = insertEventIntoDescendingList(events, packet.event);
        replay([packet.event]);
      });
    rxReqB.emit({
      kinds: [42],
      authors: [mahjongServerPubkey],
      '#e': [mahjongRoomId],
      limit: 200,
      until: now,
    });
    rxReqB.over();

    const replay = async (events: NostrEvent[], sleepInterval?: number) => {
      for (const ev of events) {
        if (ev.content.includes('GET')) {
          lastEventToReply = ev;
          const m = ev.content.match(
            /GET\s(\S+)\s?(\S+)?\s?(\S+)?\s?(\S+)?\s?(\S+)?/,
          );
          if (m === null) return;
          const command = m[1];
          requestedCommand = command;
          if (command === 'naku?') {
            let i = 2;
            nakuKinds = [];
            while (m[i] !== undefined) {
              nakuKinds.push(m[i]);
              i++;
            }
          }
          continue;
        }
        if (ev.content.includes('NOTIFY')) {
          if (sleepInterval !== undefined) await sleep(sleepInterval);
          lastEventToReply = undefined;
          requestedCommand = undefined;
          nakuKinds = undefined;
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
              tehai = new Map<string, string>();
              tsumohai = new Map<string, string>();
              sutehai = new Map<string, string>();
              say = new Map<string, string>();
              isRichi = new Map<string, boolean>();
              pointDiff = new Map<string, string>();
              dorahyoujihai = '';
              sutehaiCommand = 'sutehai';
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
              nokori = parseInt(m[3]);
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
                isRichi.set(pubkeySS, true);
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

  $: isSutehaiTurn =
    lastEventToReply !== undefined &&
    lastEventToReply.tags.some(
      (tag) => tag.length >= 2 && tag[0] === 'p' && tag[1] === loginPubkey,
    ) &&
    requestedCommand === 'sutehai?';
  $: isNakuTurn =
    lastEventToReply !== undefined &&
    lastEventToReply.tags.some(
      (tag) => tag.length >= 2 && tag[0] === 'p' && tag[1] === loginPubkey,
    ) &&
    requestedCommand === 'naku?';
</script>

<svelte:head>
  <title>rx-nostr-practice</title>
</svelte:head>

<header>
  <h1>rx-nostr-practice</h1>
  {#if loginPubkey === undefined}
    <button on:click={getNpubWithNIP07}>NIP-07 Login</button>
  {:else}
    <button
      on:click={() => {
        loginPubkey = undefined;
      }}>Logout</button
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
    naku?
    <button
      disabled={!isNakuTurn}
      on:click={() => {
        sendReply('no');
      }}>no</button
    >
    <button
      disabled={!isNakuTurn || !nakuKinds?.includes('pon')}
      on:click={() => {
        sendReply('pon');
      }}>pon</button
    >
    {#if isNakuTurn && nakuKinds?.includes('chi')}
      {#each getChiMaterial(tehai.get(loginPubkey) ?? '', sutehaiSaved) as cm}
        {@const pai1 = cm.slice(0, 2)}
        {@const pai2 = cm.slice(2, 4)}
        <button
          on:click={() => {
            sendReply(`chi ${pai1} ${pai2}`);
          }}>chi</button
        ><img class="pai" alt={pai1} src={getEmojiUrl(pai1)} /><img
          class="pai"
          alt={pai2}
          src={getEmojiUrl(pai2)}
        />
      {/each}
    {:else}
      <button disabled={true}>chi</button>
    {/if}
    <button
      disabled={!isNakuTurn || !nakuKinds?.includes('kan')}
      on:click={() => {
        sendReply('kan');
      }}>kan</button
    >
    <button
      disabled={!isNakuTurn || !nakuKinds?.includes('ron')}
      on:click={() => {
        sendReply('ron');
      }}>ron</button
    >
    <br />
    sutehai?
    <button
      disabled={!isSutehaiTurn ||
        !(
          canAnkan(
            tehai.get(loginPubkey) ?? '',
            tsumohai.get(loginPubkey) ?? '',
            nokori,
          ) ||
          canKakan(
            tehai.get(loginPubkey) ?? '',
            tsumohai.get(loginPubkey) ?? '',
            nokori,
          )
        )}
      on:click={() => {
        setSutehai('kan');
      }}>kan</button
    >
    <button
      disabled={!isSutehaiTurn ||
        sutehaiCommand === 'richi' ||
        !canRichi(
          tehai.get(loginPubkey) ?? '',
          tsumohai.get(loginPubkey) ?? '',
          isRichi.get(loginPubkey) ?? false,
          nokori,
        )}
      on:click={() => {
        setSutehai('richi');
      }}>richi</button
    >
    <button
      disabled={!isSutehaiTurn ||
        !canTsumo(
          tehai.get(loginPubkey) ?? '',
          tsumohai.get(loginPubkey) ?? '',
        )}
      on:click={() => {
        setSutehai('tsumo');
        sendDapai('');
      }}>tsumo</button
    >
  {/if}
</header>
<main>
  <h2>Info</h2>
  <p>
    {bafu ?? '?'}場 {tsumibou ?? '?'}本場 供託{kyoutaku ?? '?'}点 ドラ表示牌{#each stringToArrayPlain(dorahyoujihai ?? '') as p}<img
        class="pai"
        alt={p}
        src={getEmojiUrl(p)}
      />{/each} 残り{nokori ?? 0}枚
  </p>
  <pre>{result ?? ''}</pre>
  <h2>Players</h2>
  <dl class="players">
    {#each players.entries() as [key, value]}
      {@const profile = JSON.parse(value.content)}
      {@const paigazouTehai = stringToArrayWithFuro(tehai.get(key) ?? '')}
      {@const paigazouSutehai = stringToArrayPlain(sutehai.get(key) ?? '')}
      <dt
        class={lastEventToReply?.tags.some(
          (tag) => tag.length >= 2 && tag[0] === 'p' && tag[1] === key,
        )
          ? 'player turn'
          : 'player'}
      >
        {profile.display_name ?? ''} @{profile.name ?? ''}
        {points.get(key)}点 {pointDiff.get(key) ?? ''}
        <br /><img
          class="player"
          alt=""
          src={profile.picture ?? getRoboHashURL(key)}
        />{say.get(key) ? `＜ [${say.get(key)}]` : ''}
      </dt>
      <dd>
        <div class="tehai">
          {#each paigazouTehai?.at(0) ?? [] as pai}
            {#if isSutehaiTurn}
              <button class="dapai" on:click={() => sendDapai(pai)}
                ><img class="pai" alt={pai} src={getEmojiUrl(pai)} /></button
              >
            {:else}
              <img class="pai" alt={pai} src={getEmojiUrl(pai)} />
            {/if}
          {/each}
          {#each paigazouTehai?.at(1) ?? [] as pai}
            {@const pa = stringToArrayPlain(pai)}
            &lt;
            {#each pa as p}
              <img class="pai" alt={pai} src={getEmojiUrl(p)} />
            {/each}
            &gt;
          {/each}
          {#each paigazouTehai?.at(2) ?? [] as pai}
            {@const pa = stringToArrayPlain(pai)}
            (
            {#each pa as p}
              <img class="pai" alt={pai} src={getEmojiUrl(p)} />
            {/each}
            )
          {/each}
          {#if tsumohai.get(key)?.length ?? 0 > 0}
            {#if isSutehaiTurn}
              <button
                class="dapai"
                on:click={() => sendDapai(tsumohai.get(key) ?? '')}
                ><img
                  class="pai"
                  alt={tsumohai.get(key)}
                  src={getEmojiUrl(tsumohai.get(key) ?? '')}
                /></button
              >
            {:else}
              <img
                class="pai"
                alt={tsumohai.get(key)}
                src={getEmojiUrl(tsumohai.get(key) ?? '')}
              />
            {/if}
          {/if}
        </div>
        <br />
        <div class="kawa">
          {#each paigazouSutehai as paigazou, i}{#if [6, 12].includes(i)}<br
              />{/if}<img
              class="pai"
              alt={paigazou}
              src={getEmojiUrl(paigazou)}
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
  .players dt {
    float: left;
    clear: both;
    height: 100px;
    width: 15em;
  }
  .players dt.turn {
    box-shadow: 1px 1px 5px 1px purple;
  }
  .players dd {
    margin-inline-start: 16em;
    height: 130px;
  }
  .players dd .tehai {
    display: inline-block;
  }
  .players dd .kawa {
    display: inline-block;
    line-height: 66%;
  }
  .player {
    height: 64px;
  }
  .pai {
    height: 30px;
  }
  #log {
    clear: both;
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
</style>
