# AI Study Planner 🎓

Welcome to the **AI Study Planner**! I built this project to help students like me organize their learning, break down overwhelming syllabuses, and actually retain what they study using the power of AI (Google Gemini).

## 🚀 What it Does

This isn't just a basic to-do list. Here are the core features I've built into the platform:

*   **Syllabus Analyzer:** Upload your course syllabus PDF. The AI automatically reads it, breaks it down into chapters, and extracts the core topics you need to cover.
*   **Smart PDF Summarizer:** Too much to read? Upload your lecture notes or textbook chapters, and Gemini will generate a structured summary with key points and important terms.
*   **AI Tutor Chat:** Stuck on a concept like "Recursion" or "Thermodynamics"? Chat directly with the context-aware AI tutor to get simple explanations and examples.
*   **Auto-Flashcards:** Instantly generate Q&A flashcards for any topic to help with active recall and spaced repetition.
*   **Progress Dashboard:** Track your weekly study progress, manage your subjects, and check off daily tasks from your calendar.

## 🛠️ Tech Stack

I chose a modern stack to keep the app fast and scalable:

*   **Frontend:** React.js (Vite) + CSS for a beautiful, responsive, glassmorphism UI.
*   **Backend:** Python (Flask) API to handle AI requests and data processing.
*   **AI Engine:** Google Gemini (`gemini-2.5-flash-lite`) for all the heavy lifting (summarization, parsing, tutoring).
*   **Authentication & Database:** Firebase Auth (Google Sign-in + Email/Password) and Firestore.

## 💻 Getting Started Locally

If you want to run my project locally, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/Harshwardhans-hub/AI_STUDY_PLANNER.git
cd AI_STUDY_PLANNER
```

### 2. Set up the Backend (Flask)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```
*Note: You'll need to add a `.env` file in the `backend` folder with your `GEMINI_API_KEY=your_key_here`.*

### 3. Set up the Frontend (React/Vite)
```bash
cd ../frontend
npm install
```
*Note: Create a `.env` file in the `frontend` folder with your Firebase config (`VITE_FIREBASE_API_KEY`, etc.). You can use `.env.example` as a template.*

### 4. Run it!
Start the backend server:
```bash
# In the backend terminal
flask run
```
Start the frontend dev server:
```bash
# In the frontend terminal
npm run dev
```

Open `http://localhost:5173` in your browser.

## 💡 Why I Built This

I created this as part of the MLH project track. As a student, I know how easy it is to get overwhelmed by large syllabuses. I wanted a centralized tool that doesn't just tell me *what* to study, but actually helps me *understand* the material faster using AI. 

Feel free to fork, explore, and reach out if you have any feedback!
