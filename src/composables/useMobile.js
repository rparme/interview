import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useMobile(breakpoint = 768) {
  const isMobile = ref(false)

  function check() {
    isMobile.value = window.innerWidth <= breakpoint
  }

  onMounted(() => {
    check()
    window.addEventListener('resize', check)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', check)
  })

  return { isMobile }
}
