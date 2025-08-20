package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"go-yt-sum/adapters"
	"net/http"
	"os"

	"github.com/google/uuid"
)

func NewChatManager() *ChatManager {
	return &ChatManager{
		Chats:   make(map[string]*Chat, 0),
		Clients: make(map[string]*Client, 0),
	}
}

// Creates new chat if one doesn't exist, then increments
// Requires the caller to lock
func (mgr *ChatManager) addListenerLocked(videoID string) *Chat {
	chat, ok := mgr.Chats[videoID]
	if !ok || chat == nil {
		chat = &Chat{
			VideoID:           videoID,
			IsBusy:            false,
			InProgressRequest: "",
			NumListeners:      0,
		}
		mgr.Chats[videoID] = chat
	}

	mgr.Chats[videoID].NumListeners++
	return chat
}

// If this func fails, the program should terminate
func (mgr *ChatManager) CreateClient(w http.ResponseWriter, videoID string) (string, error) {
	// Create new client
	mgr.mu.Lock()

	id := uuid.New().String()
	mgr.Clients[id] = &Client{
		ListeningTo: videoID,
		Connection:  w,
	}

	// Update num listeners, then take a snapshot of the chat we can send to the client without needing the lock
	newChat := mgr.addListenerLocked(videoID)
	chatSnapshot := *newChat

	mgr.mu.Unlock()

	// Send them initial chatroom data

	jb, err := json.Marshal(chatSnapshot)

	if err != nil {
		return "", err
	}

	eventString := fmt.Sprintf("event: init\ndata: %s\n\n", jb)
	if _, err := fmt.Fprint(w, eventString); err != nil {
		return "", err
	}
	w.(http.Flusher).Flush()

	return id, nil
}

func (mgr *ChatManager) DeleteClient(clientID string) error {
	// Create new client
	mgr.mu.Lock()
	defer mgr.mu.Unlock()

	c, ok := mgr.Clients[clientID]

	if !ok {
		return fmt.Errorf("Client %q could not be found", clientID)
	}

	roomID := c.ListeningTo
	delete(mgr.Clients, clientID)

	if chat, ok := mgr.Chats[roomID]; ok {
		chat.mu.Lock()
		if chat.NumListeners > 0 {
			chat.NumListeners--
		}

		if chat.NumListeners == 0 {
			delete(mgr.Chats, roomID)
		}
		chat.mu.Unlock()
	}

	return nil
}

func (mgr *ChatManager) SendMessage(videoID string, message string) error {
	mgr.mu.Lock()
	chat, ok := mgr.Chats[videoID]
	if !ok {
		mgr.mu.Unlock()
		return fmt.Errorf("chat for video %q not found", videoID)
	}

	if chat.IsBusy {
		mgr.mu.Unlock()
		return fmt.Errorf("chat is busy processing another message")
	}

	chat.IsBusy = true
	chat.InProgressRequest = message
	chat.InProgressResponse = ""
	mgr.mu.Unlock()

	// Broadcast that chat is now busy processing this message
	mgr.broadcastUpdate(videoID)

	// Launch goroutine with context
	go func() {
		defer func() {
			// First broadcast completion signal
			mgr.broadcastComplete(videoID)

			// Save chat history before clearing state
			chat.mu.Lock()
			finalResponse := chat.InProgressResponse
			chat.mu.Unlock()

			if finalResponse != "" {
				mgr.saveChatHistory(videoID, message, finalResponse)
			}

			// Then clear state and broadcast final update
			chat.mu.Lock()
			chat.IsBusy = false
			chat.InProgressRequest = ""
			chat.InProgressResponse = ""
			chat.mu.Unlock()
			mgr.broadcastUpdate(videoID)
		}()

		ctx := context.Background()
		onProgress := func(token string) {
			chat.mu.Lock()
			chat.InProgressResponse += token
			chat.mu.Unlock()
			mgr.broadcastUpdate(videoID)
		}

		err := adapters.SendChatMessage(ctx, videoID, message, onProgress)
		if err != nil {
			chat.mu.Lock()
			chat.InProgressResponse = fmt.Sprintf("Error: %s", err.Error())
			chat.mu.Unlock()
			mgr.broadcastUpdate(videoID)
		}
	}()

	return nil
}

func (mgr *ChatManager) broadcastUpdate(videoID string) {
	mgr.mu.Lock()
	chat, ok := mgr.Chats[videoID]
	if !ok {
		mgr.mu.Unlock()
		return
	}

	chatSnapshot := *chat
	mgr.mu.Unlock()

	jb, err := json.Marshal(chatSnapshot)
	if err != nil {
		return
	}

	eventString := fmt.Sprintf("event: update\ndata: %s\n\n", jb)

	mgr.mu.Lock()
	for _, client := range mgr.Clients {
		if client.ListeningTo == videoID {
			fmt.Fprint(client.Connection, eventString)
			client.Connection.(http.Flusher).Flush()
		}
	}
	mgr.mu.Unlock()
}

func (mgr *ChatManager) broadcastComplete(videoID string) {
	eventString := "event: complete\ndata: {}\n\n"

	mgr.mu.Lock()
	for _, client := range mgr.Clients {
		if client.ListeningTo == videoID {
			fmt.Fprint(client.Connection, eventString)
			client.Connection.(http.Flusher).Flush()
		}
	}
	mgr.mu.Unlock()
}

func (mgr *ChatManager) loadChatHistory(videoID string) ([]Message, error) {
	chatPath := fmt.Sprintf("./content/chats/%s.json", videoID)

	if _, err := os.Stat(chatPath); os.IsNotExist(err) {
		return []Message{}, nil
	}

	data, err := os.ReadFile(chatPath)
	if err != nil {
		return nil, err
	}

	var history []Message
	if err := json.Unmarshal(data, &history); err != nil {
		return nil, err
	}

	return history, nil
}

func (mgr *ChatManager) saveChatHistory(videoID, userMessage, assistantResponse string) error {
	history, err := mgr.loadChatHistory(videoID)
	if err != nil {
		return err
	}

	// Append user message and assistant response
	history = append(history,
		Message{Content: userMessage, Role: "user"},
		Message{Content: assistantResponse, Role: "assistant"},
	)

	chatPath := fmt.Sprintf("./content/chats/%s.json", videoID)

	if err := os.MkdirAll("./content/chats", os.ModePerm); err != nil {
		return err
	}

	data, err := json.MarshalIndent(history, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(chatPath, data, 0644)
}
