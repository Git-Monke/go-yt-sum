package adapters

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/lrstanley/go-ytdlp"
)

func DownloadVideo(videoID string, onProgress func(ytdlp.ProgressUpdate)) error {
	filePath := fmt.Sprintf("%s/%s.%s", downloadsPath, videoID, audioType)
	_, err := os.Stat(filePath)

	if err == nil {
		log.Printf("%s has already been downloaded. Skipping step.", videoID)
		return nil
	}

	dl := ytdlp.New().
		ExtractAudio().
		AudioFormat(audioType).
		AudioQuality("96K").
		Output(fmt.Sprintf("%s/%s.%%(ext)s", downloadsPath, videoID)).
		ProgressFunc(100*time.Millisecond, onProgress).
		ForceIPv4()

	_, err = dl.Run(context.Background(), fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID))
	return err
}
