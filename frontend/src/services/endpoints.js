import api, { authApi } from "./api";

// ── Auth ─────────────────────────────────────────────────────────────────────
export const verifyUser  = ()       => authApi.post("/auth/verify");
export const getMe       = ()       => api.get("/auth/me");
export const updateMe    = (data)   => api.patch("/auth/me", data);

// ── Subjects ─────────────────────────────────────────────────────────────────
export const getSubjects     = ()         => api.get("/subjects/");
export const createSubject   = (data)     => api.post("/subjects/", data);
export const updateSubject   = (id, data) => api.put(`/subjects/${id}`, data);
export const deleteSubject   = (id)       => api.delete(`/subjects/${id}`);
export const getSubject      = (id)       => api.get(`/subjects/${id}`);

// ── Topics ────────────────────────────────────────────────────────────────────
export const getTopics      = (subjectId)       => api.get(`/subjects/${subjectId}/topics`);
export const addTopic       = (subjectId, data) => api.post(`/subjects/${subjectId}/topics`, data);
export const updateTopic    = (id, data)        => api.put(`/subjects/topics/${id}`, data);
export const completeTopic  = (id, done = true) => api.patch(`/subjects/topics/${id}/complete`, { is_completed: done });
export const deleteTopic    = (id)              => api.delete(`/subjects/topics/${id}`);

// ── Syllabus PDF Analysis ─────────────────────────────────────────────────────
export const analyzeSyllabus = (subjectId, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/subjects/${subjectId}/analyze-syllabus`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000, // Gemini analysis can take up to 60s for large PDFs
  });
};
export const importTopics = (subjectId, chapters, mode = "append") =>
  api.post(`/subjects/${subjectId}/import-topics`, { chapters, mode });

// ── Planner ────────────────────────────────────────────────────────────────────
export const generatePlan   = (data)   => api.post("/planner/generate", data);
export const getActivePlan  = ()       => api.get("/planner/active");
export const getTodayTasks  = ()       => api.get("/planner/tasks/today");
export const getTasksByDate = (date)   => api.get(`/planner/tasks?date=${date}`);
export const markTaskDone   = (id, isDone = true) => api.patch(`/planner/tasks/${id}/done`, { is_done: isDone });

// ── Progress ──────────────────────────────────────────────────────────────────
export const getStats        = ()      => api.get("/progress/stats");
export const getWeeklyStats  = ()      => api.get("/progress/weekly");
export const getHeatmap      = ()      => api.get("/progress/heatmap");

// ── AI ────────────────────────────────────────────────────────────────────────
export const getAISuggestions = ()         => api.get("/ai/suggestions");
export const getMotivation    = ()         => api.get("/ai/motivate");
export const summarizePDF     = (formData) => api.post("/ai/summarize", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const generateQuiz     = (data)  => api.post("/ai/quiz", data);
export const getPriority      = ()      => api.get("/ai/priority");

// ── Chat & Flashcards ─────────────────────────────────────────────────────────
export const sendChatMessage  = (data)  => api.post("/chat/message", data);
export const generateFlashcards = (data) => api.post("/chat/flashcards", data);

// ── Calendar ──────────────────────────────────────────────────────────────────
export const getUpcomingTasks   = ()       => api.get("/calendar/upcoming");
export const exportCalendarICS  = ()       => api.get("/calendar/export/ics", { responseType: "blob" });
export const getGoogleCalendarUrl = (data) => api.post("/calendar/google-url", data);

// ── Reminders ─────────────────────────────────────────────────────────────────
export const sendTestReminder = () => api.post("/reminders/test");

