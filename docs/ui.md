## Development Principles

### Type System

- Use native BigInt instead of BN.js
  - Modern libraries are moving towards BigInt
  - Better performance and native JavaScript support
- Use Address type instead of PublicKey
  - Solana is moving to Address in 2.0
  - Address extends string making it easier to use in practice
  - Better TypeScript integration

## FAQ

1. Actions vs hooks
   Sometimes the declarative nature of React Hooks doesn't work for parts of your app. For those cases, you can use the actions directly
