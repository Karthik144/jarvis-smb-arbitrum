// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockUSAT} from "../src/MockUSAT.sol";

contract DeployMockUSAT is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deploying MockUSAT");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        MockUSAT usat = new MockUSAT(deployer);

        // Mint 1,000,000 USAT to deployer for testing (6 decimals)
        usat.mint(deployer, 1_000_000 * 1e6);

        vm.stopBroadcast();

        console.log("MockUSAT deployed at:", address(usat));
        console.log("Initial supply minted to deployer: 1,000,000 USAT");
    }
}
