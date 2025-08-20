package adapters

import (
	"bytes"
	"fmt"
	"go-yt-sum/job"
	"os"

	"net/http"

	"encoding/json"
	"io"
	"time"
)

// ---

// Max tokens to feed into grok in a single summarization step
var MaxTokens = 30_000

type Message struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

type GroqSummarizationRequest struct {
	Messages []Message `json:"messages"`
	Model    string    `json:"model"`
}

type ResponseMessage struct {
	Content string `json:"content"`
}

type Choice struct {
	Message ResponseMessage `json:"message"`
}

type GroqSummarizationResponse struct {
	Choices []Choice `json:"choices"`
}

// ---

func fmtHMS(timeSecs int64) string {
	timestamp := time.Duration(timeSecs) * time.Second

	if timestamp > time.Hour {
		return fmt.Sprintf("%02d:%02d:%02d", int(timestamp.Hours()), int(timestamp.Minutes())%60, int(timestamp.Seconds())%60)
	} else {
		return fmt.Sprintf("%02d:%02d", int(timestamp.Minutes())%60, int(timestamp.Seconds())%60)
	}
}

// Takes in all the segments, and outputs a list of 30,000 token formatted timestamped chunks
func createTranscriptSegments(script []Segment) []string {
	currentString := ""
	out := make([]string, 0)

	for _, segment := range script {
		currentString += formatSubtitle(float64(segment.Start), float64(segment.End), segment.Text) + "\n"

		// Assumes 4 chars per token average
		if len(currentString) > MaxTokens*4 {
			out = append(out, currentString)
			currentString = ""
		}
	}

	// Whatever is left, append it
	out = append(out, currentString)

	return out
}

// Takes in a section of the transcript, calls groq to extend the existing summary with the new data
func extendSummary(newSection string, currentSummary string) (*string, error) {
	reqBody := &bytes.Buffer{}
	reqData := GroqSummarizationRequest{
		Messages: []Message{
			{
				Content: systemPrompt,
				Role:    "system",
			},
			{
				Content: fmt.Sprintf("Please summarize this: %s", newSection),
				Role:    "user",
			},
			{
				Content: fmt.Sprintf("Here is the current summary. Combine it with the transcription below to form a more complete summary. If there is no current summary, just write an initial one: %s", currentSummary),
				Role:    "user",
			},
		},
		Model: summarizationModel,
	}

	writer := json.NewEncoder(reqBody)
	if err := writer.Encode(reqData); err != nil {
		return nil, err
	}

	request, _ := http.NewRequest("POST", groqSummarizationUrl, reqBody)

	request.Header.Add("Authorization", fmt.Sprintf("Bearer %s", apiKey))
	request.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	rawResponseData, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	var responseData GroqSummarizationResponse

	if err := json.Unmarshal(rawResponseData, &responseData); err != nil {
		return nil, err
	}

	return &responseData.Choices[0].Message.Content, nil
}

func SummarizeVideo(videoID string, update func(func(j *job.SummaryJob))) error {

	// Read transcription data

	scribePath := fmt.Sprintf("%s/%s.%s", TranscriptionsPath, videoID, "json")

	scribeFile, err := os.Open(scribePath)
	if err != nil {
		return err
	}

	scribePlaintext, err := io.ReadAll(scribeFile)
	if err != nil {
		return err
	}

	var scribeData []Segment
	if err := json.Unmarshal(scribePlaintext, &scribeData); err != nil {
		return err
	}
	scribeFile.Close()

	// Chunk it up

	chunks := createTranscriptSegments(scribeData)
	currentSummary := ""
	update(func(j *job.SummaryJob) {
		j.Progress.SummaryChunks = len(chunks)
	})

	// Summarize each chunk

	for i, chunk := range chunks {
		newSummary, err := extendSummary(chunk, currentSummary)

		if err != nil {
			return err
		}

		update(func(j *job.SummaryJob) {
			j.Progress.ChunksSummarized = i + 1
		})

		currentSummary = *newSummary
	}

	// Write out the finished summary

	summaryPath := fmt.Sprintf("%s/%s.%s", SummariesPath, videoID, "md")

	if err := os.MkdirAll(SummariesPath, os.ModePerm); err != nil {
		return err
	}

	summaryFile, err := os.Create(summaryPath)
	if err != nil {
		return err
	}
	defer summaryFile.Close()

	if _, err := summaryFile.Write([]byte(currentSummary)); err != nil {
		return err
	}

	return nil
}
