import { InsightStep } from '../search-insight/types'

export interface CaptureGroupFormFields {
    /**
     * Repositories which to be used to get the info for code insights
     */
    repositories: string

    /**
     * Query to collect all version like series on BE
     */
    groupSearchQuery: string

    /**
     * Title of code insight
     */
    title: string

    /**
     * Setting for set chart step - how often do we collect data.
     */
    step: InsightStep

    /**
     * Value for insight step setting
     */
    stepValue: string
}
