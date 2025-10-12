![Main Screenshot](./MainScreenshot.png)

# Go Youtube Summarizer

A YouTube Summarizer built with Go. 

Uses yt-dlp and groq for fast, local summarization with better results. Pay only for what you use and nothing more.

# Installation

This project is meant to be run in a Docker container.

First, clone .env.docker.example into .env.docker and update it to use your groq api key. 
Then run 

```docker compose up -d``` 

To run the summarizer. You can then access the frontend on port 3210.

You can also build and run the backend, then install the dependencies for the frontend and run it in development mode.
*If you do it this way, make sure you place the .env.docker.example file as just a .env file in the backend directory.* 

The Docker image is strongly recommended, as it comes with everything pre-installed, pre-built, and pre-configured. So it's lightning fast and saves you a setup headache.

