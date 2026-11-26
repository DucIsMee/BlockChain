import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

function leaf(account: string, amount: bigint): Buffer {
  return Buffer.from(
    keccak256(
      Buffer.concat([
        Buffer.from(account.slice(2).toLowerCase(), "hex"),
        Buffer.from(amount.toString(16).padStart(64, "0"), "hex")
      ])
    )
  );
}

describe("MerkleAirdrop", function () {
  it("allows a whitelisted account to claim exactly once", async function () {
    const [owner, alice, bob] = await ethers.getSigners();
    const aliceAmount = ethers.parseEther("100");
    const bobAmount = ethers.parseEther("50");
    const tree = new MerkleTree(
      [leaf(alice.address, aliceAmount), leaf(bob.address, bobAmount)],
      keccak256,
      { sortPairs: true }
    );
    const token = await (await ethers.getContractFactory("AirdropToken"))
      .deploy(ethers.parseEther("1000"), owner.address);
    const airdrop = await (await ethers.getContractFactory("MerkleAirdrop"))
      .deploy(await token.getAddress(), `0x${tree.getRoot().toString("hex")}`, owner.address);
    await token.transfer(await airdrop.getAddress(), aliceAmount + bobAmount);

    await expect(airdrop.connect(alice).claim(aliceAmount, tree.getHexProof(leaf(alice.address, aliceAmount))))
      .to.emit(airdrop, "Claimed").withArgs(alice.address, aliceAmount);
    expect(await token.balanceOf(alice.address)).to.equal(aliceAmount);
    await expect(airdrop.connect(alice).claim(aliceAmount, [])).to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
  });

  it("rejects non-whitelisted claims and permits root rotation by owner", async function () {
    const [owner, alice, outsider] = await ethers.getSigners();
    const amount = ethers.parseEther("10");
    const tree = new MerkleTree([leaf(alice.address, amount)], keccak256, { sortPairs: true });
    const token = await (await ethers.getContractFactory("AirdropToken")).deploy(ethers.parseEther("100"), owner.address);
    const airdrop = await (await ethers.getContractFactory("MerkleAirdrop"))
      .deploy(await token.getAddress(), `0x${tree.getRoot().toString("hex")}`, owner.address);
    await expect(airdrop.connect(outsider).claim(amount, tree.getHexProof(leaf(alice.address, amount))))
      .to.be.revertedWithCustomError(airdrop, "InvalidProof");
    await expect(airdrop.connect(owner).setMerkleRoot(ethers.ZeroHash)).to.emit(airdrop, "MerkleRootUpdated");
  });
});
