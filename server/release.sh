#! /bin/bash
name="meow-whisper-web-server"
port=15310
branch="main"
allowMethods=("stop gitpull protos dockerremove start dockerlogs")

DIR=$(cd $(dirname $0) && pwd)

gitpull() {
  echo "-> 正在拉取远程仓库"
  git reset --hard
  git pull origin $branch
}

dockerremove() {
  echo "-> 删除无用镜像"
  docker rm $(docker ps -q -f status=exited)
  docker rmi -f $(docker images | grep '<none>' | awk '{print $3}')
}

start() {
  echo "-> 正在启动「${name}」服务"
  # gitpull
  dockerremove

  echo "-> 正在准备相关资源"
  # 获取npm配置
  DIR=$(cd $(dirname $0) && pwd)
  cp -r ~/.ssh $DIR
  cp -r ~/.gitconfig $DIR

  echo "-> 准备构建Docker"
  docker build -t $name $(cat /etc/hosts | sed 's/^#.*//g' | grep '[0-9][0-9]' | tr "\t" " " | awk '{print "--add-host="$2":"$1 }' | tr '\n' ' ') . -f Dockerfile.multi
  rm -rf $DIR/.ssh
  rm -rf $DIR/.gitconfig

  echo "-> 准备运行Docker"
  docker stop $name
  docker rm $name
  docker run --name=$name $(cat /etc/hosts | sed 's/^#.*//g' | grep '[0-9][0-9]' | tr "\t" " " | awk '{print "--add-host="$2":"$1 }' | tr '\n' ' ') -p $port:$port --restart=always -d $name
}

stop() {
  docker stop $name
}

protos() {
  echo "-> 准备编译Protobuf"
  cp -r ../protos $DIR/protos_temp
  cd ./protos_temp && protoc --go_out=../protos *.proto
  
  rm -rf $DIR/protos_temp

  echo "-> 编译Protobuf成功"
}

dockerlogs() {
  docker logs -f $name
}

main() {
  if echo "${allowMethods[@]}" | grep -wq "$1"; then
    "$1"
  else
    echo "Invalid command: $1"
  fi
}

main "$1"
