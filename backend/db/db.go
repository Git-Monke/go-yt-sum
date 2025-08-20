package db

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"sync"
)

type VideoEntry struct {
	VideoID           string  `json:"video_id"`
	VideoThumbnailURL string  `json:"video_thumbnail_url"`
	VideoName         string  `json:"video_name"`
	CreatorName       string  `json:"creator_name"`
	Length            float64 `json:"length"`
	UploadDate        string  `json:"upload_date"`

	JobFailed bool   `json:"job_failed"`
	LastError string `json:"last_error"`
}

// Maps VideoID to VideoEntry (which is just video metadata)
type DB struct {
	Data     map[string]VideoEntry `json:"data"`
	FilePath string                `json:"-"`
	Lock     sync.RWMutex          `json:"-"`
}

func NewDB(dbPath string) (*DB, error) {
	// Ensure the directory exists.
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, err
	}

	// If file missing, create seed file atomically.
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		if err := os.WriteFile(dbPath, []byte("{}"), 0o644); err != nil {
			return nil, err
		}
	}

	// Read & unmarshal.
	data, err := os.ReadFile(dbPath)
	if err != nil {
		return nil, err
	}

	var db DB
	if err := json.Unmarshal(data, &db); err != nil {
		return nil, err
	}

	if db.Data == nil {
		db.Data = make(map[string]VideoEntry)
	}

	return &DB{
		Data:     db.Data,
		FilePath: dbPath,
	}, nil
}

func (db *DB) Delete(VideoID string) {
	db.Lock.Lock()
	delete(db.Data, VideoID)
	db.Lock.Unlock()
}

func (db *DB) Create(VideoID string, Entry VideoEntry) {
	db.Lock.Lock()
	db.Data[VideoID] = Entry
	db.Lock.Unlock()

	db.SaveToFile()
}

func (db *DB) Read(VideoID string) VideoEntry {
	db.Lock.RLock()
	defer db.Lock.RUnlock()

	return db.Data[VideoID]
}

func (db *DB) ReadAll() map[string]VideoEntry {
	db.Lock.RLock()
	defer db.Lock.RUnlock()
	return db.Data
}

func (db *DB) Exists(VideoID string) bool {
	db.Lock.RLock()
	_, ok := db.Data[VideoID]
	db.Lock.RUnlock()

	return ok
}

func (db *DB) SaveToFile() {
	db.Lock.RLock()
	defer db.Lock.RUnlock()

	log.Printf("Saving DB")

	if db.FilePath == "" {
		return
	}

	dir := filepath.Dir(db.FilePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Printf("SaveToFile: mkdir %s: %v", dir, err)
		return
	}

	tmp, err := os.CreateTemp(dir, ".db-*.json")
	if err != nil {
		log.Printf("SaveToFile: create temp: %v", err)
		return
	}
	defer func() {
		_ = os.Remove(tmp.Name()) // no-op if renamed
	}()

	enc := json.NewEncoder(tmp)
	enc.SetIndent("", "  ")
	if err := enc.Encode(db); err != nil {
		_ = tmp.Close()
		log.Printf("SaveToFile: encode json: %v", err)
		return
	}

	if err := tmp.Sync(); err != nil {
		_ = tmp.Close()
		log.Printf("SaveToFile: fsync: %v", err)
		return
	}
	if err := tmp.Close(); err != nil {
		log.Printf("SaveToFile: close: %v", err)
		return
	}

	if err := os.Rename(tmp.Name(), db.FilePath); err != nil {
		log.Printf("SaveToFile: rename: %v", err)
		return
	}
}

// SetJobFailed sets the job failure state for a video
func (db *DB) SetJobFailed(videoID string, failed bool, errorMsg string) {
	db.Lock.Lock()

	if entry, exists := db.Data[videoID]; exists {
		entry.JobFailed = failed
		entry.LastError = errorMsg
		db.Data[videoID] = entry
		db.Lock.Unlock()
		db.SaveToFile()
	} else {
		db.Lock.Unlock()
	}
}

// UpdateJobSuccess marks a job as successful and clears failure state
func (db *DB) UpdateJobSuccess(videoID string) {
	db.SetJobFailed(videoID, false, "")
}
