package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type Settings struct {
	SummarizationModel string `json:"summarizationModel"`
	ChatModel          string `json:"chatModel"`
	TranscriptionModel string `json:"transcriptionModel"`
}

type SettingsManager struct {
	path     string
	settings Settings
	mu       sync.RWMutex
}

func NewSettingsManager(path string) (*SettingsManager, error) {
	sm := &SettingsManager{
		path: path,
		settings: Settings{
			SummarizationModel: "llama-3.3-70b-versatile",
			ChatModel:          "llama-3.3-70b-versatile",
			TranscriptionModel: "whisper-large-v3-turbo",
		},
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}

	if _, err := os.Stat(path); err == nil {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(data, &sm.settings); err != nil {
			return nil, err
		}
	} else {
		// Save defaults
		if err := sm.save(); err != nil {
			return nil, err
		}
	}

	return sm, nil
}

func (sm *SettingsManager) GetSettings() Settings {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.settings
}

func (sm *SettingsManager) UpdateSettings(newSettings Settings) error {
	sm.mu.Lock()
	sm.settings = newSettings
	sm.mu.Unlock()
	return sm.save()
}

func (sm *SettingsManager) save() error {
	sm.mu.RLock()
	data, err := json.MarshalIndent(sm.settings, "", "  ")
	sm.mu.RUnlock()
	if err != nil {
		return err
	}
	return os.WriteFile(sm.path, data, 0644)
}
