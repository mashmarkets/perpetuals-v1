# Solana Labs Protocol Fork

This protocol is a fork of the [Solana Perpetuals](https://github.com/solana-labs/perpetuals) protocol with several key simplifications and modernizations.

## Major Changes

### Oracle Updates
- Upgraded to Pyth V2 pull-style oracles
- Push oracles are no longer supported by Pyth

### Simplified Pool Structure
- Each pool now supports only one custody (previously multiple)
- Removed functionality:
  - Pool swapping capability
  - Collateral custody concept
  - Stable and virtual custody types
  - Complex fee modes (linear and optimal)
  - Ratio calculations

### Trading Limitations
- Removed shorting capability
  - Note: Short enum still exists internally for fee calculation purposes on exit positions

## Security

The original Solana Labs protocol underwent a comprehensive security audit by Halborn. 
You can review the complete audit report [here](Solana_Labs_Perpetuals_Solana_Program_Security_Audit_Report_Halborn_Final).
