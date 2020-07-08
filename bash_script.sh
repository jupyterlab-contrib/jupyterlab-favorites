#!/bin/sh 
#jupyter lab --port=8889 --NotebookApp.token=''
jupyter lab --port=8889 --NotebookApp.token='' &
child_pid=$!
pytest tests/test_folder.py
pytest tests/test_file.py
kill $child_pid