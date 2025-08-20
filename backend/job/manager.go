package job

import (
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"go-yt-sum/db"
	"log"
	"net/http"
	"sync"
)

type Client struct {
	Connection http.ResponseWriter
}

type ActiveJobsManager struct {
	Jobs    map[string]*SummaryJob
	Clients map[string]*Client
	DB      *db.DB

	Lock        sync.RWMutex
	ClientsLock sync.Mutex
}

func NewJobManager(db *db.DB) *ActiveJobsManager {
	return &ActiveJobsManager{
		Jobs:    make(map[string]*SummaryJob),
		Clients: make(map[string]*Client),
		DB:      db,
	}
}

// ---

// Stores for later, then sends initial job data
func (manager *ActiveJobsManager) CreateClient(w http.ResponseWriter) string {
	manager.ClientsLock.Lock()
	defer manager.ClientsLock.Unlock()

	id := uuid.New().String()
	manager.Clients[id] = &Client{
		Connection: w,
	}

	jsonString, err := json.Marshal(manager.Jobs)

	if err != nil {
		log.Println("Failed to encode all jobs when opening SSE connection. This should NOT happen.")
	}

	eventString := fmt.Sprintf("event: init\ndata: %s\n\n", jsonString)
	fmt.Fprint(w, eventString)
	w.(http.Flusher).Flush()

	return id
}

func (manager *ActiveJobsManager) DeleteClient(id string) {
	manager.ClientsLock.Lock()
	defer manager.ClientsLock.Unlock()
	delete(manager.Clients, id)
}

func (manager *ActiveJobsManager) BroadcastJobData(job *SummaryJob, eventType string) {
	jsonString, err := json.Marshal(job)

	if err != nil {
		log.Printf("Failed to encode update for job %s", job.VideoID)
	}

	eventString := fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, jsonString)

	for _, client := range manager.Clients {
		fmt.Fprint(client.Connection, eventString)
		client.Connection.(http.Flusher).Flush()
	}
}

func (manager *ActiveJobsManager) CreateJob(videoID string) (bool, *SummaryJob) {
	manager.Lock.Lock()
	defer manager.Lock.Unlock()

	if job, exists := manager.Jobs[videoID]; exists && job.GetStatus() != "failed" {
		return true, job
	}

	// Reset database failure state when creating/retrying a job
	manager.DB.UpdateJobSuccess(videoID)

	newJob := &SummaryJob{
		VideoID:  videoID,
		Status:   "pending",
		OnUpdate: manager.CreateUpdateHandler(),
	}

	manager.BroadcastJobData(newJob, "new")
	manager.Jobs[videoID] = newJob

	return false, newJob
}

// Note: There's no error handling right now lol.
func (manager *ActiveJobsManager) CreateUpdateHandler() func(job *SummaryJob) {
	return func(job *SummaryJob) {
		manager.BroadcastJobData(job, "update")

		// If the videoMeta gets created and we don't already have it, snag it and save it
		if !manager.DB.Exists(job.VideoID) && job.Progress.VideoMeta != nil {
			manager.DB.Create(job.VideoID, *job.Progress.VideoMeta)
		}
	}
}

func (manager *ActiveJobsManager) GetJob(videoID string) *SummaryJob {
	manager.Lock.Lock()
	defer manager.Lock.Unlock()

	_, exists := manager.Jobs[videoID]

	if exists {
		return manager.Jobs[videoID]
	}

	return nil
}

func (manager *ActiveJobsManager) GetAllJobs() map[string]*SummaryJob {
	manager.Lock.RLock()
	defer manager.Lock.RUnlock()

	return manager.Jobs
}

func (manager *ActiveJobsManager) DeleteJob(videoID string) {
	manager.Lock.Lock()
	defer manager.Lock.Unlock()

	delete(manager.Jobs, videoID)
}
