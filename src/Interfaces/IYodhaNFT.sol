// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IERC721} from "../../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

/**
 * @title IYodhaNFT
 * @author Yug Agarwal, Samkit Soni
 * @notice Interface for the YodhaNFT contract
 */
interface IYodhaNFT is IERC721 {
    // Custom errors
    error YodhaNFT__NotGurukulOrDao();
    error YodhaNFT__NotDao();
    error YodhaNFT__YodhaAlreadyAtTopRank();
    error YodhaNFT__YodhaAlreadyAtBottomRank();
    error YodhaNFT__TraitsAlreadyAssigned();
    error YodhaNFT__InvalidTokenId();
    error YodhaNFT__InvalidSignature();
    error YodhaNFT__InvalidTraitsValue();

    // Enums
    enum Ranking {
        UNRANKED,
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM
    }

    // Structs
    struct Traits {
        uint16 strength;
        uint16 wit;
        uint16 charisma;
        uint16 defence;
        uint16 luck;
    }

    struct Moves {
        string strike;
        string taunt;
        string dodge;
        string special;
        string recover;
    }

    // Events
    event YodhaNFTMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event YodhaPromoted(uint256 indexed tokenId, Ranking newRanking);
    event YodhaDemoted(uint256 indexed tokenId, Ranking newRanking);
    event YodhaTraitsAndMovesAssigned(uint256 indexed tokenId);
    event YodhaTraitsUpdated(uint256 indexed tokenId);

    // Functions
    function mintNft(string memory _tokenURI) external;

    function assignTraitsAndMoves(
        uint16 _tokenId,
        uint16 _strength,
        uint16 _wit,
        uint16 _charisma,
        uint16 _defence,
        uint16 _luck,
        string memory _strike,
        string memory _taunt,
        string memory _dodge,
        string memory _special,
        string memory _recover,
        bytes memory _signedData
    ) external;

    function updateTraits(
        uint256 _tokenId,
        uint16 _strength,
        uint16 _wit,
        uint16 _charisma,
        uint16 _defence,
        uint16 _luck
    ) external;

    function promoteNFT(uint256 _tokenId) external;

    function demoteNFT(uint256 _tokenId) external;

    // View functions
    function getRanking(uint256 _tokenId) external view returns (Ranking);

    function tokenURI(uint256 _tokenId) external view returns (string memory);

    function getTraits(uint256 _tokenId) external view returns (Traits memory);

    function getMoves(uint256 _tokenId) external view returns (Moves memory);
}
