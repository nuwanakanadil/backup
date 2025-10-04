'use client';

import { useState } from 'react';
import '@/styles/userLogin.css'; // your animation

export default function UserForgotPassword() {
  const [email, setEmail] = useState('');
  const [universityId, setUniversityId] = useState('');

  // flow state
  const [resetId, setResetId] = useState(null);
  const [loading, setLoading] = useState(false);

  // OTP dialog
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');

  // New password dialog
  const [pwdOpen, setPwdOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const API = 'http://localhost:5000/api/auth/forgot';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, universityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to request reset');

      if (data.resetId) setResetId(data.resetId);
      setOtp('');
      setOtpOpen(true);
    } catch (err) {
      alert(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!resetId || !otp) return alert('Enter the code sent to your email');
    setLoading(true);
    try {
      const res = await fetch(`${API}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetId, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to verify code');
      setOtpOpen(false);
      setPwdOpen(true);
    } catch (err) {
      alert(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // client-side validation mirrors backend rules for nicer UX
  const validatePassword = (pwd, confirm) => {
    if (pwd.length < 8) return 'Password must be at least 6 characters long';
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd)) {
      return 'Password must include letters and numbers';
    }
    if (pwd !== confirm) return 'Passwords do not match';
    return null;
  };

  const handleResetPassword = async () => {
    const msg = validatePassword(password, confirmPassword);
    if (msg) return alert(msg);

    setLoading(true);
    try {
      const res = await fetch(`${API}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetId, otp, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');

      alert('Password updated successfully. Please login.');
      window.location.href = '/signin';
    } catch (err) {
      alert(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="py-6 px-4">
        <div className="grid lg:grid-cols-2 items-center gap-6 max-w-6xl w-full">
          <div className="border border-slate-300 rounded-lg p-6 max-w-md shadow-[0_2px_22px_-4px_rgba(93,96,127,0.2)] max-lg:mx-auto bg-[#6F4E37]">
            <form className="space-y-16" onSubmit={handleSubmit}>
              {/* Header */}
              <div className="mb-12">
                <h1 className="text-white text-3xl font-semibold">Forgot Password</h1>
                <p className="text-white/80 text-[15px] mt-6 leading-relaxed">
                  Enter your university ID and email. We&apos;ll send a secure code to verify it&apos;s you.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Email</label>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full text-sm text-black border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600 placeholder:text-gray-400 bg-white"
                  placeholder="Enter your email"
                />
              </div>

              {/* University ID */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">University ID</label>
                <input
                  name="universityId"
                  type="text"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  required
                  className="w-full text-sm text-black border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600 placeholder:text-gray-400 bg-white"
                  placeholder="Enter your university ID"
                />
              </div>

              {/* Submit */}
              <div className="!mt-12">
                <button
                  type="submit"
                  className="w-full shadow-xl py-2.5 px-4 text-[15px] font-medium tracking-wide rounded-lg text-white bg-[#FF4081] hover:bg-pink-500 focus:outline-none cursor-pointer disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Processing…' : 'Reset Password'}
                </button>
                <p className="text-sm !mt-6 text-center text-white/80">
                  Remembered your password?{' '}
                  <a href="/signin" className="text-white font-medium hover:underline ml-1 whitespace-nowrap">
                    Login here
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Image Section */}
          <div className="max-lg:mt-8 h-[calc(100%-10px)] w-[400px] mx-auto lg:ml-15 relative">
            <img
              src="/forgotpsw.jpg"
              className="w-full h-full object-cover rounded-lg image-animation"
              alt="Forgot Password Illustration"
            />
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {otpOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-semibold mb-2 text-black">Enter verification code</h2>
            <p className="text-sm text-gray-700 mb-4">
              We sent a 6-digit code to <b className="text-black">{email}</b>. It expires in 10 minutes.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 text-black placeholder:text-gray-400 bg-white"
              placeholder="123456"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOtpOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-black"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                className="px-4 py-2 rounded-lg bg-[#FF4081] text-white disabled:opacity-60"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Password Modal */}
      {pwdOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-semibold mb-2 text-black">Set a new password</h2>
            <p className="text-sm text-gray-700 mb-4">
              Use at least 8 characters, including letters and numbers.
            </p>
            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-black placeholder:text-gray-400 bg-white"
                placeholder="New password"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-black placeholder:text-gray-400 bg-white"
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setPwdOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-black"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 rounded-lg bg-[#FF4081] text-white disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
