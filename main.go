package main

import (
	"encoding/json"
	"log"
	"net/http"

	"go-yt-sum/job"
	"go-yt-sum/pipeline"

	"github.com/gorilla/mux"
)

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
		exists, job := mgr.GetJob(videoID)

		if !exists {
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

func main() {
	log.Println("Setting up yt-dlp and its dependencies...")

	log.Println("Setting up http router and summarizer pipeline...")
	r := mux.NewRouter()

	mgr := job.NewJobManager()
	pipe := pipeline.NewSummarizerPipeline(mgr)
	videoIdIn := pipe.Start()

	r.HandleFunc("/summarize/{videoID}", constructQueueHandler(videoIdIn)).Methods("POST")
	r.HandleFunc("/summarize/{videoID}", constructGetJobHandler(mgr)).Methods("GET")

	// Opens a long lived SSE stream
	r.HandleFunc("/summarize/jobs/subscribe", createNewSSEClient(mgr)).Methods("GET")

	log.Println("Listening on port :8010")
	if err := http.ListenAndServe(":8010", r); err != nil {
		log.Fatal(err)
	}
}
