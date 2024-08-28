<script lang="ts">
  import { getEmojiUrl } from '$lib/utils';

  export let pai: string;
  export let isDora: boolean;
  export let isRemoved: boolean;
  export let isNaku: boolean;
  export let isAtari: boolean;
  export let isHidden: boolean;
  export let isRotated: boolean;
  export let isKakan: boolean;
  export let isSkipped: boolean;
</script>

{#if !isSkipped}
  <span class={'pai_container' + (isRotated ? ' rotate' : '')}>
    <img
      class={'pai' +
        (isDora && !isHidden ? ' dora' : '') +
        (isRemoved ? ' removed' : '') +
        (isNaku ? ' naku' : '') +
        (isAtari ? ' atari' : '')}
      alt={pai}
      src={getEmojiUrl(isHidden ? 'back' : pai)}
    />{#if isRotated && isKakan}<img
        class="pai"
        alt={pai}
        src={getEmojiUrl(pai)}
      />
    {/if}
  </span>
{/if}

<style>
  .pai {
    height: 30px;
  }
  .dora {
    box-shadow: 1px 1px 1px 1px yellow;
  }
  .naku {
    box-shadow: 1px 1px 1px 1px green;
  }
  .atari {
    box-shadow: 1px 1px 1px 1px red;
  }
  .removed {
    opacity: 0.25;
  }
  .rotate {
    display: inline-block;
    width: 30px;
    white-space: nowrap;
    text-align: left;
    transform-origin: 0% 0%;
    transform: rotate(270deg) translate(-30px, 0px);
  }
</style>
