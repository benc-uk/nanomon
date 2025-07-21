#!/bin/bash
kubectl create configmap db-init-scripts --from-file=./sql/init/nanomon_init.sql