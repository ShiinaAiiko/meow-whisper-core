FROM golang:1.17-alpine as builder

ENV GO111MODULE=on
ENV GOPROXY=https://mirrors.aliyun.com/goproxy/
ENV ENV=production
ENV DOCKER_LOCALHOST=host.docker.internal

WORKDIR /meow-whisper-sfu-server

COPY . .

RUN \
go mod download && \
go build -o meow-whisper-sfu main.go

EXPOSE 15302 15303 8100

CMD ["./meow-whisper-sfu","--config","./config.pro.json"]
