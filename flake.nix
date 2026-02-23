{
  description = "Development environment with Oh My Zsh";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        oh-my-zsh = pkgs.oh-my-zsh;

        nvm-dir = "$ZDOTDIR/.nvm";

        zshrc = pkgs.writeText ".zshrc" ''
          export ZSH="${oh-my-zsh}/share/oh-my-zsh"

          ZSH_THEME="agnoster"

          plugins=(
            git
            docker
            kubectl
            history
            sudo
            nvm
          )

          source $ZSH/oh-my-zsh.sh

          # NVM setup
          export NVM_DIR="${nvm-dir}"
          if [ ! -d "$NVM_DIR" ]; then
            git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR"
          fi
          [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

          # Install Node 24 if not present
          if ! command -v node &> /dev/null; then
            nvm install 24
          fi

          # Install Claude Code if not present
          if ! command -v claude &> /dev/null; then
            npm install -g @anthropic-ai/claude-code
          fi
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.zsh
            oh-my-zsh
            pkgs.git
            pkgs.curl

            # Python / uv
            pkgs.uv

            # Bazel (bazelisk auto-downloads the version from .bazelversion)
            pkgs.bazelisk

            # Claude Code (installed via npm globally in shellHook)
          ];

          shellHook = ''
            export SHELL="${pkgs.zsh}/bin/zsh"
            export ZDOTDIR="$PWD/.nix-zsh"
            mkdir -p "$ZDOTDIR"

            # Alias bazelisk as bazel
            mkdir -p "$ZDOTDIR/bin"
            ln -sf ${pkgs.bazelisk}/bin/bazelisk "$ZDOTDIR/bin/bazel"
            export PATH="$ZDOTDIR/bin:$PATH"

            cp -f ${zshrc} "$ZDOTDIR/.zshrc"
            exec ${pkgs.zsh}/bin/zsh
          '';
        };
      }
    );
}
