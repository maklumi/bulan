<script>
  import storTarikh, { padam } from './stor'
  import { get_store_value } from 'svelte/internal'

  let masaMasuk = $storTarikh[0]
  $: senaraiPesakit = $storTarikh.slice(1)
</script>

<style>
  li {
    background-color: #fff5f7;
  }
  li:nth-child(odd) {
    background-color: #fbb6ce;
  }
  button {
    cursor: no-drop;
  }
</style>

<p>Klinik mula: {masaMasuk.masa}</p>
{#if senaraiPesakit.length !== 0}
  <p>Bilangan kiraan: {senaraiPesakit.length}</p>
{/if}
<ol>
  {#each senaraiPesakit as { id, masa, gest }}
    <li class="py-1 flex justify-between mt-1 px-1">
      <button
        class="bg-purple-400 hover:bg-purple-600 text-white px-1 py-0 "
        on:click={() => padam(id)}>
        {masa.slice(-5)}
      </button>
      <div>LMP: {masa.slice(0, -5)} POA: {gest.week}+{gest.days}/7</div>
    </li>
  {:else}
    <div>Selamat Bertugas</div>
  {/each}
</ol>
