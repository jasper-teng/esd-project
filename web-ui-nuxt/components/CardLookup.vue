<template>
  <div class="lookup">
    <label class="lookup-label">{{ label }}</label>
    <div class="lookup-row">
      <input
        v-model="val"
        type="text"
        class="lookup-input"
        :placeholder="placeholder"
        @keydown.enter="emit('lookup', val.trim())"
      />
      <button class="lookup-btn" :disabled="!val.trim() || loading" @click="emit('lookup', val.trim())">
        <svg v-if="!loading" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <svg v-else viewBox="0 0 24 24" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        {{ loading ? 'Searching...' : btnText }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
defineProps({
  label:       { type: String, default: 'Card ID' },
  placeholder: { type: String, default: 'e.g. EZ-1234567890' },
  btnText:     { type: String, default: 'Look up' },
  loading:     { type: Boolean, default: false },
})
const emit = defineEmits(['lookup'])
const val = ref('')
</script>

<style scoped>
.lookup { display: flex; flex-direction: column; gap: 6px; }

.lookup-label {
  font-size: 12px; font-weight: 500; color: var(--muted); letter-spacing: 0.2px;
}

.lookup-row { display: flex; gap: 8px; }

.lookup-input {
  flex: 1; padding: 9px 12px;
  border: 1px solid var(--border); border-radius: var(--rs);
  font-family: var(--font); font-size: 13px; font-weight: 500;
  color: var(--text); background: var(--surface); outline: none;
  transition: border-color 0.15s;
}
.lookup-input:focus { border-color: var(--purple); }

.lookup-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 16px; background: var(--purple); color: #fff;
  border: none; border-radius: var(--rs);
  font-family: var(--font); font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: opacity 0.15s, transform 0.1s;
}
.lookup-btn svg {
  width: 14px; height: 14px; stroke: currentColor; stroke-width: 2;
  fill: none; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0;
}
.lookup-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.lookup-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
