'use client';

import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { useState } from 'react';
import Image from 'next/image';


export default function UserSignup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
 

   const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { firstName, lastName, phone, email, password, confirmPassword};

    const res = await fetch('http://localhost:5000/api/auth/managersignup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) alert(data.message);
    else alert(data.message || 'Signup failed');
  };


  return (
    <div class="min-h-screen flex fle-col items-center justify-center">
      <div class="py-6 px-4">
        <div class="grid lg:grid-cols-2 items-center gap-6 max-w-6xl w-full">
          <div class="border border-slate-300 rounded-lg p-6 max-w-md shadow-[0_2px_22px_-4px_rgba(93,96,127,0.2)] max-lg:mx-auto bg-[#6F4E37]">
            <form class="space-y-4" onSubmit={handleSubmit}>
              <div class="mb-12">
                <h1 class="text-white-900 text-3xl font-semibold">Sign up</h1>
                <p class="text-white-600 text-[15px] mt-6 leading-relaxed">Create an account to start your journey with us.</p>
              </div>

              {/* First Name */}
              <div>
                <label class="text-white-900 text-sm font-medium mb-2 block">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  class="w-full text-sm text-white-900 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600"
                  placeholder="Enter first name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label class="text-white-900 text-sm font-medium mb-2 block">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  class="w-full text-sm text-white-900 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600"
                  placeholder="Enter last name"
                />
              </div>

             

              {/* Phone Number */}
              <div>
                <label class="text-white-900 text-sm font-medium mb-2 block">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  class="w-full text-sm text-white-900 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600"
                  placeholder="Enter phone number"
                />
              </div>

              {/* Username */}
              <div>
                <label class="text-white-900 text-sm font-medium mb-2 block">Email</label>
                <div class="relative flex items-center">
                  <input
                    name="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    class="w-full text-sm text-white-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Enter Your Emial"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="#bbb" stroke="#bbb" class="w-[18px] h-[18px] absolute right-4" viewBox="0 0 24 24">
                    <circle cx="10" cy="7" r="6"></circle>
                    <path d="M14 15H6a5 5 0 0 0-5 5 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 5 5 0 0 0-5-5zm8-4h-2.59l.3-.29a1 1 0 0 0-1.42-1.42l-2 2a1 1 0 0 0 0 1.42l2 2a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42l-.3-.29H22a1 1 0 0 0 0-2z"></path>
                  </svg>
                </div>
              </div>

              {/* Password */}
              <div>
                <label class="text-white-900 text-sm font-medium mb-2 block">Password</label>
                <div class="relative flex items-center">
                  <input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    class="w-full text-sm text-white-900 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                    placeholder="Enter password"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="#bbb" stroke="#bbb" class="w-[18px] h-[18px] absolute right-4 cursor-pointer" viewBox="0 0 128 128">
                    <path d="M64 104C22.127 104 1.367 67.496.504 65.943a4 4 0 0 1 0-3.887C1.367 60.504 22.127 24 64 24s62.633 36.504 63.496 38.057a4 4 0 0 1 0 3.887C126.633 67.496 105.873 104 64 104zM8.707 63.994C13.465 71.205 32.146 96 64 96c31.955 0 50.553-24.775 55.293-31.994C114.535 56.795 95.854 32 64 32 32.045 32 13.447 56.775 8.707 63.994zM64 88c-13.234 0-24-10.766-24-24s10.766-24 24-24 24 10.766 24 24-10.766 24-24 24zm0-40c-8.822 0-16 7.178-16 16s7.178 16 16 16 16-7.178 16-16-7.178-16-16-16z"></path>
                  </svg>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label class="text-white-900 text-sm font-medium mb-2 block">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  class="w-full text-sm text-white-900 border border-slate-300 pl-4 pr-4 py-3 rounded-lg outline-blue-600"
                  placeholder="Confirm password"
                />
              </div>

            

              {/* Submit */}
              <div class="!mt-12">
                <button type="submit" class="w-full shadow-xl py-2.5 px-4 text-[15px] font-medium tracking-wide rounded-lg text-white bg-[#FF4081] hover:bg-pink-500 focus:outline-none cursor-pointer">
                  Sign up
                </button>
                <p class="text-sm !mt-6 text-center text-white-600">Already have an account? <a href="/signin" class="text-white-600 font-medium hover:underline ml-1 whitespace-nowrap">Login here</a></p>
              </div>
            </form>
          </div>

          {/* Image */}
          <div class="max-lg:mt-8 h-[calc(100%-75px)]">
            <img
              src="/signup.jpg"
              class="w-full h-full object-cover rounded-lg image-animation"
              alt="Coffee Login Illustration"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
