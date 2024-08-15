import { npubEncode } from 'nostr-tools/nip19';
export const defaultRelays = [
  'wss://relay.nostr.wirednet.jp/',
  'wss://nrelay.c-stellar.net/',
];
export const getRoboHashURL = (pubkey: string) => {
  return `https://robohash.org/${npubEncode(pubkey)}?set=set4`;
};
