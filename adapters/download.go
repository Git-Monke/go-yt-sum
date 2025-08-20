package adapters

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"go-yt-sum/db"
	"go-yt-sum/job"

	"github.com/asticode/go-astisub"
	"github.com/lrstanley/go-ytdlp"
)

type Segment struct {
	Start float64 `json:"start"`
	End   float64 `json:"end"`
	Text  string  `json:"text"`
}

func formatSubtitle(start float64, end float64, text string) string {
	return fmt.Sprintf("[%s-%s]: %s", fmtHMS(int64(start)), fmtHMS(int64(end)), text)
}

func FindNumOverlappingRunes(a, b string) int {
	ra, rb := []rune(a), []rune(b)
	max := len(ra)
	if len(rb) < max {
		max = len(rb)
	}
	for k := max; k > 0; k-- {
		if string(ra[len(ra)-k:]) == string(rb[:k]) {
			return k
		}
	}
	return 0
}

func findFirstByVideoID(dir, id string) (string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", err
	}

	var first string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasPrefix(name, id) && (len(name) == len(id) || name[len(id)] == '.') {
			p := filepath.Join(dir, name)
			// prefer .vtt immediately
			if strings.HasSuffix(strings.ToLower(name), ".vtt") {
				return p, nil
			}
		}
	}
	if first != "" {
		return first, nil
	}
	return "", nil
}

func formatVTT(path, videoID string) error {
	s, err := astisub.OpenFile(path)

	segments := make([]Segment, 0)

	if err != nil {
		return err
	}

	for _, seg := range s.Items {
		start := seg.StartAt.Seconds()
		end := seg.EndAt.Seconds()
		txt := seg.String()
		if txt == "" || int64(start) == int64(end) {
			continue
		}

		// Dedepulication.
		if len(segments) > 0 {
			prevIdx := len(segments) - 1
			k := FindNumOverlappingRunes(segments[prevIdx].Text, txt)
			r := []rune(segments[prevIdx].Text)

			if k > len(r) {
				segments = segments[:prevIdx]
			} else if k > 0 {
				segments[prevIdx].Text = string(r[:len(r)-k])
			}
		}

		segments = append(segments, Segment{
			Start: start,
			End:   end,
			Text:  txt,
		})
	}

	out, err := os.Create(fmt.Sprintf("%s/%s.json", TranscriptionsPath, videoID))
	encoder := json.NewEncoder(out)

	if err := encoder.Encode(segments); err != nil {
		return err
	}

	if err = os.Remove(path); err != nil {
		return err
	}

	return nil
}

func extractVideoMeta(videoID string, progress func(func(j *job.SummaryJob))) error {
	meta, err := readVideoEntryFromInfoJSON(DownloadsPath, videoID)
	if err != nil {
		return fmt.Errorf("read info.json: %w", err)
	}

	progress(func(j *job.SummaryJob) {
		j.Progress.VideoMeta = &db.VideoEntry{
			VideoID:           meta.VideoID,
			VideoThumbnailURL: meta.VideoThumbnailURL,
			VideoName:         meta.VideoName,
			CreatorName:       meta.CreatorName,
			Length:            meta.Length,
			UploadDate:        meta.UploadDate,
		}
	})

	return nil
}

func DownloadVideo(videoID string, progress func(func(j *job.SummaryJob))) (bool, error) {
	filePath := fmt.Sprintf("%s/%s.%s", DownloadsPath, videoID, audioType)

	if _, err := os.Stat(filePath); err == nil {
		log.Printf("%s has already been downloaded. Skipping step.", videoID)
		return false, nil
	}

	progress(func(j *job.SummaryJob) {
		j.Status = "checking_for_captions"
	})

	// Trigger captions + info.json generation (without downloading media)
	dl := ytdlp.New().
		WriteAutoSubs().
		WriteSubs().
		SkipDownload().
		Output(fmt.Sprintf("%s/%s.%%(ext)s", DownloadsPath, videoID)).
		SubLangs("en,en.*").
		ConvertSubs("vtt").
		Quiet().
		WriteInfoJSON().
		LimitRate("1M").
		Impersonate("Chrome-100").
		SetExecutable(ytdlpBinPath)


		_, err := dl.Run(context.Background(), fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID))

	if err != nil {
	  return false, err
	}

	rawPath, err := findFirstByVideoID(DownloadsPath, videoID)

	if err != nil {
		return false, err
	}

	if rawPath == "" {
	  return false, fmt.Errorf("Captions should have been available")
	}

	// If auto-generated transcriptions aren't available, download and extract audio then send to transcriber stage
	// Otherwise we can just format the VTT file and send straight to summarization
	fmt.Println(rawPath)
	if rawPath == "" {
		progress(func(j *job.SummaryJob) {
			j.Status = "downloading_audio"
		})

		dl := ytdlp.New().
			Output(fmt.Sprintf("%s/%s.%%(ext)s", DownloadsPath, videoID)).
			ExtractAudio().
			AudioFormat("mp3").
			ProgressFunc(250*time.Millisecond, func(up ytdlp.ProgressUpdate) {
				progress(func(j *job.SummaryJob) {
					j.Progress.PercentageString = up.PercentString()

					if up.Status == "finished" {
						j.Status = "extracting_audio"
					}
				})
			}).Quiet().WriteInfoJSON().LimitRate("1M")

		if _, err = dl.Run(context.Background(), fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)); err != nil {
			return false, err
		}

		extractVideoMeta(videoID, progress)
	} else {
		progress(func(j *job.SummaryJob) {
			j.Status = "downloaded_captions"
		})

		extractVideoMeta(videoID, progress)

		if err := formatVTT(rawPath, videoID); err != nil {
			return false, err
		}

		return true, nil
	}

	return false, nil
}

// --- helpers ---

// readVideoEntryFromInfoJSON loads <DownloadsPath>/<videoID>.info.json produced by yt-dlp
// and maps the subset of fields we care about into db.VideoEntry.
func readVideoEntryFromInfoJSON(baseDir, videoID string) (db.VideoEntry, error) {
	path := filepath.Join(baseDir, fmt.Sprintf("%s.info.json", videoID))

	data, err := os.ReadFile(path)
	if err != nil {
		return db.VideoEntry{}, err
	}

	var info struct {
		ID         string  `json:"id"`
		Title      *string `json:"title"`
		Uploader   *string `json:"uploader"`
		Duration   *int64  `json:"duration"`
		UploadDate *string `json:"upload_date"` // "YYYYMMDD"
		Thumbnail  *string `json:"thumbnail"`
		Thumbnails []struct {
			URL string `json:"url"`
		} `json:"thumbnails"`
	}

	if err := json.Unmarshal(data, &info); err != nil {
		return db.VideoEntry{}, err
	}

	thumb := ""
	if info.Thumbnail != nil {
		thumb = *info.Thumbnail
	}
	if thumb == "" && len(info.Thumbnails) > 0 {
		thumb = info.Thumbnails[len(info.Thumbnails)-1].URL
	}

	upload := ""
	if info.UploadDate != nil {
		upload = formatYYYYMMDD(*info.UploadDate)
	}

	return db.VideoEntry{
		VideoID:           info.ID,
		VideoThumbnailURL: thumb,
		VideoName:         deref(info.Title),
		CreatorName:       deref(info.Uploader),
		Length:            float64(derefInt(info.Duration)),
		UploadDate:        upload,
	}, nil
}

func formatYYYYMMDD(s string) string {
	if len(s) == 8 {
		return s[0:4] + "-" + s[4:6] + "-" + s[6:8]
	}
	return s
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func derefInt(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}
