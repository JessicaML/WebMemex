import { createAction } from 'redux-act'

export const filterDownloadDetails = createAction('imports/filterDownloadDetails')

const finishItem = (url, err) => ({ url, status: !err, err })
export const finishBookmarkItem = createAction('imports/finishBookmarkItem', finishItem)
export const finishHistoryItem = createAction('imports/finishHistoryItem', finishItem)

export const initEstimateCounts = createAction('imports/initEstimateCounts')
export const initTotalsCounts = createAction('imports/initTotalsCounts')
export const initFailCounts = createAction('imports/initFailCounts')
export const initSuccessCounts = createAction('imports/initSuccessCounts')

export const initImportState = createAction('imports/initImportState')
export const initDownloadData = createAction('imports/initDownloadData')

export const initImport = createAction('imports/initImport')
export const startImport = createAction('imports/startImport')
export const stopImport = createAction('imports/stopImport')
export const finishImport = createAction('imports/finishImport')
export const readyImport = finishImport
export const pauseImport = createAction('imports/pauseImport')
export const resumeImport = createAction('imports/resumeImport')

/**
 * Responds to messages sent from background script over the runtime connection by dispatching
 * appropriate redux actions. Non-handled messages are ignored.
 */
const getCmdMessageHandler = dispatch => ({ cmd, ...payload }) => {
    switch (cmd) {
        case 'INIT':
            dispatch(initEstimateCounts(payload))
            dispatch(readyImport())
            break
        case 'START':
            dispatch(startImport())
            break
        case 'PAUSE':
            dispatch(pauseImport())
            break
        case 'NEXT':
            dispatch(finishHistoryItem(payload.url, payload.error))
            break
        case 'COMPLETE':
            dispatch(stopImport())
            break
    }
}

// Hacky, but can't see a way around this... init thunk needs to be called before any other thunk...
let port

/**
 * Handles initing the imports runtime connection with the background script's batch import logic.
 */
export const init = () => dispatch => {
    port = browser.runtime.connect({ name: 'imports' })
    const cmdMessageHandler = getCmdMessageHandler(dispatch)
    port.onMessage.addListener(cmdMessageHandler)
}

/**
 * Creates a thunk that dispatches a given redux action and sends message over runtime connection port
 * to background script.
 * @param action Redux action ready to dispatch.
 * @param cmd The command to send over runtime connection's port.
 */
const makePortMessagingThunk = ({ action, cmd }) => () => dispatch => {
    dispatch(action)
    port.postMessage({ cmd })
}

// Batch controlling thunks
export const start = makePortMessagingThunk({ action: initImport(), cmd: 'START' })
export const stop = makePortMessagingThunk({ action: stopImport(), cmd: 'STOP' })
export const pause = makePortMessagingThunk({ action: pauseImport(), cmd: 'PAUSE' })
export const resume = makePortMessagingThunk({ action: resumeImport(), cmd: 'RESUME' })
