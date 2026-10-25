<script setup>
  import {ref,computed} from 'vue'

  const buyertype = ref('')
  const buyerstatus = ref('')
  const citizenship = ref('')

  // Main buyer
  const age = ref('')
  const income = ref('')

  // Co-owner
  const coowners = ref(1)
  const coowners_status = ref([])
  const coowners_citizenship = ref([])
  const coowners_age = ref([])
  const coowners_income = ref([])

  const emit = defineEmits(['updateBuyer'])

  // Minimum age
  const minage = computed(() => {
    if (buyertype.value === 'single' || buyertype.value === 'joint') {
      return 35
    }

    return 21
  })

  // Household income
  const totalIncome = computed(() => {
    let total = Number(income.value) || 0

    if (buyertype.value !== 'single') {
      for (let i = 0; i < coowners.value; i++) {
        total += Number(coowners_income.value[i]) || 0
      }
    }

    return total
  })

  // Validate and send buyer details
  function sendBuyerDetails() {

    // Check buyer type
    if (buyertype.value === '') {
      alert('Please select your buyer type.')
      return
    }

    // Check buyer status
    if (buyerstatus.value === '') {
      alert('Please select your buyer status.')
      return
    }

    // Check citizenship
    if (citizenship.value === '') {
      alert('Please select your citizenship.')
      return
    }

    // Check main buyer age
    if (age.value === '' || !Number.isInteger(Number(age.value)) ||
        Number(age.value) < minage.value) {
      alert(`Main buyer must be at least ${minage.value} years old. Please enter a valid age.`)
      return
    }

    // Check main buyer income
    if (income.value === '' || isNaN(Number(income.value)) ||
        Number(income.value) < 0) {
      alert('Please enter a valid monthly income.')
      return
    }

    // Check co-owner details
    if (buyertype.value !== 'single') {
      for (let i = 0; i < coowners.value; i++) {

        if (!coowners_status.value[i]) {
          alert(`Please select Co-Owner ${i + 1} buyer status.`)
          return
        }

        if (!coowners_citizenship.value[i]) {
          alert(`Please select Co-Owner ${i + 1} citizenship.`)
          return
        }

        if (coowners_age.value[i] === undefined ||
            coowners_age.value[i] === '' ||
            !Number.isInteger(Number(coowners_age.value[i])) ||
            Number(coowners_age.value[i]) < minage.value) {
          alert(`Co-Owner ${i + 1} must be at least ${minage.value} years old.`)
          return
        }

        if (coowners_income.value[i] === undefined ||
            coowners_income.value[i] === '' ||
            isNaN(Number(coowners_income.value[i])) ||
            Number(coowners_income.value[i]) < 0) {
          alert(`Please enter a valid income for Co-Owner ${i + 1}.`)
          return
        }
      }
    }

    // Send to parent
    emit('updateBuyer', {
      buyertype: buyertype.value,
      buyerstatus: buyerstatus.value,
      citizenship: citizenship.value,
      age: age.value,
      income: income.value,
      coowners: buyertype.value === 'single' ? 0 : coowners.value,
      coowners_status: buyertype.value === 'single' ? [] : coowners_status.value.slice(0, coowners.value),
      coowners_citizenship: buyertype.value === 'single' ? [] : coowners_citizenship.value.slice(0, coowners.value),
      coowners_age: buyertype.value === 'single' ? [] : coowners_age.value.slice(0, coowners.value),
      coowners_income: buyertype.value === 'single' ? [] : coowners_income.value.slice(0, coowners.value),
      totalIncome: totalIncome.value
    })
  }
</script>

<template>
  <div>
    <h4 class="mb-3">Step 1: Buyer & Household Details</h4>

    <div class="card shadow-sm">
      <div class="card-body p-4">

        <!-- Buyer Type -->
        <div class="mb-3">
          <label class="form-label">Buying As</label>

          <div class="form-check">
            <input v-model="buyertype" type="radio" value="single" name="buyertype" class="form-check-input"/>
            <label class="form-check-label">Single Buyer</label>
          </div>

          <div class="form-check">
            <input v-model="buyertype" type="radio" value="couple" name="buyertype" class="form-check-input"/>
            <label class="form-check-label">Couple / Family</label>
          </div>

          <div class="form-check">
            <input v-model="buyertype" type="radio" value="joint" name="buyertype" class="form-check-input"/>
            <label class="form-check-label">Joint Singles</label>
          </div>
        </div>

        <!-- Number of Co-Owners -->
        <div v-if="buyertype === 'couple' || buyertype === 'joint'" class="mb-3">
          <label class="form-label">Number of Co-Owners</label>

          <select v-model.number="coowners" class="form-select w-25">
            <option v-for="n in 3" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
        </div>

        <hr/>

        <!-- Main Buyer -->
        <h5 class="mb-3">Main Buyer Details</h5>

        <!-- Buyer Status -->
        <div class="mb-3">
          <label class="form-label">Buyer Status</label>

          <div class="form-check">
            <input v-model="buyerstatus" type="radio" value="first" name="buyerstatus" class="form-check-input"/>
            <label class="form-check-label">First-Timer</label>
          </div>

          <div class="form-check">
            <input v-model="buyerstatus" type="radio" value="second" name="buyerstatus" class="form-check-input"/>
            <label class="form-check-label">Second-Timer</label>
          </div>
        </div>

        <!-- Citizenship -->
        <div class="mb-3">
          <label class="form-label">Citizenship</label>

          <div class="form-check">
            <input v-model="citizenship" type="radio" value="sc" name="citizenship" class="form-check-input"/>
            <label class="form-check-label">Singapore Citizen</label>
          </div>

          <div class="form-check">
            <input v-model="citizenship" type="radio" value="pr" name="citizenship" class="form-check-input"/>
            <label class="form-check-label">Singapore Permanent Resident</label>
          </div>

          <div class="form-check">
            <input v-model="citizenship" type="radio" value="other" name="citizenship" class="form-check-input"/>
            <label class="form-check-label">Other</label>
          </div>
        </div>

        <!-- Age -->
        <div class="mb-3">
          <label class="form-label">Age</label>
          <input
            v-model.number="age"
            type="number"
            :min="minage"
            step="1"
            class="form-control w-25"
            placeholder="Enter age"
          />
          <small class="text-muted">
            Minimum age: {{ minage }} years
          </small>
        </div>

        <!-- Income -->
        <div class="mb-3">
          <label class="form-label">Average Monthly Gross Income ($)</label>
          <input
            v-model.number="income"
            type="number"
            min="0"
            class="form-control w-25"
            placeholder="Enter monthly income"
          />
        </div>

        <!-- Co-Owners -->
        <div v-if="buyertype === 'couple' || buyertype === 'joint'">

          <div v-for="n in coowners" :key="n">
            <hr/>

            <h5 class="mb-3">Co-Owner {{ n }}</h5>

            <!-- Co-Owner Status -->
            <div class="mb-3">
              <label class="form-label">Buyer Status</label>

              <div class="form-check">
                <input v-model="coowners_status[n - 1]" type="radio" value="first"
                  :name="'coowner_status' + n" class="form-check-input"/>
                <label class="form-check-label">First-Timer</label>
              </div>

              <div class="form-check">
                <input v-model="coowners_status[n - 1]" type="radio" value="second"
                  :name="'coowner_status' + n" class="form-check-input"/>
                <label class="form-check-label">Second-Timer</label>
              </div>
            </div>

            <!-- Co-Owner Citizenship -->
            <div class="mb-3">
              <label class="form-label">Citizenship</label>

              <div class="form-check">
                <input v-model="coowners_citizenship[n - 1]" type="radio" value="sc"
                  :name="'coowner_citizenship' + n" class="form-check-input"/>
                <label class="form-check-label">Singapore Citizen</label>
              </div>

              <div class="form-check">
                <input v-model="coowners_citizenship[n - 1]" type="radio" value="pr"
                  :name="'coowner_citizenship' + n" class="form-check-input"/>
                <label class="form-check-label">Singapore Permanent Resident</label>
              </div>

              <div class="form-check">
                <input v-model="coowners_citizenship[n - 1]" type="radio" value="other"
                  :name="'coowner_citizenship' + n" class="form-check-input"/>
                <label class="form-check-label">Other</label>
              </div>
            </div>

            <!-- Co-Owner Age -->
            <div class="mb-3">
              <label class="form-label">Age</label>
              <input
                v-model.number="coowners_age[n - 1]"
                type="number"
                :min="minage"
                step="1"
                class="form-control w-25"
                placeholder="Enter age"
              />
              <small class="text-muted">
                Minimum age: {{ minage }} years
              </small>
            </div>

            <!-- Co-Owner Income -->
            <div class="mb-3">
              <label class="form-label">Average Monthly Gross Income ($)</label>
              <input
                v-model.number="coowners_income[n - 1]"
                type="number"
                min="0"
                class="form-control w-25"
                placeholder="Enter monthly income"
              />
            </div>

          </div>
        </div>

        <!-- Total Income -->
        <hr/>

        <div class="mb-3">
          <h5>Total Household Income</h5>
          <p>${{ totalIncome.toLocaleString() }}</p>
        </div>

        <!-- Next -->
        <button
          type="button"
          class="btn btn-primary"
          @click="sendBuyerDetails"
        >
          Next
        </button>

      </div>
    </div>
  </div>
</template>
