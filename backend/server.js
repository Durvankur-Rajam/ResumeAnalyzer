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
You are a senior technical recruiter.

Follow this STRICT evaluation pipeline.

-------------------------------
STEP 1: Extract Required Skills
-------------------------------
From the Job Description, extract:
- Core technical skills (mandatory)
- Secondary skills (good to have)

These are your reference for evaluation.

-------------------------------
STEP 2: Check Domain Relevance
-------------------------------
- If the candidate is NOT from a technical/software domain:
  → score = 0–40
  → recommendation = "Not Fit"
  → STOP evaluation

-------------------------------
STEP 3: Skill Matching (CRITICAL)
-------------------------------
Compare resume skills with REQUIRED skills from JD.

Calculate match quality:
- High Match (70–100% skills matched)
- Medium Match (40–70%)
- Low Match (<40%)

Scoring:
- High Match → 75–100
- Medium Match → 60–75
- Low Match → 0–60

IMPORTANT:
- Missing core skills → heavily penalize
- Mention EXACT matching technologies (React, Node, Java, etc.)

-------------------------------
STEP 4: Experience Relevance
-------------------------------
- Only count relevant experience
- Ignore unrelated experience

-------------------------------
STEP 5: Experience Level Fit
-------------------------------
For roles requiring 0–2 years:
- 0–2 → ideal
- 3–5 → slight penalty
- 5+ → reduce score (overqualified)

-------------------------------
STEP 6: Depth of Work
-------------------------------
- Real projects using required tech → increase score
- Only listed skills without proof → reduce score

-------------------------------
FINAL RULES
-------------------------------
- Skills > experience
- Irrelevant domain → ALWAYS low score
- Be strict like a real recruiter

-------------------------------
INPUT
-------------------------------
Job Description:
${jd}

Resume:
${resumeText}

-------------------------------
OUTPUT (STRICT JSON ONLY)
-------------------------------
{
  "score": number between 0 and 100,
  "strengths": [
    "mention specific matching skills from JD",
    "mention relevant experience or project",
    "mention strong technical alignment"
  ],
  "gaps": [
    "missing key required skill",
    "lack of relevant experience",
    "missing important tool/framework"
  ],
  "recommendation": "Strong Fit" | "Moderate Fit" | "Not Fit"
}
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