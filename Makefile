run:
	gofmt -s -w .
	go vet ./...
	go run *.go
