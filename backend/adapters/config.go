package adapters

import (
	"go-yt-sum/settings"
)

var (
	groqTranscriptionUrl = "https://api.groq.com/openai/v1/audio/transcriptions"
	groqSummarizationUrl = "https://api.groq.com/openai/v1/chat/completions"
	groqModelsUrl        = "https://api.groq.com/openai/v1/models"

	DownloadsPath      = "./content/downloads"
	TranscriptionsPath = "./content/transcriptions"
	SummariesPath      = "./content/summaries"

	audioType = "mp3"

	// Environment variables set during initialization
	ytdlpBinPath string
	apiKey       string

	settingsMgr *settings.SettingsManager
)

// Init initializes the adapters package with environment variables
func Init(ytdlpBin, groqAPIKey string, sm *settings.SettingsManager) {
	ytdlpBinPath = ytdlpBin
	apiKey = groqAPIKey
	settingsMgr = sm
}

func GetSummarizationModel() string {
	if settingsMgr != nil {
		return settingsMgr.GetSettings().SummarizationModel
	}
	return "llama-3.3-70b-versatile"
}

func GetChatModel() string {
	if settingsMgr != nil {
		return settingsMgr.GetSettings().ChatModel
	}
	return "llama-3.3-70b-versatile"
}

func GetTranscriptionModel() string {
	if settingsMgr != nil {
		return settingsMgr.GetSettings().TranscriptionModel
	}
	return "whisper-large-v3-turbo"
}

func GetAPIKey() string {
	return apiKey
}

func GetModelsURL() string {
	return groqModelsUrl
}

var systemPrompt = "You are a summarizer agent. First, based on the content type, decide what method of organizing the data would be most helpful for the user. For example, if it's informative, summarize as a tutorial. If it's a funny video, describe what happens. If it's a course, create sections and summarize those sections etc. Use markdown, BUT DO NOT INCLUDE ```markdown```. Then, summarize the video in that way. DO NOT USE EMOJIS. If you are given a current summary, simply extend it to include the new data as instructed. Part of your input is [H:MM:SS] timestamps. Include those when referencing anything from the transcription"
