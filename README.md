# Community Token Airdrop

Hệ thống phân phối token ERC20 tự động cho các địa chỉ đã whitelist bằng Merkle Tree.

## Kiến trúc

- `AirdropToken.sol`: ERC20 `CAT`, mint supply ban đầu cho owner.
- `MerkleAirdrop.sol`: lưu Merkle root, xác minh proof on-chain, chống claim hai lần, bảo vệ reentrancy và cho phép owner cập nhật root.
- `scripts/build-merkle.ts`: đọc whitelist, tạo root/proof và ghi `merkle-output.json`.
- `scripts/deploy.ts`: deploy token + distributor và nạp đủ allocation.

Leaf được tạo bằng `keccak256(abi.encodePacked(account, amount))`, trong đó `amount` là số nguyên có 18 decimals.

## Cài đặt và chạy local

```bash
npm install
npm run merkle
npm test
npx hardhat node
# terminal khác
npm run deploy:local
```

Lấy proof cho một ví:

```bash
npm run claim-proof -- 0x0000000000000000000000000000000000000001
```

Sau khi deploy, chuyển proof và amount từ output vào `claim(amountWei, proof[])`. Người dùng phải gọi claim từ chính địa chỉ tương ứng với leaf.

## Deploy Sepolia

1. Sao chép `.env.example` thành `.env`, điền `PRIVATE_KEY`, `RPC_URL`.
2. Chạy `npm run merkle`.
3. Chạy `npx hardhat run scripts/deploy.ts --network sepolia`.
4. Verify contract bằng Hardhat Etherscan nếu cần.

## An toàn vận hành

- Không commit private key hoặc `.env`.
- Kiểm tra whitelist, checksum address và tổng allocation trước khi deploy.
- Chỉ nạp đúng tổng allocation; `recoverTokens` chỉ dùng để thu hồi token còn dư sau chiến dịch.
- Nếu cập nhật root, cần công bố root/proof mới cho cộng đồng.
