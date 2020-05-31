<script>
  import MyCalendar from "./MyCalendar.svelte";
  import ListTarikh from "./LisTarikh.svelte";
  $: repeats = [1];
</script>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>

<div id="addButton">
  <button on:click={() => repeats.concat([1])}>Add</button>
</div>
<main>

  {#each repeats as rpt}
    <div>
      <MyCalendar />
    </div>
  {/each}
  <ListTarikh />
</main>
