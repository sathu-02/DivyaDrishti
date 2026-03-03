# DivyaDrishti

# 🌟 Divya Drishti – AI-Powered Visualization

Divya Drishti is a full-stack AI-powered visualization platform that transforms plain text into structured summaries and intelligent visual representations using LLM planning + automated visualization pipelines.

It combines **FastAPI**, **LangGraph**, **OpenAI models**, and a **React frontend** to deliver an interactive AI-driven analytics experience.

---

## 🚀 Features

### 🧠 AI Planning Engine

* Uses OpenAI (GPT-based) model to analyze text
* Generates:

  * Structured summary
  * Visualization specifications (JSON)
* Ensures strict schema-based outputs

### 📊 Automated Visualization Pipeline

Supports three visualization engines:

1. **Matplotlib**

   * Line charts
   * Bar charts
   * Scatter plots
   * Heatmaps
   * Histograms
   * Pie charts
   * Area plots
   * Box plots
   * Stacked charts

2. **Graphviz**

   * Flow diagrams
   * Process pipelines
   * Tree structures
   * Network graphs
   * Clustered subgraphs

3. **Diffusion (DALL·E)**

   * Conceptual visualizations
   * AI-generated imagery from structured prompts

---

### 💬 Persistent AI Chat

* Session-level chat state using React Context
* Preserves conversation while navigating
* Resets automatically on logout

---

### 🔐 Authentication System

* JWT-based authentication
* Secure password hashing (bcrypt)
* Protected routes
* User-based chat history storage (MongoDB)

---

### 🗂 History Management

* Stores:

  * User input
  * AI summary
  * Generated visualizations
  * Timestamp
* Per-user retrieval

---

## 🏗 Tech Stack

### Backend

* **FastAPI**
* **LangGraph**
* **OpenAI API (AsyncOpenAI)**
* **Matplotlib**
* **Graphviz**
* **MongoDB**
* **JWT (OAuth2PasswordBearer)**
* **Passlib (bcrypt)**

### Frontend

* **React (Vite)**
* **React Router**
* **Axios**
* **Context API (Auth + Chat)**
* Custom light/dark theme support

---

## 📁 Project Architecture

```
Divya-Drishti/
│
├── backend/
│   ├── main.py
│   ├── graph.py
│   ├── auth.py
│   ├── models.py
│   ├── db.py
│   └── outputs/
│
├── frontend/
│   ├── pages/
│   ├── components/
│   ├── context/
│   └── api.js
│
└── README.md
```

---

## ⚙️ How It Works

1. User enters text in dashboard.
2. Backend:

   * Sends text to GPT planner.
   * Planner generates structured JSON with visualization specs.
3. LangGraph routes request:

   * Matplotlib adapter → saves PNG
   * Graphviz adapter → renders diagram
   * Diffusion adapter → generates conceptual image
4. Images stored in `/outputs`
5. FastAPI serves images via static mount
6. React frontend renders:

   * Summary
   * Visualization images
7. History stored in MongoDB.

---

## 🛠 Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/divya-drishti.git
cd divya-drishti
```

---

### 2️⃣ Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `.env`:

```
OPENAI_API_KEY=your_key_here
```

Run server:

```bash
uvicorn main:app --reload
```

Backend runs at:

```
http://localhost:8000
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 🔒 Environment Variables

```
OPENAI_API_KEY=
MONGODB_URI=
SECRET_KEY=
```

---

## 🧪 Example Use Case

Input:

```
Explain the lifecycle of a machine learning project.
```

Output:

* Structured summary
* Flow diagram of ML lifecycle
* Optional conceptual visualization
* Stored in user history

---

## 🧠 Key Engineering Decisions

* Strict JSON validation from LLM using Pydantic
* Async OpenAI calls for scalability
* Static file mounting for image delivery
* Session-level chat persistence using Context API
* Automatic chat reset on logout
* Modular visualization adapters
* Router-based execution via LangGraph

---

## 📌 Future Improvements

* Streaming LLM responses
* WebSocket-based real-time updates
* Multi-user role management
* Image caching & CDN
* Docker deployment
* Rate limiting
* Usage analytics

---

## 👨‍💻 Author

**Sathwik Raj**
Bachelor of Engineering – AI & ML
Full-Stack AI Systems Builder

---

