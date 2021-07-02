<script>
  import MyCalendar from "./MyCalendar.svelte";
  import ListTarikh from "./LisTarikh.svelte";
  import { resetvalue } from "./stor.js";
  import WeightSection from "./components/BMI.svelte";

  // $: repeats = [1]

  function handleClick() {
    resetvalue.update((value) => (value = !value));
  }
</script>

<main class="flex justify-center sm:flex-row md:flex pt-6 px-2">
  <div class="h-full bg-purple-300 m-2 shadow-2xl rounded-lg">
    <div
      class="flex justify-between bg-purple-500 m-1 border-2 border-purple-500 rounded"
    >
      <div class="pl-2 text-center tracking-wide uppercase">
        Obstetric Calendar
      </div>
      <div>
        <button
          on:click={handleClick}
          class="bg-purple-600 hover:bg-purple-800 text-white py-0 px-4 rounded"
        >
          Reset
        </button>
      </div>
    </div>
    <div class="p-2 border-2 border-purple-500 rounded">
      <MyCalendar />
    </div>
  </div>
  <div class="">
    <WeightSection />
  </div>
  <div class="p-2 mt-2 bg-pink-200 border-2 border-purple-500 rounded mt-1">
    <ListTarikh />
  </div>
</main>
