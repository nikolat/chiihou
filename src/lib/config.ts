import type { WindowNostr } from 'nostr-tools/nip07';
import { npubEncode } from 'nostr-tools/nip19';

export const linkGitHub = 'https://github.com/nikolat/rx-nostr-practice';

export const defaultRelays = [
  'wss://relay.nostr.wirednet.jp/',
  'wss://nrelay.c-stellar.net/',
];
export const getRoboHashURL = (pubkey: string) => {
  return `https://robohash.org/${npubEncode(pubkey)}?set=set4`;
};

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}
