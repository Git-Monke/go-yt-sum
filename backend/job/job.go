package job

import (
	"go-yt-sum/db"
	"sync"
)

// ---

type JobProgress struct {
	VideoMeta        *db.VideoEntry
	PercentageString string `json:"percentage_string"`

	HadCaptions         bool `json:"had_captions"`
	TranscriptionChunks int  `json:"transcription_chunks"`
	ChunksTranscribed   int  `json:"transcription_chunks_transcribed"`

	SummaryChunks    int `json:"summary_chunks"`
	ChunksSummarized int `json:"summary_chunks_transcribed"`
}

type SummaryJob struct {
	VideoID  string       `json:"video_id"`
	Status   string       `json:"status"`
	Error    string       `json:"error"`
	Progress JobProgress  `json:"job_progress"`
	Lock     sync.RWMutex `json:"-"`

	OnUpdate func(*SummaryJob) `json:"-"`
}

// Convenience wrapper
func (job *SummaryJob) UpdateStatus(newStatus string) {
	job.Lock.Lock()
	defer job.Lock.Unlock()

	job.Status = newStatus
	job.OnUpdate(job)
}

// Used for updating status and progress at same time
func (job *SummaryJob) UpdateJob(fn func(j *SummaryJob)) {
	job.Lock.Lock()
	defer job.Lock.Unlock()

	fn(job)
	job.OnUpdate(job)
}

func (job *SummaryJob) GetStatus() string {
	job.Lock.RLock()
	defer job.Lock.RUnlock()

	return job.Status
}

// ---
