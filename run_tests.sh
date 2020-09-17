#!/bin/sh 
jupyter lab --port=8889 --NotebookApp.token='' &
child_pid=$!
pytest
kill $child_pid
