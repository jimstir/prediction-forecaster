/** Hardhat config generated for prediction-forecaster project */
require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'cancun',
      viaIR: true
    }
  },
  networks: {
    hardhat: {},
    localhost: { url: 'http://127.0.0.1:8545' }
  }
};
