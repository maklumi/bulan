<script>
  import MyCalendar from './MyCalendar.svelte'
  import ListTarikh from './LisTarikh.svelte'
  import { resetvalue } from './stor.js'

  $: repeats = [1]

  function handleClick() {
    resetvalue.update((value) => (value = !value))
  }
</script>

<style>
  #title {
    justify-content: stretch;
  }
</style>

<main>
  <div class="window">
    <div id="title" class="title-bar">
      <div class="title-bar-text">Obstetric Calendar</div>
      <div class="title-bar-controls">
        <button aria-label="close" on:click={handleClick}>-reset-</button>
      </div>
    </div>
    <div class="window-body">
      <MyCalendar />
    </div>

    <div class="window-body">
      <ListTarikh />
    </div>
  </div>
</main>
