# jupyterlab-favorites

Add the ability to save favorite folders to JupyterLab for quicker browsing


## Prerequisites

* JupyterLab
* For development, an active `conda` environment with `nodejs`

## Installation

```{bash}
# the client part
jupyter labextension install jupyterlab-favorites
# the server part
pip install jupyterlab_favorites
```

If you have problems, you might need to run this (it should be automatic though):
```{bash}
jupyter serverextension enable --py jupyterlab_favorites --sys-prefix
```

## Development: Client

For a development install, do the following in the repository directory:

```{bash}
jlpm install
jupyter labextension install . --no-build
```

To check the extension is enabled run:
```{bash}
jupyter labextension list
```

In another terminal, run:
```{bash}
jupyter lab --watch
```

To build or rebuild the package and the JupyterLab app:

```{bash}
jlpm run build
```

## Development: Server

To build the dist folder run:

```{bash}
pip install --upgrade pip setuptools wheel
pip install tqdm
pip install --user --upgrade twine
python setup.py bdist_wheel
```

Then to install the files locally run:

```{bash}
pip install dist/jupyterlab_favorites-0.1.0-py3-none-any.whl
```

To check the extension is enabled run:
```{bash}
jupyter serverextension list
```

If you have problems, you might need to run this (it should be automatic though):
```{bash}
jupyter serverextension enable --py jupyterlab_favorites --sys-prefix
```