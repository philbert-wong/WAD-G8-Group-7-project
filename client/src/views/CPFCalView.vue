<script setup>
  import {ref} from 'vue'
  import BuyerDetails from '../components/BuyerDetails.vue'  // step 1
  import GrantEligibility from '../components/GrantEligibility.vue'// step 2
  import HousingLoan from '@/components/HousingLoan.vue'
  import CalResult from '@/components/CalResult.vue'
  
  const currentStep = ref(1)

  // for step 1
  const buyerDetails = ref({})

  function updateBuyer(data) {
    buyerDetails.value = data
    currentStep.value = 2
  }

  // for step 2
  const financialDetails = ref({})

  function updateFinancial(data) {
    financialDetails.value = data
    currentStep.value = 3
  }

  // for step 3
  const loanDetails = ref({})

function updateLoan(data) {
  loanDetails.value = data
  currentStep.value = 4
}
</script>

<template>
  <div class="container mt-4 mb-5">
    <h2 class="mb-4">HDB Affordability Calculator</h2>

    <!-- Step 1 -->
    <div v-show="currentStep === 1">
      <BuyerDetails @updateBuyer="updateBuyer"/>
    </div>

    <!-- Step 2 -->
    <div v-if="currentStep === 2">
      <GrantEligibility
        :buyerDetails="buyerDetails"
        @updateFinancial="updateFinancial"
      />
      <button type="button" class="btn btn-secondary mt-3" @click="currentStep = 1">Back</button>
    </div>

    <!-- Step 3 -->
    <div v-if="currentStep === 3">
      <HousingLoan :buyerDetails="buyerDetails" :financialDetails="financialDetails" @updateLoan="updateLoan"/>
      <button type="button" class="btn btn-secondary mt-3" @click="currentStep = 2">Back</button>
    </div>

    <!-- Step 4 -->
    <div v-if="currentStep === 4">
      <CalResult :buyerDetails="buyerDetails" :financialDetails="financialDetails" :loanDetails="loanDetails"/>
      <button type="button" class="btn btn-secondary mt-3"@click="currentStep = 3">Back</button>
    </div>

  </div>
</template>