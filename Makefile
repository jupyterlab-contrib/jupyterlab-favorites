# Makefile for Jupyterlab extensions version 1.27
# author: Stellars Henson <konrad.jelen@gmail.com>
# License: MIT Open Source License

.PHONY: build install clean uninstall publish dependencies mrproper increment_version install_dependencies check_dependencies upgrade help test
.DEFAULT_GOAL := help

# Read current version from package.json (only if node is available)
VERSION := $(shell command -v node >/dev/null 2>&1 && node -p "require('./package.json').version" || echo "0.0.0")

## increment project version
increment_version:
	@echo "Current version: $(VERSION)"
	@bash -c 'CURRENT_VERSION=$(VERSION); \
	IFS="." read -r major minor patch <<< "$$CURRENT_VERSION"; \
	NEW_PATCH=$$((patch + 1)); \
	NEW_VERSION="$$major.$$minor.$$NEW_PATCH"; \
	echo "New version: $$NEW_VERSION"; \
	sed -i "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" package.json; '

## build packages
build: clean increment_version check_dependencies
	npm install
	yarn install
	python -m build

## install package
install: build
	pip install dist/*.whl --force-reinstall

## run tests
test: check_dependencies
	jlpm test

## clean builds and installables
clean: uninstall  check_dependencies
	@command -v npm >/dev/null 2>&1 && npm run clean || true
	@command -v npm >/dev/null 2>&1 && npm run clean:labextension || true
	rm -rf dist lib || true

## uninstall package
uninstall:  check_dependencies
	pip uninstall -y dist/*.whl 2>/dev/null || true

## check if required dependencies are installed
check_dependencies:
	@echo "Checking dependencies..."
	@MISSING=""; \
	command -v node >/dev/null 2>&1 || MISSING="$$MISSING node"; \
	command -v npm >/dev/null 2>&1 || MISSING="$$MISSING npm"; \
	command -v yarn >/dev/null 2>&1 || MISSING="$$MISSING yarn"; \
	command -v twine >/dev/null 2>&1 || MISSING="$$MISSING twine"; \
	if [ -n "$$MISSING" ]; then \
		echo "Missing dependencies:$$MISSING"; \
		echo "Installing missing dependencies..."; \
		$(MAKE) install_dependencies; \
	else \
		echo "All dependencies are installed."; \
	fi

## publish package to public repository
publish: check_dependencies install
	npm publish --access public
	twine upload dist/*

## install all required build dependencies
install_dependencies:
	conda install -y nodejs yarn --update-all
	pip install twine
	npm install rimraf

## upgrade all npm and yarn dependencies
upgrade: check_dependencies
	jlpm up

## cleanup all build and metabuild artefacts
mrproper: clean uninstall
	rm -rf node_modules .yarn || true

## prints the list of available commands
help:
	@echo ""
	@echo "$$(tput bold)Available rules:$$(tput sgr0)"
	@sed -n -e "/^## / { \
		h; \
		s/.*//; \
		:doc" \
		-e "H; \
		n; \
		s/^## //; \
		t doc" \
		-e "s/:.*//; \
		G; \
		s/\\n## /---/; \
		s/\\n/ /g; \
		p; \
	}" ${MAKEFILE_LIST} \
	| LC_ALL='C' sort --ignore-case \
	| awk -F '---' \
		-v ncol=$$(tput cols) \
		-v indent=19 \
		-v col_on="$$(tput setaf 6)" \
		-v col_off="$$(tput sgr0)" \
	'{ \
		printf "%s%*s%s ", col_on, -indent, $$1, col_off; \
		n = split($$2, words, " "); \
		line_length = ncol - indent; \
		for (i = 1; i <= n; i++) { \
			line_length -= length(words[i]) + 1; \
			if (line_length <= 0) { \
				line_length = ncol - indent - length(words[i]) - 1; \
				printf "\n%*s ", -indent, " "; \
			} \
			printf "%s ", words[i]; \
		} \
		printf "\n"; \
	}' 
	@echo ""


# EOF

