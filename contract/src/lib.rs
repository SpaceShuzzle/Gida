#![no_std]

//! Gida Soroban contracts.
//!
//! The crate starts with a single entry point so deploys, the frontend and the
//! CI pipeline can confirm which build is live. Milestone escrow and reputation
//! entry points will land here.

use soroban_sdk::{contract, contractimpl, Env, String};

/// Semver of the currently deployed contract code.
#[contract]
pub struct GidaContract;

#[contractimpl]
impl GidaContract {
    /// Returns the contract version, e.g. `0.1.0`.
    pub fn version(env: Env) -> String {
        String::from_str(&env, "0.1.0")
    }
}

#[cfg(test)]
mod test {
    extern crate std;

    use super::*;

    #[test]
    fn reports_version() {
        let env = Env::default();
        let contract_id = env.register(GidaContract, ());
        let client = GidaContractClient::new(&env, &contract_id);

        assert_eq!(client.version(), String::from_str(&env, "0.1.0"));
    }
}
