import { useContext, useState, useEffect, useRef } from 'react'
import { StoreContext } from '~/data/store'
import ModeSelector from '~/components/ModeSelector'
import { validatePin } from '~/data/rankingService'

// Maximum number of stored rankings
const MAX_STORED_RANKINGS = 10;

// Key for storing validated PINs in localStorage
const VALIDATED_PINS_KEY = 'validatedPins';

const AppHeader = () => {
    const { mode, updateMode, ranking, userRanking, players } = useContext(StoreContext);
    const { 
        isShared, 
        pin, 
        setPin, 
        shareRanking, 
        getShareUrl,
        loadRanking,
        createNewRanking,
        savedRankings,
        switchRanking,
        deleteRanking,
        loadSavedRankings,
        isAtStorageLimit
    } = userRanking;

    const [showShareModal, setShowShareModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showRankingsDrawer, setShowRankingsDrawer] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [newPin, setNewPin] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isValidatingPin, setIsValidatingPin] = useState(false);
    
    // Ref for the drawer to detect clicks outside
    const drawerRef = useRef(null);
    
    // Load validated PIN from localStorage on mount
    useEffect(() => {
        if (ranking?.id && !ranking.id.startsWith('local')) {
            const validatedPins = JSON.parse(localStorage.getItem(VALIDATED_PINS_KEY) || '{}');
            const savedPin = validatedPins[ranking.id];
            if (savedPin) {
                setPin(savedPin);
            }
        }
    }, [ranking?.id]);
    
    // Handle clicks outside the drawer
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target)) {
                setShowRankingsDrawer(false);
            }
        };
        
        // Add event listener when drawer is open
        if (showRankingsDrawer) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        // Clean up
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showRankingsDrawer]);
    
    // Load saved rankings when opening the drawer
    useEffect(() => {
        if (showRankingsDrawer) {
            loadSavedRankings();
        }
    }, [showRankingsDrawer]);
    
    // Check if PIN is needed when switching to edit mode
    useEffect(() => {
        if (mode === 'edit' && isShared && !pin && ranking && ranking.id && !ranking.id.startsWith('local')) {
            setShowPinModal(true);
        }
    }, [mode, isShared, pin, ranking?.id]);
    
    // Store validated PIN in localStorage
    const storeValidatedPin = (rankingId, validPin) => {
        const validatedPins = JSON.parse(localStorage.getItem(VALIDATED_PINS_KEY) || '{}');
        validatedPins[rankingId] = validPin;
        localStorage.setItem(VALIDATED_PINS_KEY, JSON.stringify(validatedPins));
    };
    
    // Handle PIN submission
    const handlePinSubmit = async (e) => {
        e.preventDefault();
        setPinError('');
        
        if (!pinInput) {
            setPinError('Please enter a PIN');
            return;
        }

        setIsValidatingPin(true);
        
        try {
            const isValid = await validatePin(ranking.id, pinInput);
            
            if (isValid) {
                // Store the PIN and close the modal
                setPin(pinInput);
                storeValidatedPin(ranking.id, pinInput);
                setShowPinModal(false);
            } else {
                setPinError('Invalid PIN');
                updateMode('view');
            }
        } catch (err) {
            setPinError('Failed to validate PIN');
            updateMode('view');
        } finally {
            setIsValidatingPin(false);
        }
    };
    
    // If user cancels PIN entry, switch back to view mode
    const handlePinCancel = () => {
        setShowPinModal(false);
        updateMode('view');
    };
    
    // Handle creating a new ranking
    const handleCreateNewRanking = () => {
        if (isAtStorageLimit) {
            alert(`You've reached the maximum of ${MAX_STORED_RANKINGS} saved rankings. Please delete some before creating a new one.`);
            return;
        }
        
        const confirmed = window.confirm("Create a new ranking? This will not affect your current saved rankings.");
        if (confirmed) {
            createNewRanking(players);
            setShowRankingsDrawer(false);
        }
    };
    
    // Handle switching to a different ranking
    const handleSwitchRanking = (rankingId) => {
        if (rankingId === ranking.id) {
            setShowRankingsDrawer(false);
            return; // Already on this ranking
        }
        
        switchRanking(rankingId).then(() => {
            setShowRankingsDrawer(false);
        });
    };
    
    // Handle deleting a ranking
    const handleDeleteRanking = (e, rankingId) => {
        e.stopPropagation(); // Prevent triggering the onClick of the parent
        
        const confirmed = window.confirm("Are you sure you want to delete this ranking? This cannot be undone.");
        if (confirmed) {
            deleteRanking(rankingId);
        }
    };

    // Handle share modal toggle
    const toggleShareModal = () => {
        setShowShareModal(!showShareModal);
        // Reset form on open
        if (!showShareModal) {
            setAuthor('');
            setDescription('');
            setNewPin('');
            setShareUrl('');
            setError('');
        }
    };

    // Handle share form submission
    const handleShare = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Validate PIN
            if (newPin && !/^\d{4,6}$/.test(newPin)) {
                setError('PIN must be 4-6 digits');
                setIsSubmitting(false);
                return;
            }

            // Share ranking
            const result = await shareRanking(author, description, newPin);
            
            if (result && result.id) {
                setShareUrl(getShareUrl());
            }
        } catch (err) {
            setError(err.message || 'Failed to share ranking');
        } finally {
            setIsSubmitting(false);
        }
    };

    // URL-based loading is now handled elsewhere

    // Copy share URL to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <header data-component="AppHeader">
            <div className="header-left">
                <h1>draftkit</h1>
            </div>
            
            <div className="ranking-actions">
                {/* Ranking ID display */}
                <div className="ranking-info">
                    {ranking && ranking.id && (
                        <div className="ranking-id">
                            <div className="ranking-header">
                                <span className="id-label">Ranking:</span>
                                <span className="id-value">
                                    {ranking.id && ranking.id.startsWith('local') 
                                        ? '#0000' 
                                        : `#${ranking.id}`}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                
                <ModeSelector />
                
                {/* Menu button */}
                <button 
                    className="menu-button" 
                    onClick={() => setShowRankingsDrawer(!showRankingsDrawer)}
                    aria-label="Rankings menu"
                >
                    <span className="menu-icon">☰</span>
                </button>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        {shareUrl ? (
                            <div className="share-success">
                                <h3>Ranking Shared!</h3>
                                <div className="share-url">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={shareUrl} 
                                        onClick={(e) => e.target.select()}
                                    />
                                    <button onClick={copyToClipboard}>
                                        {isCopied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                {newPin && (
                                    <div className="pin-reminder">
                                        <p>Your PIN: <strong>{newPin}</strong></p>
                                        <p className="pin-note">Keep this PIN to edit later</p>
                                    </div>
                                )}
                                <button onClick={toggleShareModal} className="close-button small">
                                    Close
                                </button>
                            </div>
                        ) : isShared ? (
                            <div className="share-existing">
                                <h3>Share Ranking</h3>
                                <p>Your ranking ID: <strong>{ranking.id}</strong></p>
                                <div className="share-url">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={getShareUrl() || ''} 
                                        onClick={(e) => e.target.select()}
                                    />
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(getShareUrl() || '');
                                        setIsCopied(true);
                                        setTimeout(() => setIsCopied(false), 2000);
                                    }}>
                                        {isCopied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                {!pin && (
                                    <div className="edit-pin">
                                        <label htmlFor="edit-pin">PIN to edit:</label>
                                        <input 
                                            id="edit-pin"
                                            type="password" 
                                            placeholder="Enter PIN" 
                                            value={pin} 
                                            onChange={(e) => setPin(e.target.value)}
                                        />
                                    </div>
                                )}
                                <button onClick={toggleShareModal} className="close-button small">
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleShare} className="share-form">
                                <h3>Share Your Ranking</h3>
                                <div className="form-group">
                                    <label htmlFor="author">Your Name (optional):</label>
                                    <input
                                        type="text"
                                        id="author"
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                        placeholder="Anonymous"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="description">Description (optional):</label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a description..."
                                        rows="2"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="pin">PIN (optional):</label>
                                    <input
                                        type="password"
                                        id="pin"
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value)}
                                        placeholder="4-6 digits"
                                    />
                                    <p className="field-hint">Create a PIN to edit later</p>
                                </div>
                                {error && <div className="error">{error}</div>}
                                <div className="form-actions">
                                    <button 
                                        type="button" 
                                        onClick={toggleShareModal} 
                                        className="cancel-button small"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="submit-button small"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Sharing...' : 'Share'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
            
            {/* Rankings Drawer */}
            {showRankingsDrawer && (
                <div className="drawer-overlay">
                    <div className="rankings-drawer" ref={drawerRef}>
                        <div className="drawer-header">
                            <h3>Rankings</h3>
                            <button 
                                className="close-drawer" 
                                onClick={() => setShowRankingsDrawer(false)}
                                aria-label="Close menu"
                            >
                                ×
                            </button>
                        </div>
                        
                        {/* Current ranking details */}
                        {ranking && (
                            <div className="current-ranking-details">
                                <h4>Current Ranking</h4>
                                <div className="ranking-name">
                                    {ranking.id && ranking.id.startsWith('local') 
                                        ? `#${ranking.id.substr(6, 4)}`
                                        : (ranking.name || (ranking.author 
                                            ? `${ranking.author}'s Ranking` 
                                            : `Ranking #${ranking.id}`))}
                                </div>
                                
                                {ranking.author 
                                    ? <div className="ranking-author">by {ranking.author}</div>
                                    : ranking.id && ranking.id.startsWith('local') 
                                        ? <div className="ranking-author">Local Ranking</div> 
                                        : null
                                }

                                {ranking.description && (
                                    <div className="ranking-description">{ranking.description}</div>
                                )}
                                
                                {/* Share button for edit mode */}
                                {mode === 'edit' && (
                                    <button 
                                        className="share-button drawer-button" 
                                        onClick={() => {
                                            toggleShareModal();
                                            setShowRankingsDrawer(false);
                                        }}
                                    >
                                        Share This Ranking
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {/* Create new ranking button */}
                        <div className="drawer-section">
                            <button 
                                className="new-ranking-button drawer-button" 
                                onClick={() => {
                                    const confirmed = window.confirm("Create a new ranking? This will not affect your current saved rankings.");
                                    if (confirmed) {
                                        createNewRanking(players);
                                        setShowRankingsDrawer(false);
                                    }
                                }}
                            >
                                Create New Ranking
                            </button>
                            
                            {/* Saved rankings list */}
                            {savedRankings.length > 0 && (
                                <ul className="rankings-list">
                                    {savedRankings.map(item => (
                                        <li 
                                            key={item.id} 
                                            className={`ranking-item${item.id === ranking.id ? ' active' : ''}`}
                                            onClick={() => {
                                                if (item.id !== ranking.id) {
                                                    switchRanking(item.id).then(() => {
                                                        setShowRankingsDrawer(false);
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="ranking-item-content">
                                                <div className="ranking-item-header">
                                                    <div className="ranking-item-name">
                                                        {item.id.startsWith('local') 
                                                            ? `Local #${item.id.substr(-4)}` 
                                                            : `Ranking #${item.id}`}
                                                    </div>
                                                    
                                                </div>
                                                {item.author && (
                                                    <div className="ranking-item-author">
                                                        by {item.author}
                                                    </div>
                                                )}
                                                {item.description && (
                                                    <div className="ranking-item-description">
                                                        {item.description}
                                                    </div>
                                                )}
                                                <div className="ranking-item-meta">
                                                    {item.id === ranking.id && (
                                                        <div className="active-indicator">Current</div>
                                                    )}
                                                    {item.id.startsWith('local') 
                                                        ? <div className="local-indicator">Local</div>
                                                        : <div className="shared-indicator">Shared</div>
                                                    }
                                                </div>
                                            </div>
                                            {item.id !== ranking.id && (
                                                <button 
                                                    className="delete-ranking" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const confirmed = window.confirm("Are you sure you want to delete this ranking? This cannot be undone.");
                                                        if (confirmed) {
                                                            deleteRanking(item.id);
                                                        }
                                                    }}
                                                    aria-label="Delete ranking"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* PIN Modal */}
            {showPinModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Enter PIN</h3>
                        <p>This ranking is protected. Please enter the PIN to edit:</p>
                        <form onSubmit={handlePinSubmit}>
                            <input
                                type="password"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                placeholder="Enter PIN"
                                disabled={isValidatingPin}
                            />
                            {pinError && <div className="error">{pinError}</div>}
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={handlePinCancel} 
                                    className="cancel-button"
                                    disabled={isValidatingPin}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="submit-button"
                                    disabled={isValidatingPin}
                                >
                                    {isValidatingPin ? 'Validating...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </header>
    )
}

export default AppHeader