/* eslint-disable no-undef */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js')

let pyodide = null

const initPromise = loadPyodide().then((py) => {
  pyodide = py
  self.postMessage({ type: 'ready' })
}).catch((err) => {
  self.postMessage({ type: 'init-error', message: err.message })
})

self.onmessage = async ({ data: { id, code } }) => {
  try {
    await initPromise
  } catch (err) {
    self.postMessage({ type: 'result', id, stdout: '', stderr: '', error: 'Failed to load Python: ' + err.message })
    return
  }

  let stdout = ''
  let stderr = ''

  pyodide.setStdout({ batched: (s) => { stdout += s + '\n' } })
  pyodide.setStderr({ batched: (s) => { stderr += s + '\n' } })

  try {
    await pyodide.runPythonAsync(code)
    self.postMessage({ type: 'result', id, stdout, stderr, error: null })
  } catch (err) {
    self.postMessage({ type: 'result', id, stdout, stderr, error: err.message })
  }
}
