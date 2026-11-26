import { readFile, writeFile } from "node:fs/promises";
import { isAddress, parseUnits, getAddress } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

type WhitelistEntry = { address: string; amount: string };
type MerkleEntry = WhitelistEntry & { leaf: string; proof: string[] };

function leafFor(account: string, amount: bigint): Buffer {
  return Buffer.from(
    keccak256(
      Buffer.concat([
        Buffer.from(account.slice(2).toLowerCase(), "hex"),
        Buffer.from(amount.toString(16).padStart(64, "0"), "hex")
      ])
    )
  );
}

async function main(): Promise<void> {
  const inputPath = process.argv[2] ?? "data/whitelist.json";
  const outputPath = process.argv[3] ?? "merkle-output.json";
  const entries = JSON.parse(await readFile(inputPath, "utf8")) as WhitelistEntry[];

  if (entries.length === 0) throw new Error("Whitelist must contain at least one address");
  const normalized = entries.map((entry) => {
    if (!isAddress(entry.address)) throw new Error(`Invalid address: ${entry.address}`);
    const amount = parseUnits(entry.amount, 18);
    if (amount <= 0n) throw new Error(`Amount must be positive: ${entry.address}`);
    return { address: getAddress(entry.address), amount: entry.amount, amountWei: amount };
  });

  const leaves = normalized.map(({ address, amountWei }) => leafFor(address, amountWei));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const output: { root: string; totalAmount: string; entries: MerkleEntry[] } = {
    root: `0x${tree.getRoot().toString("hex")}`,
    totalAmount: normalized.reduce((sum, entry) => sum + entry.amountWei, 0n).toString(),
    entries: normalized.map(({ address, amount, amountWei }, index) => ({
      address,
      amount,
      leaf: `0x${leaves[index].toString("hex")}`,
      proof: tree.getHexProof(leaves[index])
    }))
  };

  await writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(`Merkle root: ${output.root}`);
  console.log(`Entries: ${output.entries.length}`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
