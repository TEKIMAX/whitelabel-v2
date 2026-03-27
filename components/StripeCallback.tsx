
import React, { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from "../convex/_generated/api";
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const StripeCallback = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Connecting your Stripe account...');

    const exchangeCode = useAction(api.stripeActions.exchangeConnectCode);
    const hasExchanged = React.useRef(false);

    useEffect(() => {
        const handleCallback = async () => {
            if (hasExchanged.current) return;

            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state'); // This is the projectId
            const error = params.get('error');

            if (error) {
                setStatus('error');
                setMessage(`Stripe connect failed: ${params.get('error_description') || error}`);
                return;
            }

            if (!code || !state) {
                setStatus('error');
                setMessage('Invalid callback parameters. Missing code or state.');
                return;
            }

            hasExchanged.current = true;

            try {
                await exchangeCode({ code, projectId: state });
                setStatus('success');
                setMessage('Successfully connected Stripe!');

                // Redirect back to app after short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } catch (err: any) {
                hasExchanged.current = false; // Allow retry if failed
                setStatus('error');
                setMessage(`Failed to connect Stripe: ${err.message}`);
            }
        };

        handleCallback();
    }, [exchangeCode]);

    return (
        <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-stone-300 animate-spin" />
                        <h2 className="text-xl font-serif text-stone-900">Connecting Stripe...</h2>
                        <p className="text-stone-500">{message}</p>
                    </div>
                )}
                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                        <h2 className="text-xl font-serif text-stone-900">Connected!</h2>
                        <p className="text-stone-500">{message}</p>
                        <p className="text-xs text-stone-400">Redirecting to dashboard...</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                        <XCircle className="w-12 h-12 text-red-500" />
                        <h2 className="text-xl font-serif text-stone-900">Connection Failed</h2>
                        <p className="text-red-600 text-sm">{message}</p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="mt-4 px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StripeCallback;
