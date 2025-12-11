
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import cookieParser from 'cookie-parser';
import { Resend } from 'resend';
import crypto from 'crypto';
import { WHITELIST } from './whitelist.js';

// ... imports ...

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Stores
const otpStore = new Map();
const sessionStore = new Map(); // token -> user
const userStore = new Map(); // email -> User (Persistent-ish state)

// Helper: Get or Create User
const getOrCreateUser = (email, role = 'student', name = '') => {
  if (userStore.has(email)) {
    return userStore.get(email);
  }
  const newUser = {
    email,
    role: email.includes('admin') || email === 'qsmceoglvn@gmail.com' ? 'admin' : role,
    name,
    registeredAt: new Date().toISOString(),
    reportsGenerated: 0,
    customLimit: 3,
    isRevoked: false
  };
  userStore.set(email, newUser);
  return newUser;
};

// ... Email Transporter ...

// ... Google OAuth ...
// In Google Strategy callback:
// (accessToken, refreshToken, profile, done) => {
//   const email = profile.emails?.[0].value;
//   if (!email) return done(new Error('No email from Google'));
//   const user = getOrCreateUser(email, 'student', profile.displayName);
//   const token = crypto.randomUUID();
//   sessionStore.set(token, user);
//   return done(null, { ...user, token });
// }

// ... Google Routes ...

// ... Auth Routes ...

// 1. Send OTP / Direct Login
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });

  // Direct Login
  if (WHITELIST.has(email)) {
    console.log(`[Server] Whitelisted user ${email} - Direct Login`);
    const token = crypto.randomUUID();
    const user = getOrCreateUser(email);

    sessionStore.set(token, user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    return res.json({ user, message: 'Direct login successful' });
  }

  // OTP Logic ...
  // ... (existing OTP generation) ...
  // ...
});

// 2. Verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore.get(email);

  if (!stored) return res.status(400).json({ error: 'No OTP requested' });
  if (Date.now() > stored.expires) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP expired' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

  otpStore.delete(email);

  const token = crypto.randomUUID();
  const user = getOrCreateUser(email);

  sessionStore.set(token, user);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({ user });
});

// ADMIN API
// Middleware to check Admin role
const requireAdmin = (req, res, next) => {
  const token = req.cookies.token;
  const user = sessionStore.get(token);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.user = user;
  next();
};

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = Array.from(userStore.values());
  res.json({ users });
});

app.post('/api/admin/users/update', requireAdmin, (req, res) => {
  const { email, updates } = req.body; // updates: { isRevoked, customLimit }
  if (!userStore.has(email)) return res.status(404).json({ error: 'User not found' });

  const user = userStore.get(email);
  Object.assign(user, updates);
  userStore.set(email, user);

  res.json({ user });
});

// 3. Get Current User (Session Check)
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token || !sessionStore.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = sessionStore.get(token);
  res.json({ user });
});

// 4. Logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.token;
  if (token) sessionStore.delete(token);
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});


// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));


// API Endpoint
app.post('/api/generate-report', async (req, res) => {
  try {
    const { experimentCode, context } = req.body;

    // Auth Check & Stats Tracking
    const token = req.cookies.token;
    let user = null;
    if (token && sessionStore.has(token)) {
      const sessionUser = sessionStore.get(token);
      if (userStore.has(sessionUser.email)) {
        user = userStore.get(sessionUser.email);

        // Check Access
        if (user.isRevoked) {
          return res.status(403).json({ error: 'Access revoked by admin.' });
        }

        // Check Limit (Simple Daily implementation can be done here or relied on client for now)
        // For P1 Pilot, we just track stats.
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error: API Key missing' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // ... Prompt Construction ... (omitted for brevity, keep existing) ...
    const prompt = `
      You are an expert physics lab assistant at the University of Nairobi.
      
      Using the Manual Context provided below, generate a structured JSON lab report for Experiment Code: "${experimentCode}".
      
      Instructions:
      1. Return ONLY valid JSON. Do not wrap in markdown code blocks.
      2. **STRICTLY** follow the manual content.
      3. The JSON must follow this exact schema:
      {
        "title": "Experiment Title",
        "objectives": ["obj1", "obj2"],
        "apparatus": ["item1", "item2"],
        "theory": "Brief theory in plain text or simple markdown.",
        "procedure": ["step1", "step2"],
        "tableHeaders": ["Col 1 (units)", "Col 2 (units)"],
        "tableData": [[1.0, 2.0], [2.0, 4.0]], 
        "graphConfig": {
          "xColumnIndex": 0,
          "yColumnIndex": 1,
          "xLabel": "Label X",
          "yLabel": "Label Y",
          "title": "Graph Title"
        } OR null, 
        "questions": [
          { "question": "Question text from manual?", "answer": "Answer based on theory/results." }
        ] OR [],
        "calculationScript": "A JavaScript function body (string) that takes 'rows' (array of number arrays) as input and returns an object of calculated values. Example: 'const m = rows[0][0]; return { slope: m * 2, g: 9.8 };'",
        "analysisTemplate": "Analysis text with placeholders like {{slope}} and {{g}} which match keys from calculationScript return object.",
        "discussion": "Discussion text",
        "conclusion": "Conclusion text",
        "simulationType": "one of: 'pendulum', 'heating', 'spring', 'circuit', 'wave', 'optics', 'general'"
      }
    
      Specific Rules:
      - **Graphs**: If the experiment in the manual DOES NOT explicitly require plotting a graph, set "graphConfig" to null.
      - **Questions**: If the manual lists specific questions, include them.
      - **Data**: Generate PLAUSIBLE FAKE DATA for 'tableData'.
      - **Calculations**: Ensure 'calculationScript' is valid ES6 JavaScript.
      
      MANUAL CONTEXT:
      ${context}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;

    // Increment Stats
    if (user) {
      user.reportsGenerated = (user.reportsGenerated || 0) + 1;
      userStore.set(user.email, user);
      console.log(`[Stats] User ${user.email} generated report. Total: ${user.reportsGenerated}`);
    }

    res.json({ content: text });

  } catch (error) {
    console.error('Generaton Error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Export app for testing
export { app };

// Only start server if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
