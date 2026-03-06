// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {FedExEscrow} from "../src/FedExEscrow.sol";

contract Deploy is Script {
    // Arbitrum Sepolia (testnet)
    address constant USDC_ARBITRUM_SEPOLIA = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address constant RECLAIM_ARBITRUM_SEPOLIA = 0x4D1ee04EB5CeE02d4C123d4b67a86bDc7cA2E62A;

    // Arbitrum One (mainnet) — fill in when ready
    address constant USDC_ARBITRUM_ONE = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address constant RECLAIM_ARBITRUM_ONE = address(0); // update when confirmed

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deploying FedExEscrow");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        address usdcAddr;
        address reclaimAddr;

        if (block.chainid == 421614) {
            // Arbitrum Sepolia
            usdcAddr = USDC_ARBITRUM_SEPOLIA;
            reclaimAddr = RECLAIM_ARBITRUM_SEPOLIA;
            console.log("Network: Arbitrum Sepolia");
        } else if (block.chainid == 42161) {
            // Arbitrum One
            require(RECLAIM_ARBITRUM_ONE != address(0), "Reclaim mainnet address not set");
            usdcAddr = USDC_ARBITRUM_ONE;
            reclaimAddr = RECLAIM_ARBITRUM_ONE;
            console.log("Network: Arbitrum One");
        } else {
            revert("Unsupported network");
        }

        vm.startBroadcast(deployerKey);

        FedExEscrow escrow = new FedExEscrow(usdcAddr, reclaimAddr);

        vm.stopBroadcast();

        console.log("FedExEscrow deployed at:", address(escrow));
        console.log("USDC address:", usdcAddr);
        console.log("Reclaim address:", reclaimAddr);
    }
}
