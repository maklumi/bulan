<script>
  import storTarikh, { padam } from "../stor";

  let masaMasuk;
  $: masaMasuk = $storTarikh[0];
  $: senaraiPesakit = $storTarikh.slice(1);
</script>

<div
  class="bg-pink-100 uppercase text-center tracking-wide border-purple-400 rounded
max-h-max max-w p-2 m-2 border-2"
>
  <p>Klinik mula: {masaMasuk ? masaMasuk.masa : "—"}</p>
  {#if senaraiPesakit.length !== 0}
    <p>Bilangan kiraan: <strong class="pill-number bg-pink-400"> {senaraiPesakit.length}</strong></p>
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
   .pill-number {
    display: inline-block;
    color: white;
    font-size: 20px;
    padding: 2px 16px;          /* Horizontal padding for pill shape */
    border-radius: 999px;       /* Large radius for pill effect */
  }
</style>
