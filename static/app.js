const { useState, useEffect, useRef } = React;

// --- ANALYTICS DASHBOARD COMPONENT ---
function AnalyticsDashboard({ history, onSearch, onClear }) {
  const getStats = () => {
    const searchCount = parseInt(localStorage.getItem("veloxSearchCount") || "0");
    const bookmarks   = JSON.parse(localStorage.getItem("searchBookmarks") || "[]");
    return { searchCount, bookmarks: bookmarks.length };
  };

  const getTopSearches = () => {
    const counts = JSON.parse(localStorage.getItem("veloxSearchCounts") || "{}");
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  };

  const getDailyActivity = () => {
    const activity = JSON.parse(localStorage.getItem("veloxDailyActivity") || "{}");
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString();
      last7.push({
        label: d.toLocaleDateString("en", { weekday: "short" }),
        count: activity[key] || 0
      });
    }
    return last7;
  };

  const stats       = getStats();
  const topSearches = getTopSearches();
  const daily       = getDailyActivity();
  const maxDaily    = Math.max(...daily.map(d => d.count), 1);
  const maxCount    = topSearches.length > 0 ? topSearches[0][1] : 1;

  const handleClear = () => {
    localStorage.removeItem("veloxSearchCount");
    localStorage.removeItem("veloxSearchCounts");
    localStorage.removeItem("veloxDailyActivity");
    localStorage.removeItem("veloxFirstVisit");
    localStorage.removeItem("searchHistory");
    onClear();
  };

  return (
    <div className="analytics-section">
      <p className="analytics-title">📊 Your Search Analytics</p>
      <div className="analytics-grid">
        <div className="analytics-card">
          <p className="analytics-card-value">{stats.searchCount}</p>
          <p className="analytics-card-label">Total Searches</p>
        </div>
        <div className="analytics-card">
          <p className="analytics-card-value">{topSearches.length}</p>
          <p className="analytics-card-label">Unique Queries</p>
        </div>
        <div className="analytics-card">
          <p className="analytics-card-value">{stats.bookmarks}</p>
          <p className="analytics-card-label">Bookmarks</p>
        </div>
      </div>

      <div className="chart-box">
        <p className="analytics-subtitle">📅 Last 7 Days Activity</p>
        <div className="chart-bars">
          {daily.map((d, i) => (
            <div key={i} className="chart-bar-col">
              <div
                className="chart-bar"
                style={{ height: `${(d.count / maxDaily) * 100}%` }}
              />
              <span className="chart-bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {topSearches.length > 0 && (
        <div>
          <p className="analytics-subtitle">🔥 Top Searches</p>
          <div className="top-searches">
            {topSearches.map((item, i) => (
              <div
                key={i}
                className="top-search-item"
                onClick={() => onSearch(item[0])}
              >
                <span className="top-search-rank">#{i + 1}</span>
                <span className="top-search-text">{item[0]}</span>
                <div className="top-search-bar-wrap">
                  <div
                    className="top-search-bar"
                    style={{ width: `${(item[1] / maxCount) * 100}%` }}
                  />
                </div>
                <span style={{ fontSize: "0.8rem", color: "#888" }}>{item[1]}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topSearches.length === 0 && (
        <p className="no-results">No search data yet. Start searching to see your analytics!</p>
      )}

      <button className="analytics-clear" onClick={handleClear}>
        Clear All Analytics Data
      </button>
    </div>
  );
}
// --- NEWS TAB COMPONENT ---
function NewsTab({ searchQuery }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [category, setCategory] = useState("general");

  const categories = [
    { id: "general",       label: "🌍 General"      },
    { id: "technology",    label: "💻 Tech"          },
    { id: "science",       label: "🔬 Science"       },
    { id: "sports",        label: "⚽ Sports"        },
    { id: "business",      label: "💼 Business"      },
    { id: "health",        label: "❤️ Health"        },
    { id: "entertainment", label: "🎬 Entertainment" },
  ];

  const fetchNews = async (cat = category, q = searchQuery) => {
    setLoading(true);
    setError("");
    setArticles([]);
    try {
      const url = q
        ? `/news?q=${encodeURIComponent(q)}&category=${cat}`
        : `/news?category=${cat}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.error) setError("Could not load news.");
      else setArticles(data.articles || []);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(category, searchQuery); }, [category, searchQuery]);

  return (
    <div className="news-section">
      <div className="news-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={"news-cat-btn" + (category === cat.id ? " active" : "")}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {loading && <p className="loading">Loading news...</p>}
      {error   && <p className="error">{error}</p>}
      {!loading && articles.length === 0 && !error && (
        <p className="no-results">No news articles found.</p>
      )}
      {articles.map((article, i) => (
        <div
          key={i}
          className="news-card"
          onClick={() => window.open(article.url, "_blank")}
          style={{ cursor: "pointer" }}
        >
          {article.image && (
            <img
              src={article.image}
              className="news-card-image"
              alt={article.title}
              onError={(e) => e.target.style.display = "none"}
            />
          )}
          <div className="news-card-body">
            <p className="news-card-source">{article.source} · {article.publishedAt}</p>
            <span className="news-card-title">{article.title}</span>
            <p className="news-card-desc">{article.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
// --- FILE UPLOAD AI COMPONENT ---
function FileUploadAI() {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [command, setCommand]   = useState("");
  const [reply, setReply]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef(null);

  const getFileIcon = (name) => {
    const ext = name.split(".").pop().toLowerCase();
    if (["jpg","jpeg","png","webp","gif"].includes(ext)) return "🖼️";
    if (ext === "pdf") return "📄";
    if (ext === "docx") return "📝";
    if (ext === "txt") return "📃";
    return "📁";
  };

  const handleFileChange = (selected) => {
    if (!selected) return;
    setFile(selected);
    setReply("");
    setError("");
    const ext = selected.name.split(".").pop().toLowerCase();
    if (["jpg","jpeg","png","webp","gif"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChange(dropped);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setReply("");
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("command", command || "What is in this file?");
    try {
      const res  = await fetch("/ai-file", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setReply(data.reply);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-upload-section">
      <div className="file-upload-box">
        <p className="file-upload-title">📁 Velox AI File Analysis</p>
        {!file && (
          <div
            className={"file-drop-area" + (dragover ? " dragover" : "")}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.txt"
              onChange={(e) => handleFileChange(e.target.files[0])}
              style={{ display: "none" }}
            />
            <div className="file-drop-icon">📂</div>
            <p className="file-drop-text">Drag and drop or <span>click to upload</span></p>
            <p className="file-drop-text" style={{ marginTop: "6px", fontSize: "0.8rem" }}>
              Supports: JPG, PNG, WEBP, GIF, PDF, DOCX, TXT
            </p>
          </div>
        )}
        {file && (
          <div>
            {preview && (
              <img src={preview} className="file-image-preview" alt="preview" />
            )}
            <div className="file-preview">
              <span className="file-preview-icon">{getFileIcon(file.name)}</span>
              <span className="file-preview-name">{file.name}</span>
              <button
                className="file-preview-remove"
                onClick={() => { setFile(null); setPreview(null); setReply(""); setError(""); }}
              >X</button>
            </div>
          </div>
        )}
        <div className="file-command-row">
          <input
            type="text"
            className="file-command-input"
            placeholder={file ? "Type your command..." : "Upload a file first..."}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            disabled={!file}
          />
          <button
            className="file-submit-btn"
            onClick={handleSubmit}
            disabled={!file || loading}
          >
            {loading ? "Analyzing..." : "Ask AI"}
          </button>
        </div>
        {error && <p className="error" style={{ marginTop: "12px" }}>{error}</p>}
        {reply && (
          <div className="file-ai-response">
            <p className="file-ai-label">Velox AI Response</p>
            <p className="file-ai-text">{reply}</p>
          </div>
        )}
      </div>
    </div>
  );
}
// --- AI ANSWER BOX COMPONENT ---
function AIAnswerBox({ query, trigger, language }) {
  const [answer, setAnswer]   = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer("");
    fetch(`/ai-answer?q=${encodeURIComponent(query)}&lang=${encodeURIComponent(language)}`)
      .then(r => r.json())
      .then(data => { setAnswer(data.answer || ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, [trigger]);

  if (!loading && !answer) return null;

  return (
    <div className="ai-answer-box">
      <div className="ai-answer-inner">
        <p className="ai-answer-label">AI Answer</p>
        {loading
          ? <p className="ai-answer-loading">Thinking...</p>
          : <p className="ai-answer-text">{answer}</p>
        }
      </div>
    </div>
  );
}

// --- AI SUMMARY BOX COMPONENT ---
function AISummaryBox({ query, results, trigger, language }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || results.length === 0) return;
    setLoading(true);
    setSummary("");
    const context = results.map(r => r.title + ": " + r.description).join("\n");
    fetch(`/ai-summary?q=${encodeURIComponent(query)}&context=${encodeURIComponent(context)}&lang=${encodeURIComponent(language)}`)
      .then(r => r.json())
      .then(data => { setSummary(data.summary || ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, [trigger]);

  if (!loading && !summary) return null;

  return (
    <div className="ai-summary-box">
      <p className="ai-summary-label">AI Summary</p>
      {loading
        ? <p className="ai-answer-loading">Summarizing results...</p>
        : <p className="ai-summary-text">{summary}</p>
      }
    </div>
  );
}

// --- AI CHATBOT COMPONENT ---
function AIChatbot({ language }) {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I am Velox AI. Ask me anything!" }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: language,
          messages: [...messages, userMsg].map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content
          }))
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply || "Sorry, I could not answer that."
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Something went wrong. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="chat-fab" onClick={() => setOpen(!open)}>
        {open ? "X" : "🤖"}
      </button>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <span>Velox AI</span>
            <button className="chat-close" onClick={() => setOpen(false)}>X</button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={"chat-msg " + (msg.role === "user" ? "user" : "ai")}>
                {msg.content}
              </div>
            ))}
            {loading && <div className="chat-msg loading">Thinking...</div>}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
// --- RESULT CARD COMPONENT ---
function ResultCard({ title, url, description, bookmarks, onBookmark }) {
  const isBookmarked = bookmarks.some(b => b.url === url);
  return (
    <div className="result-card">
      <button
        className="bookmark-btn"
        onClick={() => onBookmark({ title, url, description })}
        title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        {isBookmarked ? "⭐" : "☆"}
      </button>
      <a href={url} target="_blank" rel="noreferrer">{title}</a>
      <p className="result-url">{url}</p>
      <p className="result-desc">{description}</p>
    </div>
  );
}

// --- IMAGE CARD COMPONENT ---
function ImageCard({ title, url, page }) {
  return (
    <div
      className="image-card"
      onClick={() => window.open(page, "_blank")}
      style={{ cursor: "pointer" }}
    >
      <img
        src={url}
        alt={title}
        onError={(e) => e.target.style.display = "none"}
      />
      <p className="image-card-title">{title}</p>
    </div>
  );
}

// --- SUGGESTIONS COMPONENT ---
function Suggestions({ suggestions, onSelect }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="suggestions-box">
      {suggestions.map((s, i) => (
        <div key={i} className="suggestion-item" onClick={() => onSelect(s)}>
          🔍 {s}
        </div>
      ))}
    </div>
  );
}

// --- HISTORY COMPONENT ---
function SearchHistory({ history, onSelect, onDelete, onClear }) {
  if (history.length === 0) return null;
  return (
    <div className="history-box">
      <div className="history-header">
        <span>🕘 Recent Searches</span>
        <button className="history-clear" onClick={onClear}>Clear All</button>
      </div>
      {history.map((item, i) => (
        <div key={i} className="history-item">
          <span onClick={() => onSelect(item)}>🕘 {item}</span>
          <button
            className="history-delete"
            onClick={(e) => { e.stopPropagation(); onDelete(item); }}
          >X</button>
        </div>
      ))}
    </div>
  );
}

// --- PAGINATION COMPONENT ---
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  return (
    <div className="pagination">
      <button
        className="page-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >Prev</button>
      {pages.map(p => (
        <button
          key={p}
          className={"page-btn" + (p === currentPage ? " active" : "")}
          onClick={() => onPageChange(p)}
        >{p}</button>
      ))}
      <button
        className="page-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >Next</button>
    </div>
  );
}

// --- BOOKMARKS PAGE COMPONENT ---
function BookmarksPage({ bookmarks, onBookmark, onClear }) {
  return (
    <section className="bookmarks-section">
      <div className="bookmarks-header">
        <p className="bookmarks-title">Saved Bookmarks</p>
        {bookmarks.length > 0 && (
          <button className="bookmarks-clear" onClick={onClear}>Clear All</button>
        )}
      </div>
      {bookmarks.length === 0 && (
        <p className="no-bookmarks">No bookmarks yet. Star a result to save it here!</p>
      )}
      {bookmarks.map((item, index) => (
        <ResultCard
          key={index}
          title={item.title}
          url={item.url}
          description={item.description}
          bookmarks={bookmarks}
          onBookmark={onBookmark}
        />
      ))}
    </section>
  );
}
// --- MAIN APP COMPONENT ---
function App() {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState([]);
  const [images, setImages]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [searched, setSearched]         = useState(false);
  const [suggestions, setSuggestions]   = useState([]);
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [darkMode, setDarkMode]         = useState(true);
  const [activeTab, setActiveTab]       = useState("web");
  const [aiTrigger, setAiTrigger]       = useState(0);
  const [listening, setListening]       = useState(false);
  const [newsQuery, setNewsQuery]       = useState("");
  const [language, setLanguage]         = useState("English");
  const [history, setHistory]           = useState(() => {
    try { return JSON.parse(localStorage.getItem("searchHistory")) || []; }
    catch { return []; }
  });
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("searchBookmarks")) || []; }
    catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const timerRef       = useRef(null);
  const wrapperRef     = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle("light", !darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("searchBookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSuggestions([]);
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch { setSuggestions([]); }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice search. Please use Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart  = () => setListening(true);
    recognition.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      setQuery(spoken);
      setListening(false);
      handleSearch(spoken);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend   = () => setListening(false);
    recognition.start();
  };

  const handleBookmark = (item) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.url === item.url);
      if (exists) return prev.filter(b => b.url !== item.url);
      return [item, ...prev];
    });
  };

  const saveToHistory = (q) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item !== q);
      return [q, ...filtered].slice(0, 8);
    });
    const count = parseInt(localStorage.getItem("veloxSearchCount") || "0");
    localStorage.setItem("veloxSearchCount", count + 1);
    if (!localStorage.getItem("veloxFirstVisit")) {
      localStorage.setItem("veloxFirstVisit", new Date().toLocaleDateString());
    }
    const counts = JSON.parse(localStorage.getItem("veloxSearchCounts") || "{}");
    counts[q] = (counts[q] || 0) + 1;
    localStorage.setItem("veloxSearchCounts", JSON.stringify(counts));
    const activity = JSON.parse(localStorage.getItem("veloxDailyActivity") || "{}");
    const today = new Date().toLocaleDateString();
    activity[today] = (activity[today] || 0) + 1;
    localStorage.setItem("veloxDailyActivity", JSON.stringify(activity));
  };

  const handleSearch = async (searchQuery = query, page = 1) => {
    if (!searchQuery.trim()) return;
    setSuggestions([]);
    setShowHistory(false);
    setLoading(true);
    setError("");
    setResults([]);
    setImages([]);
    setSearched(true);
    setQuery(searchQuery);
    setCurrentPage(page);
    saveToHistory(searchQuery.trim());

    try {
      if (activeTab === "images") {
        const res  = await fetch(`/images?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.error) setError("Something went wrong.");
        else setImages(data.images || []);
      } else if (activeTab === "news") {
        setNewsQuery(searchQuery);
        setLoading(false);
        return;
      } else {
        const res  = await fetch(`/search?q=${encodeURIComponent(searchQuery)}&page=${page}`);
        const data = await res.json();
        if (data.error) setError("Something went wrong.");
        else {
          setResults(data.results || []);
          setTotalPages(data.pages || 0);
          setTotalResults(data.total || 0);
          setActiveTab("web");
        }
      }
      setAiTrigger(prev => prev + 1);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setResults([]);
    setImages([]);
    setError("");
    setSuggestions([]);
    setShowHistory(false);
    if (tab === "bookmarks" || tab === "files" || tab === "news" || tab === "analytics") return;
    if (query.trim() && searched) {
      setLoading(true);
      setTimeout(async () => {
        try {
          if (tab === "web") {
            const res  = await fetch(`/search?q=${encodeURIComponent(query)}&page=1`);
            const data = await res.json();
            setResults(data.results || []);
            setTotalPages(data.pages || 0);
            setTotalResults(data.total || 0);
          } else if (tab === "images") {
            const res  = await fetch(`/images?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setImages(data.images || []);
          }
        } catch {
          setError("Something went wrong.");
        } finally {
          setLoading(false);
        }
      }, 0);
    }
  };

  const handlePageChange = (page) => {
    handleSearch(query, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setSuggestions([]);
      setShowHistory(false);
      handleSearch();
    }
  };

  const handleInputFocus = () => {
    if (!query.trim() && history.length > 0) setShowHistory(true);
  };
  return (
    <div>
      <header>
        <h1 className="logo">Velo<span>x</span></h1>
        <div className="lang-selector">
          <span className="lang-label">🌐</span>
          <select
            className="lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>English</option>
            <option>Urdu</option>
            <option>Arabic</option>
            <option>French</option>
            <option>Spanish</option>
            <option>German</option>
            <option>Chinese</option>
            <option>Hindi</option>
            <option>Turkish</option>
            <option>Portuguese</option>
            <option>Russian</option>
            <option>Japanese</option>
          </select>
        </div>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light" : "Dark"}
        </button>
      </header>

      <section className="search-section">
        <div className="search-wrapper" ref={wrapperRef}>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search anything..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowHistory(false);
                if (activeTab === "files") setActiveTab("web");
              }}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              autoComplete="off"
            />
            <button
              className={"mic-btn" + (listening ? " listening" : "")}
              onClick={handleVoiceSearch}
              title={listening ? "Stop listening" : "Search by voice"}
            >
              {listening ? "🔴" : "🎤"}
            </button>
            <button onClick={() => { setSuggestions([]); handleSearch(); }}>
              Search
            </button>
          </div>
          {showHistory && suggestions.length === 0 && (
            <SearchHistory
              history={history}
              onSelect={(item) => { setQuery(item); handleSearch(item); }}
              onDelete={(item) => setHistory(prev => prev.filter(h => h !== item))}
              onClear={() => { setHistory([]); setShowHistory(false); }}
            />
          )}
          {!showHistory && (
            <Suggestions suggestions={suggestions} onSelect={handleSearch} />
          )}
        </div>
      </section>

      <div className="tabs">
        <button
          className={"tab-btn" + (activeTab === "web" ? " active" : "")}
          onClick={() => handleTabSwitch("web")}
        >🌐 Web</button>
        <button
          className={"tab-btn" + (activeTab === "news" ? " active" : "")}
          onClick={() => handleTabSwitch("news")}
        >📰 News</button>
        <button
          className={"tab-btn" + (activeTab === "images" ? " active" : "")}
          onClick={() => handleTabSwitch("images")}
        >🖼️ Images</button>
        <button
          className={"tab-btn" + (activeTab === "files" ? " active" : "")}
          onClick={() => handleTabSwitch("files")}
        >📁 Files</button>
        <button
          className={"tab-btn" + (activeTab === "bookmarks" ? " active" : "")}
          onClick={() => handleTabSwitch("bookmarks")}
        >
          ⭐ Bookmarks
          {bookmarks.length > 0 && (
            <span className="badge">{bookmarks.length}</span>
          )}
        </button>
        <button
          className={"tab-btn" + (activeTab === "analytics" ? " active" : "")}
          onClick={() => handleTabSwitch("analytics")}
        >📊 Analytics</button>
      </div>

      {activeTab === "web" && searched && (
        <AIAnswerBox query={query} trigger={aiTrigger} language={language} />
      )}

      <section className="results-section">
        {loading && <p className="loading">Searching...</p>}
        {error && <p className="error">{error}</p>}

        {activeTab === "web" && !loading && (
          <div>
            {searched && results.length === 0 && !error && (
              <p className="no-results">No results found for "{query}"</p>
            )}
            {results.length > 0 && (
              <AISummaryBox query={query} results={results} trigger={aiTrigger} language={language} />
            )}
            {results.length > 0 && (
              <p id="resultCount">
                Showing page {currentPage} of {totalPages} — {totalResults} results found
              </p>
            )}
            {results.map((item, index) => (
              <ResultCard
                key={index}
                title={item.title}
                url={item.url}
                description={item.description}
                bookmarks={bookmarks}
                onBookmark={handleBookmark}
              />
            ))}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {activeTab === "images" && !loading && (
          <div>
            {searched && images.length === 0 && !error && (
              <p className="no-results">No images found for "{query}"</p>
            )}
            <div className="image-grid">
              {images.map((img, index) => (
                <ImageCard key={index} title={img.title} url={img.url} page={img.page} />
              ))}
            </div>
          </div>
        )}
      </section>

      {activeTab === "news"      && <NewsTab searchQuery={newsQuery} />}
      {activeTab === "files"     && !loading && <FileUploadAI />}
      {activeTab === "bookmarks" && (
        <BookmarksPage
          bookmarks={bookmarks}
          onBookmark={handleBookmark}
          onClear={() => setBookmarks([])}
        />
      )}
      {activeTab === "analytics" && (
        <AnalyticsDashboard
          history={history}
          onSearch={(term) => { setQuery(term); handleTabSwitch("web"); handleSearch(term); }}
          onClear={() => setHistory([])}
        />
      )}
    </div>
  );
}
// --- MOUNT REACT APP ---
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);