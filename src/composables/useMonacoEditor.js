import { ref } from 'vue'
import loader from '@monaco-editor/loader'

export function useMonacoEditor({ editorEl, getInitialValue, onContentChange, onRunAction }) {
  const editorError = ref(null)

  let editorInstance = null
  let monacoRef = null

  const PLACEHOLDER = '# Generate a problem above to start coding\n'

  async function initEditor() {
    console.log('[editor] initEditor called, el:', editorEl.value)
    if (!editorEl.value) {
      console.error('[editor] editorEl not in DOM yet')
      return
    }

    try {
      if (!monacoRef) {
        console.log('[editor] loading Monaco from CDN…')
        monacoRef = await loader.init()
        console.log('[editor] Monaco loaded OK')
        monacoRef.editor.defineTheme('github-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'ff7b72' },
            { token: 'string', foreground: 'a5d6ff' },
            { token: 'number', foreground: '79c0ff' },
            { token: 'type', foreground: 'ffa657' },
          ],
          colors: {
            'editor.background': '#0d1117',
            'editor.foreground': '#e6edf3',
            'editor.lineHighlightBackground': '#161b2280',
            'editorLineNumber.foreground': '#3d444d',
            'editorLineNumber.activeForeground': '#6e7681',
            'editor.selectionBackground': '#264f7880',
            'editorCursor.foreground': '#e6edf3',
            'editorIndentGuide.background1': '#21262d',
            'editorIndentGuide.activeBackground1': '#30363d',
          },
        })
      }

      if (!editorEl.value) {
        console.error('[editor] editorEl disappeared after loader.init()')
        return
      }

      const rect = editorEl.value.getBoundingClientRect()
      console.log('[editor] container rect:', rect.width, 'x', rect.height)

      editorInstance = monacoRef.editor.create(editorEl.value, {
        value: getInitialValue() ?? PLACEHOLDER,
        language: 'python',
        theme: 'github-dark',
        fontSize: 13.5,
        fontFamily: "'Fira Code', 'Cascadia Code', 'SF Mono', monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        padding: { top: 14, bottom: 14 },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        renderWhitespace: 'none',
        scrollbar: { vertical: 'auto', horizontal: 'auto' },
        tabSize: 4,
        insertSpaces: true,
      })
      console.log('[editor] editor instance created OK')

      editorInstance.focus()

      editorInstance.addAction({
        id: 'run-python',
        label: 'Run Python',
        keybindings: [monacoRef.KeyMod.CtrlCmd | monacoRef.KeyCode.Enter],
        run: () => onRunAction(),
      })

      editorInstance.onDidChangeModelContent(() => onContentChange())
    } catch (err) {
      console.error('[editor] initialization failed:', err)
      editorError.value = `Editor failed to load: ${err.message}`
    }
  }

  function destroyEditor() {
    if (editorInstance) {
      editorInstance.dispose()
      editorInstance = null
    }
  }

  function getValue() {
    return editorInstance ? editorInstance.getValue() : ''
  }

  function setValue(val) {
    if (editorInstance) editorInstance.setValue(val)
  }

  function setReadOnly(readOnly) {
    editorInstance?.updateOptions({ readOnly })
  }

  function focusEditor() {
    editorInstance?.focus()
  }

  return {
    editorError,
    initEditor,
    destroyEditor,
    getValue,
    setValue,
    setReadOnly,
    focusEditor,
  }
}
