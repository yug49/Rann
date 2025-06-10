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
    error Kurukshetra__GameFinishConditionNotMet();

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

    RankCategory private immutable i_rankCategory;
    uint256 private immutable i_costToInfluence;
    uint256 private immutable i_costToDefluence;
    uint256 private s_playerOneNFTId;
    uint256 private s_playerTwoNFTId;
    address private s_playersBridgeAddress;
    uint8 private s_currentRound;
    address[] private s_playerOneBetAddresses;
    mapping(address => uint256) private s_playerOneBetAmounts;
    address[] private s_playerTwoBetAddresses;
    mapping(address => uint256) private s_playerTwoBetAmounts;
    uint256 private s_playerOneInfluenceCost;
    uint256 private s_playerTwoInfluenceCost;
    uint256 private s_playerOneDefluenceCost;
    uint256 private s_playerTwoDefluenceCost;
    mapping(address => bool) private s_playersAlreadyUsedDefluenceAddresses;
    bool private s_gameInitialized;

    modifier onlyPlayersBridge() {
        if(msg.sender != s_playersBridgeAddress) {
            revert Kurukshetra__NotValidBridgeAddress();
        }
        _;
    }

    constructor(
        RankCategory _rankCategory, 
        uint256 _costToInfluence, 
        uint256 _costToDefluence
    ) Ownable(msg.sender) {
        i_rankCategory = _rankCategory;
        i_costToInfluence = _costToInfluence;
        i_costToDefluence = _costToDefluence;
    }

    function initializeGame(
        uint256 _playerOneNFTId,
        uint256 _playersTwoNFTId,
        address _playersBridgeAddress
    ) public {
        s_playerOneNFTId = _playerOneNFTId;
        s_playerTwoNFTId = _playersTwoNFTId;
        s_playersBridgeAddress = _playersBridgeAddress;
        s_gameInitialized = true;
    }

    function betOnPlayerOne(uint256 _amount) external {
        if(_amount == 0) {
            revert Kurukshetra__InvalidBetAmount();
        }
        s_playerOneBetAddresses.push(msg.sender);
        s_playerOneBetAmounts[msg.sender] += _amount;
    }

    function startRound(
        PlayerMoves[] memory _playerOneMoves,
        PlayerMoves[] memory _playerTwoMoves,
        address[] memory _playerOneInfluentialAddresses,
        address[] memory _playerTwoInfluentialAddresses,
        address[] memory _playerOneDefluentialAddresses,
        address[] memory _playerTwoDefluentialAddresses
    ) onlyPlayersBridge {
        if(s_currentRound == 0) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if(s_currentRound >= 6) finishGame();
        for(uint256 i = 0; i < (_playerOneDefluentialAddresses.length > _playerTwoDefluentialAddresses.length ? _playerOneDefluentialAddresses.length : _playerTwoDefluentialAddresses.length); i++) {
            if(s_playersAlreadyUsedDefluenceAddresses[_playerOneDefluentialAddresses[i]])
        }
    }

    function finishGame() onlyPlayersBridge public {
        if(s_currentRound < 6) {
            revert Kurukshetra__GameFinishConditionNotMet();
        }
        // Logic to determine the winner and distribute rewards
    }

    function resetGame() onlyOwner external {
        s_playerOneNFTId = 0;
        s_playerTwoNFTId = 0;
        s_playersBridgeAddress = address(0);
        s_currentRound = 0;
    }

    /* Helper Getter Functions */

    function getRankCategory() external view returns (RankCategory) {
        return i_rankCategory;
    }
}
