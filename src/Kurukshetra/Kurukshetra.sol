// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Ownable} from "../../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IRannToken} from "../interfaces/IRannToken.sol";
import {ECDSA} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";
import {IYodhaNFT} from "../Interfaces/IYodhaNFT.sol";
import {IKurukshetraFactory} from "../Interfaces/IKurukshetraFactory.sol";

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
contract Kurukshetra {
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
    error Kurukshetra__Locked();
    error Kurukshetra__InvalidAddress();

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

    // enum LockStatus {
    //     UNLOCKED,
    //     LOCKED
    // }

    IYodhaNFT.Ranking immutable i_rankCategory;
    // Rank categories can be UNRANKED, BRONZE, SILVER, GOLD, PLATINUM.
    IRannToken private immutable i_rannToken; // Contract inteface of Rann Token
    address private immutable i_kurukshetraFactory;
    // LockStatus private s_lockStatus; // Retrency lock status of the game
    address private immutable i_cadenceArch; // contract address of cadence arch to generate the random number using flow's vrf
    uint256 private immutable i_costToInfluence; // Cost to influence a Yodha
    uint256 private immutable i_costToDefluence; // Cost to defluence a Yodha
    address private immutable i_nearAiPublicKey; // Public key of the ai that selects the next moves of the yodhas
    address private immutable i_yodhaNFTCollection; // Address of the Yodha NFT collection contract
    uint256 private immutable i_betAmount; // Amount to be betted by the players on Yodha One and Yodha Two
    uint256 private s_totalInfluencePointsOfYodhaOneForNextRound;
    uint256 private s_totalDefluencePointsOfYodhaOneForNextRound;
    uint256 private s_totalInfluencePointsOfYodhaTwoForNextRound;
    uint256 private s_totalDefluencePointsOfYodhaTwoForNextRound;
    uint256 private s_yodhaOneNFTId; // NFT ID of Yodha One
    uint256 private s_yodhaTwoNFTId; // NFT ID of Yodha Two
    // address private s_bridgeAddress; // Address of bridge contract the connects this Flow chain to NEAR chain(holding the AI agents)
    uint8 private s_currentRound; // Current Round of the game (0 when game is not started yet can be initialized, 1-5 when game is in progress)
    address[] private s_playerOneBetAddresses; // Players' addresses that have placed their bets on Yodha One
    // mapping(address => uint256) private s_playerOneBetAmounts; // Bet amounts of the betters siding with Yodha One
    address[] private s_playerTwoBetAddresses; // Players' addresses that have places their bets on Yodha Two
    // mapping(address => uint256) private s_playerTwoBetAmounts; // Bet amount of the betters siding with Yodha Two
    // uint256 private s_playerOneInfluenceCost;
    // uint256 private s_playerTwoInfluenceCost;
    // uint256 private s_playerOneDefluenceCost;
    // uint256 private s_playerTwoDefluenceCost;
    mapping(address => bool) private s_playersAlreadyUsedDefluenceAddresses; // Track if a player has already defluenced a Yodha in the game since a player can only defluence a Yodha once per game
    bool private s_gameInitialized; // Flag to check if the game has been initialized (not started but initialized with Yodha NFT Ids and bridge address)
    bool private s_isBattleOngoing; // flog to check if the battle round is currently ongoing
    // bool private s_isCalculatingWinner; // Flag to check if the winner is being calculated
    uint256 private s_gameInitializedAt;
    uint256 private s_lastRoundEndedAt;
    uint256 private s_damageOnYodhaOne; // To keep track of damage of Yodha one during the game
    uint256 private s_damageOnYodhaTwo; // To keep track of damage of yodha two during the game

    uint8 private constant MIN_YODHA_BETTING_PERIOD = 60;
    uint8 private constant MIN_BATTLE_ROUNDS_INTERVAL = 30;
    uint8 private constant YODHA_ONE_CUT = 5; // 5 % of the total bet amounts

    /**
     * @notice Constructor to initialize the Kurukshetra game.
     * @dev Rank categories can be UNRANKED, BRONZE, SILVER, GOLD, PLATINUM.
     * @param _costToInfluence The cost to influenfce a Yodha
     * @param _costToDefluence The cost to defluence a Yodha
     * @dev Cost to influence and defluence is in Rann tokens.
     * @param _rannTokenAddress Contract address of Rann token.
     */
    constructor(
        uint256 _costToInfluence,
        uint256 _costToDefluence,
        address _rannTokenAddress,
        address _nearAiPublicKey,
        address _cadenceArch,
        address _yodhaNFTCollection,
        uint256 _betAmount,
        IYodhaNFT.Ranking _rankCategory
    ) {
        if (_rannTokenAddress == address(0)) {
            revert Kurukshetra__InvalidTokenAddress();
        }
        if (_costToInfluence == 0 || _costToDefluence == 0) {
            revert Kurukshetra__CostCannotBeZero();
        }
        if (_nearAiPublicKey == address(0)) {
            revert Kurukshetra__InvalidAddress();
        }
        if (_cadenceArch == address(0)) {
            revert Kurukshetra__InvalidAddress();
        }
        if (_yodhaNFTCollection == address(0)) {
            revert Kurukshetra__InvalidAddress();
        }
        if (_betAmount == 0) {
            revert Kurukshetra__InvalidBetAmount();
        }

        i_costToInfluence = _costToInfluence;
        i_costToDefluence = _costToDefluence;
        i_rannToken = IRannToken(_rannTokenAddress);
        i_nearAiPublicKey = _nearAiPublicKey;
        i_cadenceArch = _cadenceArch;
        i_yodhaNFTCollection = _yodhaNFTCollection;
        i_betAmount = _betAmount;
        i_rankCategory = _rankCategory;
        i_kurukshetraFactory = msg.sender;

        // s_lockStatus = LockStatus.UNLOCKED; // Initialize the lock status to unlocked
    }

    event GameInitialized(
        uint256 indexed yodhaOneNFTId, uint256 indexed yodhaTwoNFTId, uint256 indexed gameInitializedAt
    );

    event BetPlacedOnYodhaOne(address indexed player, uint256 indexed multiplier, uint256 indexed betAmount);

    event BetPlacedOnYodhaTwo(address indexed player, uint256 indexed multiplier, uint256 indexed betAmount);

    event GameStarted(uint256 indexed gameStartedAt);

    event GameFinished(
        uint256 indexed yodhaOneNFTId,
        uint256 indexed yodhaTwoNFTId,
        uint256 indexed damageOnYodhaOne,
        uint256 damageOnYodhaTwo
    );

    event YodhaOneInfluenced(address indexed player, uint256 indexed yodhaNFTId, uint256 indexed currentRound);

    event YodhaTwoInfluenced(address indexed player, uint256 indexed yodhaNFTId, uint256 indexed currentRound);

    event YodhaOneDefluenced(address indexed player, uint256 indexed yodhaNFTId, uint256 indexed currentRound);

    event YodhaTwoDefluenced(address indexed player, uint256 indexed yodhaNFTId, uint256 indexed currentRound);

    event RoundOver(
        uint256 indexed roundNumber,
        uint256 indexed yodhaOneNFTId,
        uint256 indexed yodhaTwoNFTId,
        uint256 yodhaOneDamage,
        uint256 yodhaOneRecovery,
        uint256 yodhaTwoDamage,
        uint256 yodhaTwoRecovery
    );

    event YodhaMoveExecuted(
        address indexed player,
        uint256 indexed currentRound,
        PlayerMoves indexed move,
        uint256 damageOnOpponentYodha,
        uint256 recoveryOnSelfYodha
    );

    event GameResetted(uint256 indexed yodhaOneNFTId, uint256 indexed yodhaTwoNFTId);

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
        if (
            IYodhaNFT(i_yodhaNFTCollection).ownerOf(_yodhaOneNFTId) == address(0)
                || IYodhaNFT(i_yodhaNFTCollection).ownerOf(_yodhaTwoNFTId) == address(0)
        ) {
            revert Kurukshetra__InvalidTokenAddress();
        }
        if (
            IYodhaNFT(i_yodhaNFTCollection).getRanking(_yodhaOneNFTId)
                != IYodhaNFT(i_yodhaNFTCollection).getRanking(_yodhaTwoNFTId)
                || IYodhaNFT(i_yodhaNFTCollection).getRanking(_yodhaOneNFTId) != i_rankCategory
                || IYodhaNFT(i_yodhaNFTCollection).getRanking(_yodhaTwoNFTId) != i_rankCategory
        ) {
            revert Kurukshetra__InvalidRankCategory();
        }

        s_yodhaOneNFTId = _yodhaOneNFTId;
        s_yodhaTwoNFTId = _yodhaTwoNFTId;
        s_gameInitialized = true;
        s_gameInitializedAt = block.timestamp;

        emit GameInitialized(_yodhaOneNFTId, _yodhaTwoNFTId, s_gameInitializedAt);
    }

    /**
     * @notice Places a bet on Yodha One.
     * @param _multiplier The multiplier for the bet amount.
     */
    function betOnYodhaOne(uint256 _multiplier) external {
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_currentRound != 0) {
            revert Kurukshetra__GameAlreadyStarted();
        }
        if (_multiplier == 0) {
            revert Kurukshetra__InvalidBetAmount();
        }

        for (uint256 i = 0; i < _multiplier; i++) {
            s_playerOneBetAddresses.push(msg.sender);
        }
        i_rannToken.transferFrom(msg.sender, address(this), i_betAmount * _multiplier);

        emit BetPlacedOnYodhaOne(msg.sender, _multiplier, i_betAmount);
    }

    /**
     * @notice Places a bet on Yodha Two.
     * @param _multiplier The multiplier for the bet amount.
     */
    function betOnYodhaTwo(uint256 _multiplier) external {
        if (_multiplier == 0) {
            revert Kurukshetra__InvalidBetAmount();
        }
        if (!s_gameInitialized) {
            revert Kurukshetra__GameNotStartedYet();
        }
        if (s_currentRound != 0) {
            revert Kurukshetra__GameAlreadyStarted();
        }

        for (uint256 i = 0; i < _multiplier; i++) {
            s_playerTwoBetAddresses.push(msg.sender);
        }
        i_rannToken.transferFrom(msg.sender, address(this), i_betAmount * _multiplier);

        emit BetPlacedOnYodhaTwo(msg.sender, _multiplier, i_betAmount);
    }

    /**
     * @notice Starts the game.
     * @dev This function checks if there are at least better on both the sides to prevent unnecessary starting of the game
     */
    function startGame() external {
        if (block.timestamp < MIN_YODHA_BETTING_PERIOD + s_gameInitializedAt) {
            revert Kurukshetra__BettingPeriodStillGoingOn();
        }
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

        emit GameStarted(block.timestamp);
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

        emit YodhaOneInfluenced(msg.sender, s_yodhaOneNFTId, s_currentRound);
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
        s_playersAlreadyUsedDefluenceAddresses[msg.sender] = true;

        emit YodhaOneDefluenced(msg.sender, s_yodhaOneNFTId, s_currentRound);
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

        emit YodhaTwoInfluenced(msg.sender, s_yodhaTwoNFTId, s_currentRound);
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
        s_playersAlreadyUsedDefluenceAddresses[msg.sender] = true;

        emit YodhaTwoDefluenced(msg.sender, s_yodhaTwoNFTId, s_currentRound);
    }

    /**
     * @notice Function to execute the battle between two Yodhas.
     * @param _yodhaOneMove The move of Yodha One.
     * @param _yodhaTwoMove The move of Yodha Two.
     * @param _signedData The signed data from the AI agent.
     * @dev this function can only be called by the signed data of the AI agent
     */
    function battle(PlayerMoves _yodhaOneMove, PlayerMoves _yodhaTwoMove, bytes memory _signedData) external {
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
        bytes32 dataHash = keccak256(abi.encodePacked(_yodhaOneMove, _yodhaTwoMove));
        if (s_currentRound >= 6) {
            finishGame();
            return;
        }
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        address recovered = ECDSA.recover(ethSignedMessage, _signedData);
        if (recovered != i_nearAiPublicKey) {
            revert Kurukshetra__InvalidSignature();
        }

        s_isBattleOngoing = true;

        //Logic to detemine the winner of the battle
        (uint256 damageOnYodhaTwo, uint256 recoveryOfYodhaOne) = _executeYodhaMove(_yodhaOneMove);
        (uint256 damageOnYodhaOne, uint256 recoveryOfYodhaTwo) = _executeYodhaMove(_yodhaTwoMove);

        if (s_damageOnYodhaOne < recoveryOfYodhaOne) recoveryOfYodhaOne = s_damageOnYodhaOne;
        if (s_damageOnYodhaTwo < recoveryOfYodhaTwo) recoveryOfYodhaTwo = s_damageOnYodhaTwo;

        s_damageOnYodhaOne = s_damageOnYodhaOne + damageOnYodhaOne - recoveryOfYodhaOne;
        s_damageOnYodhaTwo = s_damageOnYodhaTwo + damageOnYodhaTwo - recoveryOfYodhaTwo;

        s_currentRound++;
        s_lastRoundEndedAt = block.timestamp;

        if (s_currentRound >= 6) {
            finishGame();
        }

        s_isBattleOngoing = false;

        emit RoundOver(
            s_currentRound - 1,
            s_yodhaOneNFTId,
            s_yodhaTwoNFTId,
            damageOnYodhaOne,
            recoveryOfYodhaOne,
            damageOnYodhaTwo,
            recoveryOfYodhaTwo
        );
    }

    /**
     * @param _yodhaMove The move of the Yodha.
     * @return damageOnOpponent The damage inflicted on the opponent Yodha.
     * @return recoveryOfSelf The recovery of the Yodha itself.
     */
    function _executeYodhaMove(PlayerMoves _yodhaMove)
        private
        returns (uint256 damageOnOpponent, uint256 recoveryOfSelf)
    {
        // formulae to find our the damage and recovery if success

        emit YodhaMoveExecuted(msg.sender, s_currentRound, _yodhaMove, damageOnOpponent, recoveryOfSelf);
    }

    /**
     * @notice Function to finish the game and distribute rewards.
     */
    function finishGame() public {
        if (s_currentRound < 6) {
            revert Kurukshetra__GameFinishConditionNotMet();
        }
        if (s_isBattleOngoing) {
            revert Kurukshetra__LastBattleIsStillGoingOn();
        }
        // Yodha One Winner
        if (s_damageOnYodhaOne < s_damageOnYodhaTwo) {
            uint256 cutOfYodhaOneMaker = (i_rannToken.balanceOf(address(this)) * YODHA_ONE_CUT) / 100;
            i_rannToken.transfer(IYodhaNFT(i_yodhaNFTCollection).ownerOf(s_yodhaOneNFTId), cutOfYodhaOneMaker);
            uint256 winnerPrice = i_rannToken.balanceOf(address(this)) / s_playerOneBetAddresses.length;
            IKurukshetraFactory(i_kurukshetraFactory).updateWinnings(
                s_yodhaOneNFTId, i_rannToken.balanceOf(address(this))
            );
            for (uint256 i = 0; i < s_playerOneBetAddresses.length; i++) {
                if (i == s_playerOneBetAddresses.length - 1) {
                    i_rannToken.transfer(s_playerOneBetAddresses[i], i_rannToken.balanceOf(address(this)));
                    break;
                }
                i_rannToken.transfer(s_playerOneBetAddresses[i], winnerPrice);
            }
        }
        // Yodha Two Winner
        else if (s_damageOnYodhaTwo < s_damageOnYodhaOne) {
            uint256 cutOfYodhaTwoMaker = (i_rannToken.balanceOf(address(this)) * YODHA_ONE_CUT) / 100;
            i_rannToken.transfer(IYodhaNFT(i_yodhaNFTCollection).ownerOf(s_yodhaTwoNFTId), cutOfYodhaTwoMaker);
            uint256 winnerPrice = i_rannToken.balanceOf(address(this)) / s_playerTwoBetAddresses.length;
            IKurukshetraFactory(i_kurukshetraFactory).updateWinnings(
                s_yodhaTwoNFTId, i_rannToken.balanceOf(address(this))
            );
            for (uint256 i = 0; i < s_playerTwoBetAddresses.length; i++) {
                if (i == s_playerTwoBetAddresses.length - 1) {
                    i_rannToken.transfer(s_playerTwoBetAddresses[i], i_rannToken.balanceOf(address(this)));
                    break;
                }
                i_rannToken.transfer(s_playerTwoBetAddresses[i], winnerPrice);
            }
        }
        // Draw
        else {
            uint256 cutOfYodhaMaker = ((i_rannToken.balanceOf(address(this)) * YODHA_ONE_CUT) / 100) / 2;
            i_rannToken.transfer(IYodhaNFT(i_yodhaNFTCollection).ownerOf(s_yodhaOneNFTId), cutOfYodhaMaker);
            i_rannToken.transfer(IYodhaNFT(i_yodhaNFTCollection).ownerOf(s_yodhaTwoNFTId), cutOfYodhaMaker);
            uint256 winnerPrice =
                i_rannToken.balanceOf(address(this)) / (s_playerOneBetAddresses.length + s_playerTwoBetAddresses.length);
            IKurukshetraFactory(i_kurukshetraFactory).updateWinnings(
                s_yodhaOneNFTId, i_rannToken.balanceOf(address(this)) / 2
            );
            IKurukshetraFactory(i_kurukshetraFactory).updateWinnings(
                s_yodhaTwoNFTId, i_rannToken.balanceOf(address(this)) / 2
            );
            for (
                uint256 i = 0;
                i
                    < (
                        s_playerOneBetAddresses.length > s_playerTwoBetAddresses.length
                            ? s_playerOneBetAddresses.length
                            : s_playerTwoBetAddresses.length
                    );
                i++
            ) {
                if (i < s_playerOneBetAddresses.length) {
                    i_rannToken.transfer(s_playerOneBetAddresses[i], winnerPrice);
                }
                if (i < s_playerTwoBetAddresses.length) {
                    i_rannToken.transfer(s_playerTwoBetAddresses[i], winnerPrice);
                }
            }
        }

        _resetGame();

        emit GameFinished(s_yodhaOneNFTId, s_yodhaTwoNFTId, s_damageOnYodhaOne, s_damageOnYodhaTwo);
    }

    /**
     * @dev Function to fetch a pseudo-random value
     */
    function _revertibleRandom() private view returns (uint64) {
        // Static call to the Cadence Arch contract's revertibleRandom function
        (bool ok, bytes memory data) = i_cadenceArch.staticcall(abi.encodeWithSignature("revertibleRandom()"));
        require(ok, "Failed to fetch a random number through Cadence Arch");
        uint64 output = abi.decode(data, (uint64));
        // Return the random value
        return output;
    }

    /**
     * Reset the defluence mapping by implementing a new function to handle this
     */
    function _resetGame() private {
        s_yodhaOneNFTId = 0;
        s_yodhaTwoNFTId = 0;
        s_currentRound = 0;
        s_totalInfluencePointsOfYodhaOneForNextRound = 0;
        s_totalDefluencePointsOfYodhaOneForNextRound = 0;
        s_totalInfluencePointsOfYodhaTwoForNextRound = 0;
        s_totalDefluencePointsOfYodhaTwoForNextRound = 0;
        s_playerOneBetAddresses = new address[](0);
        s_playerTwoBetAddresses = new address[](0);
        _clearDefluenceAddresses();
        s_gameInitialized = false;
        s_isBattleOngoing = false;
        s_gameInitializedAt = 0;
        s_lastRoundEndedAt = 0;
        s_damageOnYodhaOne = 0;
        s_damageOnYodhaTwo = 0;

        emit GameResetted(s_yodhaOneNFTId, s_yodhaTwoNFTId);
    }

    /**
     * @notice Helper function to clear defluence addresses mapping
     */
    function _clearDefluenceAddresses() private {
        for (
            uint256 i = 0;
            i
                < (
                    s_playerOneBetAddresses.length > s_playerTwoBetAddresses.length
                        ? s_playerOneBetAddresses.length
                        : s_playerTwoBetAddresses.length
                );
            i++
        ) {
            if (i < s_playerOneBetAddresses.length) {
                s_playersAlreadyUsedDefluenceAddresses[s_playerOneBetAddresses[i]] = false;
            }
            if (i < s_playerTwoBetAddresses.length) {
                s_playersAlreadyUsedDefluenceAddresses[s_playerTwoBetAddresses[i]] = false;
            }
        }
    }

    /* Helper Getter Functions */

    function getRannTokenAddress() external view returns (address) {
        return address(i_rannToken);
    }

    function getCadenceArchAddress() external view returns (address) {
        return i_cadenceArch;
    }

    function getCostToInfluence() external view returns (uint256) {
        return i_costToInfluence;
    }

    function getCostToDefluence() external view returns (uint256) {
        return i_costToDefluence;
    }

    function getNearAiPublicKey() external view returns (address) {
        return i_nearAiPublicKey;
    }

    function getBetAmount() external view returns (uint256) {
        return i_betAmount;
    }

    function getYodhaOneNFTId() external view returns (uint256) {
        return s_yodhaOneNFTId;
    }

    function getYodhaTwoNFTId() external view returns (uint256) {
        return s_yodhaTwoNFTId;
    }

    function getCurrentRound() external view returns (uint8) {
        return s_currentRound;
    }

    function getPlayerOneBetAddresses() external view returns (address[] memory) {
        return s_playerOneBetAddresses;
    }

    function getPlayerTwoBetAddresses() external view returns (address[] memory) {
        return s_playerTwoBetAddresses;
    }

    function getInitializationStatus() external view returns (bool) {
        return s_gameInitialized;
    }

    function getBattleStatus() external view returns (bool) {
        return s_isBattleOngoing;
    }

    function getGameInitializedAt() external view returns (uint256) {
        return s_gameInitializedAt;
    }

    function getLastRoundEndedAt() external view returns (uint256) {
        return s_lastRoundEndedAt;
    }

    function getDamageOnYodhaOne() external view returns (uint256) {
        return s_damageOnYodhaOne;
    }

    function getDamageOnYodhaTwo() external view returns (uint256) {
        return s_damageOnYodhaTwo;
    }

    function getMinYodhaBettingPeriod() external pure returns (uint8) {
        return MIN_YODHA_BETTING_PERIOD;
    }

    function getMinBattleRoundsInterval() external pure returns (uint8) {
        return MIN_BATTLE_ROUNDS_INTERVAL;
    }
}
