'use client';

import { useState } from 'react';
import '@/styles/userLogin.css'; // For animation

export default function UserForgotPassword() {
  const [email, setEmail] = useState('');
  const [universityId, setUniversityId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const userData = {
      email,
      universityId,
    };
    console.log(userData);
    // Connect to backend to send reset link or verify identity
  };

  return (
    <div class="min-h-screen flex fle-col items-center justify-center">
      <div class="py-6 px-4">
        <div class="grid lg:grid-cols-2 items-center gap-6 max-w-6xl w-full">
          <div class="border border-slate-300 rounded-lg p-6 max-w-md shadow-[0_2px_22px_-4px_rgba(93,96,127,0.2)] max-lg:mx-auto bg-[#6F4E37]">
            <form class="space-y-16" onSubmit={handleSubmit}>
              {/* Header Title for Forgot Password */}
              <div class="mb-12">
                <h1 class="text-white-900 text-3xl font-semibold">Forgot Password</h1>
                <p class="text-white-600 text-[15px] mt-6 leading-relaxed">
                  Enter your university ID and email. We'll help you reset your password securely.
                </p>
              </div>

              {/* Email */}
              <div>
                <label class="text-white-900 text-sm font-medium mb-2 block">Email</label>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  class="w-full text-sm text-white-900 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600"
                  placeholder="Enter your email"
                />
              </div>

              {/* University ID */}
              <div>
                <label class="text-white-900 text-sm font-medium mb-2 block">University ID</label>
                <input
                  name="universityId"
                  type="text"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  required
                  class="w-full text-sm text-white-900 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600"
                  placeholder="Enter your university ID"
                />
              </div>

              {/* Submit */}
              <div class="!mt-12">
                <button type="submit" class="w-full shadow-xl py-2.5 px-4 text-[15px] font-medium tracking-wide rounded-lg text-white bg-[#FF4081] hover:bg-pink-500 focus:outline-none cursor-pointer">
                  Reset Password
                </button>
                <p class="text-sm !mt-6 text-center text-white-600">Remembered your password? <a href="/signin" class="text-white-600 font-medium hover:underline ml-1 whitespace-nowrap">Login here</a></p>
              </div>
            </form>
          </div>

          {/* Image Section */}
          <div class="max-lg:mt-8 h-[calc(100%-10px)] w-[400px] mx-auto lg:ml-15 relative">
            <img
              src="/forgotpsw.jpg"
              class="w-full h-full object-cover rounded-lg image-animation"
              alt="Forgot Password Illustration"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
