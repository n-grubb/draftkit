import { useContext } from 'react'
import { SportContext } from '~/data/sportContext'

const SportSelector = () => {
    const { sport, setSport, sports } = useContext(SportContext)

    return (
        <div className="sport-selector">
            {sports.map(s => (
                <label
                    key={s.key}
                    className={`sport-option ${sport === s.key ? 'selected' : ''}`}
                    title={s.label}
                >
                    <span>{s.shortLabel}</span>
                    <input
                        type="radio"
                        name="sport"
                        value={s.key}
                        checked={sport === s.key}
                        onChange={() => setSport(s.key)}
                    />
                </label>
            ))}
        </div>
    )
}

export default SportSelector
