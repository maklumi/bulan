<script>
  import storTarikh, { padam } from "./stor";

  let masaMasuk;
  $: masaMasuk = $storTarikh[0];
  $: senaraiPesakit = $storTarikh.slice(1);
</script>

<div
  class="bg-pink-200 uppercase text-center tracking-wide border-purple-500 rounded
max-h-max max-w-max p-2 m-2 border-2"
>
  <p>Klinik mula: {masaMasuk ? masaMasuk.masa : "—"}</p>
  {#if senaraiPesakit.length !== 0}
    <p>Bilangan kiraan: {senaraiPesakit.length}</p>
  {/if}
  <ol>
    {#each senaraiPesakit as { id, masa, gest }}
      <li class="py-1 flex justify-between mt-1 px-1">
        <button
          class="bg-purple-400 hover:bg-purple-600 text-white px-1 py-0"
          on:click={() => padam(id)}
        >
          {masa.slice(-5)}
        </button>
        <div>LMP: {masa.slice(0, -5)} POA: {gest.week}+{gest.days}/7</div>
      </li>
    {:else}
      <div>Selamat Bertugas</div>
    {/each}
  </ol>
</div>

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
