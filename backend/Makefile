build-image:
	docker build -t git-monke/go-yt-sum-b:latest .

push-image:
	docker tag git-monke/go-yt-sum-b:latest gitmonke/go-yt-sum-b:latest
	docker push gitmonke/go-yt-sum-b:latest

run-image:
	docker run -v "./.env:/app/.env:ro" git-monke/go-yt-sum-b:latest 
