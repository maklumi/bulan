<script>
  let birth = "";
  let age = null;
  let error = "";

  function compute() {
    error = "";
    if (!birth) {
      age = null;
      return;
    }

    const b = new Date(birth + "T00:00:00");
    const today = new Date();
    if (isNaN(b.getTime())) {
      error = "Invalid date";
      age = null;
      return;
    }
    if (b > today) {
      error = "Birthdate cannot be in the future";
      age = null;
      return;
    }

    let years = today.getFullYear() - b.getFullYear();
    let months = today.getMonth() - b.getMonth();
    let days = today.getDate() - b.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    age = { years, months, days };
  }

  function clear() {
    birth = "";
  }
</script>

<div
  class="bg-slate-50 p-3 shadow-lg rounded-lg border border-slate-200 w-full w-full max-w-md"
>
  <div class="component-header">Age Calculator</div>

  <!-- Input Section -->
  <div class="flex items-center gap-3 mb-3 p-3">
    <label for="birthday" class="text-sm font-medium text-slate-700">Born</label
    >
    <input
      id="birthday"
      type="date"
      bind:value={birth}
      on:input={compute}
      class="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-sky-400"
      aria-label="Birthdate"
    />
    <button
      on:click={clear}
      class="m-2 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded"
    >
      Clear
    </button>
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="text-red-600 text-sm mb-2">{error}</div>
  {/if}

  <!-- Age Display -->
  {#if age}
    <div class="flex m-2 text-sm items-center gap-4 bg-green-50 p-2 rounded">
      <div class="text-slate-700">Age:</div>
      <div><strong class="text-green-700">{age.years}</strong> Years</div>
      <div><strong class="text-green-700">{age.months}</strong> Months</div>
      <div><strong class="text-green-700">{age.days}</strong> Days</div>
    </div>
  {:else}
    <div class="m-2 text-sm text-slate-600 italic">
      Enter a birthdate to calculate age.
    </div>
  {/if}
</div>
