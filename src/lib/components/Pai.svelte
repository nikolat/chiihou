<script lang="ts">
  import { getEmojiUrl } from '$lib/utils';

  export let pai: string;
  export let isDora: boolean;
  export let isRemoved: boolean;
  export let isNaku: boolean;
  export let isAtari: boolean;
  export let isHidden: boolean;
</script>

<img
  class={'pai' +
    (isDora && !isHidden ? ' dora' : '') +
    (isRemoved ? ' removed' : '') +
    (isNaku ? ' naku' : '') +
    (isAtari ? ' atari' : '')}
  alt={pai}
  src={getEmojiUrl(isHidden ? 'back' : pai)}
/>

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
</style>
