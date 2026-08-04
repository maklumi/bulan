<script>
  let wt = 50;
  let ht = 150;
  $: currentbmi = (wt / ht / ht) * 10000;
  $: minnormwt = ((ht * ht) / 10000) * 17;
  $: maxnorwt = ((ht * ht) / 10000) * 24.9;
  $: minoverwt = ((ht * ht) / 10000) * 25;
  $: maxoverwt = ((ht * ht) / 10000) * 29.9;
  $: minobese1 = ((ht * ht) / 10000) * 30;
  $: maxobese1 = ((ht * ht) / 10000) * 34.9;
  $: minobese2 = ((ht * ht) / 10000) * 35;
  $: maxobese2 = ((ht * ht) / 10000) * 39.9;
  $: minobese3 = ((ht * ht) / 10000) * 40;
</script>

<div
  class="bg-slate-50 p-3 shadow-lg rounded-lg border border-slate-200 w-full max-w-md"
>
  <div class="component-header">BMI Measurements</div>

  <div class="p-3 space-y-2">
    <!-- Weight -->
    <div class="px-3 bg-blue-100 flex justify-between items-center rounded">
      <span class="font-medium text-slate-700">Weight</span>
      <div class="my-1">
        <input
          id="weight"
          type="number"
          min="0"
          max="1000"
          bind:value={wt}
          class="border border-slate-300 rounded px-2 w-20"
        />
        <span class="ml-1 text-slate-600">kg</span>
      </div>
    </div>

    <!-- Height -->
    <div class="px-3 bg-blue-200 flex justify-between items-center rounded">
      <span class="font-medium text-slate-700">Height</span>
      <div class="my-1">
        <input
          id="height"
          type="number"
          min="0"
          max="1000"
          bind:value={ht}
          class="border border-slate-300 rounded px-2 w-20"
        />
        <span class="ml-1 text-slate-600">cm</span>
      </div>
    </div>

    <!-- BMI Table -->
    <table class="table-auto w-full text-slate-800 mt-2">
      <tbody>
        <tr class="py-2">
          <td>Current BMI :</td>
          <td><strong>{currentbmi ? currentbmi.toFixed(1) : 0}</strong></td>
        </tr>
        <tr class="bg-green-100">
          <td>Normal (≥17):</td>
          <td class="text-green-700"
            >{minnormwt.toFixed(1)}–{maxnorwt.toFixed(1)}</td
          >
        </tr>
        <tr class="bg-yellow-100">
          <td>Overweight (≥25):</td>
          <td class="text-yellow-700"
            >{minoverwt.toFixed(1)}–{maxoverwt.toFixed(1)}</td
          >
        </tr>
        <tr class="bg-orange-100">
          <td>Obese I (≥30):</td>
          <td class="text-orange-700"
            >{minobese1.toFixed(1)}–{maxobese1.toFixed(1)}</td
          >
        </tr>
        <tr class="bg-red-100">
          <td>Obese II (≥35):</td>
          <td class="text-red-700"
            >{minobese2.toFixed(1)}–{maxobese2.toFixed(1)}</td
          >
        </tr>
        <tr class="bg-red-200">
          <td>Obese III (≥40):</td>
          <td class="text-red-800">{minobese3.toFixed(1)}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
