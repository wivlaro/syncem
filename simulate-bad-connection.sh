#!/bin/bash

BURST_CHANCE=50%
LOSS=10%
LAG=1400ms
LAG_DEVIATION=200ms


echo "Simulating packet loss:$LOSS; burst chance:$BURST_CHANCE; lag:$LAG; lag deviation:$LAG_DEVIATION"
sudo tc qdisc add dev eth0 root netem loss $LOSS $BURST_CHANCE
sudo tc qdisc link dev eth0 root netem delay $LAG $LAG_DEVIATION

trap cleanup EXIT
function cleanup() {
    echo "Disabling simulation"
    sudo tc qdisc delete dev eth0 root netem
}

echo "Press ctrl-c to exit"
cat 

