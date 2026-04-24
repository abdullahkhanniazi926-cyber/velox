from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from groq import Groq
import urllib.request
import urllib.parse
import json
import os
import base64
import PyPDF2
import docx

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["UPLOAD_FOLDER"] = "uploads"
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY")


# --- SERVE FRONTEND ---
@app.route("/")
def index():
    return render_template("index.html")


# --- SEARCH ROUTE ---
@app.route("/search")
def search():
    query = request.args.get("q", "")
    page = int(request.args.get("page", 1))
    per_page = 5

    if not query:
        return jsonify({"results": [], "total": 0, "pages": 0})

    try:
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&format=json&srlimit=30"
        req = urllib.request.Request(search_url, headers={"User-Agent": "Velox/1.0"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())

        search_results = data.get("query", {}).get("search", [])
        results = []
        for r in search_results:
            title = r.get("title", "")
            snippet = r.get("snippet", "").replace('<span class="searchmatch">', "").replace("</span>", "")
            url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
            results.append({"title": title, "url": url, "description": snippet})

        total = len(results)
        pages = (total + per_page - 1) // per_page
        start = (page - 1) * per_page
        paginated = results[start:start + per_page]

        return jsonify({
            "results": paginated,
            "total": total,
            "pages": pages,
            "current_page": page
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- IMAGE SEARCH ROUTE ---
@app.route("/images")
def images():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"images": []})

    try:
        url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrlimit=12&prop=pageimages&piprop=thumbnail&pithumbsize=300&format=json"
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())

        pages  = data.get("query", {}).get("pages", {})
        images = []
        for page in pages.values():
            thumbnail = page.get("thumbnail")
            if thumbnail:
                images.append({
                    "title": page.get("title", ""),
                    "url":   thumbnail.get("source", ""),
                    "page":  f"https://en.wikipedia.org/wiki/{urllib.parse.quote(page.get('title', '').replace(' ', '_'))}"
                })

        return jsonify({"images": images})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- IMAGE PROXY ROUTE ---
@app.route("/image-proxy")
def image_proxy():
    url = request.args.get("url", "")
    if not url:
        return "", 400
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://en.wikipedia.org/"
        })
        with urllib.request.urlopen(req) as response:
            data        = response.read()
            content_type = response.headers.get("Content-Type", "image/jpeg")
        from flask import Response
        return Response(data, content_type=content_type)
    except Exception as e:
        return str(e), 500


# --- SUGGESTIONS ROUTE ---
@app.route("/suggestions")
def suggestions():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"suggestions": []})

    try:
        url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={urllib.parse.quote(query)}&limit=6&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "Velox/1.0"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            return jsonify({"suggestions": data[1]})

    except Exception as e:
        return jsonify({"suggestions": []})


# --- NEWS ROUTE ---
@app.route("/news")
def news():
    category = request.args.get("category", "general")
    query = request.args.get("q", "")

    try:
        if query:
            url = f"https://gnews.io/api/v4/search?q={urllib.parse.quote(query)}&lang=en&max=10&apikey={GNEWS_API_KEY}"
        else:
            url = f"https://gnews.io/api/v4/top-headlines?category={category}&lang=en&max=10&apikey={GNEWS_API_KEY}"

        req = urllib.request.Request(url, headers={"User-Agent": "Velox/1.0"})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())

        articles = data.get("articles", [])
        results = []
        for a in articles:
            results.append({
                "title": a.get("title", ""),
                "description": a.get("description", ""),
                "url": a.get("url", ""),
                "image": a.get("image", ""),
                "source": a.get("source", {}).get("name", ""),
                "publishedAt": a.get("publishedAt", "")[:10]
            })

        return jsonify({"articles": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- AI ANSWER BOX ROUTE ---
@app.route("/ai-answer")
def ai_answer():
    query = request.args.get("q", "")
    lang = request.args.get("lang", "English")
    if not query:
        return jsonify({"answer": ""})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful search assistant. Give a short, clear, direct answer in {lang} language in 2-3 sentences. No markdown, no bullet points, just plain text."
                },
                {"role": "user", "content": query}
            ],
            max_tokens=150
        )
        answer = response.choices[0].message.content.strip()
        return jsonify({"answer": answer})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- AI SUMMARY ROUTE ---
@app.route("/ai-summary")
def ai_summary():
    query = request.args.get("q", "")
    context = request.args.get("context", "")
    lang = request.args.get("lang", "English")
    if not query:
        return jsonify({"summary": ""})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful search assistant. Based on the search results, write a concise summary in {lang} language in 3-4 sentences. No markdown, plain text only."
                },
                {
                    "role": "user",
                    "content": f"Query: {query}\n\nSearch Results:\n{context}"
                }
            ],
            max_tokens=200
        )
        summary = response.choices[0].message.content.strip()
        return jsonify({"summary": summary})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- AI CHAT ROUTE ---
@app.route("/ai-chat", methods=["POST"])
def ai_chat():
    data = request.get_json()
    messages = data.get("messages", [])
    lang = data.get("lang", "English")
    if not messages:
        return jsonify({"reply": ""})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"You are Velox AI, a helpful search assistant. Always respond in {lang} language. Answer clearly and concisely."
                }
            ] + messages,
            max_tokens=300
        )
        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- HELPER: EXTRACT TEXT FROM DOCUMENT ---
def extract_text(file, filename):
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text[:4000]

    elif ext == "docx":
        doc = docx.Document(file)
        text = "\n".join([p.text for p in doc.paragraphs])
        return text[:4000]

    elif ext == "txt":
        return file.read().decode("utf-8")[:4000]

    return None


# --- FILE UPLOAD + AI ROUTE ---
@app.route("/ai-file", methods=["POST"])
def ai_file():
    command = request.form.get("command", "What is in this file?")
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    filename = file.filename
    ext = filename.rsplit(".", 1)[-1].lower()

    try:
        if ext in ["jpg", "jpeg", "png", "webp", "gif"]:
            image_data = base64.b64encode(file.read()).decode("utf-8")
            mime_type = f"image/{ext if ext != 'jpg' else 'jpeg'}"

            response = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{image_data}"
                                }
                            },
                            {"type": "text", "text": command}
                        ]
                    }
                ],
                max_tokens=500
            )
            reply = response.choices[0].message.content.strip()
            return jsonify({"reply": reply, "type": "image"})

        else:
            text = extract_text(file, filename)
            if not text:
                return jsonify({"error": "Could not read this file type."}), 400

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are Velox AI. The user has uploaded a document. Read it carefully and respond to their command."
                    },
                    {
                        "role": "user",
                        "content": f"Command: {command}\n\nDocument Content:\n{text}"
                    }
                ],
                max_tokens=500
            )
            reply = response.choices[0].message.content.strip()
            return jsonify({"reply": reply, "type": "document"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)