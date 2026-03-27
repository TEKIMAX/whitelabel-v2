/**
 * Custom Auth Page — Magic Code Flow
 * Split layout: left side auth card, right side image.
 *
 * Flow:
 *  1. User enters email
 *  2. Code sent to email
 *  3. User enters 6-digit code
 *  4. Authenticated
 */
import React, { useState, useRef, useEffect } from 'react';
import { Mail, ArrowRight, ArrowLeft, Loader2, User, KeyRound, Building2, CheckCircle2, Send, AlertTriangle, X } from 'lucide-react';
import { Logo } from './Logo';
import { useBranding } from './BrandingProvider';

type AuthStep = 'email' | 'code' | 'org_selection' | 'success' | 'no_org' | 'loading_orgs';
type AuthMode = 'login' | 'signup';

interface Organization {
  id: string;
  name: string;
}

interface AuthPageProps {
  onAuthSuccess: (data: {
    user: any;
    accessToken: string;
    refreshToken: string;
  }) => void;
  isAuthenticatedWithoutOrg?: boolean;
  currentUserEmail?: string;
  onLogout?: () => void;
  onSwitchOrg?: (organizationId: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthSuccess,
  isAuthenticatedWithoutOrg,
  currentUserEmail,
  onLogout,
  onSwitchOrg,
}) => {
  const branding = useBranding();
  // Form states
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Organization Selection state
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [sessionExpired, setSessionExpired] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('reason') === 'session_expired';
    }
    return false;
  });

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Request Access states
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');


  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (sessionExpired && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('reason');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [sessionExpired]);

  // Handle direct access by authenticated users with no active workspace
  useEffect(() => {
    if (isAuthenticatedWithoutOrg && currentUserEmail) {
      setStep('loading_orgs');
      fetch(`/api/orgs/membership?email=${encodeURIComponent(currentUserEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.organizations && data.organizations.length > 0) {
            setOrganizations(data.organizations);
            setStep('org_selection');
          } else {
            setStep('no_org');
          }
        })
        .catch(err => {
          console.error("Failed to load organizations for direct access:", err);
          setStep('no_org');
        });
    }
  }, [isAuthenticatedWithoutOrg, currentUserEmail]);

  // Auto-focus first code input when step changes to 'code'
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Auto-select when exactly one org is available (provisioner-linked deployments)
  useEffect(() => {
    if (step === 'org_selection' && organizations.length === 1) {
      selectOrganization(organizations[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, organizations]);

  // ── Send code ──────────────────────────────────────────────────────────

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const body: any = { email };
      if (mode === 'signup') {
        body.firstName = firstName;
        body.lastName = lastName;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Unable to send code. Please try again.');
        return;
      }

      setStep('code');
      setCode(['', '', '', '', '', '']);
      setCountdown(60);
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verify code ────────────────────────────────────────────────────────

  const verifyCode = async (fullCode: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle explicit organization selection required from WorkOS
        if (res.status === 401 && data.error === 'organization_selection_required') {
           setPendingToken(data.pending_authentication_token);
           
           // Fetch the user's available organizations using their pending receipt
           try {
             // Extract userId from the raw WorkOS error payload receipt, otherwise fallback to email state
             const userId = data.rawData?.authentication_receipt?.user?.id;
             let fetchUrl = '/api/orgs/membership?token=' + encodeURIComponent(data.pending_authentication_token);
             if (userId) {
               fetchUrl += '&userId=' + encodeURIComponent(userId);
             } else if (email) {
               fetchUrl += '&email=' + encodeURIComponent(email);
             }

             const orgRes = await fetch(fetchUrl);
             if (orgRes.ok) {
               const orgData = await orgRes.json();
               if (orgData.organizations?.length > 0) {
                 setOrganizations(orgData.organizations);
                 setStep('org_selection');
                 return;
               }
             }
           } catch(e) { /* Fallthrough to error */ }
           
           setError('You must select an organization, but we couldn\'t load them.');
           return;
        }

        setError(data.message || data.error || 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
        return;
      }

      setStep('success');
      setTimeout(() => {
        onAuthSuccess({
          user: data.user,
          accessToken: data.accessToken || data.access_token,
          refreshToken: data.refreshToken || data.refresh_token,
        });
      }, 800);
    } catch {
      setError('Unable to verify. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Select Organization ────────────────────────────────────────────────

  const selectOrganization = async (organizationId: string) => {
    setError(null);
    setIsLoading(true);

    // Already-authenticated user selecting an org (no pending token from failed auth).
    // Use WorkOS org-scoped redirect to get a new token with org context.
    if (!pendingToken) {
      if (onSwitchOrg) {
        onSwitchOrg(organizationId);
        return; // redirects away, no need to setIsLoading(false)
      }
      setIsLoading(false);
      setError('Session expired. Please sign in again.');
      setTimeout(() => { setStep('email'); setError(null); }, 1500);
      return;
    }

    try {
      const res = await fetch('/api/auth/login-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_authentication_token: pendingToken, organization_id: organizationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Failed to authenticate with the chosen organization.');
        return;
      }

      setStep('success');
      setTimeout(() => {
        onAuthSuccess({
          user: data.user,
          accessToken: data.accessToken || data.access_token,
          refreshToken: data.refreshToken || data.refresh_token,
        });
      }, 800);
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Code input handlers ────────────────────────────────────────────────

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only last char
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      verifyCode(fullCode);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || '';
    }
    setCode(newCode);
    if (pasted.length === 6) {
      verifyCode(pasted);
    } else {
      codeInputRefs.current[pasted.length]?.focus();
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setStep('email');
    setError(null);
    setCode(['', '', '', '', '', '']);
    setPendingToken(null);
    setOrganizations([]);
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestStatus('loading');
    
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: requestName,
          email: currentUserEmail || email,
          message: requestMessage,
        }),
      });

      if (!res.ok) throw new Error('Failed to send request');
      
      setRequestStatus('success');
      setTimeout(() => {
        setShowRequestAccess(false);
        setRequestStatus('idle');
      }, 3000);
    } catch {
      setRequestStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT SIDE: Auth Form ─────────────────────────────────────────── */}
      <div className={`w-full lg:w-1/2 flex ${step === 'org_selection' ? 'items-start pt-16' : 'items-center'} justify-center px-6 py-12 bg-[#F9F8F4]`}>
        <div className="w-full max-w-md space-y-8">
          {/* Logo — hidden on no_org/loading_orgs since those steps show their own */}
          {step !== 'no_org' && step !== 'loading_orgs' && (
            <div className="flex items-center justify-center lg:justify-start">
              <Logo
                className="flex items-center gap-3"
                imageClassName="h-16 w-auto rounded"
                textClassName="font-serif font-bold text-xl tracking-wide"
                src={branding.logoUrl || '/images/black-logo.png'}
              />
            </div>
          )}

          {/* ── Step 1: Email Entry ─────────────────────────────── */}
          {step === 'email' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {sessionExpired && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 animate-in fade-in slide-in-from-top-4">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-bold mb-0.5">Session Expired</h3>
                    <p className="text-xs text-amber-700">Your session has expired. Please sign in again to continue.</p>
                  </div>
                  <button 
                    onClick={() => setSessionExpired(false)} 
                    className="ml-auto text-amber-500/70 hover:text-amber-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div>
                <h1 className="font-serif text-3xl text-stone-900 mb-2">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="text-stone-500 text-sm">
                  {mode === 'login'
                    ? 'Enter your email to receive a sign-in code'
                    : 'Enter your details to get started'}
                </p>
              </div>

              <form onSubmit={sendCode} className="space-y-4">
                {/* Name fields (signup only) */}
                {mode === 'signup' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        id="signup-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        autoComplete="given-name"
                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C5A065]/40 focus:border-[#C5A065] transition-all"
                      />
                    </div>
                    <div>
                      <input
                        id="signup-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        autoComplete="family-name"
                        className="w-full px-4 py-3.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C5A065]/40 focus:border-[#C5A065] transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    autoComplete="email"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C5A065]/40 focus:border-[#C5A065] transition-all"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 animate-in fade-in duration-200">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full py-3.5 bg-stone-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#C5A065] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch mode */}
              <div className="text-center pt-4 border-t border-stone-200">
                <p className="text-sm text-stone-500">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button onClick={() => switchMode('signup')} className="text-[#C5A065] hover:text-[#b8933a] font-bold transition-colors">
                        Create one
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button onClick={() => switchMode('login')} className="text-[#C5A065] hover:text-[#b8933a] font-bold transition-colors">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Code Verification ──────────────────────── */}
          {step === 'code' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <button
                  onClick={() => { setStep('email'); setError(null); }}
                  className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change email
                </button>
                <h1 className="font-serif text-3xl text-stone-900 mb-2">Check your email</h1>
                <p className="text-stone-500 text-sm">
                  We sent a 6-digit code to <strong className="text-stone-700">{email}</strong>
                </p>
              </div>

              {/* Code inputs */}
              <div className="flex justify-center gap-3" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { codeInputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-white border-2 border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A065]/40 focus:border-[#C5A065] transition-all"
                    disabled={isLoading}
                  />
                ))}
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[#C5A065]" />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 animate-in fade-in duration-200 text-center">
                  {error}
                </div>
              )}

              {/* Resend */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-stone-400">
                    Resend code in <span className="font-bold text-stone-600">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={() => sendCode()}
                    disabled={isLoading}
                    className="text-sm text-[#C5A065] hover:text-[#b8933a] font-bold transition-colors disabled:opacity-50"
                  >
                    Resend code
                  </button>
                )}
              </div>

              {/* Hint */}
              <div className="flex items-center gap-2 p-3 bg-stone-100 rounded-xl">
                <KeyRound className="w-4 h-4 text-stone-400 shrink-0" />
                <p className="text-xs text-stone-500">
                  Can't find the email? Check your spam folder.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Organization Selection ──────────────────────── */}
          {step === 'org_selection' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="py-4">
                <h1 className="font-serif text-3xl text-stone-900 mb-2">Choose your workspace</h1>
                <p className="text-stone-500 text-sm">
                  Select the organization you want to log into.
                </p>
              </div>

              {/* Organization list */}
              <div className="space-y-3">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => selectOrganization(org.id)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl hover:border-[#C5A065] hover:shadow-md transition-all text-left group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-[#C5A065]/10 transition-colors">
                        <Building2 className="w-5 h-5 text-stone-500 group-hover:text-[#C5A065] transition-colors" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{org.name}</p>
                        <p className="text-xs text-stone-500">Workspace</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-[#C5A065] transition-colors" />
                  </button>
                ))}
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-center mt-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[#C5A065]" />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 animate-in fade-in duration-200 text-center">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Success ────────────────────────────────── */}
          {step === 'success' && (
            <div className="space-y-6 animate-in fade-in duration-300 text-center py-8">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h1 className="font-serif text-3xl text-stone-900 mb-2">You're in</h1>
                <p className="text-stone-500 text-sm">Setting up your workspace...</p>
              </div>
              <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: branding.primaryColor || '#C5A065' }} />
            </div>
          )}

          {/* ── Step 5: Loading Orgs ────────────────────────────────── */}
          {step === 'loading_orgs' && (
            <div className="space-y-6 animate-in fade-in duration-300 text-center py-8">
              <div>
                <h1 className="font-serif text-3xl text-stone-900 mb-2">Loading workspaces</h1>
                <p className="text-stone-500 text-sm">Please wait while we check your access...</p>
              </div>
              <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: branding.primaryColor || '#C5A065' }} />
            </div>
          )}

          {/* ── Step 6: No Active Workspaces ────────────────────────────────── */}
          {step === 'no_org' && (
            <div className="space-y-6 animate-in fade-in duration-300 text-center py-6">
              <div className="flex justify-center mb-4">
                <Logo
                  className="flex items-center justify-center"
                  imageClassName="h-12 w-auto max-w-[120px] rounded object-contain"
                  textClassName="hidden"
                  src={branding.logoUrl || '/images/black-logo.png'}
                />
              </div>
              <div>
                <h1 className="font-serif text-3xl text-stone-900 mb-2">No Active Workspaces</h1>
                <p className="text-stone-500 text-sm mb-8">
                  You have successfully authenticated as <strong>{currentUserEmail || email}</strong>, but you don't belong to any organizations yet.
                </p>
                
                {!showRequestAccess ? (
                  <div className="flex items-center gap-3 mb-4">
                    {onLogout && (
                      <button
                        onClick={onLogout}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-stone-200 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-50 transition-all shadow-sm"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Logout
                      </button>
                    )}
                    
                    <button
                      onClick={() => setShowRequestAccess(true)}
                      className="flex-1 py-3.5 text-white rounded-xl font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                      style={{ backgroundColor: branding.primaryColor || '#C5A065' }}
                    >
                      Request Access
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 p-6 bg-white border border-stone-200 rounded-2xl shadow-sm text-left animate-in slide-in-from-bottom-4 duration-300">
                    <h3 className="font-bold text-stone-900 mb-1">Request Workspace Access</h3>
                    <p className="text-xs text-stone-500 mb-4">Send a message to the administrator to request an invitation.</p>
                    
                    <form onSubmit={handleRequestAccess} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1.5">Your Name</label>
                        <input
                          type="text"
                          value={requestName}
                          onChange={(e) => setRequestName(e.target.value)}
                          required
                          placeholder="Jane Doe"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A065]/40 focus:border-[#C5A065]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1.5">Message (Optional)</label>
                        <textarea
                          value={requestMessage}
                          onChange={(e) => setRequestMessage(e.target.value)}
                          placeholder="Hi, I need access to the team workspace."
                          rows={3}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C5A065]/40 focus:border-[#C5A065] resize-none"
                        />
                      </div>

                      {requestStatus === 'error' && (
                        <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 text-center">
                          Failed to send request. The administrator may not have configured their email correctly.
                        </div>
                      )}

                      {requestStatus === 'success' ? (
                        <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700 flex items-center justify-center gap-2 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Request Sent!
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowRequestAccess(false)}
                            className="flex-1 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={requestStatus === 'loading' || !requestName.trim()}
                            className="flex-1 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ backgroundColor: branding.primaryColor || '#C5A065' }}
                          >
                            {requestStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SIDE: Image ────────────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/onboarding-cover.png"
            alt="Platform"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-stone-900/40" />

        {/* Decorative blurs */}
        <div className="absolute top-[10%] right-[10%] w-64 h-64 bg-[#C5A065]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[10%] w-48 h-48 bg-[#C5A065]/15 rounded-full blur-[80px]" />

        {/* Bottom card */}
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <div className="p-8 rounded-2xl bg-stone-900/60 backdrop-blur-xl border border-stone-700/50">
            <blockquote className="font-serif text-xl text-white leading-relaxed mb-4">
              "AI-powered guidance for early-stage founders — from first idea to funded startup."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C5A065]/20 flex items-center justify-center">
                <span className="text-[#C5A065] font-bold text-xs">AS</span>
              </div>
              <div>
                <p className="text-white text-sm font-bold">Adaptive Startup</p>
                <p className="text-stone-400 text-xs">The Operating System for 0 to 1</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};