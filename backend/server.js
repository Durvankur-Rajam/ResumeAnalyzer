import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const app = express();

// ✅ CORS FIX
app.use(cors({
  origin: "*",
}));

app.use(express.json());

const upload = multer({
  dest: "uploads/",
  limits: { files: 10 },
}).array("resume");

// ✅ OpenRouter client
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "Resume Analyzer",
  },
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/analyze", upload, async (req, res) => {
  try {
    const jd = req.body.jd;

    if (!jd || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "Missing JD or Resumes" });
    }

    const results = [];

    for (let file of req.files) {
      try {
        console.log("Processing:", file.originalname);

        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        const resumeText = pdfData.text;

        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

const prompt = `
You are an experienced technical recruiter.

STRICT RULE:
If the candidate does NOT have relevant technical skills for the role,
they MUST be rated as "Not Fit" with a low score (below 40).

Do NOT give high scores for irrelevant profiles, even if they have many years of experience.

Evaluate based on:

1. Skill Match (CRITICAL)
   - If required technical skills are missing → heavily penalize

2. Domain Relevance (VERY IMPORTANT)
   - If candidate is from a different domain (e.g., sales, marketing, non-tech),
     assign a low score regardless of experience

3. Experience Relevance
   - Only count experience relevant to the job role

4. Experience Level Fit
   - Prefer candidates matching required experience (0–2 years)

5. Depth of Work
   - Real projects > generic experience

---

Job Description:
${jd}

Resume:
${resumeText}

---

Return ONLY JSON:

{
  "score": number (0–100),
  "strengths": ["", "", ""],
  "gaps": ["", "", ""],
  "recommendation": "Strong Fit" | "Moderate Fit" | "Not Fit"
}

---

SCORING RULES:
- 80–100: Strong Fit (relevant + strong match)
- 60–79: Moderate Fit
- BELOW 40: Not Fit (irrelevant domain or missing core skills)

Be strict. Do NOT reward irrelevant experience.
`;

        
        let response;
        try {
          response = await client.chat.completions.create({
            model: "mistralai/mixtral-8x7b-instruct",
            messages: [{ role: "user", content: prompt }],
          });
        } catch (err) {
          console.log("Retrying for:", file.originalname);
          response = await client.chat.completions.create({
            model: "mistralai/mixtral-8x7b-instruct",
            messages: [{ role: "user", content: prompt }],
          });
        }

        const responseText = response.choices[0].message.content;

        console.log("RAW RESPONSE:", responseText);

        let cleaned = responseText.replace(/```json|```/g, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);

        let parsed;

        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (err) {
            console.log("Parse failed:", err.message);
          }
        }

        if (!parsed) {
          parsed = {
            score: 0,
            strengths: ["Could not parse AI response"],
            gaps: ["Try again"],
            recommendation: "Error",
          };
        }

        if (parsed.score <= 1) {
          parsed.score = Math.round(parsed.score * 100);
        }

        results.push({
          name: file.originalname,
          ...parsed,
        });

      } catch (err) {
        console.error("File error:", file.originalname, err.message);

        results.push({
          name: file.originalname,
          score: 0,
          strengths: ["Processing failed"],
          gaps: ["Could not analyze"],
          recommendation: "Error",
        });
      }
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    res.json(results);

  } catch (err) {
    console.error("Backend Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));