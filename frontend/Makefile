build-image:
	docker build -t git-monke/go-yt-sum-f:latest .

push-image:
	docker tag git-monke/go-yt-sum-f:latest gitmonke/go-yt-sum-f:latest
	docker push gitmonke/go-yt-sum-f:latest

run-image:
	docker run -p 3210:80 git-monke/go-yt-sum-f:latest 
