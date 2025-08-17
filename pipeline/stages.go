package pipeline

import (
	"fmt"
	"log"

	"go-yt-sum/adapters"
	"go-yt-sum/job"

	"github.com/lrstanley/go-ytdlp"
)

type PipelineError struct {
	Err   error
	Job   *job.SummaryJob
	Stage string
}

type SummarizerPipeline struct {
	mgr *job.ActiveJobsManager

	videoIdIn     chan string
	pendingCh     chan *job.SummaryJob
	downloadedCh  chan *job.SummaryJob
	transcribedCh chan *job.SummaryJob
	summarizedCh  chan *job.SummaryJob

	errCh chan PipelineError
}

func NewSummarizerPipeline(mgr *job.ActiveJobsManager) *SummarizerPipeline {
	return &SummarizerPipeline{
		mgr: mgr,

		videoIdIn:     make(chan string, 1024),
		pendingCh:     make(chan *job.SummaryJob, 1024),
		downloadedCh:  make(chan *job.SummaryJob, 1024),
		transcribedCh: make(chan *job.SummaryJob, 1024),
		summarizedCh:  make(chan *job.SummaryJob, 1024),

		errCh: make(chan PipelineError, 10),
	}
}

func (pipe *SummarizerPipeline) Start() chan<- string {
	go pipe.processNewIds()
	go pipe.downloadNextJob()
	go pipe.transcribeNextJob()
	go pipe.summarizeNextJob()
	go pipe.displayOutput()

	go pipe.handleErrors()

	return pipe.videoIdIn
}

// ---

func (pipe *SummarizerPipeline) recoverStage(stageName string, failedJob *job.SummaryJob) {
	if r := recover(); r != nil {
		pipe.errCh <- PipelineError{
			Err:   fmt.Errorf("%v", r),
			Job:   failedJob,
			Stage: stageName,
		}
	}
}

// ---

func (pipe *SummarizerPipeline) handleErrors() {
	for pipeError := range pipe.errCh {
		log.Printf("Job %s failed at stage %s: %s", pipeError.Job.VideoID, pipeError.Stage, pipeError.Err)

		pipeError.Job.UpdateJob(func(j *job.SummaryJob) {
      j.Status = "failed" 
			j.Error = pipeError.Err.Error()
		})
	}
}

func (pipe *SummarizerPipeline) processNewIds() {
	for videoId := range pipe.videoIdIn {
		exists, newJob := pipe.mgr.CreateJob(videoId)

		if !exists {
			log.Printf("Added %s to queue\n", videoId)
			pipe.pendingCh <- newJob
		} else {
			log.Printf("Video with id %s already has a job\n", videoId)
		}
	}
}

func (pipe *SummarizerPipeline) summarizeNextJob() {
	for pendingJob := range pipe.transcribedCh {
		func(job *job.SummaryJob) {
			defer pipe.recoverStage("summarizeNextJob", job)

			log.Printf("Summarizing %s\n", job.VideoID)
			job.UpdateStatus("summarizing")

			if err := adapters.SummarizeVideo(job.VideoID, job.UpdateJob); err != nil {
				panic(err)
			}

			pipe.summarizedCh <- job
		}(pendingJob)
	}
}

func (pipe *SummarizerPipeline) transcribeNextJob() {
	for pendingJob := range pipe.downloadedCh {
		func(job *job.SummaryJob) {
			defer pipe.recoverStage("transcribeNextJob", job)

			err := adapters.TranscribeVideo(job.VideoID, job.UpdateJob)

			if err != nil {
				panic(err)
			}

			pipe.transcribedCh <- pendingJob
		}(pendingJob)
	}
}

func (pipe *SummarizerPipeline) downloadNextJob() {
	// Read in jobs from the pipeline
	for pendingJob := range pipe.pendingCh {

		// Define handler for this job which we can catch if it fails unexpectedly
		func(j *job.SummaryJob) {
			defer pipe.recoverStage("downloadNextJob", j)

			log.Printf("Downloading %s\n", pendingJob.VideoID)
			pendingJob.UpdateStatus("downloading")

			// Define progress handler
			onProgress := func(up ytdlp.ProgressUpdate) {
				j.UpdateJob(func(j *job.SummaryJob) {
					j.Progress.PercentageString = up.PercentString()

					if up.Status == "finished" {
						j.Status = "extracting_audio"
					}
				})
			}

			// Call the adapter to perform the IO
			err := adapters.DownloadVideo(j.VideoID, onProgress)
			if err != nil {
				panic(err)
			}

			// Hand off
			pipe.downloadedCh <- pendingJob
		}(pendingJob)
	}
}

func (pipe *SummarizerPipeline) displayOutput() {
	for j := range pipe.summarizedCh {
		log.Printf("All steps completed succesfully for job %s\n", j.VideoID)

		j.UpdateJob(func (j *job.SummaryJob) {
      j.Status = "finished"
		})
	}
}
