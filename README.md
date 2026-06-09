# 📧 Internship Email Agent

# Live Demo:
https://internship-agent.vercel.app/

> **AI-Powered Email Screening for Internships**  
> Analyze emails, auto-organize your inbox, apply to the right opportunities.

##  Features

-  **Smart Screening**: Multi-factor scoring (Skills, Experience, Company Fit, Timeline)
-  **Gmail Integration**: Auto-analyze emails, star, create labels
-  **LLM-Powered**: Uses Groq's free LLaMA 3.1 model (fast & free)
-  **PDF CV Analysis**: Extracts skills & experience from your CV
-  **Flexible Preferences**: Set salary, location, tech stack requirements
-  **Feedback Learning**: Tracks accuracy of decisions over time
-  **Privacy-First**: Uses OAuth2, no password storage, local CV processing

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
- Node.js 14+ ([download](https://nodejs.org))
- Groq API key (free at [console.groq.com](https://console.groq.com/keys))
- Google Cloud project (OAuth2 credentials)

### 2. Clone & Install
```bash
git clone https://github.com/Kiranwaqar/Internship_Agent.git
cd internship-agent
npm install
```

### 3. Set Up Environment

Create `.env` file:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
SESSION_SECRET=random_session_secret_here
PORT=3000
NODE_ENV=development
```

### 4. Run Locally
```bash
npm start
```
Open http://localhost:3000 in your browser.

---

##  How to Use

### Manual Mode (No Gmail)
1. Paste your Groq API key (stored in browser only)
2. Upload your CV (PDF, optional but recommended)
3. Paste an internship email
4. Click "Analyze Email"
5. Review decision with confidence score & explanations

### Gmail Integration Mode
1. Click "Connect Gmail" → authorize access
2. Set preferences (salary, location, tech stack)
3. Click "Fetch & Analyze Unread Emails"
4. Review each email's decision
5. Click ⭐ to star or 📭 to archive

---

## 🤖 Decision Logic

| Decision | Meaning | Criteria |
|----------|---------|----------|
| **⭐ STAR** | Highly relevant | score ≥ 60%, confidence ≥ 70%, no red flags |
| **✗ IGNORE** | Not a good fit | score < 50%, confidence ≥ 70% |
| **🔍 ESCALATE** | Review manually | score 50-60% OR confidence < 70% OR red flags |
| **📭 NOT INTERNSHIP** | Spam/Newsletter | Not an internship posting |

---

## 🌐 Deploy to Production

### 🎉 Deploy to Vercel (Easiest - FREE)
```bash
# 1. Push to GitHub
git add . && git commit -m "Deploy" && git push

# 2. Go to vercel.com → Import GitHub repo
# 3. Add environment variables
# 4. Click Deploy!
```
**See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed step-by-step guide (5 minutes)**


## 🔧 Configuration

### Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web Application)
5. Add redirect URIs:
   - `http://localhost:3000/auth/google/callback` (dev)
   - `https://your-domain.com/auth/google/callback` (prod)

### Groq API
1. Get free key at [console.groq.com/keys](https://console.groq.com/keys)
2. No credit card required
3. Free tier includes 30+ calls/minute

---

## 📊 Scoring Breakdown

The agent evaluates emails on 4 factors:

1. **Skills Match (35%)** - Do you have the required skills?
2. **Experience Match (30%)** - Does your year/degree match?
3. **Company Fit (20%)** - Do you want to work there?
4. **Timeline Fit (15%)** - Can you make the deadline?

Each factor contributes to the final `match_score` (0-100).

---

## 🛠️ API Endpoints

### Manual Analysis
```bash
POST /analyze
Content-Type: multipart/form-data
- apiKey: your Groq API key
- subject: email subject
- body: email body
- cv: (optional) PDF file
- preferences: { salary, location, tech }
```

### Gmail API
```bash
# Fetch unread emails
GET /api/gmail/emails

# Get Gmail profile
GET /api/gmail/profile

# Auto-analyze email
POST /api/gmail/auto-analyze
{ email: { from, subject, body }, preferences: {...} }

# Apply action (star/archive/label)
POST /api/gmail/apply-action
{ messageId, action: "star" | "archive" | "label" }

# Auth status
GET /api/auth/status
```

---

##  Security & Privacy

✅ **OAuth2 Authentication** - Google handles login, we don't see passwords
✅ **No CV Storage** - PDF is processed in memory only
✅ **Browser-Only Keys** - API keys stay in your browser (local mode)
✅ **HTTPS in Production** - All connections encrypted
✅ **Minimal Scopes** - Gmail access limited to read + label only

---

##  Troubleshooting

### "OAuth redirect URI mismatch"
→ Check Google Cloud Console, ensure redirect URI matches exactly

### "Invalid JSON from Groq"
→ Try shorter emails, or check API rate limits at [console.groq.com](https://console.groq.com)

### "Gmail API not working"
→ Verify Gmail API is enabled in Google Cloud Console

### "Session lost after deployment"
→ Set `SESSION_SECRET` environment variable

---

##  Analytics & Feedback

Track decision accuracy:
```javascript
// View in browser console
JSON.parse(localStorage.getItem('feedbackHistory'))

// Example output:
{
  "STAR": { "correct": 12, "incorrect": 2, "accuracy": 86 },
  "IGNORE": { "correct": 8, "incorrect": 1, "accuracy": 89 },
  "ESCALATE": { "correct": 5, "incorrect": 3, "accuracy": 63 }
}
```

---

##  Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript
- **LLM**: Groq API (LLaMA 3.1 8B)
- **Gmail**: Google APIs JavaScript client
- **Auth**: Passport.js + Google OAuth2
- **PDF**: pdf-parse

---

##  License

MIT License - Feel free to use, modify, and share!

---

##  Contributing

Found a bug? Have an idea? Submit an issue or PR!

---

**Built with ❤️ to help students analyze internships faster**

