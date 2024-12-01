<script lang="ts">
	import { getEmojiUrl } from '$lib/utils';

	let {
		pai,
		isDora,
		isRemoved,
		isNaku,
		isAtari,
		isHidden,
		isRotated,
		isKakan,
		isSkipped
	}: {
		pai: string;
		isDora: boolean;
		isRemoved: boolean;
		isNaku: boolean;
		isAtari: boolean;
		isHidden: boolean;
		isRotated: boolean;
		isKakan: boolean;
		isSkipped: boolean;
	} = $props();
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
		/>{#if isRotated && isKakan}<img class="pai" alt={pai} src={getEmojiUrl(pai)} />
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
