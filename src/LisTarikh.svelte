<script>
  import storTarikh from "./stor";
  import { get_store_value } from "svelte/internal";
</script>

<style>
  ol {
    list-style-type: lower-roman;
    justify-self: start;
  }
</style>

<ol>
  {#each $storTarikh as { id, masa, gest }}
    <li>LMP: {masa} Gest: {gest.week}+{gest.days}/7</li>
  {:else}
    <li>Selamat Bertugas</li>
  {/each}
</ol>
