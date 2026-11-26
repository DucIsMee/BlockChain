// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleAirdrop is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    bytes32 public merkleRoot;
    mapping(address account => bool claimed) public hasClaimed;

    event MerkleRootUpdated(bytes32 indexed previousRoot, bytes32 indexed newRoot);
    event Claimed(address indexed account, uint256 amount);
    event TokensRecovered(address indexed recipient, uint256 amount);

    error InvalidProof();
    error AlreadyClaimed();
    error ZeroAddress();

    constructor(IERC20 tokenAddress, bytes32 initialRoot, address initialOwner)
        Ownable(initialOwner)
    {
        if (address(tokenAddress) == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }
        token = tokenAddress;
        merkleRoot = initialRoot;
    }

    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        emit MerkleRootUpdated(merkleRoot, newRoot);
        merkleRoot = newRoot;
    }

    function claim(uint256 amount, bytes32[] calldata proof)
        external
        nonReentrant
    {
        if (hasClaimed[msg.sender]) {
            revert AlreadyClaimed();
        }

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) {
            revert InvalidProof();
        }

        hasClaimed[msg.sender] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    function recoverTokens(address recipient, uint256 amount)
        external
        onlyOwner
    {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }
        token.safeTransfer(recipient, amount);
        emit TokensRecovered(recipient, amount);
    }
}
