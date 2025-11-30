FROM rust:1.86-slim

SHELL ["bash", "-c"]

# Install system dependencies for Linera and development
# Includes wabt (wasm-strip) and binaryen (wasm-opt) for WASM optimization
RUN apt-get update && apt-get install -y \
    pkg-config \
    protobuf-compiler \
    clang \
    make \
    curl \
    git \
    wabt \
    binaryen \
    && rm -rf /var/lib/apt/lists/*

# Install Linera CLI tools
RUN cargo install --locked linera-service@0.15.5 linera-storage-service@0.15.5

# Install Node.js via nvm (LTS Krypton = Node 22)
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.40.3/install.sh | bash \
    && . ~/.nvm/nvm.sh \
    && nvm install lts/krypton \
    && npm install -g pnpm

# Add wasm32 target for Linera contracts
RUN rustup target add wasm32-unknown-unknown

WORKDIR /build

# Healthcheck: wait for frontend to be ready on port 5173
HEALTHCHECK --interval=5s --timeout=3s --start-period=60s --retries=10 \
    CMD ["curl", "-sf", "http://localhost:5173"]

ENTRYPOINT ["bash", "/build/run.bash"]
