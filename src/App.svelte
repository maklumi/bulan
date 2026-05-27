<script>
  import ObstetricCalendar from "./components/ObstetricCalendar.svelte";
  import ListTarikh from "./components/DateList.svelte";
  import { resetvalue } from "./stor.js";
  import BMI from "./components/BMI.svelte";
  import AgeCalculator from "./components/AgeCalculator.svelte";

  // $: repeats = [1]

  function handleClick() {
    resetvalue.update((value) => (value = !value));
  }
</script>

<main class="flex flex-row flex-wrap justify-center gap-1">
  <div>
    <ObstetricCalendar  {handleClick}/>
  </div>
  <div>
    <BMI />
  </div>
<div>
  <div>
   <AgeCalculator />
    
  </div>
  <div>
   <ListTarikh />
  </div>
</div>
</main>
