# jupyterlab-favorites

Add the ability to save favorite folders to JupyterLab for quicker browsing


## Prerequisites

* JupyterLab

## Installation

```bash
# the client part
jupyter labextension install jupyterlab-favorites
# the server part
pip install jupyter_favorites
# enabling the server part (should be automatic, but here just in case)
# omit `--sys-prefix` if you're not using conda
jupyter serverextension enable --py jupyter_favorites --sys-prefix
```

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
npm run build
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```

