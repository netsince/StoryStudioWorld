import { initialize } from 'vs/base/common/worker/webWorkerBootstrap'
import { EditorWorker } from 'vs/editor/common/services/editorWebWorker'

initialize(() => {
  return new EditorWorker({})
})
