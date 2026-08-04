<script>
  import ObstetricCalendar from "./components/ObstetricCalendar.svelte";
  import ListTarikh from "./components/DateList.svelte";
  import { resetvalue } from "./stor.js";
  import BMI from "./components/BMI.svelte";
  import AgeCalculator from "./components/AgeCalculator.svelte";
  import Clock from "./components/Clock.svelte";

  // $: repeats = [1]

  function handleClick() {
    resetvalue.update((value) => (value = !value));
  }
</script>

<main class="min-h-screen bg-slate-100 pt-12 px-4 md:px-8 lg:px-16">
  <div
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mx-auto max-w-7xl justify-items-center items-start"
  >
    <ObstetricCalendar {handleClick} />

    <div>
      <BMI />
      <Clock />
    </div>

    <div>
      <AgeCalculator />
      <ListTarikh />
    </div>
  </div>
</main>
