import { useState } from "react";
import "./App.css";

function App() {
  const [jd, setJd] = useState("");
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!jd) {
      setError("Please enter Job Description");
      return;
    }

    if (!files.length) {
      setError("Please upload at least one resume");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("jd", jd);

      for (let file of files) {
        if (file.type !== "application/pdf") {
          setError("Only PDF files allowed");
          setLoading(false);
          return;
        }
        formData.append("resume", file);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(
        "https://resumeanalyzer-x5xb.onrender.com/analyze",
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);

      if (err.name === "AbortError") {
        setError(
          "Server is waking up... please wait a few seconds and try again."
        );
      } else {
        setError("Failed to analyze resumes. Please try again.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <div className="cardMain">
        <h2 className="title">AI Resume Analyzer</h2>

        <textarea
          placeholder="Paste Job Description..."
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={6}
          className="textarea"
        />

        <label className="uploadBox">
          📂 Upload Resumes (PDF)
          <input
            type="file"
            accept=".pdf"
            multiple
            hidden
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />
        </label>

        {files.length > 0 && (
          <div className="fileList">
            {files.map((f, i) => (
              <p key={i}>📄 {f.name}</p>
            ))}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          className="button"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Analyze Resumes"}
        </button>

        {loading && <div className="loader"></div>}

        {error && <p className="error">{error}</p>}

        {results && (
          <div className="card">
            <h3>Ranking Results</h3>

            {results.map((r, index) => (
              <div key={index} className="resultItem">
                <h4>
                  #{index + 1} - {r.name}
                  {index === 0 && (
                    <span className="top"> 🏆 Top Candidate</span>
                  )}
                </h4>

                <p><b>Score:</b> {r.score}%</p>

                <p>
                  <b>Recommendation:</b>{" "}
                  <span
                    className={`tag ${
                      r.recommendation === "Strong Fit"
                        ? "green"
                        : r.recommendation === "Moderate Fit"
                        ? "orange"
                        : "red"
                    }`}
                  >
                    {r.recommendation}
                  </span>
                </p>

                <p>
                  <b>Strengths:</b>{" "}
                  {r.strengths?.length ? r.strengths.join(", ") : "N/A"}
                </p>

                <p>
                  <b>Gaps:</b>{" "}
                  {r.gaps?.length ? r.gaps.join(", ") : "N/A"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;