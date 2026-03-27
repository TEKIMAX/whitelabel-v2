import React, { useState } from 'react';
import { useAuth } from '../contexts/CustomAuthProvider';
import { AuthPage } from './AuthPage';

export const DevLogin: React.FC = () => {
  const { authenticateDirectly } = useAuth();
  const [showInject, setShowInject] = useState(false);
  const [tokenString, setTokenString] = useState('');
  const [error, setError] = useState('');

  const handleInject = () => {
    try {
      if (!tokenString.trim()) {
        setError('Please paste the production storage string.');
        return;
      }
      const parsed = JSON.parse(tokenString);
      if (!parsed.accessToken || !parsed.user) {
        throw new Error("Invalid format. Must contain 'accessToken' and 'user'.");
      }
      
      authenticateDirectly(parsed);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to parse session string.');
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-50 rounded-lg">
        <button 
          onClick={() => setShowInject(!showInject)}
          className="text-white text-xs px-4 py-2 bg-stone-900 border border-stone-800 rounded-full hover:bg-stone-800 shadow-xl opacity-50 hover:opacity-100 transition-opacity"
        >
          {showInject ? 'Use Magic Link' : 'Emergency Token Inject'}
        </button>
      </div>

      {!showInject ? (
        <AuthPage 
          onAuthSuccess={(data) => {
            authenticateDirectly(data);
            window.location.href = '/';
          }}
        />
      ) : (
        <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
            <h1 className="text-2xl outline-none font-serif font-bold text-stone-900 mb-2">Dev Login Injection</h1>
            
            <p className="text-sm text-stone-500 mb-4">
              Paste the value of the <code>workos_auth_session</code> from your production LocalStorage to bypass authentication tracking locally.
            </p>
            
            <textarea
              value={tokenString}
              onChange={(e) => setTokenString(e.target.value)}
              placeholder='{"user": {...}, "accessToken": "ey...", ...}'
              className="w-full h-40 p-4 border border-stone-300 rounded-xl mb-4 font-mono text-xs focus:ring-2 focus:ring-[#C5A065] outline-none"
            />
            
            {error && <p className="text-red-500 text-xs mb-4 font-medium">{error}</p>}
            
            <button
              onClick={handleInject}
              className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 transition-colors shadow-md"
            >
              Inject Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

