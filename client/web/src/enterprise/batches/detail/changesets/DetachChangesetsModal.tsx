import Dialog from '@reach/dialog'
import React, { useCallback, useState } from 'react'

import { asError, isErrorLike } from '@sourcegraph/common'
import { TelemetryProps } from '@sourcegraph/shared/src/telemetry/telemetryService'
import { Button, LoadingSpinner } from '@sourcegraph/wildcard'

import { ErrorAlert } from '../../../../components/alerts'
import { Scalars } from '../../../../graphql-operations'
import { detachChangesets as _detachChangesets } from '../backend'

export interface DetachChangesetsModalProps extends TelemetryProps {
    onCancel: () => void
    afterCreate: () => void
    batchChangeID: Scalars['ID']
    changesetIDs: Scalars['ID'][]

    /** For testing only. */
    detachChangesets?: typeof _detachChangesets
}

export const DetachChangesetsModal: React.FunctionComponent<DetachChangesetsModalProps> = ({
    onCancel,
    afterCreate,
    batchChangeID,
    changesetIDs,
    telemetryService,
    detachChangesets = _detachChangesets,
}) => {
    const [isLoading, setIsLoading] = useState<boolean | Error>(false)

    const onSubmit = useCallback<React.FormEventHandler>(async () => {
        setIsLoading(true)
        try {
            await detachChangesets(batchChangeID, changesetIDs)
            telemetryService.logViewEvent('BatchChangeDetailsPageDetachArchivedChangesets')
            afterCreate()
        } catch (error) {
            setIsLoading(asError(error))
        }
    }, [changesetIDs, detachChangesets, batchChangeID, telemetryService, afterCreate])

    const labelId = 'detach-changesets-modal-title'

    return (
        <Dialog
            className="modal-body modal-body--top-third p-4 rounded border"
            onDismiss={onCancel}
            aria-labelledby={labelId}
        >
            <h3 id={labelId}>Detach changesets</h3>
            <p className="mb-4">Are you sure you want to detach the selected changesets?</p>
            {isErrorLike(isLoading) && <ErrorAlert error={isLoading} />}
            <div className="d-flex justify-content-end">
                <Button
                    disabled={isLoading === true}
                    className="mr-2"
                    onClick={onCancel}
                    outline={true}
                    variant="secondary"
                >
                    Cancel
                </Button>
                <Button onClick={onSubmit} disabled={isLoading === true} variant="primary">
                    {isLoading === true && <LoadingSpinner />}
                    Detach
                </Button>
            </div>
        </Dialog>
    )
}
