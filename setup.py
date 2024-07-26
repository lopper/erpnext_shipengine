from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in shipengine/__init__.py
from shipengine import __version__ as version

setup(
	name="shipengine",
	version=version,
	description="Integrates with Shipengine",
	author="p",
	author_email="p@p.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
