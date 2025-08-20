package chat

import (
	"net/http"
	"sync"
)

type Chat struct {
	VideoID string `json:"video_id"`
	IsBusy  bool   `json:"is_busy"`

	InProgressRequest  string `json:"request"`
	InProgressResponse string `json:"response"`

	NumListeners int        `json:"-"`
	mu           sync.Mutex `json:"-"`
}

type Client struct {
	ListeningTo string
	Connection  http.ResponseWriter
}

type ChatManager struct {
	Chats map[string]*Chat `json:"chats"`
	// Maps clientID to
	Clients map[string]*Client `json:"-"`

	mu sync.Mutex `json:"-"`
}

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
