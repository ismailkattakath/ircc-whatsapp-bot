{
  description = "WhatsApp bot answering Canadian immigration questions, grounded in official IRCC content via a local pgvector RAG store";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # x86_64-darwin deliberately excluded: nixpkgs-unstable (26.11) dropped
      # it entirely (Intel Mac sunset) -- pinning to an older nixpkgs just for
      # that one system isn't worth the added complexity here. The other
      # three cover every platform actually in scope today.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: {
        default = pkgs.callPackage ./nix/package.nix { };
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs
            pkgs.postgresql
          ];
          shellHook = ''
            echo "ircc-whatsapp-bot dev shell — npm install && npm start (see README for required env vars)"
          '';
        };
      });

      # `services.irccWhatsappBot` — see nix/module.nix. Consumers:
      #   inputs.ircc-whatsapp-bot.url = "github:ismailkattakath/ircc-whatsapp-bot";
      #   inputs.ircc-whatsapp-bot.inputs.nixpkgs.follows = "nixpkgs";
      #   extraHomeModules = [
      #     ircc-whatsapp-bot.homeManagerModules.default
      #     { services.irccWhatsappBot = { enable = true; allowedNumbers = [ "1..." ]; }; }
      #   ];
      homeManagerModules.default = import ./nix/module.nix;

      formatter = forAllSystems (pkgs: pkgs.nixfmt-rfc-style);
    };
}
