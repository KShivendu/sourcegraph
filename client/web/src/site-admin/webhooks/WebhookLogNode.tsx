import classNames from 'classnames'
import { format } from 'date-fns'
import ChevronDownIcon from 'mdi-react/ChevronDownIcon'
import ChevronRightIcon from 'mdi-react/ChevronRightIcon'
import React, { useCallback, useState } from 'react'

import { Button, Tab, TabList, TabPanel, TabPanels, Tabs } from '@sourcegraph/wildcard'

import { WebhookLogFields } from '../../graphql-operations'

import { MessagePanel } from './MessagePanel'
import { StatusCode } from './StatusCode'
import styles from './WebhookLogNode.module.scss'

export interface Props {
    node: WebhookLogFields

    // For storybook purposes only:
    initiallyExpanded?: boolean
    initialTabIndex?: number
}

export const WebhookLogNode: React.FunctionComponent<Props> = ({
    initiallyExpanded,
    initialTabIndex,
    node: { externalService, receivedAt, request, response, statusCode },
}) => {
    const [isExpanded, setIsExpanded] = useState(initiallyExpanded === true)
    const toggleExpanded = useCallback(() => setIsExpanded(!isExpanded), [isExpanded])

    return (
        <>
            <span className={styles.separator} />
            <span className={styles.detailsButton}>
                <Button
                    className="btn-icon"
                    aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                    onClick={toggleExpanded}
                >
                    {isExpanded ? (
                        <ChevronDownIcon className="icon-inline" aria-label="Close section" />
                    ) : (
                        <ChevronRightIcon className="icon-inline" aria-label="Expand section" />
                    )}
                </Button>
            </span>
            <span className={styles.statusCode}>
                <StatusCode code={statusCode} />
            </span>
            <span>
                {externalService ? externalService.displayName : <span className="text-danger">Unmatched</span>}
            </span>
            <span className={styles.receivedAt}>{format(Date.parse(receivedAt), 'Ppp')}</span>
            <span className={styles.smDetailsButton}>
                <Button onClick={toggleExpanded} outline={true} variant="secondary">
                    {isExpanded ? (
                        <ChevronDownIcon className="icon-inline" aria-label="Close section" />
                    ) : (
                        <ChevronRightIcon className="icon-inline" aria-label="Expand section" />
                    )}{' '}
                    {isExpanded ? 'Hide' : 'Show'} details
                </Button>
            </span>
            {isExpanded && (
                <div className={classNames('px-4', 'pt-3', 'pb-2', styles.expanded)}>
                    <Tabs index={initialTabIndex} size="small">
                        <TabList>
                            <Tab>Request</Tab>
                            <Tab>Response</Tab>
                        </TabList>
                        <TabPanels>
                            <TabPanel>
                                <MessagePanel className="pt-2" message={request} requestOrStatusCode={request} />
                            </TabPanel>
                            <TabPanel>
                                <MessagePanel className="pt-2" message={response} requestOrStatusCode={statusCode} />
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </div>
            )}
        </>
    )
}
