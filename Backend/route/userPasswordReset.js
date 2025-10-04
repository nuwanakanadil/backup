// routes/passwordReset.js
require('dotenv').config(); // ensure env is loaded even if app forgot

const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');

// ---- Brevo SDK ----
const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;

// be explicit; SDK should default but this avoids edge proxies
defaultClient.basePath = 'https://api.brevo.com/v3';

// IMPORTANT: set BOTH api-key and partner-key, and trim
const RAW_KEY = (process.env.BREVO_API_KEY || '').trim();
defaultClient.authentications['api-key'].apiKey = RAW_KEY;
defaultClient.authentications['partner-key'].apiKey = RAW_KEY;

if (!RAW_KEY) {
  console.warn('[Brevo] BREVO_API_KEY is missing! Email sending will fail (401).');
} else {
  console.log('[Brevo] API key loaded (length=%d)', RAW_KEY.length);
}

const transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();

const router = express.Router();

// Utility: 6-digit code
function makeOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Brevo
async function sendOtpEmail(to, otp) {
  const appName = process.env.APP_NAME || 'MealMatrix';
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || appName).trim();

  if (!senderEmail) {
    throw new Error('BREVO_SENDER_EMAIL is not set');
  }
  if (!RAW_KEY) {
    throw new Error('BREVO_API_KEY is not set');
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6">
      <h2>${appName} – Password Reset</h2>
      <p>Use the following One-Time Password (OTP) to verify your request:</p>
      <p style="font-size:24px; letter-spacing:4px; font-weight:700; margin:16px 0">${otp}</p>
      <p>This code expires in <b>10 minutes</b>. If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  const payload = new SibApiV3Sdk.SendSmtpEmail();
  payload.sender = { email: senderEmail, name: senderName };
  payload.to = [{ email: to }];
  payload.subject = `${appName} Password Reset Code`;
  payload.htmlContent = html;

  try {
    const resp = await transactionalEmailsApi.sendTransacEmail(payload);
    return resp;
  } catch (e) {
    // Print the most useful error detail for debugging
    const msg =
      e?.response?.text ||
      e?.response?.body?.message ||
      e?.message ||
      'Unknown Brevo error';
    console.error('[Brevo] sendTransacEmail failed:', msg);
    throw e;
  }
}

// ========================
// 1) Request reset
// POST /api/auth/forgot/request
// Body: { email, universityId }
// ========================
router.post('/request', async (req, res) => {
  try {
    const { email, universityId } = req.body || {};
    if (!email || !universityId) {
      return res.status(400).json({ message: 'Email and University ID are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), universityId }).lean();

    // Always 200; only send if user exists
    if (!user) {
      return res.status(200).json({ ok: true, message: 'If the account exists, a code was sent', masked: true });
    }

    const otp = makeOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await PasswordReset.deleteMany({ userId: user._id });
    const reset = await PasswordReset.create({ userId: user._id, otpHash, expiresAt });

    try {
      await sendOtpEmail(email, otp);
    } catch (mailErr) {
      console.error('[Brevo] send email failed:', mailErr?.response?.text || mailErr?.message || mailErr);
      return res.status(500).json({
        message: 'Failed to send verification email. Please try again.',
        hint: !RAW_KEY ? 'BREVO_API_KEY missing' : undefined,
      });
    }

    return res.json({ ok: true, resetId: reset._id, expiresAt });
  } catch (err) {
    console.error('forgot/request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ========================
// 2) Verify OTP
// POST /api/auth/forgot/verify
// Body: { resetId, otp }
// ========================
router.post('/verify', async (req, res) => {
  try {
    const { resetId, otp } = req.body || {};
    if (!resetId || !otp) return res.status(400).json({ message: 'Bad request' });

    const reset = await PasswordReset.findById(resetId);
    if (!reset) return res.status(400).json({ message: 'Invalid or expired code' });

    if (reset.expiresAt < new Date()) {
      await reset.deleteOne();
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }

    if (reset.attempts >= 5) {
      await reset.deleteOne();
      return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
    }

    const match = await bcrypt.compare(otp, reset.otpHash);
    reset.attempts += 1;
    if (!match) {
      await reset.save();
      return res.status(400).json({ message: 'Incorrect code' });
    }

    reset.verified = true;
    await reset.save();

    return res.json({ ok: true, message: 'OTP verified' });
  } catch (err) {
    console.error('forgot/verify error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ========================
// 3) Reset password
// POST /api/auth/forgot/reset
// Body: { resetId, otp, password, confirmPassword }
// ========================
router.post('/reset', async (req, res) => {
  try {
    const { resetId, otp, password, confirmPassword } = req.body || {};
    if (!resetId || !otp || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    // Your signup rules/messages preserved
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({ message: 'Password must include letters and numbers' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const reset = await PasswordReset.findById(resetId);
    if (!reset) return res.status(400).json({ message: 'Invalid reset session' });
    if (reset.expiresAt < new Date()) {
      await reset.deleteOne();
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }

    const ok = await bcrypt.compare(otp, reset.otpHash);
    if (!ok) return res.status(400).json({ message: 'Incorrect code' });

    const user = await User.findById(reset.userId);
    if (!user) {
      await reset.deleteOne();
      return res.status(400).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    await PasswordReset.deleteMany({ userId: user._id });

    return res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('forgot/reset error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


// OPTIONAL: Self-test route to verify Brevo config quickly
router.post('/_selftest', async (req, res) => {
  try {
    const to = (req.body?.to || '').trim();
    if (!to) return res.status(400).json({ message: 'Provide { to }' });
    await sendOtpEmail(to, '123456');
    res.json({ ok: true, message: 'Email sent (check Brevo logs/inbox)' });
  } catch (e) {
    const msg = e?.response?.text || e?.message || 'Unknown Brevo error';
    res.status(500).json({ ok: false, message: msg });
  }
});

module.exports = router;
