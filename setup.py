from setuptools import setup, find_packages
from jupyterlab_resuse import __version__


long_description = (
    'Add the ability to save favorite folders to JupyterLab for quicker browsing.'
    'To be used in conjuction with the jupyterlab-favorites JupyterLab extension.'
)

# substitute for `jupyter serverextension enable --sys-prefix`
# Ref: https://jupyter-notebook.readthedocs.io/en/stable/examples/Notebook/Distributing%20Jupyter%20Extensions%20as%20Python%20Packages.html#setup.py
data_files = [
    ('etc/jupyter/jupyter_notebook_config.d', [
        'jupyter-config/jupyter_notebook_config.d/jupyterlab_favorites.json'
    ])
]

setup(
    name='jupyterlab_favorites',
    version=__version__,
    description='Add the ability to save favorite folders to JupyterLab for quicker browsing.',
    long_description=long_description,
    long_description_content_type='text/markdown',
    packages=find_packages(),
    include_package_data=True,
    data_files = data_files,
    author='NERSC, Trevor Slaton',
    license='BSD 3-Clause',
    url='https://github.com/tslaton/jupyterlab-favorites',
    keywords=['Jupyter', 'Jupyterlab', 'NERSC'],
    python_requires='>=3.6',
    install_requires=['notebook']
)