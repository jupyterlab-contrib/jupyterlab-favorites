# jupyterlab-favorites

Add the ability to save favorite folders to JupyterLab for quicker browsing

## Prerequisites

* JupyterLab
* For development, an active `conda` environment with `nodejs`

## Installation

```{bash}
jupyter labextension install jupyterlab-favorites
```

## Development

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

Sometimes the above command doesn't seem to catch all the necessary changes, and you might need to run those below as well.

To build or rebuild the package:

```{bash}
jlpm run build
```

To build or rebuild the lab:

```{bash}
jupyter lab build
```