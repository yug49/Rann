// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Ownable} from "../../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IRannToken} from "../interfaces/IRannToken.sol";

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
contract Kurukshetra is Ownable {
    error Kurukshetra__NotValidBridgeAddress();
    error Kurukshetra__GameNotStartedYet();
    error Kurukshetra__GameFinishConditionNotMet();
    error Kurukshetra__PlayerHasAlreadyBettedOnPlayerOne();
    error Kurukshetra__GameAlreadyStarted();
    error Kurukshetra__InvalidBetAmount();
    error Kurukshetra__CanOnlyBetOnOnePlayer();
    error Kurukshetra__GameNotInitializedYet();
    error Kurukshetra__InvalidTokenAddress();
    error Kurukshetra__CostCannotBeZero();
    error Kurukshetra__InvalidRankCategory();
    error Kurukshetra__ThereShouldBeBettersOnBothSide();

    enum RankCategory {
        UNRANKED,
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM
    }

    enum PlayerMoves {
        STRIKE, // strength
        TAUNT, // charisma + wit
        DODGE, // defence
        SPECIAL, // personality + strength
        RECOVER // defence + charisma

    }

    RankCategory private immutable i_rankCategory; // Rank category of the game
    // Rank categories can be UNRANKED, BRONZE, SILVER, GOLD, PLATINUM.
    IRannToken private immutable i_rannToken; // Contract inteface of Rann Token
    uint256 private immutable i_costToInfluence; // Cost to influence a Yodha
    uint256 private immutable i_costToDefluence; // Cost to defluence a Yodha
    uint256 private s_yodhaOneNFTId; // NFT ID of Yodha One
    uint256 private s_yodhaTwoNFTId; // NFT ID of Yodha Two
    address private s_bridgeAddress; // Address of bridge contract the connects this Flow chain to NEAR chain(holding the AI agents)
    uint8 private s_currentRound; // Current Round of the game (0 when game is not started yet can be initialized, 1-5 when game is in progress)
    address[] private s_playerOneBetAddresses; // Players' addresses that have placed their bets on Yodha One
    mapping(address => uint256) private s_playerOneBetAmounts; // Bet amounts of the betters siding with Yodha One
    address[] private s_playerTwoBetAddresses; // Players' addresses that have places their bets on Yodha Two
    mapping(address => uint256) private s_playerTwoBetAmounts; // Bet amount of the betters siding with Yodha Two
    // uint256 private s_playerOneInfluenceCost;
    // uint256 private s_playerTwoInfluenceCost;
    // uint256 private s_playerOneDefluenceCost;
    // uint256 private s_playerTwoDefluenceCost;
    mapping(address => bool) private s_playersAlreadyUsedDefluenceAddresses; // Track if a player has already defluenced a Yodha in the game since a player can only defluence a Yodha once per game
    bool private s_gameInitialized; // Flag to check if the game has been initialized (not started but initialized with Yodha NFT Ids and bridge address)

    modifier onlyPlayersBridge() {
        if (msg.sender != s_bridgeAddress) {
            revert Kurukshetra__NotValidBridgeAddress();
        }
        _;
    }

    /**
     * @notice Constructor to initialize the Kurukshetra game.
     * @param _rankCategory The rank category of the game.
     * @dev Rank categories can be UNRANKED, BRONZE, SILVER, GOLD, PLATINUM.
     * @param _costToInfluence The cost to influenfce a Yodha
     * @param _costToDefluence The cost to defluence a Yodha
     * @dev Cost to influence and defluence is in Rann tokens.
     * @param _rannTokenAddress Contract address of Rann token.
     */
    constructor(
        RankCategory _rankCategory,
        uint256 _costToInfluence,
        uint256 _costToDefluence,
        address _rannTokenAddress
    ) Ownable(msg.sender) {
        if (_rannTokenAddress == address(0)) {
            revert Kurukshetra__InvalidTokenAddress();
        }
        if (_costToInfluence == 0 || _costToDefluence == 0) {
            revert Kurukshetra__CostCannotBeZero();
        }
        if (uint8(_rankCategory) > 4) revert Kurukshetra__InvalidRankCategory();
        i_rankCategory = _rankCategory;
        i_costToInfluence = _costToInfluence;
        i_costToDefluence = _costToDefluence;
        i_rannToken = IRannToken(_rannTokenAddress);
    }

    /**
     * @notice Initializes the game with the given parameters.
     * @param _yodhaOneNFTId The NFT ID of Yodha One.
     * @param _yodhaTwoNFTId The NFT ID of Yodha Two.
     * @param _bridgeAddress The address of the players' bridge.
     */
    function initializeGame(uint256 _yodhaOneNFTId, uint256 _yodhaTwoNFTId, address _bridgeAddress) public {
        s_yodhaOneNFTId = _yodhaOneNFTId;
        s_yodhaTwoNFTId = _yodhaTwoNFTId;
        s_bridgeAddress = _bridgeAddress;
        s_gameInitialized = true;
    }

    /**
     * @notice Places a bet on Yodha One.
     * @param _amount amount to bet on yodha one
     */
    function betOnYodhaOne(uint256 _amount) external {
        if (_amount == 0) {
            revert Kurukshetra__InvalidBetAmount();
        }
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_currentRound != 0) {
            revert Kurukshetra__GameAlreadyStarted();
        }
        if (s_playerOneBetAmounts[msg.sender] != 0) {
            revert Kurukshetra__PlayerHasAlreadyBettedOnPlayerOne();
        }
        if (s_playerTwoBetAmounts[msg.sender] != 0) {
            revert Kurukshetra__CanOnlyBetOnOnePlayer();
        }

        s_playerOneBetAddresses.push(msg.sender);
        s_playerOneBetAmounts[msg.sender] == _amount;
        i_rannToken.burnFrom(msg.sender, _amount);
    }

    /**
     * @notice Places a bet on Yodha Two.
     * @param _amount amount to bet on yodha two
     */
    function betOnYodhaTwo(uint256 _amount) external {
        if (_amount == 0) {
            revert Kurukshetra__InvalidBetAmount();
        }
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_currentRound != 0) {
            revert Kurukshetra__GameAlreadyStarted();
        }
        if (s_playerTwoBetAmounts[msg.sender] != 0) {
            revert Kurukshetra__PlayerHasAlreadyBettedOnPlayerOne();
        }
        if (s_playerOneBetAmounts[msg.sender] != 0) {
            revert Kurukshetra__CanOnlyBetOnOnePlayer();
        }

        s_playerTwoBetAddresses.push(msg.sender);
        s_playerTwoBetAmounts[msg.sender] = _amount;
        i_rannToken.burnFrom(msg.sender, _amount);
    }

    /**
     * @notice Starts the game.
     * @dev This function checks if there are at least better on both the sides to prevent unnecessary starting of the game
     */
    function startGame() external onlyPlayersBridge {
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotInitializedYet();
        }
        if (s_currentRound != 0) {
            revert Kurukshetra__GameAlreadyStarted();
        }
        if (s_playerTwoBetAddresses.length == 0 || s_playerOneBetAddresses.length == 0) {
            revert Kurukshetra__ThereShouldBeBettersOnBothSide();
        }
        s_currentRound = 1;
    }

    function startRound(
        PlayerMoves[] memory _playerOneMoves,
        PlayerMoves[] memory _playerTwoMoves,
        address[] memory _playerOneInfluentialAddresses,
        address[] memory _playerTwoInfluentialAddresses,
        address[] memory _playerOneDefluentialAddresses,
        address[] memory _playerTwoDefluentialAddresses
    ) external onlyPlayersBridge {
        if (!s_gameInitialized) {
            if (s_currentRound >= 6) finishGame();
        }
        for (
            uint256 i = 0;
            i
                < (
                    _playerOneDefluentialAddresses.length > _playerTwoDefluentialAddresses.length
                        ? _playerOneDefluentialAddresses.length
                        : _playerTwoDefluentialAddresses.length
                );
            i++
        ) {}
    }

    function finishGame() public onlyPlayersBridge {
        if (s_currentRound < 6) {
            revert Kurukshetra__GameFinishConditionNotMet();
        }
        // Logic to determine the winner and distribute rewards
    }

    function resetGame() external onlyOwner {
        s_yodhaOneNFTId = 0;
        s_yodhaTwoNFTId = 0;
        s_bridgeAddress = address(0);
        s_currentRound = 0;
    }

    /* Helper Getter Functions */

    function getRankCategory() external view returns (RankCategory) {
        return i_rankCategory;
    }
}
