import React, { useEffect } from 'react'

import { useTemporarySetting } from './settings/temporary/useTemporarySetting'

export const UserSessionStores: React.FunctionComponent = () => {
    const today = new Date().toDateString()
    const [daysActiveCount, setDaysActiveCount] = useTemporarySetting('user.daysActiveCount', 0)
    const [lastDayActive, setLastDayActive] = useTemporarySetting('user.lastDayActive', null)

    const loading = daysActiveCount === undefined || lastDayActive === undefined

    useEffect(() => {
        if (!loading && lastDayActive !== today) {
            setLastDayActive(today)
            setDaysActiveCount(daysActiveCount + 1)
        }
    }, [daysActiveCount, lastDayActive, loading, setDaysActiveCount, setLastDayActive, today])

    return null
}
