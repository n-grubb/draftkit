import { useState } from 'react';
import StatsPrefsModal from './StatsPrefsModal';

const POSITION_FILTERS = [
    { 
        label: 'All',
        value: undefined
    },
    { 
        label: 'B ×',
        value: 'UTIL'
    },
    { 
        label: 'P *',
        value: 'P'
    },
    { 
        label: 'C',
        value: 'C'
    },
    { 
        label: '1B',
        value: '1B'
    },
    { 
        label: '2B',
        value: '2B'
    },
    { 
        label: '3B',
        value: '3B'
    },
    { 
        label: 'SS',
        value: 'SS'
    },
    { 
        label: '2B/SS',
        value: '2B/SS'
    },
    { 
        label: '1B/3B',
        value: '1B/3B'
    },
    { 
        label: 'OF',
        value: 'OF'
    },
    { 
        label: 'DH',
        value: 'DH'
    },
    { 
        label: 'SP',
        value: 'SP'
    },
    { 
        label: 'RP',
        value: 'RP'
    },
]

const FilterBar = (props) => {
    const { posFilter, onPosChange, draftMode } = props;
    const [showStatsModal, setShowStatsModal] = useState(false);
    
    return (
        <div className="filter-bar">
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

            <fieldset className="position-filters">
                <legend>Position</legend>
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
                            name="pos-filter" value={filterOption.value} 
                            checked={posFilter == filterOption.value} 
                            onChange={() => { 
                                let currentlyChecked = posFilter == filterOption.value
                                onPosChange(currentlyChecked ? undefined : filterOption.value)
                            }} 
                        />
                 </div>
                ))}
            </fieldset>
        </div>
    )
}

export default FilterBar