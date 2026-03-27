import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/CustomAuthProvider';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useConvexAuth } from 'convex/react';

interface AcceptInviteProps {
  onContinue: () => void;
}

const AcceptInvite: React.FC<AcceptInviteProps> = ({ onContinue }) => {
  const { user } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const [redirecting, setRedirecting] = useState(false);

  const projects = useQuery(api.projects.list, isAuthenticated ? {} : 'skip');

  // If user somehow lands here unauthenticated, redirect to home
  useEffect(() => {
    if (!user) {
      window.location.href = '/';
    }
  }, [user]);

  const handleContinue = () => {
    setRedirecting(true);
    onContinue();
  };

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F9F8F4]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email;

  const projectCount = projects?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-stone-100 p-10 text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>

        {/* Heading */}
        <h1 className="font-serif text-3xl text-stone-900 mb-2">
          Welcome, {displayName}!
        </h1>
        <p className="text-stone-500 text-sm mb-8 leading-relaxed">
          You've accepted your invitation and your account is ready.{' '}
          {projectCount > 0
            ? `You have access to ${projectCount} workspace${projectCount !== 1 ? 's' : ''}.`
            : 'Your workspace is waiting for you.'}
        </p>

        {/* Divider */}
        <div className="border-t border-stone-100 mb-8" />

        {/* What's next */}
        <div className="text-left space-y-3 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
            What's next
          </p>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <p className="text-sm text-stone-600">
              Explore the workspaces your team has set up for you
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <p className="text-sm text-stone-600">
              Collaborate with your team using AI-powered tools
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <p className="text-sm text-stone-600">
              Build, validate, and grow your ideas together
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={redirecting}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-stone-900 text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-stone-800 active:bg-stone-700 transition-colors disabled:opacity-60"
        >
          {redirecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Go to My Dashboard
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Email */}
        <p className="mt-4 text-xs text-stone-400">
          Signed in as {user.email}
        </p>
      </div>
    </div>
  );
};

export default AcceptInvite;
