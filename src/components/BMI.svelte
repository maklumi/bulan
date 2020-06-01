<script>
  let wt = 50
  let ht = 150
  $: currentbmi = (wt / ht / ht) * 10000
  $: minnormwt = ((ht * ht) / 10000) * 17
  $: maxnorwt = ((ht * ht) / 10000) * 24.9
  $: minoverwt = ((ht * ht) / 10000) * 25
  $: maxoverwt = ((ht * ht) / 10000) * 29.9
</script>

<style>
  #title {
    width: 90%;
  }
  label > input {
    margin: 0 8px;
  }
  #window {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-items: center;
    width: 90%;
    justify-self: center;
    font-weight: 800;
  }
  #windowbody {
    /* flex: 0 0 100%; */
    width: 90%;
    justify-items: stretch;
  }
  #fieldrow {
    width: 90%;
    display: inline-flex;
  }
</style>

<div class="window" id="window">
  <div id="title" class="title-bar">
    <div class="title-bar-text">BMI measurements</div>
    <div class="title-bar-controls">
      <button aria-label="close">RESET</button>
    </div>
  </div>
  <div class="window-body" id="windowbody">
    <div class="field-row" id="fieldrow">
      <label for="weight">
        Weight
        <input id="weight" type="number" min="0" max="1000" bind:value={wt} />
        kg
      </label>
    </div>
    <div class="field-row" id="fieldrow">
      <label for="height">
        Height
        <input id="height" type="number" min="0" max="1000" bind:value={ht} />
        cm
      </label>

    </div>
    <div class="window-body" id="windowbody">
      <p>Current BMI :{currentbmi ? currentbmi.toFixed(2) : 0}</p>
      <p>Normal BMI 17-24.9 : {minnormwt.toFixed(2)}-{maxnorwt.toFixed(2)}</p>
      <p>
        Overweight BMI 25-29.9 : {minoverwt.toFixed(2)}-{maxoverwt.toFixed(2)}
      </p>
    </div>
  </div>
</div>
