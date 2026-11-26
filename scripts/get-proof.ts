import { readFile } from "node:fs/promises";
import { getAddress } from "ethers";

type Entry = { address: string; amount: string; proof: string[] };
type Output = { root: string; entries: Entry[] };

async function main(): Promise<void> {
  const address = getAddress(process.argv[2] ?? "");
  const data = JSON.parse(await readFile(process.argv[3] ?? "merkle-output.json", "utf8")) as Output;
  const entry = data.entries.find((item) => item.address === address);
  if (!entry) throw new Error(`Address is not whitelisted: ${address}`);
  console.log(JSON.stringify({ root: data.root, address, amount: entry.amount, proof: entry.proof }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
