import { useState, useEffect } from 'react'

const Toast = ({
    isVisible,
    message,
    actionLabel,
    onAction,
    isLoading = false,
    position = 'bottom', // 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right'
    variant = 'primary' // 'primary' | 'info' | 'warning' | 'danger'
}: any) => {
    const [show, setShow] = useState(false)

    useEffect(() => {
        setShow(isVisible)
    }, [isVisible])

    if (!show) return null

    // Map position prop to CSS classes
    const positionClasses = {
        'top': 'toast-top',
        'top-left': 'toast-top-left',
        'top-right': 'toast-top-right',
        'bottom': 'toast-bottom',
        'bottom-left': 'toast-bottom-left',
        'bottom-right': 'toast-bottom-right'
    }

    return (
        <div className={`toast ${positionClasses[position]}`}>
            <div className={`toast-content toast-${variant}`}>
                <span>{message}</span>
                {onAction && (
                    <button 
                        className={`toast-action-button toast-action-${variant}`}
                        onClick={onAction}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : actionLabel}
                    </button>
                )}
            </div>
        </div>
    )
}

export default Toast 