import React, { useState, useEffect } from 'react';
import { trackEvent } from '../analytics';

type Theme = 'light' | 'dark';

export const SupportModal: React.FC<{ show: boolean; onClose: () => void; theme: Theme; }> = ({ show, onClose, theme }) => {
    const [view, setView] = useState<'initial' | 'upi'>('initial');
    const [copyText, setCopyText] = useState('Copy UPI ID');
    const isDark = theme === 'dark';

    useEffect(() => {
        if (show) {
            setView('initial');
            setCopyText('Copy UPI ID');
        }
    }, [show]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (show) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [show, onClose]);

    const handleCopy = () => {
        navigator.clipboard.writeText('udaybhaskar2283@okicici');
        trackEvent('support_copy_upi_id');
        setCopyText('Copied!');
        setTimeout(() => setCopyText('Copy UPI ID'), 2000);
    };

    if (!show) return null;

    const modalBg = isDark ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800';
    const buttonBaseClasses = `w-full text-center px-4 py-3 text-lg font-bold rounded-md transition-colors duration-300 flex items-center justify-center space-x-3`;
    const upiClasses = isDark ? `bg-gray-800 hover:bg-gray-700` : `bg-gray-200 hover:bg-gray-300`;

    const icons = {
        close: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
        ),
        back: (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
        ),
        copy: (
             <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
        ),
        paypal: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-paypal" viewBox="0 0 16 16">
              <path d="M14.06 3.713c.12-1.071-.093-1.832-.702-2.526C12.628.356 11.312 0 9.626 0H4.734a.7.7 0 0 0-.691.59L2.005 13.509a.42.42 0 0 0 .415.486h2.756l-.202 1.28a.628.628 0 0 0 .62.726H8.14c.429 0 .793-.31.862-.731l.025-.13.48-3.043.03-.164.001-.007a.35.35 0 0 1 .348-.297h.38c1.266 0 2.425-.256 3.345-.91q.57-.403.993-1.005a4.94 4.94 0 0 0 .88-2.195c.242-1.246.13-2.356-.57-3.154a2.7 2.7 0 0 0-.76-.59l-.094-.061ZM6.543 8.82a.7.7 0 0 1 .321-.079H8.3c2.82 0 5.027-1.144 5.672-4.456l.003-.016q.326.186.548.438c.546.623.679 1.535.45 2.71-.272 1.397-.866 2.307-1.663 2.874-.802.57-1.842.815-3.043.815h-.38a.87.87 0 0 0-.863.734l-.03.164-.48 3.043-.024.13-.001.004a.35.35 0 0 1-.348.296H5.595a.106.106 0 0 1-.105-.123l.208-1.32z"/>
            </svg>
        )
    };
    
    const copyButtonClasses = copyText === 'Copied!' 
        ? (isDark ? 'bg-green-400 text-black' : 'bg-green-500 text-white')
        : 'bg-brand-accent hover:bg-brand-accent/90 text-white';

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
        >
            <div 
                className={`relative w-full max-w-sm m-4 p-6 rounded-lg shadow-2xl ${modalBg}`}
                onClick={e => e.stopPropagation()}
            >
                {view === 'upi' && (
                    <button onClick={() => setView('initial')} className={`absolute top-3 left-3 p-2 rounded-full ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`} aria-label="Back to support options">
                        {icons.back}
                    </button>
                )}
                <button onClick={onClose} className={`absolute top-3 right-3 p-2 rounded-full ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`} aria-label="Close support dialog">
                    {icons.close}
                </button>

                {view === 'initial' && (
                    <>
                        <h2 id="support-modal-title" className="text-2xl font-bold text-center mb-6">Support This Project</h2>
                        <div className="space-y-4">
                            <a 
                                href="https://www.paypal.com/ncp/payment/72N9AB9VD4MJ4" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`${buttonBaseClasses} bg-[#0070ba] text-white hover:bg-[#005ea6]`}
                                onClick={() => {
                                    trackEvent('support_paypal_click');
                                    onClose();
                                }}
                            >
                                {icons.paypal}
                                <span>Pay with PayPal</span>
                            </a>
                            <button 
                                onClick={() => {
                                    trackEvent('support_show_upi');
                                    setView('upi')
                                }}
                                className={`${buttonBaseClasses} ${upiClasses}`}
                            >
                                <span className="font-bold text-2xl leading-none">₹</span>
                                <span>Pay with UPI</span>
                            </button>
                        </div>
                    </>
                )}

                {view === 'upi' && (
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-2xl font-bold mb-4">Pay with UPI</h2>
                        <img src="images/UPI-QRCode.png" alt="UPI QR Code" width="256" height="256" className={`rounded-lg border-4 ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-4`} />
                        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Scan the QR code with any UPI app</p>
                        <div className={`w-full flex items-center rounded-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'}`}>
                            <input 
                                type="text" 
                                readOnly 
                                value="udaybhaskar2283@okicici"
                                aria-label="UPI ID"
                                className={`w-full p-2 bg-transparent text-base truncate focus:outline-none ${isDark ? 'text-gray-200' : 'text-gray-800'}`} 
                            />
                            <button 
                                onClick={handleCopy}
                                className={`flex-shrink-0 flex items-center justify-center w-36 space-x-2 px-3 py-2 text-sm font-semibold rounded-r-md transition-all duration-300 ${copyButtonClasses}`}
                            >
                                {copyText === 'Copy UPI ID' && <span className="w-5 h-5">{icons.copy}</span>}
                                <span>{copyText}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
