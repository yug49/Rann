// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IYodhaNFT} from "../Interfaces/IYodhaNFT.sol";
import {IRannToken} from "../Interfaces/IRannToken.sol";

/**
 * @title Bazaar - Yodha MarketPlace
 * @author Yug Agarwal
 * @dev This contract allows users to buy and sell Yodha NFTs in a decentralized marketplace
 *
 *                          .            .                                   .#
 *                        +#####+---+###+#############+-                  -+###.
 *                        +###+++####+##-+++++##+++##++####+-.         -+###+++
 *                        +#########.-#+--+####++###- -########+---+++#####+++
 *                        +#######+#+++--+####+-..-+-.###+++########+-++###++.
 *                       +######.     +#-#####+-.-------+############+++####-
 *                      +####++...     ########-++-        +##########++++++.
 *                     -#######-+.    .########+++          -++######+++-
 *                     #++########--+-+####++++-- . ..    .-#++--+##+####.
 *                    -+++++++++#####---###---.----###+-+########..-+#++##-
 *                    ++###+++++#####-..---.. .+##++++#++#++-+--.   .-++++#
 *                   .###+.  .+#+-+###+ ..    +##+##+#++----...---.  .-+--+.
 *                   ###+---------+####+   -####+-.......    ...--++.  .---.
 *                  -#++++-----#######+-  .-+###+.... .....      .-+##-.  .
 *                  ##+++###++######++-.   .--+---++---........  ...---.  .
 *                 -####+-+#++###++-.        .--.--...-----.......--..... .
 *                 +######+++###+--..---.....  ...---------------.. .. .  .
 *                .-#########+#+++--++--------......----++--.--.  .--+---.
 *                 -+++########++--++++----------------------.--+++--+++--
 *            .######-.-++++###+----------------------..---++--++-+++---..
 *            -##########-------+-----------------------+-++-++----..----+----+#####++--..
 *            -#############+..  ..--..----------.....-+++++++++++++++++##################+.
 *            --+++++#########+-   . ....  ....... -+++++++++++++++++++############-.----+##-
 *            -----....-+#######+-             .. -+++++++++++++++++++++##+######+.       +++.
 *            --------.....---+#####+--......----.+++++++++++++++++++++##+-+++##+.        -++-
 *            -------...   .--++++++---.....-----.+++++++++++++++++++++++. -+++##-        .---
 *            #################+--.....-------.  .+++++++++++++++++++++-       -+-.       .---
 *            +#########++++-.. .......-+--..--++-++++++++++++++++++++-         .-... ....----
 *            -#####++---..   .--       -+++-.  ..+++++++++++++++++++--        .-+-......-+---
 *            +####+---...    -+#-   .  --++++-. .+++++++++++++++++++---        --        -+--
 *            ++++++++++--....-++.--++--.--+++++-.+++++++++++++++++++---. .......         ----
 *           .--++#########++-.--.+++++--++++###+-++++++++++++++++++++----   .-++-        ----
 *            .-+#############+-.++#+-+-++#######-++++++++++++++++++++----   -++++-      ..---
 *           .---+############+.+###++--++#####++-+++++++++++++++++++++-------++++-........-+-
 *            --+-+##########-+######+++++-++++++-++++++++++++++++++++++-----.----.......---+-
 *           .--+---#######..+#######+++++++--+++-+++++++++++++++++++++++-----------------+++-
 *           .++--..-+##-.-########+++++---++ .+-.+++++++++++++++++++++++++++++++++++---+++++-
 *           -+++. ..-..-+#########++-++--..--....+++++++++++++++++++++++++++++++++++++++++++-
 *           -++-......-+++############++++----- .+++++++++++++++++++++++++++++++++++++++++++-
 *           +##-.....---+#######+####+####+--++-.+++++++++++++++++++++++++++++++++++++++++++-
 *          .#+++-...-++######++-+-----..----++##-+++++++++++++++++++++++++++++++++++++++++++-
 *          .+++--------+##----+------+-..----+++-+++++++++++++++++++++++++++++++++++++++++++-
 *           ----.-----+++-+-...------++-----...--+++++++++++++++++++++++++++++++++++++++++++-
 *          .-..-.--.----..--.... ....++--.  ....-+++++++++++++++++++++++++++++++++++++++++++-
 *           -----------.---..--..   ..+.  . ... .+++++++++++++++++++++++++++++++++++++++++++-
 *         .+#+#+---####+-.    .....--...   .    .+++++++++++++++++++++++++++++++++++++++++++-
 *         -+++++#++++++++.    ..-...--.. ..     .+++++++++++++++++++++++++++++++++++++++++++-
 *         ++++++-------++--   . ....--.. . . .. .+++++++++++++++++++++++++-+----------...
 *         -++++--++++.------......-- ...  ..  . .---------------...
 *         -++-+####+++---..-.........
 *           .....
 */
contract Bazaar {
    error Bazaar__Locked();
    error Bazaar__NotOwnerOfYodha();
    error Bazaar__InvalidPrice();
    error Bazaar__AlreadyOnSale();
    error Bazaar__NotOnSale();

    enum LockStatus {
        UNLOCKED,
        LOCKED
    }

    IYodhaNFT public immutable i_yodhaNFT;
    IRannToken public immutable i_rannToken;
    LockStatus private s_lockStatus;
    uint256[] private s_tokenIdsOnSale;
    mapping(uint256 => address) public s_tokenIdToOwner;
    mapping(uint256 => uint256) public s_tokenIdToPrice;

    /**
     * @notice Modifier to lock the contract for critical operations
     * @dev This prevents re-entrancy attacks by ensuring that certain functions cannot be called while the lock is active
     */
    modifier lock() {
        if (s_lockStatus == LockStatus.LOCKED) {
            revert Bazaar__Locked();
        }
        s_lockStatus = LockStatus.LOCKED;
        _;
        s_lockStatus = LockStatus.UNLOCKED;
    }

    /**
     * @notice Constructor to initialize the Bazaar contract with YodhaNFT and RannToken addresses
     * @param _yodhaNFT Address of the YodhaNFT contract
     * @param _rannToken Address of the RannToken contract
     */
    constructor(address _yodhaNFT, address _rannToken) {
        i_yodhaNFT = IYodhaNFT(_yodhaNFT);
        i_rannToken = IRannToken(_rannToken);
        s_lockStatus = LockStatus.UNLOCKED;
    }

    /**
     * @notice Puts a Yodha NFT up for sale
     * @param _tokenId The ID of the Yodha NFT to be put on sale
     * @param _price The price at which the Yodha NFT is being sold
     * @dev This function transfers the Yodha NFT from the owner to the Bazaar contract and marks it as on sale
     * @dev This function assumes that the owner has already approved the Bazaar contract to transfer the Yodha NFT
     */
    function putYourYodhaForSale(uint256 _tokenId, uint256 _price) external lock {
        if (i_yodhaNFT.ownerOf(_tokenId) != msg.sender) {
            revert Bazaar__NotOwnerOfYodha();
        }
        if (_price == 0) {
            revert Bazaar__InvalidPrice();
        }

        s_tokenIdsOnSale.push(_tokenId);
        s_tokenIdToOwner[_tokenId] = msg.sender;
        s_tokenIdToPrice[_tokenId] = _price;
        i_yodhaNFT.transferFrom(msg.sender, address(this), _tokenId);
    }

    /**
     * @notice Allows a user to buy a Yodha NFT that is on sale
     * @param _tokenId The ID of the Yodha NFT to be purchased
     * @dev This function transfers the Rann tokens from the buyer to the seller and completes the sale
     * @dev This function assumes that the buyer has already approved the Bazaar contract to spend the required amount of Rann tokens
     */
    function buyYodha(uint256 _tokenId) external lock {
        if (s_tokenIdToOwner[_tokenId] == address(0)) {
            revert Bazaar__NotOnSale();
        }

        i_rannToken.transferFrom(msg.sender, s_tokenIdToOwner[_tokenId], s_tokenIdToPrice[_tokenId]);

        s_tokenIdToOwner[_tokenId] = address(0);
        s_tokenIdToPrice[_tokenId] = 0;

        for (uint256 i = 0; i < s_tokenIdsOnSale.length; i++) {
            if (s_tokenIdsOnSale[i] == _tokenId) {
                // Remove the tokenId from the on-sale list
                s_tokenIdsOnSale[i] = s_tokenIdsOnSale[s_tokenIdsOnSale.length - 1];
                s_tokenIdsOnSale.pop();
                break;
            }
        }

        i_yodhaNFT.transferFrom(address(this), msg.sender, _tokenId);
    }

    /**
     * @notice Allows the owner of a Yodha NFT to retrieve it from sale
     * @param _tokenId The ID of the Yodha NFT to be retrieved
     * @dev This function checks if the caller is the owner and if the Yodha NFT is on sale before allowing retrieval
     */
    function retrieveYodhaOnSale(uint256 _tokenId) external lock {
        if (s_tokenIdToOwner[_tokenId] != msg.sender) {
            revert Bazaar__NotOwnerOfYodha();
        }
        if (s_tokenIdToPrice[_tokenId] == 0) {
            revert Bazaar__NotOnSale();
        }

        s_tokenIdToOwner[_tokenId] = address(0);
        s_tokenIdToPrice[_tokenId] = 0;
        for (uint256 i = 0; i < s_tokenIdsOnSale.length; i++) {
            if (s_tokenIdsOnSale[i] == _tokenId) {
                s_tokenIdsOnSale[i] = s_tokenIdsOnSale[s_tokenIdsOnSale.length - 1];
                s_tokenIdsOnSale.pop();
                break;
            }
        }

        i_yodhaNFT.transferFrom(address(this), msg.sender, _tokenId);
    }

    /**
     * @notice Allows the owner of a Yodha NFT to change its sale price
     * @param _tokenId The ID of the Yodha NFT whose price is to be changed
     * @param _newPrice The new price to set for the Yodha NFT
     * @dev This function checks if the caller is the owner and if the Yodha NFT is on sale before allowing price change
     */
    function changePriceOfYodhaAlreadyOnSale(uint256 _tokenId, uint256 _newPrice) external lock {
        if (s_tokenIdToOwner[_tokenId] != msg.sender) {
            revert Bazaar__NotOwnerOfYodha();
        }
        if (_newPrice == 0) {
            revert Bazaar__InvalidPrice();
        }
        if (s_tokenIdToPrice[_tokenId] == 0) {
            revert Bazaar__NotOnSale();
        }

        s_tokenIdToPrice[_tokenId] = _newPrice;
    }

    /* Helper Getter Functions */

    function getYodhaIdsOnSale() external view returns (uint256[] memory) {
        return s_tokenIdsOnSale;
    }

    function getYodhaOwner(uint256 _tokenId) external view returns (address) {
        return s_tokenIdToOwner[_tokenId];
    }

    function getYodhaPrice(uint256 _tokenId) external view returns (uint256) {
        return s_tokenIdToPrice[_tokenId];
    }

    function isYodhaOnSale(uint256 _tokenId) external view returns (bool) {
        return s_tokenIdToOwner[_tokenId] != address(0);
    }
}
