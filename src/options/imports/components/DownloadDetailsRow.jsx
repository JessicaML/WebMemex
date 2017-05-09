import React, { PropTypes } from 'react'
import classNames from 'classnames'

import localStyles from './DownloadDetails.css'

const getRowClasses = isActive => classNames({
    [localStyles.active]: isActive,
    [localStyles.detailsTableRow]: true,
})

const DownloadDetailsRow = ({ url, downloaded, error, handleClick, isActive }) => (
    <tr className={getRowClasses(isActive)} onClick={handleClick}>
        <td>{url}</td>
        <td>{downloaded}</td>
        <td>{error}</td>
    </tr>
)

DownloadDetailsRow.propTypes = {
    // State
    isActive: PropTypes.bool.isRequired,

    // Event handlers
    handleClick: PropTypes.func.isRequired,

    // Data
    url: PropTypes.string.isRequired,
    downloaded: PropTypes.string.isRequired,
    error: PropTypes.string,
}

export default DownloadDetailsRow