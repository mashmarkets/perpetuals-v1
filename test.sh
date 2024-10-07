#!/bin/bash
cargo test-bpf -- --nocapture
anchor test -- --features test