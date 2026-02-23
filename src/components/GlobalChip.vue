<template>
  <div class="global-chip" aria-live="polite">
    <strong>{{ done }}</strong> / {{ total }} solved
  </div>
</template>

<script setup>
defineProps({
  done:  { type: Number, required: true },
  total: { type: Number, required: true },
})
</script>

<style scoped>
.global-chip {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.78rem;
  color: #8b949e;
  z-index: 100;
  pointer-events: none;
}

.global-chip strong {
  color: #3fb950;
}
</style>
