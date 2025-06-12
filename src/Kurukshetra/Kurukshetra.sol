// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Ownable} from "../../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IRannToken} from "../interfaces/IRannToken.sol";
import {ECDSA} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";

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
    error Kurukshetra__LastBattleIsStillGoingOn();
    error Kurukshetra__BattleIsCurrentlyOngoingCannotInfluenceOrDefluence();
    error Kurukshetra__PlayerAlreadyUsedDefluence();
    error Kurukshetra__BettingPeriodStillGoingOn();
    error Kurukshetra__BattleRoundIntervalPeriodIsStillGoingOn();
    error Kurukshetra__GameAlreadyInitialized();
    error Kurukshetra__YodhaIdsCannotBeSame();
    error Kurukshetra__InvalidSignature();



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
    address private immutable i_nearAiPublicKey; // Public key of the ai that selects the next moves of the yodhas
    uint256 private s_totalInfluencePointsOfYodhaOneForNextRound;
    uint256 private s_totalDefluencePointsOfYodhaOneForNextRound;
    uint256 private s_totalInfluencePointsOfYodhaTwoForNextRound;
    uint256 private s_totalDefluencePointsOfYodhaTwoForNextRound;
    uint256 private s_yodhaOneNFTId; // NFT ID of Yodha One
    uint256 private s_yodhaTwoNFTId; // NFT ID of Yodha Two
    // address private s_bridgeAddress; // Address of bridge contract the connects this Flow chain to NEAR chain(holding the AI agents)
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
    bool private s_isBattleOngoing;
    uint256 private s_gameInitializedAt;
    uint256 private s_lastRoundEndedAt;

    uint8 private constant MIN_YODHA_BETTING_PERIOD = 60;
    uint8 private constant MIN_BATTLE_ROUNDS_INTERVAL = 30;


    // modifier onlyPlayersBridge() {
    //     if (msg.sender != s_bridgeAddress) {
    //         revert Kurukshetra__NotValidBridgeAddress();
    //     }
    //     _;
    // }

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
        address _rannTokenAddress,
        address _nearAiPublicKey
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
        i_nearAiPublicKey = _nearAiPublicKey;
    }

    /**
     * @notice Initializes the game with the given parameters.
     * @param _yodhaOneNFTId The NFT ID of Yodha One.
     * @param _yodhaTwoNFTId The NFT ID of Yodha Two.
     */
    function initializeGame(uint256 _yodhaOneNFTId, uint256 _yodhaTwoNFTId) public {
        if (s_gameInitialized) {
            revert Kurukshetra__GameAlreadyInitialized();
        }
        if (_yodhaOneNFTId == 0 || _yodhaTwoNFTId == 0) {
            revert Kurukshetra__InvalidTokenAddress();
        }
        if (_yodhaOneNFTId == _yodhaTwoNFTId) {
            revert Kurukshetra__YodhaIdsCannotBeSame();
        }

        s_yodhaOneNFTId = _yodhaOneNFTId;
        s_yodhaTwoNFTId = _yodhaTwoNFTId;
        s_gameInitialized = true;
        s_gameInitializedAt = block.timestamp;
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
        i_rannToken.transferFrom(msg.sender, address(this), _amount);
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
        i_rannToken.transferFrom(msg.sender, address(this), _amount);
    }

    /**
     * @notice Starts the game.
     * @dev This function checks if there are at least better on both the sides to prevent unnecessary starting of the game
     */
    function startGame() external {
        if (block.timestamp < MIN_YODHA_BETTING_PERIOD + s_gameInitializedAt) revert Kurukshetra__BettingPeriodStillGoingOn();
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
        s_lastRoundEndedAt = block.timestamp;
    }

    /**
     * @notice Allows players to influence Yodha One.
     */
    function influenceYodhaOne() external {
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotInitializedYet();
        }
        if (s_currentRound == 0 || s_currentRound >= 6) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_isBattleOngoing) revert Kurukshetra__BattleIsCurrentlyOngoingCannotInfluenceOrDefluence();

        i_rannToken.transferFrom(msg.sender, address(this), i_costToInfluence);
        s_totalInfluencePointsOfYodhaOneForNextRound++;
    }

    /**
     * @notice Allows players to defluence Yodha One.
     */
    function defluenceYodhaOne() external {
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotInitializedYet();
        }
        if (s_currentRound == 0 || s_currentRound >= 6) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_isBattleOngoing) revert Kurukshetra__BattleIsCurrentlyOngoingCannotInfluenceOrDefluence();
        if (s_playersAlreadyUsedDefluenceAddresses[msg.sender]) revert Kurukshetra__PlayerAlreadyUsedDefluence();

        i_rannToken.transferFrom(msg.sender, address(this), i_costToDefluence);
        s_totalDefluencePointsOfYodhaOneForNextRound++;
    }

    /**
     * @notice Allows players to influence Yodha Two.
     */
    function influenceYodhaTwo() external {
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotInitializedYet();
        }
        if (s_currentRound == 0 || s_currentRound >= 6) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_isBattleOngoing) revert Kurukshetra__BattleIsCurrentlyOngoingCannotInfluenceOrDefluence();

        i_rannToken.transferFrom(msg.sender, address(this), i_costToInfluence);
        s_totalInfluencePointsOfYodhaTwoForNextRound++;
    }

    /**
     * @notice Allows players to defluence Yodha Two.
     */
    function defluenceYodhaTwo() external {
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotInitializedYet();
        }
        if (s_currentRound == 0 || s_currentRound >= 6) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_isBattleOngoing) revert Kurukshetra__BattleIsCurrentlyOngoingCannotInfluenceOrDefluence();
        if (s_playersAlreadyUsedDefluenceAddresses[msg.sender]) revert Kurukshetra__PlayerAlreadyUsedDefluence();

        i_rannToken.transferFrom(msg.sender, address(this), i_costToDefluence);
        s_totalDefluencePointsOfYodhaTwoForNextRound++;
    }

    function battle(
        PlayerMoves _playerOneMoves,
        PlayerMoves _playerTwoMoves,
        bytes memory _signedData
    ) external {
        if (block.timestamp < s_lastRoundEndedAt + MIN_BATTLE_ROUNDS_INTERVAL) {
            revert Kurukshetra__BattleRoundIntervalPeriodIsStillGoingOn();
        }
        if (s_isBattleOngoing) {
            revert Kurukshetra__LastBattleIsStillGoingOn();
        }
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotInitializedYet();
        }
        if (s_currentRound == 0) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_playerTwoBetAddresses.length == 0 || s_playerOneBetAddresses.length == 0) {
            revert Kurukshetra__ThereShouldBeBettersOnBothSide();
        }
        bytes32 dataHash = keccak256(
            abi.encodePacked(
                _playerOneMoves, _playerTwoMoves
            )
        );
        if (s_currentRound >= 6) finishGame();
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        address recovered = ECDSA.recover(ethSignedMessage, _signedData);
        if (recovered != i_nearAiPublicKey) {
            revert Kurukshetra__InvalidSignature();
        }

        s_isBattleOngoing = true;

        //Logic to detemine the winner of the battle
    }

    function finishGame() public {
        if (s_currentRound < 6) {
            revert Kurukshetra__GameFinishConditionNotMet();
        }
        // Logic to determine the winner and distribute rewards
    }

    function resetGame() external onlyOwner {
        s_yodhaOneNFTId = 0;
        s_yodhaTwoNFTId = 0;
        s_currentRound = 0;
    }

    /* Helper Getter Functions */

    function getRankCategory() external view returns (RankCategory) {
        return i_rankCategory;
    }
}
