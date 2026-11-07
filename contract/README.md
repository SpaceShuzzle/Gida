# Gida contracts

Soroban smart contracts for Gida, written in Rust.

## Layout

- `src/lib.rs` — contract crate. Currently exposes `version`, which lets deploys
  and the frontend confirm which build is live. Milestone escrow and reputation
  entry points belong here.

## Requirements

- Rust 1.84+ (`rustup target add wasm32v1-none`)
- [`stellar-cli`](https://developers.stellar.org/docs/tools/cli) v25.2.0+

The Soroban SDK refuses plain `cargo build` for wasm on purpose: the contract
spec has to be shaken by the build system, so always build through the CLI.

## Build and test

```bash
cargo test                    # unit tests on the host target
stellar contract build        # target/wasm32v1-none/release/gida_contract.wasm
```

## Deploy

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/gida_contract.wasm \
  --source <secret-key-or-identity> \
  --network testnet
```
