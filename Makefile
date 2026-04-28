docker-build-backend:
	cd backend
	docker build -t git-monke/go-yt-sum-b:latest .

dev-backend:
	cd backend && go run main.go

dev-frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j 2 dev-backend dev-frontend
