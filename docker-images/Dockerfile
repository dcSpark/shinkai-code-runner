
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

RUN groupadd -r shinkai-code-runner-user && useradd -r -g shinkai-code-runner-user -G audio,video shinkai-code-runner-user \
    && mkdir -p /home/shinkai-code-runner-user/Downloads \
    && chown -R shinkai-code-runner-user:shinkai-code-runner-user /home/shinkai-code-runner-user

# Run everything after as non-privileged user.
USER shinkai-code-runner-user

ENV HOME=/home/shinkai-code-runner-user

WORKDIR /app

RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="${HOME}/.local/bin:${PATH}"
RUN uv python install 3.8 3.9 3.10 3.11 3.12 3.13 3.14
RUN source $HOME/.local/bin/env && uv venv --seed cache/python-venv --python 3.13 && source cache/python-venv/bin/activate && uv pip install pipreqs && uv tool install ruff

ENTRYPOINT ["/tini", "--"]
