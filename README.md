# AI Resume Analyzer
Live Application: https://resume-analyzer-psi-brown.vercel.app/

---

The AI Resume Analyzer allows users to input a job description and upload multiple resumes in PDF format. The system processes each resume, evaluates it using a Large Language Model (LLM), and generates a structured output including a score, strengths, gaps, and a hiring recommendation.

Candidates are automatically ranked based on their scores, providing a clear comparison similar to an Applicant Tracking System (ATS).

---

## How It Works

1. User enters a job description
2. Uploads one or more resumes
3. Backend extracts text from PDFs
4. Data is sent to the LLM for evaluation
5. LLM returns structured JSON output
6. Backend parses and normalizes the response
7. Candidates are ranked based on score
8. Results are displayed in the UI

---

## Tech Stack
Frontend - React  

Backend - Node.js and express.js 

AI Integration: OpenRouter (LLM API – Mixtral model) 

Tools - ChatGPT, Claud, VS Code, Vercel, Rerender

---
## Google Drive (Working Demo Video)

https://drive.google.com/drive/folders/1LE3aviYyqOxzcMz0S7qI3EqDjS1wWx8d?usp=sharing
