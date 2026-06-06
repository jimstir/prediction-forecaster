async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  const ForecastMarket = await ethers.getContractFactory('ForecastMarket');
  const fm = await ForecastMarket.deploy('Test Market', 'Deployed by Hardhat script');
  await fm.deployed();
  console.log('ForecastMarket deployed to:', fm.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
