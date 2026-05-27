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
  class="bg-purple-200 px-2 m-2 shadow-2xl rounded-lg border-2 border-purple-300 max-h-max max-w-max"
>
  <div
    class="flex bg-purple-500 p-2 m-1 uppercase text-center tracking-wide
    border-2 border-purple-300 rounded"
  >
    Age Calculator
  </div>

  <div class="flex-row items-center gap-2 mb-2">
    <label for="birthday" class="text-sm m-2">Born</label>
    <input
      id="birthday"
      type="date"
      bind:value={birth}
      on:input={compute}
      class="p-2 border rounded"
      aria-label="Birthdate"
    />
    <button
      on:click={clear}
      class="m-2 bg-purple-600 text-white px-3 py-1 rounded">Clear</button
    >
  </div>

  {#if error}
    <div class="text-red-600 text-sm mb-2">{error}</div>
  {/if}

  {#if age}
    <div class=" flex m-2 text-sm item-center gap-4">
      <div>Age:</div>
      <div><strong> {age.years}</strong> Years</div>
      <div><strong>{age.months}</strong> Months</div>
      <div><strong>{age.days}</strong> Days</div>
    </div>
  {:else}
    <div class="m-2 text-sm text-gray-700">
      Enter a birthdate to calculate age.
    </div>
  {/if}
</div>
