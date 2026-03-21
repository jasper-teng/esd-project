<template>
  <div class="balance" :class="{ 'balance--low': isLow }">
    <div class="balance-label">Balance</div>
    <div class="balance-amount">${{ balance.toFixed(2) }}</div>
    <div v-if="isLow" class="balance-warning">Below $5.00 minimum</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ balance: { type: Number, required: true } })
const isLow = computed(() => props.balance < 5)
</script>

<style scoped>
.balance {
  background: var(--purple-l);
  border: 1px solid #d4d0f8;
  border-radius: var(--rs);
  padding: 10px 14px;
  min-width: 130px;
}
.balance--low { background: var(--yellow-l); border-color: #f0e08a; }

.balance-label {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.4px; color: var(--purple-d); opacity: 0.7;
}
.balance--low .balance-label { color: var(--yellow-d); }

.balance-amount {
  font-size: 22px; font-weight: 600; color: var(--purple-d);
  letter-spacing: -0.5px; margin-top: 2px;
}
.balance--low .balance-amount { color: var(--yellow-d); }

.balance-warning {
  font-size: 11px; font-weight: 500; color: var(--yellow-d); margin-top: 3px;
}
</style>
