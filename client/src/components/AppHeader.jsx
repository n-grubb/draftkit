
import { useContext, useState } from 'react'
import { StoreContext } from '~/data/store'
import ModeSelector from '~/components/ModeSelector'

const AppHeader = () => {
    const { mode, ranking, userRanking } = useContext(StoreContext);
    const { 
        isShared, 
        pin, 
        setPin, 
        shareRanking, 
        getShareUrl,
        loadRanking
    } = userRanking;

    const [showShareModal, setShowShareModal] = useState(false);
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [newPin, setNewPin] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

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
                {/* Description and author info to the right of title */}
                {ranking && ranking.id && (
                    <div className="ranking-metadata">
                        {ranking.description && (
                            <span className="ranking-description">{ranking.description}</span>
                        )}
                        {ranking.author && (
                            <span className="ranking-author">by {ranking.author}</span>
                        )}
                    </div>
                )}
            </div>
            
            <div className="ranking-actions">
                {/* Ranking ID display with share/load buttons */}
                <div className="ranking-info">
                    {ranking && ranking.id && (
                        <div className="ranking-id">
                            <div className="ranking-header">
                                <span className="id-label">Ranking:</span>
                                <span className="id-value">#{ranking.id}</span>
                            </div>
                            
                            {/* Controls for edit mode, immediately below ranking ID */}
                            {mode === 'edit' && (
                                <div className="ranking-controls compact">
                                    <a href="#" onClick={(e) => { e.preventDefault(); toggleShareModal(); }} className="ranking-link">
                                        {isShared ? 'Share' : 'Share'}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <ModeSelector />
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
            
            {/* Rankings are now loaded via URL instead of modal */}
        </header>
    );
};

export default AppHeader