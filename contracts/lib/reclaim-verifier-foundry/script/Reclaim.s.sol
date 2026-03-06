// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Reclaim} from "../src/Reclaim.sol";

contract ReclaimScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        Reclaim reclaim = new Reclaim();

        vm.stopBroadcast();

        console.log("Reclaim deployed at:", address(reclaim));
        console.log("Owner:", reclaim.owner());
        console.log("Current epoch:", reclaim.currentEpoch());
    }
}
