import { ref } from 'vue'

export function useResizePanels(rootEl) {
  const panelWidth = ref(320)
  const outputHeight = ref(170)
  const sidebarWidth = ref(240)

  // ── Panel (right side) resize ──
  let isResizing = false
  let resizeStartX = 0
  let resizeStartWidth = 0

  function onResizeMove(e) {
    if (!isResizing) return
    const delta = resizeStartX - e.clientX
    panelWidth.value = Math.max(220, Math.min(680, resizeStartWidth + delta))
  }

  function onResizeEnd() {
    isResizing = false
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
    rootEl.value?.classList.remove('is-resizing')
  }

  function onResizeStart(e) {
    isResizing = true
    resizeStartX = e.clientX
    resizeStartWidth = panelWidth.value
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
    rootEl.value?.classList.add('is-resizing')
  }

  // ── Sidebar (left side) resize ──
  let isSidebarResizing = false
  let sidebarResizeStartX = 0
  let sidebarResizeStartWidth = 0

  function onSidebarResizeMove(e) {
    if (!isSidebarResizing) return
    const delta = e.clientX - sidebarResizeStartX
    sidebarWidth.value = Math.max(160, Math.min(400, sidebarResizeStartWidth + delta))
  }

  function onSidebarResizeEnd() {
    isSidebarResizing = false
    document.removeEventListener('mousemove', onSidebarResizeMove)
    document.removeEventListener('mouseup', onSidebarResizeEnd)
    rootEl.value?.classList.remove('is-resizing')
  }

  function onSidebarResizeStart(e) {
    isSidebarResizing = true
    sidebarResizeStartX = e.clientX
    sidebarResizeStartWidth = sidebarWidth.value
    document.addEventListener('mousemove', onSidebarResizeMove)
    document.addEventListener('mouseup', onSidebarResizeEnd)
    rootEl.value?.classList.add('is-resizing')
  }

  // ── Output pane resize (drag top edge up/down) ──
  let isOutputResizing = false
  let outputResizeStartY = 0
  let outputResizeStartHeight = 0

  function onOutputResizeMove(e) {
    if (!isOutputResizing) return
    const delta = outputResizeStartY - e.clientY
    outputHeight.value = Math.max(80, Math.min(600, outputResizeStartHeight + delta))
  }

  function onOutputResizeEnd() {
    isOutputResizing = false
    document.removeEventListener('mousemove', onOutputResizeMove)
    document.removeEventListener('mouseup', onOutputResizeEnd)
    rootEl.value?.classList.remove('is-resizing-output')
  }

  function onOutputResizeStart(e) {
    isOutputResizing = true
    outputResizeStartY = e.clientY
    outputResizeStartHeight = outputHeight.value
    document.addEventListener('mousemove', onOutputResizeMove)
    document.addEventListener('mouseup', onOutputResizeEnd)
    rootEl.value?.classList.add('is-resizing-output')
  }

  function cleanupResize() {
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
    document.removeEventListener('mousemove', onSidebarResizeMove)
    document.removeEventListener('mouseup', onSidebarResizeEnd)
    document.removeEventListener('mousemove', onOutputResizeMove)
    document.removeEventListener('mouseup', onOutputResizeEnd)
  }

  return {
    panelWidth,
    outputHeight,
    sidebarWidth,
    onResizeStart,
    onSidebarResizeStart,
    onOutputResizeStart,
    cleanupResize,
  }
}
