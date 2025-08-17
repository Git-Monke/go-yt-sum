package adapters

import (
	"bytes"
	"fmt"
	"go-yt-sum/job"
	"log"
	"os"
	"os/exec"

	"mime/multipart"
	"net/http"
	"path/filepath"

	"encoding/json"
	"io"
)

type Segment struct {
	Start float32 `json:"start"`
	End   float32 `json:"end"`
	Text  string  `json:"text"`
}

type TranscriptionPayload struct {
	Segments []Segment `json:"segments"`
}

func cleanUpChunks(videoID string) {
	chunksPath := fmt.Sprintf("%s/%s/", downloadsPath, videoID)
	os.RemoveAll(chunksPath)
}

// Takes mp3, chunks it, returns a list of the relative paths of all the chunk files. Good for iterating over once the function has been called
func chunkAudio(videoID string) (*[]string, error) {
	dlPath := fmt.Sprintf("%s/%s.%s", downloadsPath, videoID, audioType)
	outputPath := fmt.Sprintf("%s/%s", downloadsPath, videoID)

	if err := os.MkdirAll(outputPath, os.ModePerm); err != nil {
		return nil, err
	}

	cmd := exec.Command("ffmpeg",
		"-y",
		"-i", dlPath, // input
		"-vn",                // no video
		"-c:a", "libmp3lame", // encode to mp3
		"-b:a", "96k",
		"-f", "segment", // <-- split muxer
		"-segment_time", "1200", // 1200s = 20 min chunks
		"-reset_timestamps", "1",
		"-map", "0:a:0",
		filepath.Join(outputPath, "%03d.mp3"), // output pattern is the FINAL arg
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Println(string(output))
		return nil, err
	}

	entries, err := os.ReadDir(outputPath)
	if err != nil {
		return nil, err
	}

	out := make([]string, 0)

	for _, entry := range entries {
		out = append(out, fmt.Sprintf("%s/%s", outputPath, entry.Name()))
	}

	return &out, nil
}

// Opens the file, encodes http request, transcribes via groq, returns structured payload
// Uses lastEnd to shift timestamps and then deduplicate
func transcribeFile(filePath string, context string) (*TranscriptionPayload, error) {
	audioFile, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}

	defer audioFile.Close()

	// Create multipart HTTP request for sending file data
	reqBody := &bytes.Buffer{}
	writer := multipart.NewWriter(reqBody)

	part, err := writer.CreateFormFile("file", filepath.Base(filePath))
	if err != nil {
		return nil, err
	}

	_, err = io.Copy(part, audioFile)

	// Write other fields
	err = writer.WriteField("model", transcriptionModel)
	err = writer.WriteField("language", "en")
	err = writer.WriteField("response_format", "verbose_json")
	err = writer.WriteField("prompt", context)
	err = writer.WriteField("timestamp_granularities[]", "segment")

	err = writer.Close()
	if err != nil {
		return nil, err
	}

	request, _ := http.NewRequest("POST", groqTranscriptionUrl, reqBody)

	// Write headers
	request.Header.Add("Content-Type", writer.FormDataContentType())
	request.Header.Add("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	// Send request
	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	respBody, err := io.ReadAll(response.Body)
	var data TranscriptionPayload

	if err := json.Unmarshal(respBody, &data); err != nil {
		return nil, err
	}

	return &data, nil
}

// The progress func should handle locking and unlocking + sending data to clients.
// The purpose of keeping it abstract is so if that logic changes (it likely will), this logic stays the same
func TranscribeVideo(videoID string, progress func(func(j *job.SummaryJob))) error {
	// Check for existing transcription
	scribePath := fmt.Sprintf("%s/%s.%s", transcriptionsPath, videoID, "json")
	_, err := os.Stat(scribePath)

	if err == nil {
		log.Printf("%s has already been transcribed. Skipping step.", videoID)
		return nil
	}

	// Chunk it up
  progress(func (j *job.SummaryJob) {
		j.Status = "chunking"
	})

	entries, err := chunkAudio(videoID)
	defer cleanUpChunks(videoID)

	if err != nil {
		return err
	}

  progress(func (j *job.SummaryJob) {
		j.Status = "transcribing"
		j.Progress.TranscriptionChunks = len(*entries) 
	})

	// Transcribe each segment
	segments := make([]Segment, 0)
	var lastTimestamp float32 = 0.0

	for i, entry := range *entries {
		newTranscription, err := transcribeFile(entry, "")
		if err != nil { return err }

		for i := range newTranscription.Segments {
      newTranscription.Segments[i].Start += lastTimestamp			
			newTranscription.Segments[i].End += lastTimestamp
		}

		progress(func (j *job.SummaryJob) {
			j.Progress.ChunksTranscribed = i + 1
		})

	  segments = append(segments, newTranscription.Segments...)	
    // Each transcription chunk is 1200 seconds long, so we can increment by a fixed amount safely
		lastTimestamp += 1200
	}

	// Write output
  outputFile, err := os.Create(scribePath)
	if err != nil { return err }

	encoder := json.NewEncoder(outputFile)
  if err := encoder.Encode(segments); err != nil { return err }

	return nil
}
