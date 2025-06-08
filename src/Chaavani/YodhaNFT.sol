// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ERC721} from "../../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

/**
 * @title YodhaNFT
 * @author Yug Agarwal
 * @notice This is the core contract that mints the charecters' NFTs.
 * @dev A user (charecter maker) must pass the token uri with the charecters' 5 images (normal, attacked, deafened, poisoned and silenced).
 * @dev This user's passed uri should also contain charecters' personality attributes.
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
contract YodhaNFT is ERC721 {
    error YodhaNFT__NotGurukulOrDao();
    error YodhaNFT__NotDao();
    error YodhaNFT__YodhaAlreadyAtTopRank();
    error YodhaNFT__YodhaAlreadyAtBottomRank();

    enum Ranking {
        UNRANKED,
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM
    }

    struct Traits{
        // all these can have a maximum value of 100 and with decimal precision of 2
        // so the maximum value of each trait can be 10000
        uint16 strength;
        uint16 wit;
        uint16 charisma;
        uint16 defence;
        uint16 luck;
    }

    struct Moves{
        string strike;  // strength
        string taunt;   // charisma + wit
        string dodge;   // defence
        string special; // personality + strength
        string recover; // defence + charisma
        // everything it also influenced by the luck factor
    }

    uint16 private constant TRAITS_DECIMAL_PRECISION = 2;
    uint256 private s_tokenCounter;
    mapping(uint256 => string) private s_tokenIdToUri;
    mapping(uint256 => Ranking) private s_tokenIdToRanking;
    mapping(uint256 => Traits) private s_tokenIdToTraits;
    mapping(uint256 => Moves) private s_tokenIdToMoves;
    address private immutable i_dao;
    address private immutable i_gurukul;

    event YodhaNFTMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event YodhaPromoted(uint256 indexed tokenId, Ranking newRanking);
    event YodhaDemoted(uint256 indexed tokenId, Ranking newRanking);

    /**
     * @notice This modifier checks if the caller is either the Gurukul or the DAO.
     * @dev It is used to restrict access to certain functions that can only be called by the Gurukul or DAO.
     */
    modifier onlyGurukulOrDao() {
        if (msg.sender != i_gurukul && msg.sender != i_dao) {
            revert YodhaNFT__NotGurukulOrDao();
        }
        _;
    }

    /**
     * @notice This modifier checks if the caller is the DAO.
     * @dev It is used to restrict access to certain functions that can only be called by the DAO.
     */
    modifier onlyDao() {
        if (msg.sender != i_dao) {
            revert YodhaNFT__NotDao();
        }
        _;
    }

    /**
     * @notice This constructor initializes the YodhaNFT collection contract.
     * @param _dao The address of the DAO.
     * @param _gurukul The address of the Gurukul.
     */
    constructor(address _dao, address _gurukul) ERC721("Yodhas", "YDA") {
        s_tokenCounter = 0;
        i_dao = _dao;
        i_gurukul = _gurukul;
    }

    /**
     *
     * @param _tokenURI The URI of the NFT to be minted, which should contain the charecter's images and personality attributes.
     */
    function mintNft(string memory _tokenURI) public {
        s_tokenIdToUri[s_tokenCounter] = _tokenURI;
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenIdToRanking[s_tokenCounter] = Ranking.UNRANKED;
        s_tokenCounter++;

        emit YodhaNFTMinted(msg.sender, s_tokenCounter - 1, _tokenURI);
    }

    /**
     * @notice This function promotes the NFT to the next rank.
     * @param _tokenId The ID of the NFT to be promoted.
     * @dev Only callable by the Gurukul or DAO.
     */
    function promoteNFT(uint256 _tokenId) public onlyGurukulOrDao {
        if (s_tokenIdToRanking[_tokenId] == Ranking.PLATINUM) {
            revert YodhaNFT__YodhaAlreadyAtTopRank();
        }
        if (s_tokenIdToRanking[_tokenId] == Ranking.UNRANKED) {
            s_tokenIdToRanking[_tokenId] = Ranking.BRONZE;
        } else if (s_tokenIdToRanking[_tokenId] == Ranking.BRONZE) {
            s_tokenIdToRanking[_tokenId] = Ranking.SILVER;
        } else if (s_tokenIdToRanking[_tokenId] == Ranking.SILVER) {
            s_tokenIdToRanking[_tokenId] = Ranking.GOLD;
        } else if (s_tokenIdToRanking[_tokenId] == Ranking.GOLD) {
            s_tokenIdToRanking[_tokenId] = Ranking.PLATINUM;
        }

        emit YodhaPromoted(_tokenId, s_tokenIdToRanking[_tokenId]);
    }

    /**
     * @notice This function demotes the NFT to the previous rank.
     * @param _tokenId The ID of the NFT to be demoted.
     * @dev Only callable by the DAO.
     */
    function demoteNFT(uint256 _tokenId) public onlyDao {
        if (s_tokenIdToRanking[_tokenId] == Ranking.UNRANKED) {
            revert YodhaNFT__YodhaAlreadyAtBottomRank();
        }
        if (s_tokenIdToRanking[_tokenId] == Ranking.PLATINUM) {
            s_tokenIdToRanking[_tokenId] = Ranking.GOLD;
        } else if (s_tokenIdToRanking[_tokenId] == Ranking.GOLD) {
            s_tokenIdToRanking[_tokenId] = Ranking.SILVER;
        } else if (s_tokenIdToRanking[_tokenId] == Ranking.SILVER) {
            s_tokenIdToRanking[_tokenId] = Ranking.BRONZE;
        } else if (s_tokenIdToRanking[_tokenId] == Ranking.BRONZE) {
            s_tokenIdToRanking[_tokenId] = Ranking.UNRANKED;
        }

        emit YodhaDemoted(_tokenId, s_tokenIdToRanking[_tokenId]);
    }

    /* Helper Getter Functions */

    function getRanking(uint256 _tokenId) public view returns (Ranking) {
        return s_tokenIdToRanking[_tokenId];
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        return s_tokenIdToUri[_tokenId];
    }

    function getTraits(uint256 _tokenId) public view returns (Traits memory) {
        return s_tokenIdToTraits[_tokenId];
    }

    function getMoves(uint256 _tokenId) public view returns (Moves memory) {
        return s_tokenIdToMoves[_tokenId];
    }
}
