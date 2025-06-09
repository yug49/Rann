// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Ownable} from "../../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title Kurukshetra
 * @author Yug Agarwal
 * @notice This is the core contract that mints the Arena NFTs.
 * @dev A user (Arena maker) must pass the arena attributes in the token URI.
 * @dev The arena uri must 3 characters' token ids that should match a valid character in YodhaNFT.
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
contract Kurukshetra is Ownable{
    error Kurukshetra__NotValidBridgeAddress();
    error Kurukshetra__GameNotStartedYet();

    enum RankCategory{
        UNRANKED,
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM
    }

    enum PlayerMoves{
        STRIKE,  // strength
        TAUNT,  // charisma + wit
        DODGE,   // defence
        SPECIAL, // personality + strength
        RECOVER // defence + charisma
    }

    RankCategory private immutable s_rankCategory;
    uint256 private s_playerOneNFTId;
    uint256 private s_playerTwoNFTId;
    address private s_playersBridgeAddress;
    uint8 private s_currentRound;
    address[] private s_playerOneBetAddresses;
    uint256[] private s_playerOneBetAmounts;
    address[] private s_playerTwoBetAddresses;
    uint256[] private s_playerTwoBetAmounts;
    uint256 private s_playerOneInfluenceCost;
    uint256 private s_playerTwoInfluenceCost;
    uint256 private s_playerOneDefluenceCost;
    uint256 private s_playerTwoDefluenceCost;

    modifier onlyPlayersBridge() {
        if(msg.sender != s_playersBridgeAddress) {
            revert Kurukshetra__NotValidBridgeAddress();
        }
        _;
    }

    constructor(RankCategory _rankCategory) Ownable(msg.sender) {
        s_rankCategory = _rankCategory;
    }

    function startGame(
        uint256 _playerOneNFTId,
        uint256 _playersTwoNFTId,
        address _playersBridgeAddress,
        address[] _playerOneBetAddresses,
        uint256[] _playerOneBetAmounts,
        address[] _playerTwoBetAddresses,
        uint256[] _playerTwoBetAmounts,

    ) public {
        s_playerOneNFTId = _playerOneNFTId;
        s_playerTwoNFTId = _playersTwoNFTId;
        s_playersBridgeAddress = _playersBridgeAddress;
        s_currentRound = 1;
        s_playerOneBetAddresses = _playerOneBetAddresses;
        s_playerOneBetAmounts = _playerOneBetAmounts;
        s_playerTwoBetAddresses = _playerTwoBetAddresses;
        s_playerTwoBetAmounts = _playerTwoBetAmounts;
    }

    function startRound(
        PlayerMoves[] memory _playerOneMoves,
        PlayerMoves[] memory _playerTwoMoves,
        address[] memory _playerOneInfluentialAddresses,
        address[] memory _playerTwoInfluentialAddresses
    ) {
        if(currentRound == 0) {
            revert Kurukshetra__GameNotStartedYet();
        }
        
    }



    function resetGame() onlyOwner external {
        s_playerOneNFTId = 0;
        s_playerTwoNFTId = 0;
        s_playersBridgeAddress = address(0);
        s_currentRount = 0;
    }

    /* Helper Getter Functions */

    function getRankCategory() external view returns (RankCategory) {
        return s_rankCategory;
    }
}
