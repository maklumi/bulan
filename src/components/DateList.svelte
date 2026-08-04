<script>
  import storTarikh, { padam } from "../stor";

  let masaMasuk;
  $: masaMasuk = $storTarikh[0];
  $: senaraiPesakit = $storTarikh.slice(1);
</script>

<div class="bg-slate-50 p-3 shadow-lg rounded-lg border border-slate-200 w-full max-w-md">
  <p class="text-sky-700 font-semibold">
    Klinik mula: {masaMasuk ? masaMasuk.masa : "—"}
  </p>

  {#if senaraiPesakit.length !== 0}
    <p class="mt-2 text-slate-700">
      Bilangan kiraan:
      <strong
        class="pill-number bg-sky-600 text-white px-3 py-1 rounded-full ml-2"
      >
        {senaraiPesakit.length}
      </strong>
    </p>
  {/if}

  <ol class="mt-3 space-y-2">
    {#each senaraiPesakit as { id, masa, gest }}
      <li class="flex justify-between items-center bg-slate-100 rounded px-2 py-1">
        <button
          class="bg-teal-600 hover:bg-teal-700 text-white px-2 py-1 rounded cursor-pointer"
          on:click={() => padam(id)}
        >
          {masa.slice(-5)}
        </button>
        <div class="text-slate-700 text-sm">
          LMP: {masa.slice(0, -5)} &nbsp; POA: {gest.week}+{gest.days}/7
        </div>
      </li>
    {:else}
      <div class="text-slate-600 italic">Selamat Bertugas</div>
    {/each}
  </ol>
</div>

<style>
  .pill-number {
    display: inline-block;
    font-size: 1rem;
    font-weight: 600;
  }
</style>

