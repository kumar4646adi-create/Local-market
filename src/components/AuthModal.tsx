import React from 'react';

interface AuthModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  actionReason?: string;
  onClose: () => void;
  onSignInWithGoogle: () => Promise<void>;
  onContinueAsDemo?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  title = 'Log In / Sign Up',
  subtitle = 'Create an account or log in to continue.',
  actionReason,
  onClose,
  onSignInWithGoogle,
  onContinueAsDemo,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSignInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = () => {
    onContinueAsDemo?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#edeeef] text-left animate-in slide-in-from-bottom-6 duration-300 relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f3f4f5] hover:bg-[#edeeef] text-[#414941] flex items-center justify-center cursor-pointer transition-all"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#023616] text-white flex items-center justify-center mb-4 shadow-sm">
          <span className="material-symbols-outlined text-3xl">storefront</span>
        </div>

        {/* Titles */}
        <h3 className="text-xl font-extrabold text-[#191c1d] tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-[#717970] mt-1">
          {actionReason ? (
            <span className="font-semibold text-[#023616]">{actionReason}</span>
          ) : (
            subtitle
          )}
        </p>

        {error && (
          <div className="my-3 p-2.5 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Benefits list */}
        <div className="my-4 p-3 bg-[#f8f9fa] rounded-2xl border border-[#edeeef] space-y-2 text-xs text-[#414941]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#023616]">check_circle</span>
            <span>⚡ Express Smart Pickup counter orders</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#023616]">check_circle</span>
            <span>❤️ Save favorite Ghumarwin shops across devices</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#023616]">check_circle</span>
            <span>⭐ Review stores & purchased grocery products</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#023616]">check_circle</span>
            <span>🕒 Track real-time order status and OTPs</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {/* Sign in with Google */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full bg-white hover:bg-[#f8f9fa] active:scale-[0.99] text-[#191c1d] font-bold py-3 px-4 rounded-xl border border-[#c1c9be] shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {/* Quick Demo Customer Sign In */}
          {onContinueAsDemo && (
            <button
              type="button"
              onClick={handleDemoClick}
              className="w-full bg-[#023616] hover:bg-[#1e4d2b] active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">badge</span>
              <span>Continue with Customer Account</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full text-xs font-semibold text-[#717970] hover:text-[#191c1d] py-2 text-center cursor-pointer transition-colors"
          >
            Continue browsing as guest
          </button>
        </div>
      </div>
    </div>
  );
};
