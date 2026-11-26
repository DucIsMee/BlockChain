import { readFile } from "node:fs/promises";
import { ethers } from "hardhat";

type MerkleOutput = { root: string; totalAmount: string };

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const merkle = JSON.parse(await readFile("merkle-output.json", "utf8")) as MerkleOutput;
  const tokenFactory = await ethers.getContractFactory("AirdropToken");
  const token = await tokenFactory.deploy(ethers.parseUnits("1000000", 18), deployer.address);
  await token.waitForDeployment();

  const airdropFactory = await ethers.getContractFactory("MerkleAirdrop");
  const airdrop = await airdropFactory.deploy(await token.getAddress(), merkle.root, deployer.address);
  await airdrop.waitForDeployment();

  // build-merkle stores totalAmount in the token's smallest unit (wei).
  const funding = BigInt(merkle.totalAmount);
  await (await token.transfer(await airdrop.getAddress(), funding)).wait();
  console.log(`Token: ${await token.getAddress()}`);
  console.log(`Airdrop: ${await airdrop.getAddress()}`);
  console.log(`Root: ${merkle.root}`);
  console.log(`Funded: ${funding.toString()} wei`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
