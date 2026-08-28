import { createContext, useState, useCallback } from 'react';
import {
    getSportConfig,
    setActiveSport,
    getActiveSportKey,
    DEFAULT_SPORT,
    SPORT_LIST,
} from '~/features/sports/registry';

export const SportContext = createContext<any>({
    sport: DEFAULT_SPORT,
    config: getSportConfig(DEFAULT_SPORT),
    sports: SPORT_LIST,
    setSport: () => {},
});

function initialSport() {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('sport');
    return saved && getSportConfig(saved).key === saved ? saved : DEFAULT_SPORT;
}

export const SportProvider = ({ children }) => {
    const [sport, setSportState] = useState(initialSport);

    // Keep the module-level active sport in sync during render so the pure
    // helper modules resolve to the right config before descendants render.
    if (getActiveSportKey() !== sport) {
        setActiveSport(sport);
    }

    const setSport = useCallback((next) => {
        setActiveSport(next);
        localStorage.setItem('sport', next);
        setSportState(next);
    }, []);

    const config = getSportConfig(sport);

    return (
        <SportContext.Provider value={{ sport, config, sports: SPORT_LIST, setSport }}>
            {children}
        </SportContext.Provider>
    );
};

export default SportProvider;
