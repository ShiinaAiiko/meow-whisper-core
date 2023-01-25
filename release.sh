#! /bin/bash
name="meow-whisper"
branch="main"
allowMethods=("protos")
DIR=$(cd $(dirname $0) && pwd)

protos() {
  DIR=$(cd $(dirname $0) && pwd)
  cd $DIR/server && bash ./release.sh protos
  cd $DIR/example/simple-chat-demo && bash ./release.sh protos
}

main() {
  if echo "${allowMethods[@]}" | grep -wq "$1"; then
    "$1"
  else
    echo "Invalid command: $1"
  fi
}

main "$1"
