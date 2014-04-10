#!/bin/bash

echo "Checkin Node and NPM installation..."
if command -v node -v >/dev/null; then
  NODE_VERSION=`node -v`
  echo "INFO:  Node is installed version is $NODE_VERSION"
else
  echo "ERROR: Node does not installed, install it and run script again!"
  exit 1;
fi
if command -v npm -v >/dev/null; then
  NPM_VERSION=`npm -v`
  echo "INFO:  NPM is installed version is $NPM_VERSION"
else
  echo "ERROR: NPM does not installed, install it and run script again!"
  exit 1;
fi

echo "Checkin Forever installation..."
if command -v forever >/dev/null; then
  echo "INFO:  Forever is installed"
else
  read -p "WARN:  Forever is not installed, install it (y/n)?: " RESPONCE
  if [ "$RESPONCE" == "y" ]; then
    echo "Installing Forever via NPM -globally"
    npm install forever -g
  else
    echo "ERROR: Forever does not installed, install it and run script again!"
    exit 1;
  fi
fi

echo "Checkin transmission-remote installation..."
if command -v transmission-remote >/dev/null; then
  echo "INFO:  transmission-remote is installed"
else
  echo "ERROR: transmission-remote does not installed, install it and run script again!"
  exit 1;
fi

echo "Downloading app from github..."
mkdir /tmp/torrentloader
wget -P /tmp/torrentloader https://github.com/vaxann/TorrentLoader/archive/master.zip

echo "Unpackind app in /usr/bin/torrentloader/..."
mkdir /usr/bin/torrentloader
unzip /tmp/torrentloader/master.zip -d /usr/bin/torrentloader

echo "Copy config to /etc/torrentloader/config.json"
mkdir /etc/torrentloader/
mv /usr/bin/torrentloader/*.json /etc/torrentloader/

echo "Registring service..."

echo "Starting service: ..."

echo "Edit config /etc/torrentloader/config.json file and restart service"
