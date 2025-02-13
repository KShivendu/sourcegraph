import React from 'react'

import { Link } from '@sourcegraph/shared/src/components/Link'
import { pluralize } from '@sourcegraph/shared/src/util/strings'

import { AuthenticatedUser } from '../../../auth'
import { ViewerBatchChangesCodeHostsFields } from '../../../graphql-operations'
import { CodeHost } from '../CodeHost'

export interface MissingCredentialsAlertProps {
    viewerBatchChangesCodeHosts: ViewerBatchChangesCodeHostsFields
    authenticatedUser: Pick<AuthenticatedUser, 'url'>
}

export const MissingCredentialsAlert: React.FunctionComponent<MissingCredentialsAlertProps> = ({
    viewerBatchChangesCodeHosts,
    authenticatedUser,
}) => {
    if (viewerBatchChangesCodeHosts.totalCount === 0) {
        return <></>
    }
    return (
        <div className="alert alert-warning">
            <p>
                <strong>
                    You don't have credentials configured for{' '}
                    {pluralize('this code host', viewerBatchChangesCodeHosts.totalCount, 'these code hosts')}
                </strong>
            </p>
            <ul>
                {viewerBatchChangesCodeHosts.nodes.map(node => (
                    <CodeHost {...node} key={node.externalServiceKind + node.externalServiceURL} />
                ))}
            </ul>
            <p className="mb-0">
                Credentials are required to publish changesets on code hosts. Configure them in your{' '}
                <Link to={`${authenticatedUser.url}/settings/batch-changes`} target="_blank" rel="noopener">
                    batch changes user settings
                </Link>{' '}
                to apply this spec.
            </p>
        </div>
    )
}
