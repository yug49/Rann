// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IYodhaNFT} from "./IYodhaNFT.sol";

/**
 * @title IKurukshetraFactory - The Arena Maker Interface
 * @author Yug Agarwal
 * @dev Interface for the KurukshetraFactory contract that allows DAO to make new arenas for ranks
 */
interface IKurukshetraFactory {
    // Custom Errors
    error KurukshetraFactory__NotDAO();
    error KurukshetraFactory__InvalidAddress();
    error KurukshetraFactory__InvalidBetAmount();
    error KurukshetraFactory__InvalidCostToInfluence();
    error KurukshetraFactory__InvalidCostToDefluence();
    error KurukshetraFactory__NotArena();

    // Events
    event NewArenaCreated(
        address indexed arenaAddress,
        IYodhaNFT.Ranking indexed ranking,
        uint256 costToInfluence,
        uint256 costToDefluence,
        uint256 betAmount
    );

    // External Functions

    /**
     * @dev Creates a new arena with specified parameters
     * @param _costToInfluence The cost to influence an arena
     * @param _costToDefluence The cost to defluence an arena
     * @param _betAmount The initial bet amount for the arenas
     * @param _ranking The ranking of the arena
     * @return The address of the newly created arena
     */
    function makeNewArena(
        uint256 _costToInfluence,
        uint256 _costToDefluence,
        uint256 _betAmount,
        IYodhaNFT.Ranking _ranking
    ) external returns (address);

    /**
     * @dev Updates the winnings for a specific Yodha NFT
     * @param _yodhaNFTId The ID of the Yodha NFT
     * @param _amount The amount to add to winnings
     */
    function updateWinnings(uint256 _yodhaNFTId, uint256 _amount) external;

    // View Functions

    /**
     * @dev Returns all arena addresses
     * @return Array of arena addresses
     */
    function getArenas() external view returns (address[] memory);

    /**
     * @dev Returns the ranking of a specific arena
     * @param _arena The address of the arena
     * @return The ranking of the arena
     */
    function getArenaRanking(address _arena) external view returns (IYodhaNFT.Ranking);

    /**
     * @dev Checks if an address is a valid arena
     * @param _arena The address to check
     * @return True if the address is an arena, false otherwise
     */
    function isArenaAddress(address _arena) external view returns (bool);

    /**
     * @dev Returns the Rann token contract address
     * @return The address of the Rann token contract
     */
    function getRannTokenAddress() external view returns (address);

    /**
     * @dev Returns the Cadence architecture address
     * @return The address of the Cadence architecture
     */
    function getCadenceArch() external view returns (address);

    /**
     * @dev Returns the Yodha NFT collection address
     * @return The address of the Yodha NFT collection
     */
    function getYodhaNFTCollection() external view returns (address);
}
