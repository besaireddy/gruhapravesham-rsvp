import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Loader2, ChevronLeft } from 'lucide-react';

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { isAuthorizedAdmin } from '../lib/adminUtils';

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthorizedAdmin(user?.email)) {
      navigate('/admin', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;

      if (!isAuthorizedAdmin(loggedInUser.email)) {
        await auth.signOut();
        throw new Error('Access denied. Only approved host accounts can access the admin panel.');
      }

      const userDocRef = doc(db, 'users', loggedInUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: loggedInUser.uid,
          email: loggedInUser.email,
          role: 'admin'
        });
      }
      navigate('/admin');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in your Firebase project.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-[#717171] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthorizedAdmin(user?.email)) return null;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full apple-card p-10 md:p-12 text-center"
      >
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#717171] text-sm font-bold mb-8 hover:text-[#222222] transition-colors mx-auto"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Invitation
        </button>

        <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#ebebeb]">
          <Lock className="w-8 h-8 text-[#222222]" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#222222]">Host Access</h1>
        <p className="text-[#717171] mb-10 font-medium">
          Sign in with your Google account to manage the event
        </p>

        <div className="space-y-6">
          {error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-500 text-sm font-bold bg-red-50 py-2 rounded-lg px-4"
            >
              {error}
            </motion.p>
          )}
          
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#ebebeb] py-4 rounded-2xl font-bold text-[#222222] hover:bg-surface transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="pt-4 border-t border-[#ebebeb]">
            <p className="text-xs text-[#717171] font-medium leading-relaxed">
              Note: Only approved host Google accounts can access the admin panel.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
