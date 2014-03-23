#!/bin/bash

NAME="TorrentLoader"
# NOW=$(date +"%Y-%m-%d_%H-%M-%S")
APPLICATION_DIRECTORY="/home/ivanabramenko/TorrentLoader"
APPLICATION_START=app.js
PIDFILE=/var/run/TorrentLoader.pid
LOGFILE="/home/ivanabramenko/downloads/torrents/log/TorrentLoader.log"


start() {
    echo "Starting $NAME"

    forever --pidFile $PIDFILE --sourceDir $APPLICATION_DIRECTORY \
        -a -l $LOGFILE --minUptime 5000 --spinSleepTime 2000 \
        start $APPLICATION_START &
    RETVAL=$?
}

stop() {
    if [ -f $PIDFILE ]; then
        echo "Shutting down $NAME"
        # Tell Forever to stop the process. Note that doing it this way means
        # that each application that runs as a service must have a different
        # start file name, regardless of which directory it is in.
        forever stop $APPLICATION_START
        # Get rid of the pidfile, since Forever won't do that.
        rm -f $PIDFILE
        RETVAL=$?
    else
        echo "$NAME is not running."
        RETVAL=0
    fi
}

restart() {
    echo "Restarting $NAME"
    stop
    start
}

status() {
    echo "Status for $NAME:"
    # This is taking the lazy way out on status, as it will return a list of
    # all running Forever processes. You get to figure out what you want to
    # know from that information.
    #
    # On Ubuntu, this isn't even necessary. To find out whether the service is
    # running, use "service my-application status" which bypasses this script
    # entirely provided you used the service utility to start the process.
    forever list | grep "$NAME"
    RETVAL=$?
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    restart)
        restart
        ;;
    *)
        echo "Usage: {start|stop|status|restart}"
        exit 1
        ;;
esac
exit $RETVAL
