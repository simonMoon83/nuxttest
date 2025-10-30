<script setup lang="ts">
const testParams = ref({
  plant_code: '1000',
  code_grp: 'ACTIVE'
})

const gridParams = ref({
  grid_id: 'menu5_search'
})

const testResult = ref(null)
const gridResult = ref(null)
const testing = ref(false)
const testingGrid = ref(false)

async function testSpCodeInfo() {
  try {
    testing.value = true
    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: {
        procedureName: 'sp_code_info',
                 parameters: {
           case: 'search',
           plant_code: testParams.value.plant_code,
           code_grp: testParams.value.code_grp
         }
      }
    })
    
    testResult.value = result
    console.log('sp_code_info 테스트 결과:', result)
  } catch (error) {
    console.error('sp_code_info 테스트 오류:', error)
    testResult.value = { error: error.message }
  } finally {
    testing.value = false
  }
}

async function testSpGridInfo() {
  try {
    testingGrid.value = true
    const result = await $fetch<any>('/api/stored-procedure/execute', {
      method: 'POST',
      body: {
        procedureName: 'sp_grid_info',
        parameters: {
          case: 'search',
          grid_id: gridParams.value.grid_id
        }
      }
    })
    
    gridResult.value = result
    console.log('sp_grid_info 테스트 결과:', result)
  } catch (error) {
    console.error('sp_grid_info 테스트 오류:', error)
    gridResult.value = { error: error.message }
  } finally {
    testingGrid.value = false
  }
}
</script>

<template>
  <div class="card">
    <h2>Stored Procedure 테스트 - sp_code_info</h2>
    
    <div class="mb-4">
      <h3>sp_code_info 테스트</h3>
      <div class="flex gap-2 mb-2">
        <InputText v-model="testParams.plant_code" placeholder="plant_code" />
        <InputText v-model="testParams.code_grp" placeholder="code_grp" />
        <Button @click="testSpCodeInfo" :loading="testing">테스트 실행</Button>
      </div>
      
      <div v-if="testResult" class="p-3 border rounded">
        <h4>테스트 결과:</h4>
        <pre>{{ JSON.stringify(testResult, null, 2) }}</pre>
      </div>
    </div>
    
    <div class="mb-4">
      <h3>sp_grid_info 테스트</h3>
      <div class="flex gap-2 mb-2">
        <InputText v-model="gridParams.grid_id" placeholder="grid_id" />
        <Button @click="testSpGridInfo" :loading="testingGrid">테스트 실행</Button>
      </div>
      
      <div v-if="gridResult" class="p-3 border rounded">
        <h4>테스트 결과:</h4>
        <pre>{{ JSON.stringify(gridResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
