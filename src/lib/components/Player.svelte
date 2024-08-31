<script lang="ts">
  import type { RxNostr } from 'rx-nostr';
  import type { NostrEvent } from 'nostr-tools/pure';
  import { defaultRelays, getRoboHashURL } from '$lib/config';
  import { zap } from '$lib/utils';
  import {
    addHai,
    removeHai,
    stringToArrayPlain,
    stringToArrayWithFuro,
  } from '$lib/mjlib/mj_common';
  import { getShanten } from '$lib/mjlib/mj_shanten';
  import Command from '$lib/components/Command.svelte';
  import Pai from '$lib/components/Pai.svelte';

  export let key: string;
  export let value: NostrEvent | undefined;
  export let sekijun: string[];
  export let tehai: Map<string, string>;
  export let sutehai: Map<string, string>;
  export let lastEventsToReply: Map<string, NostrEvent>;
  export let requestedCommand: string | undefined;
  export let kaze: Map<string, string>;
  export let points: Map<string, number>;
  export let pointDiff: Map<string, string>;
  export let loginPubkey: string | undefined;
  export let rxNostr: RxNostr | undefined;
  export let nakuKinds: Map<string, string[] | undefined>;
  export let sutehaiSaved: string;
  export let doras: string[];
  export let sutehaiCommand: string;
  export let tsumohai: Map<string, string>;
  export let nokori: number | undefined;
  export let setSutehai: (value: string) => void;
  export let richiJunme: Map<string, number>;
  export let callSendDapai: (pai: string | undefined) => void;
  export let say: Map<string, string>;
  export let pubkeysToOpenTehai: Set<string>;
  export let furoJunme: Map<string, number[]>;
  export let furoHistory: Map<string, [{ sutehai: string; pubkey: string }]>;
  export let kakanHistory: Map<string, string[]>;
  export let sutehaiPlayerSaved: string;
  export let isAgariPlayer: boolean;
  export let isFurikomiPlayer: boolean;
  export let isKyokuEnd: boolean;

  const getSekijunIndex = (pubkey: string): number => {
    const selfIndex = sekijun.indexOf(key);
    const otherIndex = sekijun.indexOf(pubkey);
    return (selfIndex - otherIndex - 1 + 4) % 4;
  };

  $: profile = JSON.parse(value?.content || '{}');
  $: paigazouTehai = stringToArrayWithFuro(tehai.get(key) ?? '');
  $: paigazouSutehai = stringToArrayPlain(sutehai.get(key) ?? '');
  $: isSutehaiTurn =
    loginPubkey !== undefined &&
    lastEventsToReply.has(loginPubkey) &&
    requestedCommand === 'sutehai?';
</script>

<dt
  class={'player' +
    (lastEventsToReply.has(key) && requestedCommand === 'sutehai?'
      ? ' sutehai_turn'
      : '') +
    (lastEventsToReply.has(key) &&
    requestedCommand === 'naku?' &&
    (loginPubkey === undefined ||
      (loginPubkey !== undefined && loginPubkey === key))
      ? ' naku_turn'
      : '') +
    (isAgariPlayer ? ' is_agari' : '') +
    (isFurikomiPlayer ? ' is_furikomi' : '')}
>
  {kaze.get(key) ?? '?'}家
  {profile.display_name ?? ''} @{profile.name ?? ''}
  <br />
  <button class="zap" title="Zap!" on:click={() => zap(key, defaultRelays)}
    >⚡️</button
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
        {callSendDapai}
        {isKyokuEnd}
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
          on:click={() => callSendDapai(pai)}
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
      {@const sutehaiPlayerIndex = getSekijunIndex(sutehaiPlayer)}
      {@const isKakan = kakanHistory.get(key)?.includes(sutehai) ?? false}
      {#each pa as p, i}
        <Pai
          pai={i === sutehaiPlayerIndex ? sutehai : p}
          isDora={doras.includes(p)}
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
          class="dapai"
          disabled={sutehaiCommand === 'richi' &&
            getShanten(
              removeHai(
                addHai(tehai.get(key) ?? '', tsumohai.get(key) ?? ''),
                tsumohai.get(key) ?? '',
              ),
            )[0] > 0}
          on:click={() => callSendDapai(tsumohai.get(key))}
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
    height: 130px;
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
    height: 130px;
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
  button.dapai:disabled {
    cursor: not-allowed;
    opacity: 0.5;
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
