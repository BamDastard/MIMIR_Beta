import React, { useState } from 'react';

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: (displayName: string) => void;
    apiClient: any; // Using any for simplicity, but should be typed
}

export default function OnboardingModal({ isOpen, onComplete, apiClient }: OnboardingModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError('');

        try {
            const res = await apiClient.post('/user/onboard', { display_name: name });
            if (res.ok) {
                const data = await res.json();
                onComplete(data.display_name);
            } else {
                const err = await res.json();
                setError(err.detail || 'Failed to onboard');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-cyan-500/20">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                    Welcome to MIMIR
                </h2>
                <p className="text-gray-400 mb-6">
                    I do not recognize your aura. By what name shall I know you?
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                            Your Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                            placeholder="e.g. Thor Odinson"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900/50">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${loading || !name.trim()
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                            }`}
                    >
                        {loading ? 'Forging Identity...' : 'Begin Journey'}
                    </button>
                </form>
            </div>
        </div>
    );
}
