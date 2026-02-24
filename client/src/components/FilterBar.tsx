import { useState } from 'react';
import StatsPrefsModal from './StatsPrefsModal';

const POSITION_FILTERS = [
    { label: 'All',     value: undefined },
    { label: 'C',       value: 'C'       },
    { label: '1B',      value: '1B'      },
    { label: '2B',      value: '2B'      },
    { label: 'SS',      value: 'SS'      },
    { label: '2B/SS',   value: '2B/SS'   },
    { label: '3B',      value: '3B'      },
    { label: '1B/3B',   value: '1B/3B'   },
    { label: 'OF',      value: 'OF'      },
    { label: 'DH',      value: 'DH'      },
    { label: 'Batters', value: 'UTIL'    },
    { label: 'SP',      value: 'SP'      },
    { label: 'RP',      value: 'RP'      },
    { label: 'Pitchers', value: 'P'      },
]

const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
)

const GearIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
)

const FilterBar = (props) => {
    const { posFilter, onPosChange, draftMode, searchQuery, onSearchChange } = props;
    const [showStatsModal, setShowStatsModal] = useState(false);

    return (
        <div className="player-controls">
            <div className="search-bar">
                <span className="search-icon"><SearchIcon /></span>
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search players…"
                    value={searchQuery || ''}
                    onChange={e => onSearchChange(e.target.value)}
                />
            </div>

            <div className="controls-divider" />

            <fieldset className="position-filters">
                {POSITION_FILTERS.map(filterOption => (
                    <div
                        key={filterOption.value || 'all'}
                        className={`pos-filter${posFilter === filterOption.value ? ' active' : ''}`}
                        data-pos={filterOption.value}
                        title={filterOption.label}
                    >
                        <label htmlFor={`pos-filter--${filterOption.value}`}>{filterOption.label}</label>
                        <input
                            type="radio"
                            id={`pos-filter--${filterOption.value}`}
                            name="pos-filter"
                            value={filterOption.value}
                            checked={posFilter == filterOption.value}
                            onChange={() => {
                                const currentlyChecked = posFilter == filterOption.value
                                onPosChange(currentlyChecked ? undefined : filterOption.value)
                            }}
                        />
                    </div>
                ))}
            </fieldset>

            {!draftMode && (
                <div className="controls-actions">
                    <button
                        className="icon-btn gear-btn"
                        onClick={() => setShowStatsModal(true)}
                        title="Customize Stats"
                    >
                        <GearIcon />
                    </button>

                    {showStatsModal && (
                        <StatsPrefsModal onClose={() => setShowStatsModal(false)} />
                    )}
                </div>
            )}
        </div>
    )
}

export default FilterBar
