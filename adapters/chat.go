package adapters

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

type ChatMessage struct {
	Content string `json:"content"`
	Role    string `json:"role"`
}

type GroqChatRequest struct {
	Messages []ChatMessage `json:"messages"`
	Model    string        `json:"model"`
	Stream   bool          `json:"stream"`
}

type GroqStreamResponse struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
	} `json:"choices"`
}

func loadSummary(videoID string) (string, error) {
	summaryPath := fmt.Sprintf("%s/%s.md", SummariesPath, videoID)
	
	if _, err := os.Stat(summaryPath); os.IsNotExist(err) {
		return "", nil // No summary available
	}
	
	data, err := os.ReadFile(summaryPath)
	if err != nil {
		return "", err
	}
	
	return string(data), nil
}

func loadChatHistory(videoID string) ([]ChatMessage, error) {
	chatPath := fmt.Sprintf("./content/chats/%s.json", videoID)
	
	if _, err := os.Stat(chatPath); os.IsNotExist(err) {
		return []ChatMessage{}, nil
	}
	
	data, err := os.ReadFile(chatPath)
	if err != nil {
		return nil, err
	}
	
	var history []ChatMessage
	if err := json.Unmarshal(data, &history); err != nil {
		return nil, err
	}
	
	return history, nil
}

func SendChatMessage(ctx context.Context, videoID, message string, onProgress func(string)) error {
	// Load chat history
	history, err := loadChatHistory(videoID)
	if err != nil {
		return err
	}
	
	// Load summary
	summary, err := loadSummary(videoID)
	if err != nil {
		return err
	}
	
	// Build complete message context
	messages := []ChatMessage{
		{
			Content: "You are a smart and chill person answering questions about the video. By default your response should be super short and concise UNLESS EXPLICITLY ASKED to do something that requires a lot more text",
			Role:    "system",
		},
	}
	
	// Add summary context if available
	if summary != "" {
		messages = append(messages, ChatMessage{
			Content: "Here is the summary of the video:\n\n" + summary,
			Role:    "system",
		})
	}
	
	// Add chat history
	messages = append(messages, history...)
	
	// Add new user message
	messages = append(messages, ChatMessage{
		Content: message,
		Role:    "user",
	})

	reqBody := &bytes.Buffer{}
	reqData := GroqChatRequest{
		Messages: messages,
		Model:    chatModel,
		Stream:   true,
	}

	if err := json.NewEncoder(reqBody).Encode(reqData); err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(ctx, "POST", groqSummarizationUrl, reqBody)
	if err != nil {
		return err
	}

	request.Header.Add("Authorization", fmt.Sprintf("Bearer %s", apiKey))
	request.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	// Parse streaming response
	scanner := bufio.NewScanner(response.Body)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			line := scanner.Text()
			
			// Skip empty lines and non-data lines
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			
			// Check for stream termination
			if strings.Contains(line, "[DONE]") {
				break
			}
			
			// Extract JSON from data line
			jsonData := strings.TrimPrefix(line, "data: ")
			
			var streamResp GroqStreamResponse
			if err := json.Unmarshal([]byte(jsonData), &streamResp); err != nil {
				continue // Skip malformed chunks
			}
			
			// Extract content and call progress callback
			if len(streamResp.Choices) > 0 && streamResp.Choices[0].Delta.Content != "" {
				onProgress(streamResp.Choices[0].Delta.Content)
			}
		}
	}

	return scanner.Err()
}
