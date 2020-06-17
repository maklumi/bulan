<script>
  let wt = 50
  let ht = 150
  $: currentbmi = (wt / ht / ht) * 10000
  $: minnormwt = ((ht * ht) / 10000) * 17
  $: maxnorwt = ((ht * ht) / 10000) * 24.9
  $: minoverwt = ((ht * ht) / 10000) * 25
  $: maxoverwt = ((ht * ht) / 10000) * 29.9
  $: minobese1 = ((ht * ht) / 10000) * 30
  $: maxobese1 = ((ht * ht) / 10000) * 34.9
  $: minobese2 = ((ht * ht) / 10000) * 35
  $: maxobese2 = ((ht * ht) / 10000) * 39.9
  $: minobese3 = ((ht * ht) / 10000) * 40
</script>

<div class="bg-purple-300 m-2 shadow-2xl rounded-lg">
  <div
    class="flex bg-purple-500 mt-1 p-2 uppercase text-center tracking-wide
    border-2 border-purple-300 rounded ">
    BMI measurements
  </div>

  <div class="p-2">
    <div class="px-2 bg-pink-400 flex justify-around">
      <label>Weight</label>
      <div class="my-1">
        <div>
          <input id="weight" type="number" min="0" max="1000" bind:value={wt} />
          <span>kg</span>
        </div>
      </div>
    </div>
    <div class="px-2 bg-pink-500 flex justify-around">
      <label>Height</label>
      <div class="my-1">
        <input id="height" type="number" min="0" max="1000" bind:value={ht} />
        <span>cm</span>
      </div>
    </div>

    <div class="flex-col">
      <div class="bmirow mt-6">
        <div>Current BMI :</div>
        <div>{currentbmi ? currentbmi.toFixed(1) : 0}</div>
      </div>
      <div class="bmirow mt-4">
        <div>Normal BMI 17-24.9 :</div>
        <div>{minnormwt.toFixed(1)}-{maxnorwt.toFixed(1)}</div>
      </div>
      <div class="bmirow mt-1">
        <div>Overwt BMI 25-29.9 :</div>
        <div>{minoverwt.toFixed(1)}-{maxoverwt.toFixed(1)}</div>
      </div>
      <div class="bmirow mt-1">
        <div>Obese BMI 30-34.9 :</div>
        <div>{minobese1.toFixed(1)}-{maxobese1.toFixed(1)}</div>
      </div>
      <div class="bmirow mt-1">
        <div>Obese BMI 35-39.9 :</div>
        <div>{minobese2.toFixed(1)}-{maxobese2.toFixed(1)}</div>
      </div>
      <div class="bmirow mt-1">
        <div>Obese BMI 40 :</div>
        <div>{minobese3.toFixed(1)}</div>
      </div>
    </div>
  </div>
</div>
