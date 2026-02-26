import { ref, computed } from 'vue'

export function useCodeExecution({ getEditorValue, unitTests }) {
  // ── Pyodide worker ──
  let _worker = null
  const _callbacks = new Map()
  let _nextId = 0

  const workerReady = ref(false)

  function ensureWorker() {
    if (_worker) return
    _worker = new Worker('/pyodide.worker.js')
    _worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        console.log('[pyodide worker] ready')
        workerReady.value = true
      } else if (data.type === 'init-error') {
        console.error('[pyodide worker] init failed:', data.message)
      } else if (data.type === 'result') {
        const resolve = _callbacks.get(data.id)
        if (resolve) {
          resolve(data)
          _callbacks.delete(data.id)
        }
      }
    }
    _worker.onerror = (err) => console.error('[pyodide worker] error:', err.message, err)
  }

  function runPython(code) {
    return new Promise((resolve) => {
      const id = ++_nextId
      _callbacks.set(id, resolve)
      _worker.postMessage({ id, code })
    })
  }

  // ── Output state ──
  const output = ref('')
  const hasError = ref(false)
  const isRunning = ref(false)
  const testResults = ref([])
  const activeTestTab = ref(null)
  const showTests = ref(false)
  const expandedTest = ref(null)

  function clearOutput() {
    output.value = ''
    testResults.value = []
    hasError.value = false
    activeTestTab.value = null
  }

  const outputDisplay = computed(() =>
    output.value || '# Click "Run" or press Ctrl+Enter to execute'
  )

  const parsedTestNames = computed(() => {
    const raw = unitTests.value
    return [...raw.matchAll(/def (test_\w+)\(/g)].map(m => m[1])
  })

  const parsedTestCases = computed(() => {
    const raw = unitTests.value
    const firstLine = raw.split('\n')[0]
    if (!firstLine.startsWith('# __CASES__:')) return {}
    try {
      const cases = JSON.parse(firstLine.slice('# __CASES__:'.length))
      return Object.fromEntries(cases.map(c => [c.name, c]))
    } catch { return {} }
  })

  const allTestsPassing = computed(() =>
    testResults.value.length > 0 && testResults.value.every(r => r.status === 'pass')
  )

  function testResultFor(name) {
    return testResults.value.find(r => r.name === name)
  }

  function formatTestName(name) {
    return name.replace(/^test_?/, '').replace(/_/g, ' ') || name
  }

  function toggleTestExpand(name) {
    expandedTest.value = expandedTest.value === name ? null : name
  }

  function testSourceFor(name) {
    const raw = unitTests.value
    const lines = raw.split('\n')
    const startIdx = lines.findIndex(l => new RegExp(`^\\s*def\\s+${name}\\s*\\(`).test(l))
    if (startIdx === -1) return null
    const methodIndent = lines[startIdx].match(/^(\s*)/)[1].length
    const bodyLines = []
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trimStart()
      if (!trimmed) { bodyLines.push(''); continue }
      const lineIndent = line.length - trimmed.length
      if (lineIndent <= methodIndent && (trimmed.startsWith('def ') || trimmed.startsWith('class '))) break
      const bodyIndent = methodIndent + 4
      bodyLines.push(line.length >= bodyIndent ? line.slice(bodyIndent) : trimmed)
    }
    while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop()
    return bodyLines.join('\n')
  }

  // Custom Python reporter
  const TEST_RUNNER = `
import json as _json, unittest as _unittest, io as _io, contextlib as _ctx
class _R(_unittest.TestResult):
    def __init__(self):
        super().__init__(); self._r = []
    def addSuccess(self, t):
        self._r.append({'name': t._testMethodName, 'status': 'pass'})
    def addFailure(self, t, err):
        self._r.append({'name': t._testMethodName, 'status': 'fail', 'message': str(err[1])})
    def addError(self, t, err):
        self._r.append({'name': t._testMethodName, 'status': 'error', 'message': str(err[1])})
_results = []
for _t in _unittest.TestLoader().loadTestsFromTestCase(TestSolution):
    _buf = _io.StringIO()
    _r = _R()
    with _ctx.redirect_stdout(_buf):
        _unittest.TestSuite([_t]).run(_r)
    for _item in _r._r:
        _item['stdout'] = _buf.getvalue()
    _results.extend(_r._r)
print('__TEST_RESULTS__:' + _json.dumps(_results))
`

  async function runCode() {
    if (!getEditorValue || !workerReady.value || isRunning.value) return

    isRunning.value = true
    hasError.value = false
    output.value = ''
    testResults.value = []

    const userCode = getEditorValue()
    const rawTests = unitTests.value

    let code
    if (rawTests) {
      const lines = rawTests.split('\n')
      const mainIdx = lines.findIndex(l => l.trimStart().startsWith('if __name__'))
      const testCode = (mainIdx >= 0 ? lines.slice(0, mainIdx) : lines).join('\n')
      code = `${userCode}\n\n${testCode}\n${TEST_RUNNER}`
    } else {
      code = userCode
    }

    try {
      const { stdout, stderr, error } = await runPython(code)

      if (rawTests && stdout.includes('__TEST_RESULTS__:')) {
        const lines = stdout.split('\n')
        const resultsLine = lines.find(l => l.startsWith('__TEST_RESULTS__:'))
        try {
          testResults.value = JSON.parse(resultsLine.slice('__TEST_RESULTS__:'.length))
          const first = testResults.value.find(r => r.status !== 'pass') ?? testResults.value[0]
          if (first) activeTestTab.value = first.name
        } catch {}
        const cleanOut = lines.filter(l => !l.startsWith('__TEST_RESULTS__:')).join('\n').trimEnd()
        output.value = cleanOut
        if (stderr) { output.value += (output.value ? '\n' : '') + stderr; hasError.value = true }
        if (error)  { output.value += (output.value ? '\n' : '') + error;  hasError.value = true }
      } else {
        let text = ''
        if (stdout) text += stdout
        if (stderr) { text += stderr; hasError.value = true }
        if (error)  { text += (text ? '\n' : '') + error; hasError.value = true }
        output.value = text.trimEnd()
      }
    } catch (e) {
      output.value = String(e)
      hasError.value = true
    } finally {
      isRunning.value = false
    }
  }

  return {
    workerReady,
    isRunning,
    output,
    hasError,
    testResults,
    activeTestTab,
    outputDisplay,
    parsedTestNames,
    parsedTestCases,
    allTestsPassing,
    expandedTest,
    showTests,
    runCode,
    clearOutput,
    ensureWorker,
    testResultFor,
    formatTestName,
    testSourceFor,
    toggleTestExpand,
  }
}
