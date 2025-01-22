
FROM denoland/deno:debian-2.1.1

SHELL ["/bin/bash", "-c"]
# This is a workaround to get playwright to install so we can use stagehand
RUN deno init dummy-project
WORKDIR /dummy-project
RUN deno add --allow-scripts npm:@playwright/test@1.42.1 && deno run -A npm:playwright install
# Add chromium
RUN apt-get update && apt-get install -y chromium
ENV CHROME_PATH=/usr/bin/chromium

RUN apt-get install -y curl

WORKDIR /app
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

RUN source $HOME/.local/bin/env && uv venv --seed cache/python-venv --python 3.13 && source cache/python-venv/bin/activate && uv pip install pipreqs && uv tool install ruff

RUN ls $HOME/.cache/ms-playwright


ENTRYPOINT ["/tini", "--"]
