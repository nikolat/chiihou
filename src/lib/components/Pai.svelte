<script lang="ts">
  import { getEmojiUrl } from '$lib/utils';

  export let pai: string;
  export let isDora: boolean;
  export let isRemoved: boolean;
  export let hide: boolean;
</script>

<img
  class={'pai' + (isDora ? ' dora' : '') + (isRemoved ? ' removed' : '')}
  alt={pai}
  src={getEmojiUrl(hide ? 'back' : pai)}
/>

<style>
  .pai {
    height: 30px;
  }
  .dora {
    box-shadow: 1px 1px 1px 1px yellow;
  }
  .removed {
    opacity: 0.25;
  }
</style>
