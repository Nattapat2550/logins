/* (วางทับทั้งไฟล์) */
const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const {
  createUserByEmail,
  findUserByEmail,
  setUsernameAndPassword,
  storeVerificationCode,
  validateAndConsumeCode,
  setOAuthUser,
  createPasswordResetToken,
  consumePasswordResetToken,
  setPassword,
} = require('../models/user');

const { sendEmail } = require('../utils/gmail');
const generateCode = require('../utils/generateCode');
const { setAuthCookie, clearAuthCookie, extractToken } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );
}

// ------ REGISTER ------
router.post('/register', async (req, res) => {
  try {
    const { email } = req.body || {};

    // ✅ โหมด preview: หน้า form ยังไม่กด Save (ห้ามเขียน DB)
    // ฝั่ง frontend ส่งมาเป็น { preview: true } หรือ query ?preview=1
    const isPreview =
      req.query?.preview === '1' ||
      req.body?.preview === true ||
      req.body?.mode === 'preview';

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (isPreview) {
      // ✅ ไม่เรียก find-user / create-user / store-code / sendEmail
      return res.status(200).json({ ok: true, preview: true });
    }

    // ---------- Save จริง (submit/register) ----------
    const existing = await findUserByEmail(email);

    if (existing && existing.is_email_verified) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = existing || (await createUserByEmail(email));

    if (!user || !user.id) {
      return res.status(503).json({
        error: 'Pure API is temporarily unavailable (rate-limited/blocked). Please try again.',
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ✅ กันเคส Pure-API ส่งกลับ void (null/empty) แต่จริง ๆ สำเร็จ
    const storeResult = await storeVerificationCode(user.id, code, expiresAt);
    const storedOk = storeResult === true || storeResult === null || storeResult === undefined;

    if (!storedOk) {
      return res.status(503).json({ error: 'Cannot store verification code. Please try again.' });
    }

    // ✅ ส่งเมลไม่สำเร็จไม่ทำให้ register ล้ม (เพราะ user ต้องมีสิทธิ์ retry ได้)
    let emailSent = true;
    try {
      await sendEmail(
        email,
        "Your verification code",
        `Your code is ${code}. It expires in 10 minutes.`
      );
    } catch (e) {
      emailSent = false;
      console.error('sendEmail failed', e);
    }

    return res.status(201).json({ ok: true, emailSent });
  } catch (e) {
    console.error('register error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ------ VERIFY CODE ------
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'Missing email or code' });

    const result = await validateAndConsumeCode(email, code);
    if (!result.ok) {
      if (result.reason === 'no_user') return res.status(404).json({ error: 'User not found' });
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('verify-code error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ------ COMPLETE PROFILE ------
router.post('/complete-profile', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !username || !password) return res.status(400).json({ error: 'Missing fields' });
    if (username.length < 3) return res.status(400).json({ error: 'Username too short' });
    if (password.length < 8) return res.status(400).json({ error: 'Password too short' });

    const updated = await setUsernameAndPassword(email, username, password);
    if (!updated) return res.status(401).json({ error: 'Email not verified' });

    const token = signToken(updated);
    setAuthCookie(res, token, true);

    res.json({
      ok: true,
      token,
      role: updated.role,
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        role: updated.role,
        profile_picture_url: updated.profile_picture_url,
      },
    });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    console.error('complete-profile error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ------ LOGIN (EMAIL / PASSWORD) ------
router.post('/login', async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};
    const user = await findUserByEmail(email || '');
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    setAuthCookie(res, token, !!remember);

    res.json({
      role: user.role,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
      },
    });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/logout', async (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// ------ GOOGLE OAUTH (WEB FLOW) ------
const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_CLIENT_ID_ANDROID;

const oauth2ClientWeb = new google.auth.OAuth2(
  GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URI,
);

router.get('/google', (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URI;

    if (!clientId || !redirectUri) {
      console.error('Google OAuth not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CALLBACK_URI');
      return res.status(500).send('Google OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
    return res.redirect(url);
  } catch (err) {
    console.error('GET /api/auth/google error:', err);
    return res.status(500).send('Unable to start Google login');
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    const { tokens } = await oauth2ClientWeb.getToken({
      code,
      redirect_uri: process.env.GOOGLE_CALLBACK_URI,
    });
    oauth2ClientWeb.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2ClientWeb });
    const { data: info } = await oauth2.userinfo.get();

    const email = info.email;
    const oauthId = info.id;
    const picture = info.picture;
    const name = info.name;

    const user = await setOAuthUser({
      email,
      provider: 'google',
      oauthId,
      pictureUrl: picture,
      name,
    });

    const token = signToken(user);
    setAuthCookie(res, token, true);

    const frag = `token=${encodeURIComponent(token)}&role=${encodeURIComponent(user.role || 'user')}`;

    if (!user.username) {
      return res.redirect(`${process.env.FRONTEND_URL}/form.html?email=${encodeURIComponent(email)}#${frag}`);
    }

    if (user.role === 'admin') return res.redirect(`${process.env.FRONTEND_URL}/admin.html#${frag}`);
    return res.redirect(`${process.env.FRONTEND_URL}/home.html#${frag}`);
  } catch (e) {
    console.error('google callback error', e?.response?.data || e?.message || e);
    return res.redirect(`${process.env.FRONTEND_URL}/login.html?error=oauth_failed`);
  }
});

// ------ FORGOT / RESET PASSWORD ------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const rawToken = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const user = await createPasswordResetToken(email, rawToken, expiresAt);

    if (user) {
      const link = `${process.env.FRONTEND_URL}/reset.html?token=${rawToken}`;
      await sendEmail({
        to: email,
        subject: 'Password reset',
        text: `Reset your password using this link (valid 30 minutes): ${link}`,
        html: `<p>Reset your password (valid 30 minutes): <a href="${link}">${link}</a></p>`,
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('forgot-password error', e);
    res.json({ ok: true });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password too short' });

    const user = await consumePasswordResetToken(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    await setPassword(user.id, newPassword);
    res.json({ ok: true });
  } catch (e) {
    console.error('reset-password error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ------ GOOGLE LOGIN (MOBILE / FLUTTER) ------
router.post('/google-mobile', async (req, res) => {
  try {
    const { authCode } = req.body || {};
    if (!authCode) return res.status(400).json({ error: 'Missing authCode' });

    const webClientId = process.env.GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID;
    if (!webClientId || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Google web client or secret is not configured');
      return res.status(500).json({ error: 'Google auth is not configured on server' });
    }

    const oauth2ClientMobile = new google.auth.OAuth2(
      webClientId,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    const { tokens } = await oauth2ClientMobile.getToken(authCode);
    oauth2ClientMobile.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2ClientMobile });
    const { data: info } = await oauth2.userinfo.get();

    const email = info.email;
    const oauthId = info.id;
    const picture = info.picture;
    const name = info.name;

    if (!email) return res.status(400).json({ error: 'No email from Google' });

    const user = await setOAuthUser({
      email,
      provider: 'google',
      oauthId,
      pictureUrl: picture,
      name,
    });

    const token = signToken(user);
    setAuthCookie(res, token, true);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
      },
      role: user.role,
    });
  } catch (e) {
    console.error('google-mobile error', e?.response?.data || e?.message || e);
    res.status(401).json({ error: 'Invalid Google auth' });
  }
});

router.get('/status', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.json({ authenticated: false });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      authenticated: true,
      id: payload.id || payload.sub,
      role: payload.role || 'user',
    });
  } catch {
    return res.json({ authenticated: false });
  }
});

module.exports = router;
