// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSAT
/// @notice Mock stablecoin for testing on Robinhood testnet.
///         Owner can mint freely; anyone can burn their own balance.
contract MockUSAT is ERC20, ERC20Permit, Ownable {
    constructor(address initialOwner)
        ERC20("USAT (mock)", "USAT")
        ERC20Permit("USAT (mock)")
        Ownable(initialOwner)
    {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens to any address. Only callable by owner.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burn tokens from caller's balance.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
