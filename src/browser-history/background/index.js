import importHistory, { importDocsSelector } from './import-history'
import initBatch from 'src/util/promise-batcher'
import { storePageFromUrl } from 'src/page-storage/store-page'
import db from 'src/pouchdb'

export const lastImportTimeStorageKey = 'last_import_time'
const getImportDocs = async () => await db.find({ selector: importDocsSelector })

const genericCount = { history: 0, bookmark: 0 }
const initCounts = { totals: genericCount, fail: genericCount, success: genericCount }

const getImportCounts = docs => docs.reduce((acc, doc) => ({
    totals: { ...acc.totals, [doc.type]: acc.totals[doc.type] + 1 },
    fail: { ...acc.fail, [doc.type]: acc.fail[doc.type] + (doc.status === 'fail' ? 1 : 0) },
    success: { ...acc.success, [doc.type]: acc.success[doc.type] + (doc.status === 'success' ? 1 : 0) },
}), initCounts)

const getPendingInputs = importDocs => importDocs
    .filter(doc => doc.status === 'pending')
    .map(doc => ({ url: doc.url, importDocId: doc._id }))

const setImportDocStatus = async (docId, status) => {
    const doc = await db.get(docId)
    doc.status = status
    await db.put(doc)
}

/**
 * Handles all needed preliminary logic before the user-controlled batch imports process
 * can begin. Currently handles generation of page and corresponding visit docs for all
 * browser history.
 */
async function preliminaryImports() {
    // Check if the importHistory stage was run previously to search history from that time
    const startTime = (await browser.storage.local.get(lastImportTimeStorageKey))[lastImportTimeStorageKey]
    await importHistory({ startTime })

    // Set the new importHistory timestamp in local storage for next import
    browser.storage.local.set({ [lastImportTimeStorageKey]: Date.now() })
}

const getCmdMessageHandler = batch => ({ cmd }) => {
    switch (cmd) {
        case 'START':
        case 'RESUME': return batch.start()
        case 'PAUSE': return batch.pause()
        case 'STOP': return batch.stop()
        default: return console.error(`unknown command: ${cmd}`)
    }
}

/**
 * Main connection handler to handle background importing and fetch&analysis batching
 * logic via commands issued from the UI.
 */
async function importsConnectionHandler(port) {
    // Make sure to only handle connection logic for imports (allows other use of runtime.connect)
    if (port.name !== 'imports') return

    console.log('importer connected')

    await preliminaryImports()

    // Get import counts and send them down to UI
    const { docs: importDocs } = await getImportDocs()
    port.postMessage({ type: 'INIT', ...getImportCounts(importDocs) })

    // Allows batcher to handle specific events
    const observer = {
        // Triggers on the successful finish of each batch input
        next({ input: { url, importDocId } }) {
            // Send success data to listener
            port.postMessage({ type: 'NEXT', url })
            setImportDocStatus(importDocId, 'success')
        },
        // Triggers on any error during the processing of each batch input
        error({ input: { url, importDocId }, error }) {
            // Send error data to listener
            port.postMessage({ type: 'NEXT', url, error })
            setImportDocStatus(importDocId, 'fail')
        },
        // Triggers after all inputs have been batch processed, regardless of success
        complete: () => port.postMessage({ type: 'COMPLETE' }),
    }

    const inputBatch = getPendingInputs(importDocs)
    const batch = initBatch({ inputBatch, asyncCallback: storePageFromUrl, observer })

    // Handle any incoming messages to control the batch
    const cmdMessageHandler = getCmdMessageHandler(batch)
    port.onMessage.addListener(cmdMessageHandler)
}

// Allow content-script or UI to connect and communicate control of imports
browser.runtime.onConnect.addListener(importsConnectionHandler)