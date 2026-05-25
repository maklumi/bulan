<script>
  import MyCalendar from "./MyCalendar.svelte";
  import ListTarikh from "./LisTarikh.svelte";
  import { resetvalue } from "./stor.js";
  import WeightSection from "./components/BMI.svelte";
  import AgeCalculator from "./components/AgeCalculator.svelte";

  // $: repeats = [1]

  function handleClick() {
    resetvalue.update((value) => (value = !value));
  }
</script>

<main class="flex flex-row flex-wrap justify-center gap-1">
  <div>
    <MyCalendar  {handleClick}/>
  </div>
  <div>
    <WeightSection />
  </div>
  <div>
    <ListTarikh />
  </div>
  <div>
    <AgeCalculator />
  </div>
</main>
