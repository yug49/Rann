// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Kurukshetra} from "./Kurukshetra.sol";
import {Ownable} from "../../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IYodhaNFT} from "../Interfaces/IYodhaNFT.sol";

/**
 * @title KurukshetraFactory - The Arena Maker
 * @author Yug Agarwal
 * @dev DAO can make new arenas for ranks
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
contract KurukshetraFactory{
    error KurukshetraFactory__NotDAO();
    error KurukshetraFactory__InvalidAddress();
    error KurukshetraFactory__InvalidBetAmount();
    error KurukshetraFactory__InvalidCostToInfluence();
    error KurukshetraFactory__InvalidCostToDefluence();
    error KurukshetraFactory__NotArena();

    address[] private arenas;
    mapping(address => bool) private isArena;
    mapping(address => IYodhaNFT.Ranking) private arenaRankings;
    address private immutable i_rannTokenAddress;
    address private immutable i_nearAiPublicKey;
    address private immutable i_cadenceArch;
    address private immutable i_yodhaNFTCollection;

    modifier onlyArenas() {
        if (!isArena[msg.sender]) {
            revert KurukshetraFactory__NotArena();
        }
        _;
    }

    /**
     * @param _costToInfluence The cost to influence an arena
     * @param _costToDefluence The cost to defluence an arena
     * @param _rannTokenAddress The address of the Rann token contract
     * @param _nearAiPublicKey The public key for Near AI
     * @param _cadenceArch The address of the Cadence architecture
     * @param _yodhaNFTCollection The address of the Yodha NFT collection
     * @param _betAmount The initial bet amount for the arenas
     */
    constructor(
        uint256 _costToInfluence,
        uint256 _costToDefluence,
        address _rannTokenAddress,
        address _nearAiPublicKey,
        address _cadenceArch,
        address _yodhaNFTCollection,
        uint256 _betAmount
    ){
        if (_rannTokenAddress == address(0)) {
            revert KurukshetraFactory__InvalidAddress();
        }
        if (_nearAiPublicKey == address(0)) {
            revert KurukshetraFactory__InvalidAddress();
        }
        if (_cadenceArch == address(0)) {
            revert KurukshetraFactory__InvalidAddress();
        }
        if (_yodhaNFTCollection == address(0)) {
            revert KurukshetraFactory__InvalidAddress();
        }
        if (_betAmount == 0) {
            revert KurukshetraFactory__InvalidBetAmount();
        }
        if (_costToInfluence == 0) {
            revert KurukshetraFactory__InvalidCostToInfluence();
        }
        if (_costToDefluence == 0) {
            revert KurukshetraFactory__InvalidCostToDefluence();
        }

        Kurukshetra arena1 = new Kurukshetra(
            _costToInfluence,
            _costToDefluence,
            _rannTokenAddress,
            _nearAiPublicKey,
            _cadenceArch,
            _yodhaNFTCollection,
            _betAmount,
            IYodhaNFT.Ranking.UNRANKED
        );

        Kurukshetra arena2 = new Kurukshetra(
            _costToInfluence * 2,
            _costToDefluence * 2,
            _rannTokenAddress,
            _nearAiPublicKey,
            _cadenceArch,
            _yodhaNFTCollection,
            _betAmount * 2,
            IYodhaNFT.Ranking.BRONZE
        );

        Kurukshetra arena3 = new Kurukshetra(
            _costToInfluence * 3,
            _costToDefluence * 3,
            _rannTokenAddress,
            _nearAiPublicKey,
            _cadenceArch,
            _yodhaNFTCollection,
            _betAmount * 3,
            IYodhaNFT.Ranking.SILVER
        );

        Kurukshetra arena4 = new Kurukshetra(
            _costToInfluence * 4,
            _costToDefluence * 4,
            _rannTokenAddress,
            _nearAiPublicKey,
            _cadenceArch,
            _yodhaNFTCollection,
            _betAmount * 4,
            IYodhaNFT.Ranking.GOLD
        );

        Kurukshetra arena5 = new Kurukshetra(
            _costToInfluence * 5,
            _costToDefluence * 5,
            _rannTokenAddress,
            _nearAiPublicKey,
            _cadenceArch,
            _yodhaNFTCollection,
            _betAmount * 5,
            IYodhaNFT.Ranking.PLATINUM
        );

        arenas.push(address(arena1));
        arenas.push(address(arena2));
        arenas.push(address(arena3));
        arenas.push(address(arena4));
        arenas.push(address(arena5));
        isArena[address(arena1)] = true;
        isArena[address(arena2)] = true;
        isArena[address(arena3)] = true;
        isArena[address(arena4)] = true;
        isArena[address(arena5)] = true;
        arenaRankings[address(arena1)] = IYodhaNFT.Ranking.UNRANKED;
        arenaRankings[address(arena2)] = IYodhaNFT.Ranking.BRONZE;
        arenaRankings[address(arena3)] = IYodhaNFT.Ranking.SILVER;
        arenaRankings[address(arena4)] = IYodhaNFT.Ranking.GOLD;
        arenaRankings[address(arena5)] = IYodhaNFT.Ranking.PLATINUM;

        i_rannTokenAddress = _rannTokenAddress;
        i_nearAiPublicKey = _nearAiPublicKey;
        i_cadenceArch = _cadenceArch;
        i_yodhaNFTCollection = _yodhaNFTCollection;
    }

    event NewArenaCreated(
        address indexed arenaAddress,
        IYodhaNFT.Ranking indexed ranking,
        uint256 costToInfluence,
        uint256 costToDefluence,
        uint256 betAmount
    );

    /**
     * @param _costToInfluence The cost to influence an arena
     * @param _costToDefluence The cost to defluence an arena
     * @param _betAmount The initial bet amount for the arenas
     * @param _ranking The ranking of the arena
     */
    function makeNewArena(
        uint256 _costToInfluence,
        uint256 _costToDefluence,
        uint256 _betAmount,
        IYodhaNFT.Ranking _ranking
    ) external returns (address) {
        Kurukshetra newArena = new Kurukshetra(
            _costToInfluence,
            _costToDefluence,
            i_rannTokenAddress,
            i_nearAiPublicKey,
            i_cadenceArch,
            i_yodhaNFTCollection,
            _betAmount,
            _ranking
        );

        arenas.push(address(newArena));
        isArena[address(newArena)] = true;
        arenaRankings[address(newArena)] = _ranking;

        emit NewArenaCreated(address(newArena), _ranking, _costToInfluence, _costToDefluence, _betAmount);

        return address(newArena);
    }

    /**
     * 
     * @param _yodhaNFTId The ID of the Yodha NFT to update winnings for
     * @param _amount The amount to add to the winnings of the Yodha NFT
     * @dev This function can only be called by arenas to update the winnings of a Yodha NFT that will further help in promotions and leaderboard management.
     */
    function updateWinnings(uint256 _yodhaNFTId, uint256 _amount) external onlyArenas {
        IYodhaNFT(i_yodhaNFTCollection).increaseWinnings(_yodhaNFTId, _amount);
    }

    /* Helper Getter Functions */

    function getArenas() external view returns (address[] memory) {
        return arenas;
    }

    function getArenaRanking(address _arena) external view returns (IYodhaNFT.Ranking) {
        return arenaRankings[_arena];
    }

    function isArenaAddress(address _arena) external view returns (bool) {
        return isArena[_arena];
    }

    function getRannTokenAddress() external view returns (address) {
        return i_rannTokenAddress;
    }

    function getCadenceArch() external view returns (address) {
        return i_cadenceArch;
    }

    function getYodhaNFTCollection() external view returns (address) {
        return i_yodhaNFTCollection;
    }
}
