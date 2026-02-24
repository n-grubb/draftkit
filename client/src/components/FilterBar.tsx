import { useState } from 'react';
import StatsPrefsModal from './StatsPrefsModal';

const POSITION_FILTERS = [
    { label: 'All',   value: undefined },
    { label: 'C',     value: 'C'       },
    { label: '1B',    value: '1B'      },
    { label: '2B',    value: '2B'      },
    { label: 'SS',    value: 'SS'      },
    { label: '2B/SS', value: '2B/SS'  },
    { label: '3B',    value: '3B'      },
    { label: '1B/3B', value: '1B/3B'  },
    { label: 'OF',    value: 'OF'      },
    { label: 'DH',    value: 'DH'      },
    { label: 'B ×',   value: 'UTIL'    },
    { label: 'SP',    value: 'SP'      },
    { label: 'RP',    value: 'RP'      },
    { label: 'P *',   value: 'P'       },
]

const SearchIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
)

const FilterBar = (props) => {
    const { posFilter, onPosChange, draftMode, searchQuery, onSearchChange } = props;
    const [showStatsModal, setShowStatsModal] = useState(false);

    return (
        <div className="filter-bar">
            <div className="filter-bar-left">
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
                            className={
                                `pos-filter${
                                    ['UTIL','P'].includes(filterOption.value)
                                        ? ' symbol'
                                        : ''
                                }${
                                    posFilter === filterOption.value ? ' active' : ''
                                }`
                            }
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
            </div>

            {!draftMode && (
                <div className="stats-customizer">
                    <button
                        className="customize-stats-button"
                        onClick={() => setShowStatsModal(true)}
                    >
                        Customize Stats
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
