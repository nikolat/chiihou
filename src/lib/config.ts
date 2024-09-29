import type { WindowNostr } from 'nostr-tools/nip07';
import { npubEncode } from 'nostr-tools/nip19';

export const mahjongChannelIds = [
  'c8d5c2709a5670d6f621ac8020ac3e4fc3057a4961a15319f7c0818309407723',
  '06ddcb27b27f667d6487b5128625f25cb2148cf87bff0502aaffe5ca705dc626',
];
export const mahjongServerPubkeys = ['93e68a5f7bf6d35f0cb1288160e42ecdb3396b80bb686a528199dfc5e58ceb25'];

export const mahjongPlayerPubkeys = [
  '1cc73c7cc29a6c0070f39856fdb835bc9e6cbdf4dcdd207fa9eff8cf4d5699df',
  'c5f93ee20ede33299d192d182fa95d523416d669c5c8887e6b2a2456c2e0c300',
  '75fb3240d4af1255a249cf33f9223529ec41f223bb8dd93b82bbe6e799f9e4a1',
];

export const chatHashtag = 'chiihou_chat';

export const linkGitHub = 'https://github.com/nikolat/chiihou';

export const defaultRelays = ['wss://relay.nostr.wirednet.jp/', 'wss://relay-jp.nostr.wirednet.jp/', 'wss://yabu.me/'];
export const getRoboHashURL = (pubkey: string) => {
  return `https://robohash.org/${npubEncode(pubkey)}?set=set4`;
};
export const urlNIP07guide = 'https://welcome.nostr-jp.org/tutorial/nip-07.html';

export const clientTag = ['client', 'chiihou', '31990:6b0a60cff3eca5a2b2505ccb3f7133d8422045cbef40f3d2c6189fb0b952e7d4:1727582360441'];

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}
