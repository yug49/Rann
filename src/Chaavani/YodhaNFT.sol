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

    enum Ranking{
        UNRANKED,
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM
    }

    uint256 private s_tokenCounter;
    mapping(uint256 => string) private s_tokenIdToUri;
    mapping(uint256 => Ranking) private s_tokenIdToRanking;
    address private immutable i_dao;
    address private immutable i_gurukul;

    event YodhaNFTMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event YodhaPromoted(uint256 indexed tokenId, Ranking newRanking);
    event YodhaDemoted(uint256 indexed tokenId, Ranking newRanking);

    modifier onlyGurukulOrDao() {
        if(msg.sender != i_gurukul && msg.sender != i_dao) {
            revert YodhaNFT__NotGurukulOrDao();
        }
        _;
    }

    modifier onlyDao() {
        if(msg.sender != i_dao) {
            revert YodhaNFT__NotDao();
        }
        _;
    }

    constructor(address _dao, address _gurukul) ERC721("Yodhas", "YDA") {
        s_tokenCounter = 0;
        i_dao = _dao;
        i_gurukul = _gurukul;
    }

    function mintNft(string memory _tokenURI) public {
        s_tokenIdToUri[s_tokenCounter] = _tokenURI;
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenIdToRanking[s_tokenCounter] = Ranking.UNRANKED;
        s_tokenCounter++;

        emit YodhaNFTMinted(msg.sender, s_tokenCounter - 1, _tokenURI);
    }

    function promoteNFT(uint256 tokenId) public onlyGurukulOrDao {
        if(s_tokenIdToRanking[tokenId] == Ranking.PLATINUM) {
            revert YodhaNFT__YodhaAlreadyAtTopRank();
        }
        if(s_tokenIdToRanking[tokenId] == Ranking.UNRANKED) {
            s_tokenIdToRanking[tokenId] = Ranking.BRONZE;
        } else if(s_tokenIdToRanking[tokenId] == Ranking.BRONZE) {
            s_tokenIdToRanking[tokenId] = Ranking.SILVER;
        } else if(s_tokenIdToRanking[tokenId] == Ranking.SILVER) {
            s_tokenIdToRanking[tokenId] = Ranking.GOLD;
        } else if(s_tokenIdToRanking[tokenId] == Ranking.GOLD) {
            s_tokenIdToRanking[tokenId] = Ranking.PLATINUM;
        }

        emit YodhaPromoted(tokenId, s_tokenIdToRanking[tokenId]);
    }

    function demoteNFT(uint256 tokenId) public onlyDao {
        if(s_tokenIdToRanking[tokenId] == Ranking.UNRANKED) {
            revert YodhaNFT__YodhaAlreadyAtBottomRank();
        }
        if(s_tokenIdToRanking[tokenId] == Ranking.PLATINUM) {
            s_tokenIdToRanking[tokenId] = Ranking.GOLD;
        } else if(s_tokenIdToRanking[tokenId] == Ranking.GOLD) {
            s_tokenIdToRanking[tokenId] = Ranking.SILVER;
        } else if(s_tokenIdToRanking[tokenId] == Ranking.SILVER) {
            s_tokenIdToRanking[tokenId] = Ranking.BRONZE;
        } else if(s_tokenIdToRanking[tokenId] == Ranking.BRONZE) {
            s_tokenIdToRanking[tokenId] = Ranking.UNRANKED;
        }

        emit YodhaDemoted(tokenId, s_tokenIdToRanking[tokenId]);
    }

    function getRanking(uint256 tokenId) public view returns (Ranking) {
        return s_tokenIdToRanking[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return s_tokenIdToUri[tokenId];
    }
}
