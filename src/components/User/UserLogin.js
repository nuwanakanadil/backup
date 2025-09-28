'use client';

import {
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { useState } from 'react';
import Image from 'next/image';
import '@/styles/userLogin.css'; // Animation
import { useRouter } from 'next/navigation';

export default function UserLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // NEW: simple form errors
  const [errors, setErrors] = useState({});

  // NEW: validation helper (matches your project rules)
  const validate = () => {
    const next = {};

    // email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address';
    }

    // password: min 8 chars, letters & numbers
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      next.password = 'Min 8 characters with letters & numbers';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      console.log('Logged in:', data);
      localStorage.setItem('email', JSON.stringify(data.email));
      localStorage.setItem('userId', data.userId);
      alert('Login successful!');
      // redirect or set session here
      router.push("/userProfile");
    } else {
      alert(data.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="py-6 px-4">
        <div className="grid lg:grid-cols-2 items-center gap-6 max-w-6xl w-full">
          {/* Login Form */}
          <div className="border border-slate-300 rounded-lg p-6 max-w-md shadow-[0_2px_22px_-4px_rgba(93,96,127,0.2)] max-lg:mx-auto bg-[#6F4E37]">
            <form className="space-y-16" onSubmit={handleSubmit}>
              <div className="mb-12">
                <h1 className="text-white text-3xl font-semibold">Sign in</h1>
                <p className="text-white text-[15px] mt-6 leading-relaxed">
                  Sign in to your account and explore a world of possibilities.
                </p>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">Email</label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-invalid={!!errors.email}
                    className="w-full text-sm text-black border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-300 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">Password</label>
                <div className="relative flex items-center">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-invalid={!!errors.password}
                    className="w-full text-sm text-black border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Enter password"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-300 text-xs mt-1">{errors.password}</p>
                )}
                <p className="text-white text-xs mt-1">Must be 8+ chars with letters & numbers.</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm text-white">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="/ForgotPassword" className="text-white hover:underline font-medium">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <div className="mt-12">
                <button
                  type="submit"
                  className="w-full shadow-xl py-2.5 px-4 text-[15px] font-medium tracking-wide rounded-lg text-white bg-[#FF4081] hover:bg-pink-500 focus:outline-none"
                >
                  Sign in
                </button>
                <p className="text-sm mt-6 text-center text-white">
                  Don't have an account?
                  <a href="/signup" className="text-white font-medium hover:underline ml-1">
                    Register here
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Right Image */}
          <div className="max-lg:mt-8 h-[calc(100%-100px)]">
            <img
              src="/coffee-login.jpg"
              className="w-full h-full object-cover rounded-lg image-animation"
              alt="Coffee Login"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
