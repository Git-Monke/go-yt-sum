package adapters

var (
	groqTranscriptionUrl = "https://api.groq.com/openai/v1/audio/transcriptions"
	groqSummarizationUrl = "https://api.groq.com/openai/v1/chat/completions"
	apiKey = "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"

	transcriptionModel = "whisper-large-v3-turbo"
	summarizationModel = "openai/gpt-oss-120b"

	downloadsPath = "./content/downloads"
	transcriptionsPath = "./content/transcriptions"
	summariesPath = "./content/summaries"

	audioType = "mp3"
)

var systemPrompt = "You are a summarizer agent. First, based on the content type, decide what method of organizing the data would be most helpful for the user. For example, if it's informative, summarize as a tutorial. If it's a funny video, describe what happens. If it's a course, create sections and summarize those sections etc. Use markdown, BUT DO NOT INCLUDE ```markdown```. Then, summarize the video in that way. DO NOT USE EMOJIS. If you are given a current summary, simply extend it to include the new data as instructed. Part of your input is [H:MM:SS] timestamps. Include those when referencing anything from the transcription"
