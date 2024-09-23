import { createRxForwardReq, createRxBackwardReq, uniq, type EventPacket, type RxNostr } from 'rx-nostr';
import { Subject } from 'rxjs';
import type { NostrEvent } from 'nostr-tools/core';
import { binarySearch } from 'nostr-tools/utils';
import * as nip19 from 'nostr-tools/nip19';
import { addHai, compareFn, removeHai, stringToArrayWithFuro } from '$lib/mjlib/mj_common';
import { getShanten } from '$lib/mjlib/mj_shanten';
import { getKakanHai } from '$lib/mjlib/mj_ai';
import { chatHashtag } from '$lib/config';

export const enum RxReqMode {
  Backward,
  Forward,
}

export const fetchEventsOfChannel = (
  rxNostr: RxNostr,
  mahjongChannelIds: string[],
  setMahjongChannelEvents: (value: Map<string, NostrEvent | undefined>) => void,
) => {
  const mahjongChannelEvents: Map<string, NostrEvent | undefined> = new Map<string, NostrEvent | undefined>();
  const rxReqB = createRxBackwardReq();
  const now = Math.floor(Date.now() / 1000);
  const flushes$ = new Subject<void>();
  const next = (packet: EventPacket) => {
    const event = packet.event;
    mahjongChannelEvents.set(event.id, event);
  };
  const complete = () => {
    setMahjongChannelEvents(mahjongChannelEvents);
  };
  const subscriptionB = rxNostr.use(rxReqB).pipe(uniq(flushes$)).subscribe({ next, complete });
  rxReqB.emit([
    {
      kinds: [40],
      ids: mahjongChannelIds,
      until: now,
    },
  ]);
  rxReqB.over();
};

interface Subscription {
  unsubscribe(): void;
}

export const fetchEventsToReplay = (
  rxNostr: RxNostr,
  mahjongChannelId: string,
  mahjongServerPubkey: string,
  pushSubscription: (value: Subscription) => void,
  setEvents: (value: NostrEvent[]) => void,
  setChatEvents: (value: NostrEvent[]) => void,
  setStatus: (value: string) => void,
  setChatMembers: (value: Map<string, NostrEvent>) => void,
  replay: (events: NostrEvent[], mode: RxReqMode) => Promise<void>,
  setSleepInterval: (value: number) => void,
) => {
  let events: NostrEvent[] = [];
  let chatEvents: NostrEvent[] = [];
  let statusEvent: NostrEvent;
  const chatMembers: Map<string, NostrEvent> = new Map<string, NostrEvent>();
  const rxReqB = createRxBackwardReq();
  const now = Math.floor(Date.now() / 1000);
  const flushes$ = new Subject<void>();
  const next = (packet: EventPacket) => {
    const event = packet.event;
    if (event.kind === 0) {
      const ev = chatMembers.get(event.pubkey);
      if (ev === undefined || ev.created_at < event.created_at) {
        chatMembers.set(event.pubkey, event);
        setChatMembers(chatMembers);
      }
    } else if (event.kind === 30315) {
      if (statusEvent === undefined || statusEvent.created_at < event.created_at) {
        statusEvent = event;
        setStatus(statusEvent.content);
      }
    } else if (event.tags.some((tag) => tag.length >= 2 && tag[0] === 't' && tag[1] === chatHashtag)) {
      chatEvents = insertEventIntoDescendingList(chatEvents, event);
      setChatEvents(chatEvents);
    } else {
      events = insertEventIntoDescendingList(events, event);
      setEvents(events);
    }
  };
  const complete1 = async () => {
    const lastKyokuStartEvent = events.find((ev) => ev.tags.some((tag) => tag.length >= 2 && tag[0] === 't' && tag[1] === 'kyokustart'));
    if (lastKyokuStartEvent === undefined) {
      console.warn('#kyokustart is not found');
      return;
    }
    const chatMemberPubkeys = Array.from(new Set<string>(chatEvents.map((ev) => ev.pubkey)));
    const rxReqB2 = createRxBackwardReq();
    const subscriptionB2 = rxNostr.use(rxReqB2).pipe(uniq(flushes$)).subscribe({ next, complete: complete2 });
    rxReqB2.emit([
      {
        kinds: [42],
        authors: [mahjongServerPubkey],
        '#e': [mahjongChannelId],
        since: lastKyokuStartEvent.created_at,
        until: now,
      },
      {
        kinds: [0],
        authors: chatMemberPubkeys,
        until: now,
      },
    ]);
    rxReqB2.over();
  };
  const complete2 = async () => {
    const isKyokuEnd = events.some((ev) => ev.content.includes('NOTIFY kyokuend'));
    if (!isKyokuEnd) {
      setSleepInterval(0);
    }
    await replay(events.toReversed(), RxReqMode.Backward);
    let eventsQueue: NostrEvent[] = [];
    let timer: number;
    const rxReqF = createRxForwardReq();
    const subscriptionF = rxNostr
      .use(rxReqF)
      .pipe(uniq(flushes$))
      .subscribe((packet) => {
        const event = packet.event;
        if (event.tags.some((tag) => tag.length >= 2 && tag[0] === 't' && tag[1] === chatHashtag)) {
          chatEvents = insertEventIntoDescendingList(chatEvents, event);
          setChatEvents(chatEvents);
          if (!chatMembers.has(event.pubkey)) {
            const rxReqB3 = createRxBackwardReq();
            const subscriptionB3 = rxNostr.use(rxReqB3).pipe(uniq(flushes$)).subscribe({ next });
            rxReqB3.emit({
              kinds: [0],
              authors: [event.pubkey],
              until: now,
            });
            rxReqB3.over();
          }
        } else if (event.kind === 30315) {
          statusEvent = event;
          setStatus(statusEvent.content);
        } else {
          events = insertEventIntoDescendingList(events, packet.event);
          setEvents(events);
          //稀にイベントが前後して到着する場合があるため近い時間に到着したイベントは溜めておきソートしてからreplayに送る
          eventsQueue = insertEventIntoDescendingList(eventsQueue, packet.event);
          clearTimeout(timer);
          timer = setTimeout(() => {
            const eventsQueueCopy = eventsQueue;
            eventsQueue = [];
            replay(eventsQueueCopy.toReversed(), RxReqMode.Forward);
          }, 100);
        }
      });
    rxReqF.emit([
      {
        kinds: [42],
        authors: [mahjongServerPubkey],
        '#e': [mahjongChannelId],
        since: now,
      },
      {
        kinds: [30315],
        authors: [mahjongServerPubkey],
        '#d': ['general'],
        since: now,
      },
      {
        kinds: [42],
        '#e': [mahjongChannelId],
        '#t': [chatHashtag],
        since: now,
      },
    ]);
    pushSubscription(subscriptionF);
  };
  const subscriptionB = rxNostr.use(rxReqB).pipe(uniq(flushes$)).subscribe({ next, complete: complete1 });
  rxReqB.emit([
    {
      kinds: [42],
      authors: [mahjongServerPubkey],
      '#e': [mahjongChannelId],
      '#t': ['gamestart'],
      limit: 4,
      until: now,
    },
    {
      kinds: [42],
      authors: [mahjongServerPubkey],
      '#e': [mahjongChannelId],
      '#t': ['kyokustart'],
      limit: 1,
      until: now,
    },
    {
      kinds: [30315],
      authors: [mahjongServerPubkey],
      '#d': ['general'],
      limit: 1,
      until: now,
    },
    {
      kinds: [42],
      '#e': [mahjongChannelId],
      '#t': [chatHashtag],
      limit: 10,
      until: now,
    },
  ]);
  rxReqB.over();
};

export const fetchProfiles = (
  rxNostr: RxNostr,
  players: Map<string, NostrEvent | undefined>,
  setPlayers: (value: Map<string, NostrEvent | undefined>) => void,
) => {
  const next = (packet: EventPacket) => {
    const event = packet.event;
    const profile = players.get(event.pubkey);
    if (profile === undefined || profile.created_at < event.created_at) {
      players.set(event.pubkey, event);
      setPlayers(players);
    }
  };
  const flushes$ = new Subject<void>();
  const rxReqB = createRxBackwardReq();
  const subscriptionB = rxNostr.use(rxReqB).pipe(uniq(flushes$)).subscribe(next);
  rxReqB.emit({
    kinds: [0],
    authors: Array.from(players.keys()),
    until: Math.floor(Date.now() / 1000),
  });
  rxReqB.over();
};

export const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

export const insertEventIntoDescendingList = (sortedArray: NostrEvent[], event: NostrEvent): NostrEvent[] => {
  const [idx, found] = binarySearch(sortedArray, (b) => {
    if (event.id === b.id) return 0;
    if (event.created_at === b.created_at) return event.id.localeCompare(b.id);
    return b.created_at - event.created_at;
  });
  if (!found) {
    sortedArray.splice(idx, 0, event);
  }
  return sortedArray;
};

export const getTagsReply = (event: NostrEvent): string[][] => {
  const tagsReply: string[][] = [];
  const tagRoot = event.tags.find((tag) => tag.length >= 4 && tag[0] === 'e' && tag[3] === 'root');
  if (tagRoot !== undefined) {
    tagsReply.push(tagRoot);
    tagsReply.push(['e', event.id, '', 'reply']);
  } else {
    tagsReply.push(['e', event.id, '', 'root']);
  }
  for (const tag of event.tags.filter((tag) => tag.length >= 2 && tag[0] === 'p' && tag[1] !== event.pubkey)) {
    tagsReply.push(tag);
  }
  tagsReply.push(['p', event.pubkey, '']);
  return tagsReply;
};

export const getNpubWithNIP07 = async (setLoginPubkey: (value: string | undefined) => void): Promise<void> => {
  const nostr = window.nostr;
  let pubkey: string | undefined;
  if (nostr?.getPublicKey) {
    try {
      pubkey = await nostr.getPublicKey();
    } catch (error) {
      console.error(error);
    }
  }
  setLoginPubkey(pubkey);
};

export const zap = (pubkey: string, relays: string[]) => {
  const elm = document.createElement('button') as HTMLButtonElement;
  elm.dataset.npub = nip19.npubEncode(pubkey);
  elm.dataset.relays = relays.join(',');
  (window as any).nostrZap.initTarget(elm);
  elm.dispatchEvent(new Event('click'));
};

export const sendDapai = (
  rxNostr: RxNostr | undefined,
  pai: string,
  eventToReply: NostrEvent,
  sutehaiCommand: string,
  setSutehaiCommand: (v: string) => void,
) => {
  if (rxNostr === undefined) return;
  const now = Math.floor(Date.now() / 1000);
  rxNostr.send({
    kind: 42,
    content: `nostr:${nip19.npubEncode(eventToReply.pubkey)} sutehai? ${sutehaiCommand} ${pai}`,
    tags: getTagsReply(eventToReply),
    created_at: eventToReply.created_at < now ? now : eventToReply.created_at + 1,
  });
  setSutehaiCommand('sutehai');
};

export const sendMention = (
  rxNostr: RxNostr | undefined,
  mahjongChannelId: string,
  pubkey: string,
  message: string,
  last_created_at: number,
) => {
  if (rxNostr === undefined) return;
  const now = Math.floor(Date.now() / 1000);
  rxNostr.send({
    kind: 42,
    content: `nostr:${nip19.npubEncode(pubkey)} ${message}`,
    tags: [
      ['e', mahjongChannelId, '', 'root'],
      ['p', pubkey, ''],
    ],
    created_at: last_created_at < now ? now : last_created_at + 1,
  });
};

export const sendChatMessage = (rxNostr: RxNostr | undefined, mahjongChannelId: string, message: string) => {
  if (rxNostr === undefined) return;
  rxNostr.send({
    kind: 42,
    content: `${message} #${chatHashtag}`,
    tags: [
      ['e', mahjongChannelId, '', 'root'],
      ['t', chatHashtag],
    ],
  });
};

export const setFuro = (tehai: string, sute: string, haiUsed: string): string => {
  tehai = removeHai(tehai, haiUsed);
  tehai = addFuro(tehai, sute + haiUsed, '<', '>');
  return tehai;
};

export const setKakan = (tehai: string, kakanHai: string): string => {
  tehai = tehai.replace(kakanHai.repeat(3), kakanHai.repeat(4));
  return tehai;
};

export const setAnkan = (tehai: string, ankanHai: string): string => {
  tehai = removeHai(tehai, ankanHai.repeat(4));
  tehai = addFuro(tehai, ankanHai.repeat(4), '(', ')');
  return tehai;
};

const addFuro = (tehai: string, furo: string, s1: string, s2: string): string => {
  const sortedFuro = stringToArrayWithFuro(furo)[0];
  sortedFuro.sort(compareFn);
  const strFuro = sortedFuro.join('');
  const index = tehai.search(/[<\(]/);
  if (index >= 0) {
    return tehai.slice(0, index) + s1 + strFuro + s2 + tehai.slice(index);
  } else {
    return tehai + s1 + strFuro + s2;
  }
};

export const canTsumo = (tehai: string, atariHai: string): boolean => {
  if (atariHai === '') return false;
  //和了かどうか(シャンテン数が-1かどうか)検証する
  const shanten = getShanten(addHai(tehai, atariHai))[0];
  if (shanten !== -1) return false;
  //TODO: 役があるかどうか検証する
  return true;
};

//TODO: もっとちゃんとチェック
export const canAnkan = (tehai: string, tsumoHai: string, nokori: number): boolean => {
  if (nokori === 0) return false;
  const arAnkanHai: string[] = getAnkanHai(addHai(tehai, tsumoHai));
  if (arAnkanHai.length === 0) return false;
  return true;
};

export const getAnkanHai = (hai: string): string[] => {
  const arHai: string[] = stringToArrayWithFuro(hai)[0];
  const arRet: string[] = [];
  for (const h of new Set<string>(arHai)) {
    if (arHai.filter((e) => e === h).length >= 4) arRet.push(h);
  }
  return arRet;
};

//TODO: もっとちゃんとチェック
export const canKakan = (tehai: string, tsumoHai: string, nokori: number): boolean => {
  if (nokori === 0) return false;
  const arKakanHai: string[] = getKakanHai(addHai(tehai, tsumoHai));
  if (arKakanHai.length > 0) return true;
  return false;
};

export const getEmojiUrl = (pai: string): string => {
  return awayuki_mahjong_emojis[convertEmoji(pai)];
};

const convertEmoji = (pai: string) => {
  if (pai === 'back') return 'mahjong_back';
  if (['m', 'p', 's'].includes(pai.at(1) ?? '')) {
    return `mahjong_${pai.at(1)}${pai.at(0)}`;
  } else if (pai.at(1) === 'z') {
    switch (pai.at(0)) {
      case '1':
        return 'mahjong_east';
      case '2':
        return 'mahjong_south';
      case '3':
        return 'mahjong_west';
      case '4':
        return 'mahjong_north';
      case '5':
        return 'mahjong_white';
      case '6':
        return 'mahjong_green';
      case '7':
        return 'mahjong_red';
      default:
        throw TypeError(`Unknown pai: ${pai}`);
    }
  } else {
    throw TypeError(`Unknown pai: ${pai}`);
  }
};

export const awayuki_mahjong_emojis: any = {
  mahjong_m1: 'https://awayuki.github.io/emoji/mahjong-m1.png',
  mahjong_m2: 'https://awayuki.github.io/emoji/mahjong-m2.png',
  mahjong_m3: 'https://awayuki.github.io/emoji/mahjong-m3.png',
  mahjong_m4: 'https://awayuki.github.io/emoji/mahjong-m4.png',
  mahjong_m5: 'https://awayuki.github.io/emoji/mahjong-m5.png',
  mahjong_m6: 'https://awayuki.github.io/emoji/mahjong-m6.png',
  mahjong_m7: 'https://awayuki.github.io/emoji/mahjong-m7.png',
  mahjong_m8: 'https://awayuki.github.io/emoji/mahjong-m8.png',
  mahjong_m9: 'https://awayuki.github.io/emoji/mahjong-m9.png',
  mahjong_p1: 'https://awayuki.github.io/emoji/mahjong-p1.png',
  mahjong_p2: 'https://awayuki.github.io/emoji/mahjong-p2.png',
  mahjong_p3: 'https://awayuki.github.io/emoji/mahjong-p3.png',
  mahjong_p4: 'https://awayuki.github.io/emoji/mahjong-p4.png',
  mahjong_p5: 'https://awayuki.github.io/emoji/mahjong-p5.png',
  mahjong_p6: 'https://awayuki.github.io/emoji/mahjong-p6.png',
  mahjong_p7: 'https://awayuki.github.io/emoji/mahjong-p7.png',
  mahjong_p8: 'https://awayuki.github.io/emoji/mahjong-p8.png',
  mahjong_p9: 'https://awayuki.github.io/emoji/mahjong-p9.png',
  mahjong_s1: 'https://awayuki.github.io/emoji/mahjong-s1.png',
  mahjong_s2: 'https://awayuki.github.io/emoji/mahjong-s2.png',
  mahjong_s3: 'https://awayuki.github.io/emoji/mahjong-s3.png',
  mahjong_s4: 'https://awayuki.github.io/emoji/mahjong-s4.png',
  mahjong_s5: 'https://awayuki.github.io/emoji/mahjong-s5.png',
  mahjong_s6: 'https://awayuki.github.io/emoji/mahjong-s6.png',
  mahjong_s7: 'https://awayuki.github.io/emoji/mahjong-s7.png',
  mahjong_s8: 'https://awayuki.github.io/emoji/mahjong-s8.png',
  mahjong_s9: 'https://awayuki.github.io/emoji/mahjong-s9.png',
  mahjong_east: 'https://awayuki.github.io/emoji/mahjong-east.png',
  mahjong_south: 'https://awayuki.github.io/emoji/mahjong-south.png',
  mahjong_west: 'https://awayuki.github.io/emoji/mahjong-west.png',
  mahjong_north: 'https://awayuki.github.io/emoji/mahjong-north.png',
  mahjong_white: 'https://awayuki.github.io/emoji/mahjong-white.png',
  mahjong_green: 'https://awayuki.github.io/emoji/mahjong-green.png',
  mahjong_red: 'https://awayuki.github.io/emoji/mahjong-red.png',
  mahjong_back: 'https://awayuki.github.io/emoji/mahjong-back.png',
  mahjong_stick100: 'https://awayuki.github.io/emoji/mahjong-stick100.png',
  mahjong_stick1000: 'https://awayuki.github.io/emoji/mahjong-stick1000.png',
};
