package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"

	"go-yt-sum/adapters"
	"go-yt-sum/chat"
	"go-yt-sum/db"
	"go-yt-sum/job"
	"go-yt-sum/pipeline"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

var DBPath = "./content/db.json"

func constructQueueHandler(videoIdIn chan<- string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		videoID := mux.Vars(r)["videoID"]

		select {
		case videoIdIn <- videoID:
			w.WriteHeader(http.StatusAccepted)
		default:
			http.Error(w, "queue full", http.StatusTooManyRequests)
		}
	}
}

func constructGetJobHandler(mgr *job.ActiveJobsManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		videoID := mux.Vars(r)["videoID"]
		job := mgr.GetJob(videoID)

		if job == nil {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		if err := json.NewEncoder(w).Encode(job); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

func createNewSSEClient(mgr *job.ActiveJobsManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Type")

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		id := mgr.CreateClient(w)
		defer mgr.DeleteClient(id)

		// Don't return: keep the connection open until the client disconnects
		<-r.Context().Done()
	}
}

type SummaryResponse struct {
	NoSummaryReason string `json:"no_summary_reason"`
	Summary         string `json:"summary"`
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func createSummaryFetcher(mgr *job.ActiveJobsManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		videoID := mux.Vars(r)["videoID"]
		location := fmt.Sprintf("%s/%s.md", adapters.SummariesPath, videoID)

		if j := mgr.GetJob(videoID); j != nil && j.GetStatus() != "finished" {
			writeJSON(w, http.StatusOK, SummaryResponse{NoSummaryReason: "in_progress"})
			return
		}

		if _, err := os.Stat(location); errors.Is(err, os.ErrNotExist) {
			writeJSON(w, http.StatusOK, SummaryResponse{NoSummaryReason: "not_found"})
			return
		}

		b, err := os.ReadFile(location)

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, SummaryResponse{Summary: string(b)})
	}
}

func getChatHistory(w http.ResponseWriter, r *http.Request) {
	videoID := mux.Vars(r)["videoID"]
	chatPath := fmt.Sprintf("./content/chats/%s.json", videoID)

	var data []byte

	if _, err := os.Stat(chatPath); os.IsNotExist(err) {
    data = []byte("[]") 
	} else {
		data, err = os.ReadFile(chatPath)
		if err != nil {
			http.Error(w, "failed to load chat history", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func constructGetVideoHandler(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		videoID := mux.Vars(r)["videoID"]
		if !db.Exists(videoID) {
			http.NotFound(w, r)
			return
		}
		writeJSON(w, http.StatusOK, db.Read(videoID))
	}
}

func constructGetAllVideosHandler(db *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, db.ReadAll())
	}
}

func constructSendChatHandler(chatMgr *chat.ChatManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		videoID := mux.Vars(r)["videoID"]

		var req struct {
			Message string `json:"message"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		if err := chatMgr.SendMessage(videoID, req.Message); err != nil {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}

		w.WriteHeader(http.StatusAccepted)
	}
}

func createChatSSEClient(chatMgr *chat.ChatManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		videoID := mux.Vars(r)["videoID"]

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Type")
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		id, err := chatMgr.CreateClient(w, videoID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer chatMgr.DeleteClient(id)

		<-r.Context().Done()
	}
}

func loadRequiredEnvVars() (string, string) {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	ytdlpBin := os.Getenv("YTDLP_BIN")
	if ytdlpBin == "" {
		log.Fatalf("YTDLP_BIN environment variable is required but not set")
	}

	groqAPIKey := os.Getenv("GROQ_API_KEY")
	if groqAPIKey == "" {
		log.Fatalf("GROQ_API_KEY environment variable is required but not set")
	}

	return ytdlpBin, groqAPIKey
}

func main() {
	log.Println("Loading environment variables")
	ytdlpBin, groqAPIKey := loadRequiredEnvVars()
	
	// Initialize adapters with environment variables
	adapters.Init(ytdlpBin, groqAPIKey)

	r := mux.NewRouter()

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	log.Println("Setting up DB")
	db, err := db.NewDB(DBPath)

	if err != nil {
		log.Fatalf("Failed to initailized db: %s", err.Error())
	}

	log.Println("Creating job manager")
	mgr := job.NewJobManager(db)

	log.Println("Creating chat manager")
	chatMgr := chat.NewChatManager()

	log.Println("Booting up pipeline")
	pipe := pipeline.NewSummarizerPipeline(mgr)
	videoIdIn := pipe.Start()
	log.Println("Defining routes")
	r.HandleFunc("/summarize/{videoID}", constructQueueHandler(videoIdIn)).Methods("POST")
	r.HandleFunc("/summarize/{videoID}", constructGetJobHandler(mgr)).Methods("GET")

	r.HandleFunc("/summaries/{videoID}", createSummaryFetcher(mgr)).Methods("GET")
	r.HandleFunc("/videos/{videoID}", constructGetVideoHandler(db)).Methods("GET")

	r.HandleFunc("/videos", constructGetAllVideosHandler(db)).Methods("GET")

	// Opens a long lived SSE stream
	r.HandleFunc("/summarize/jobs/subscribe", createNewSSEClient(mgr)).Methods("GET")

	// Chat endpoints
	r.HandleFunc("/chat/{videoID}", getChatHistory).Methods("GET")
	r.HandleFunc("/chat/{videoID}/send", constructSendChatHandler(chatMgr)).Methods("POST")
	r.HandleFunc("/chat/{videoID}/subscribe", createChatSSEClient(chatMgr)).Methods("GET")

	handler := c.Handler(r)
	log.Println("Serving on port 8010!")
	if err := http.ListenAndServe(":8010", handler); err != nil {
		log.Fatal(err)
	}
}
