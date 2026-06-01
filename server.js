const express = require('express');
const multer = require('multer');
const path = require('path');
const pdfParse = require('pdf-parse');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();
const GmailService = require('./gmail-service');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Session and auth setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'internship-agent-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors());

// Passport setup
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // Store user info
  const user = {
    id: profile.id,
    email: profile.emails[0].value,
    name: profile.displayName,
    accessToken,
    refreshToken
  };
  done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.use(express.json());
app.use(express.static('public'));

// Auth routes
app.get('/auth/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.modify'] 
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.redirect('/');
  });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/analyze', upload.single('cv'), async (req, res) => {
  try {
    const { subject, body, pref_salary, pref_location, pref_tech } = req.body;
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) return res.status(400).json({ error: 'No API key provided' });
    if (!body) return res.status(400).json({ error: 'No email body provided' });

    const systemPrompt = `You are an advanced internship email screening agent for software engineering and IT students.

CRITICAL: Output MUST be ONLY valid JSON. No other text.

Task:
1. Determine if email is a legitimate internship opportunity
2. Extract: deadline, location, compensation, company info, required skills
3. Analyze CV against requirements
4. Provide multi-factor scores
5. Detect red flags

Return this exact JSON structure (MUST be valid JSON):
{
  "is_internship": boolean,
  "decision": "STAR" or "IGNORE" or "ESCALATE",
  "confidence": number 0-100,
  "score": number 0-100,
  "reason": "string - one sentence",
  "factor_breakdown": {
    "skills_match": number 0-100,
    "experience_match": number 0-100,
    "company_fit": number 0-100,
    "timeline_fit": number 0-100
  },
  "extracted_skills": ["skill1", "skill2"],
  "matched_skills": ["skill1"],
  "missing_skills": ["skill1"],
  "required_skills_detected": ["skill1"],
  "year_ok": true or false or null,
  "degree_ok": true or false or null,
  "deadline": "YYYY-MM-DD or null",
  "location": "string or null",
  "compensation": "string or null",
  "company_info": "string or null",
  "red_flags": ["flag1"] or [],
  "escalate_reason": "string or null"
}

RULES:
- STAR: is_internship=true AND score >= 60 AND confidence >= 70 AND year_ok != false
- IGNORE: is_internship=false OR (score < 50 AND confidence >= 70)
- ESCALATE: confidence < 70 OR red_flags.length > 0 OR (50 <= score < 60)

Analyze now.`;

    let userMessage;
    let cvText = "";

    // Extract PDF text if file uploaded
    if (req.file) {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        cvText = pdfData.text;
      } catch (pdfErr) {
        console.warn("PDF parsing failed:", pdfErr.message);
        cvText = "[PDF could not be parsed - student profile used]";
      }
    }

    // Student preferences section
    let preferencesSection = '';
    if (pref_salary || pref_location || pref_tech) {
      preferencesSection = `\n--- STUDENT PREFERENCES ---\n`;
      if (pref_salary) preferencesSection += `Minimum Compensation: ${pref_salary}\n`;
      if (pref_location) preferencesSection += `Location Preference: ${pref_location}\n`;
      if (pref_tech) preferencesSection += `Preferred Tech Stack: ${pref_tech}\n`;
    }

    if (cvText) {
      userMessage = `${systemPrompt}

--- STUDENT CV ---
${cvText.substring(0, 1500)}

--- STUDENT PREFERENCES ---
${pref_salary ? `Min Compensation: ${pref_salary}` : '(None)'}
${pref_location ? `Location: ${pref_location}` : '(None)'}
${pref_tech ? `Tech Stack: ${pref_tech}` : '(None)'}

--- EMAIL TO ANALYZE ---
Subject: ${subject || '(none)'}

Body:
${body}`;
    } else {
      userMessage = `${systemPrompt}

--- STUDENT PROFILE ---
Typical 3rd/final year Software Engineering student. Skills: Python, Java, JavaScript, React, Node.js, SQL, Git, REST APIs, OOP, databases.

--- STUDENT PREFERENCES ---
${pref_salary ? `Min Compensation: ${pref_salary}` : '(None)'}
${pref_location ? `Location: ${pref_location}` : '(None)'}
${pref_tech ? `Tech Stack: ${pref_tech}` : '(None)'}

--- EMAIL TO ANALYZE ---
Subject: ${subject || '(none)'}

Body:
${body}`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 1200,
        temperature: 0.2,
        messages: [
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });

    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    
    let result;
    try {
      result = JSON.parse(clean);
      
      // Validate required fields
      if (!result.decision || !result.is_internship === undefined) {
        throw new Error("Missing required fields in response");
      }
    } catch (parseErr) {
      console.error("JSON Parse Error:", parseErr.message);
      console.error("Raw response:", clean.substring(0, 500));
      
      // Try to extract JSON from response if it contains extra text
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch (e) {
          return res.status(400).json({ 
            error: "Agent response was not valid JSON. Please try again.",
            debug: clean.substring(0, 300) 
          });
        }
      } else {
        return res.status(400).json({ 
          error: "Agent response was not valid JSON. Please try again.",
          debug: clean.substring(0, 300)
        });
      }
    }
    
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Gmail API Routes
app.get('/api/gmail/profile', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    auth.setCredentials({ access_token: req.user.accessToken, refresh_token: req.user.refreshToken });
    
    const gmailService = new GmailService();
    gmailService.setAuth(auth);
    
    const profile = await gmailService.getProfile();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gmail/emails', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    auth.setCredentials({ access_token: req.user.accessToken, refresh_token: req.user.refreshToken });
    
    const gmailService = new GmailService();
    gmailService.setAuth(auth);
    
    const query = req.query.q || 'is:unread from:(internship OR recruitment OR careers OR "job opportunity")';
    const emails = await gmailService.fetchEmails(query, 10);
    res.json(emails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gmail/auto-analyze', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    const { email, preferences } = req.body;
    const apiKey = req.headers['x-api-key'] || process.env.GROQ_API_KEY;
    
    if (!apiKey) return res.status(400).json({ error: 'No Groq API key provided' });
    
    // Use the same analysis logic as /analyze endpoint
    const systemPrompt = `You are an advanced internship email screening agent.
CRITICAL: Output MUST be ONLY valid JSON. No other text.
Task: Determine if email is a legitimate internship opportunity. Extract: deadline, location, compensation, company info, required skills. Analyze against student profile. Provide multi-factor scores. Detect red flags.
Return JSON with: is_internship, decision, confidence, score, reason, factor_breakdown, extracted_skills, matched_skills, missing_skills, required_skills_detected, year_ok, degree_ok, deadline, location, compensation, company_info, red_flags, escalate_reason.
Decision rules: STAR if score>=60 AND confidence>=70 AND year_ok!=false. IGNORE if not internship OR (score<50 AND confidence>=70). ESCALATE if confidence<70 OR red_flags.length>0 OR (50<=score<60).`;

    const userMessage = `${systemPrompt}

--- STUDENT PROFILE ---
Typical 3rd/final year Software Engineering student. Skills: Python, Java, JavaScript, React, Node.js, SQL, Git, REST APIs, OOP, databases.

--- STUDENT PREFERENCES ---
${preferences?.salary ? `Min Compensation: ${preferences.salary}` : '(None)'}
${preferences?.location ? `Location: ${preferences.location}` : '(None)'}
${preferences?.tech ? `Tech Stack: ${preferences.tech}` : '(None)'}

--- EMAIL TO ANALYZE ---
From: ${email.from}
Subject: ${email.subject}

Body:
${email.body.substring(0, 2000)}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 1200,
        temperature: 0.2,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(clean);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gmail/apply-action', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    const { messageId, action, labelName } = req.body;
    
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    auth.setCredentials({ access_token: req.user.accessToken, refresh_token: req.user.refreshToken });
    
    const gmailService = new GmailService();
    gmailService.setAuth(auth);
    
    if (action === 'star') {
      await gmailService.starEmail(messageId);
    } else if (action === 'label') {
      const labelId = await gmailService.createLabel(labelName);
      if (labelId) await gmailService.applyLabel(messageId, labelId);
    } else if (action === 'archive') {
      await gmailService.archiveEmail(messageId);
    }
    
    res.json({ success: true, action, messageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n✅ Internship Agent running at http://localhost:${PORT}\n`));
