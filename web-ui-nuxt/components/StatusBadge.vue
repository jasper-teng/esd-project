<template>
  <span class="badge" :class="`badge--${status}`">
    <span class="dot" />
    {{ labelMap[status] ?? status }}
  </span>
</template>

<script setup>
defineProps({ status: { type: String, required: true } })

const labelMap = {
  active: 'Active', lost: 'Lost', blocked: 'Blocked',
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
}
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1px;
}
.dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
  flex-shrink: 0;
}
.badge--active   { background: var(--green-l); color: var(--green-d); }
.badge--approved { background: var(--green-l); color: var(--green-d); }
.badge--pending  { background: var(--yellow-l); color: var(--yellow-d); }
.badge--lost     { background: var(--red-l); color: var(--red-d); }
.badge--blocked  { background: var(--red-l); color: var(--red-d); }
.badge--rejected { background: var(--red-l); color: var(--red-d); }
</style>
