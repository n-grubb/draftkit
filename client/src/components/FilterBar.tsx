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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
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
                        className="gear-btn"
                        onClick={() => setShowStatsModal(true)}
                        title="Customize Stats"
                    >
                        <GearIcon />
                        <span>Stats</span>
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
