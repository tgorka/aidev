# =============================================================================
# PROJECT Devcontainer
# Base: Debian Trixie + Node.js 25
# Purpose: AI based project developlemt
# =============================================================================

FROM node:25-trixie

ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=${USER_UID}

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------------
# System packages
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core utilities
    ca-certificates \
    curl \
    wget \
    unzip \
    less \
    vim \
    tree \
    htop \
    gnupg \
    lsb-release \
    sudo \
    # Version control
    git \
    git-lfs \
    # SSH (for Proxmox / VM management)
    openssh-client \
    # HTTP tools
    httpie \
    # JSON / YAML processing
    jq \
    # Search & find
    ripgrep \
    fd-find \
    fzf \
    # Syntax-highlighted cat
    bat \
    # Per-directory env vars
    direnv \
    # Python (useful for some Pulumi providers / scripting)
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# NOTE: Docker CLI is installed via the docker-outside-of-docker devcontainer
# feature in devcontainer.json (handles CLI + socket permissions automatically)

# ---------------------------------------------------------------------------
# GitHub CLI (gh)
# ---------------------------------------------------------------------------
RUN (type -p wget >/dev/null || apt-get install -y wget) \
    && mkdir -p -m 755 /etc/apt/keyrings \
    && out=$(mktemp) \
    && wget -nv -O "$out" https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    && cat "$out" | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] \
       https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# yq (YAML processor)
# ---------------------------------------------------------------------------
RUN YQ_VERSION=$(curl -sL https://api.github.com/repos/mikefarah/yq/releases/latest | jq -r '.tag_name') \
    && curl -fsSL "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_$(dpkg --print-architecture)" \
       -o /usr/local/bin/yq \
    && chmod +x /usr/local/bin/yq

# ---------------------------------------------------------------------------
# Ensure the node user can sudo and owns home
# ---------------------------------------------------------------------------
RUN echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME} \
    && mkdir -p /home/${USERNAME}/.local/bin \
    && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}

# Switch to non-root user for remaining installs
USER ${USERNAME}
ENV HOME=/home/${USERNAME}
ENV PATH="${HOME}/.local/bin:${HOME}/.bun/bin:${HOME}/.pulumi/bin:${PATH}"

# ---------------------------------------------------------------------------
# Bun (JS runtime + package manager)
# ---------------------------------------------------------------------------
RUN curl -fsSL https://bun.sh/install | bash

# ---------------------------------------------------------------------------
# Graphite CLI (gt) - stacked PRs
# ---------------------------------------------------------------------------
RUN bun add -g @withgraphite/graphite-cli

# ---------------------------------------------------------------------------
# TypeScript (global)
# ---------------------------------------------------------------------------
RUN bun add -g typescript

# ---------------------------------------------------------------------------
# Cursor CLI (AI coding agent)
# ---------------------------------------------------------------------------
RUN curl -fsSL https://cursor.com/install | bash

# ---------------------------------------------------------------------------
# OpenCode CLI (AI coding agent)
# ---------------------------------------------------------------------------
RUN bun add -g opencode-ai

# ---------------------------------------------------------------------------
# direnv hook (auto-load .envrc files)
# ---------------------------------------------------------------------------
RUN echo 'eval "$(direnv hook bash)"' >> "${HOME}/.bashrc" \
    && echo 'eval "$(direnv hook zsh)"' >> "${HOME}/.zshrc" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Shell configuration
# ---------------------------------------------------------------------------
RUN echo '\n# PROJECT devcontainer paths' >> "${HOME}/.bashrc" \
    && echo 'export PATH="${HOME}/.local/bin:${HOME}/.bun/bin:${HOME}/.pulumi/bin:${PATH}"' >> "${HOME}/.bashrc" \
    && echo '' >> "${HOME}/.bashrc" \
    && echo '# Git-aware prompt' >> "${HOME}/.bashrc" \
    && echo 'source /usr/lib/git-core/git-sh-prompt 2>/dev/null || true' >> "${HOME}/.bashrc" \
    && echo 'export GIT_PS1_SHOWDIRTYSTATE=1' >> "${HOME}/.bashrc" \
    && echo 'export GIT_PS1_SHOWSTASHSTATE=1' >> "${HOME}/.bashrc" \
    && echo 'export GIT_PS1_SHOWUNTRACKEDFILES=1' >> "${HOME}/.bashrc" \
    && echo "export PS1='\\[\\e[1;32m\\]\\u\\[\\e[0m\\]:\\[\\e[1;34m\\]\\w\\[\\e[0;33m\\]\$(__git_ps1 \" (%s)\" 2>/dev/null)\\[\\e[0m\\] \\$ '" >> "${HOME}/.bashrc"

WORKDIR /workspace

# Reset to avoid issues with downstream commands
ENV DEBIAN_FRONTEND=
