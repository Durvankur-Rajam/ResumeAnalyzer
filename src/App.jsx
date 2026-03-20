import { useState } from "react";

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

      const res = await fetch("https://resumeanalyzer-x5xb.onrender.com", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      setResults(data);

    } catch (err) {
      console.error(err);
      setError("Failed to analyze resumes.");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>AI Resume Analyzer</h2>

      <textarea
        placeholder="Paste Job Description..."
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={6}
        style={styles.textarea}
      />

      <input
        type="file"
        accept=".pdf"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files))}
      />

      {files.length > 0 && (
        <div style={styles.fileList}>
          {files.map((f, i) => (
            <p key={i}>📄 {f.name}</p>
          ))}
        </div>
      )}

      <button onClick={handleAnalyze} style={styles.button} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Resumes"}
      </button>

      {error && <p style={styles.error}>{error}</p>}

      {results && (
        <div style={styles.card}>
          <h3>Ranking Results</h3>

          {results.map((r, index) => (
            <div key={index} style={styles.resultItem}>
              <h4>
                #{index + 1} - {r.name}
                {index === 0 && <span style={{ color: "green" }}> 🏆 Top Candidate</span>}
              </h4>

              <p><b>Score:</b> {r.score}</p>

              <p>
                <b>Recommendation:</b>{" "}
                <span
                  style={{
                    color:
                      r.recommendation === "Strong Fit"
                        ? "green"
                        : r.recommendation === "Moderate Fit"
                        ? "orange"
                        : "red",
                  }}
                >
                  {r.recommendation}
                </span>
              </p>

              <p><b>Strengths:</b> {r.strengths?.join(", ") || "N/A"}</p>
              <p><b>Gaps:</b> {r.gaps?.join(", ") || "N/A"}</p>

              <hr />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "700px",
    margin: "auto",
    padding: "20px",
    fontFamily: "Arial",
  },
  title: {
    textAlign: "center",
  },
  textarea: {
    width: "100%",
    marginBottom: "10px",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    padding: "12px",
    marginTop: "10px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
  },
  error: {
    color: "red",
    marginTop: "10px",
  },
  fileList: {
    marginTop: "10px",
    fontSize: "14px",
    color: "#555",
  },
  card: {
    marginTop: "20px",
    padding: "15px",
    borderRadius: "10px",
    background: "#f5f5f5",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  resultItem: {
    marginBottom: "15px",
  },
};

export default App;