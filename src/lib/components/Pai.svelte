<script lang="ts">
  import { getEmojiUrl } from '$lib/utils';

  export let pai: string;
  export let isDora: boolean;
  export let hide: boolean;
</script>

<img
  class={isDora ? 'pai dora' : 'pai'}
  alt={pai}
  src={getEmojiUrl(hide ? '5z' : pai)}
/>

<style>
  .pai {
    height: 30px;
  }
  .dora {
    box-shadow: 1px 1px 1px 1px yellow;
  }
</style>
