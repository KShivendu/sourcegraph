import classNames from 'classnames'
import React from 'react'

import { pluralize } from '@sourcegraph/shared/src/util/strings'
import { AlertLink } from '@sourcegraph/wildcard'

interface UnpublishedNoticeProps {
    unpublished: number
    total: number
    className?: string
}

export const UnpublishedNotice: React.FunctionComponent<UnpublishedNoticeProps> = ({
    unpublished,
    total,
    className,
}) => {
    if (total === 0 || unpublished !== total) {
        return <></>
    }
    return (
        <div className={classNames('alert alert-secondary', className)}>
            {unpublished} unpublished {pluralize('changeset', unpublished, 'changesets')}. Select changeset(s) and
            choose the 'Publish changesets' action to publish them, or{' '}
            <AlertLink
                to="https://docs.sourcegraph.com/batch_changes/how-tos/publishing_changesets#publishing-changesets"
                rel="noopener"
                target="_blank"
            >
                read more about publishing changesets
            </AlertLink>
            .
        </div>
    )
}
