import { useState, useContext } from 'react';
import { StoreContext } from '~/data/store';

const ShareRanking = () => {
    const { userRanking } = useContext(StoreContext);
    const { 
        ranking, 
        isShared, 
        pin, 
        setPin, 
        shareRanking, 
        getShareUrl 
    } = userRanking;

    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [newPin, setNewPin] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Handle toggling the share form visibility
    const toggleForm = () => {
        setShowForm(!showForm);
        // Reset state when opening
        if (!showForm) {
            setAuthor('');
            setDescription('');
            setNewPin('');
            setShareUrl('');
            setIsCopied(false);
            setError('');
        }
    };

    // Handle form submission to share the ranking
    const handleShare = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Validate PIN if provided (must be 4-6 digits)
            // Fix: escaping backslash in regex pattern
            if (newPin && !/^\d{4,6}$/.test(newPin)) {
                setError('PIN must be 4-6 digits');
                setIsSubmitting(false); // Reset submitting state
                return;
            }

            // Share the ranking
            const result = await shareRanking(author, description, newPin);
            
            // Only update if we successfully shared (avoid infinite loop)
            if (result && result.id) {
                setShareUrl(getShareUrl());
            }
        } catch (err: any) {
            setError(err.message || 'Failed to share ranking');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Copy the share URL to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    // For already shared rankings, just show the URL
    if (isShared && !ranking.id.startsWith('local')) {
        const url = getShareUrl();
        return (
            <div className="share-ranking">
                <h3>Share Your Ranking</h3>
                {ranking.author && (
                    <p className="share-info-row">
                        <span className="label">By:</span> {ranking.author}
                    </p>
                )}
                {ranking.description && (
                    <p className="share-info-row">
                        <span className="label">Description:</span> {ranking.description}
                    </p>
                )}
                <div className="share-url">
                    <input
                        type="text"
                        readOnly
                        value={url}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button onClick={() => {
                        if (url) {
                            navigator.clipboard.writeText(url);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                        }
                    }}>
                        {isCopied ? 'Copied!' : 'Copy URL'}
                    </button>
                </div>
                {!pin && (
                    <div className="edit-pin">
                        <p>Enter PIN to edit this ranking:</p>
                        <input
                            type="password"
                            placeholder="PIN"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                        />
                    </div>
                )}
            </div>
        );
    }

    // For non-shared rankings, show the share form or button
    return (
        <div className="share-ranking">
            {!showForm ? (
                <button className="share-button" onClick={toggleForm}>
                    Share Your Ranking
                </button>
            ) : (
                <>
                    <h3>Share Your Ranking</h3>
                    {shareUrl ? (
                        // Show the share URL after successful sharing
                        <div className="share-success">
                            <p>Your ranking has been shared! Share this URL:</p>
                            <div className="share-url">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={shareUrl} 
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                />
                                <button onClick={copyToClipboard}>
                                    {isCopied ? 'Copied!' : 'Copy URL'}
                                </button>
                            </div>
                            {newPin && (
                                <div className="pin-reminder">
                                    <p>Your PIN: <strong>{newPin}</strong></p>
                                    <p className="pin-note">Keep this PIN to edit your ranking later!</p>
                                </div>
                            )}
                            <button onClick={toggleForm} className="share-modal-close">
                                Done
                            </button>
                        </div>
                    ) : (
                        // Show the share form
                        <form onSubmit={handleShare} className="share-form">
                            <div className="form-group">
                                <label htmlFor="author">Your Name</label>
                                <input
                                    type="text"
                                    id="author"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    placeholder="Anonymous"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a description for your ranking..."
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="pin">PIN</label>
                                <input
                                    type="password"
                                    id="pin"
                                    value={newPin}
                                    onChange={(e) => setNewPin(e.target.value)}
                                    placeholder="4-6 digits"
                                />
                                <p className="field-hint">
                                    Optional. Create a PIN to edit from another device.
                                </p>
                            </div>
                            {error && <div className="error">{error}</div>}
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={toggleForm} 
                                    className="cancel-button"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="submit-button"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Sharing...' : 'Share Ranking'}
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}
        </div>
    );
};

export default ShareRanking;