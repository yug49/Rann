// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ERC721} from "../../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ECDSA} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title YodhaNFT
 * @author Yug Agarwal, Samkit Soni
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
    error YodhaNFT__TraitsAlreadyAssigned();
    error YodhaNFT__InvalidTokenId();
    error YodhaNFT__InvalidSignature();
    error YodhaNFT__GurukulAlreadySet();
    error YodhaNFT__InvalidGurukulAddress();
    error YodhaNFT__InvalidTraitsValue();
    error YodhaNFT__InvalidTokenURI();
    error YodhaNFT__InvalidMovesNames();

    enum Ranking {
        UNRANKED,
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM
    }

    struct Traits {
        // all these can have a maximum value of 100 and with decimal precision of 2
        // so the maximum value of each trait can be 10000
        uint16 strength;
        uint16 wit;
        uint16 charisma;
        uint16 defence;
        uint16 luck;
    }

    struct Moves {
        string strike; // strength
        string taunt; // charisma + wit
        string dodge; // defence
        string special; // personality + strength
        string recover; // defence + charisma
            // everything it also influenced by the luck factor
    }

    uint16 private constant TRAITS_DECIMAL_PRECISION = 2;
    uint256 private s_tokenCounter;
    address private s_gurukul;
    mapping(uint256 => string) private s_tokenIdToUri;
    mapping(uint256 => Ranking) private s_tokenIdToRanking;
    mapping(uint256 => Traits) private s_tokenIdToTraits;
    mapping(uint256 => Moves) private s_tokenIdToMoves;
    mapping(uint256 => bool) private s_traitsAssigned;
    address private immutable i_dao;
    address private immutable i_nearAiPublicKey; // NEAR AI Public Key for generating traits and moves

    /**
     * @notice This modifier checks if the caller is either the Gurukul or the DAO.
     * @dev It is used to restrict access to certain functions that can only be called by the Gurukul or DAO.
     */
    modifier onlyGurukulOrDao() {
        if (msg.sender != s_gurukul && msg.sender != i_dao) {
            revert YodhaNFT__NotGurukulOrDao();
        }
        _;
    }

    /**
     * @notice This modifier checks if the caller is the Gurukul.
     * @dev It is used to restrict access to certain functions that can only be called by the Gurukul.
     */
    modifier onlyGurukul() {
        if (msg.sender != s_gurukul) {
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
     * @param _nearAiPublicKey The public key of the NEAR Ai or the Game Master(backend) that will generate the traits or signing the data
     */
    constructor(address _dao, address _nearAiPublicKey) ERC721("Yodhas", "YDA") {
        s_tokenCounter = 1; // Start token IDs from 1
        i_dao = _dao;
        i_nearAiPublicKey = _nearAiPublicKey;
    }

    event YodhaNFTMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event YodhaPromoted(uint256 indexed tokenId, Ranking newRanking);
    event YodhaDemoted(uint256 indexed tokenId, Ranking newRanking);
    event YodhaTraitsAndMovesAssigned(uint256 indexed tokenId);
    event YodhaTraitsUpdated(uint256 indexed tokenId);
    event YodhaNFT__GurukulSet(address indexed gurukul);

    /**
     * @param _gurukul  The address of the Gurukul contract that will train the YodhaNFTs.
     * @notice This function should be called only once and that too just after the deployment of the YodhaNFT contract before any other function
     */
    function setGurukul(address _gurukul) external {
        if (s_gurukul != address(0)) {
            revert YodhaNFT__GurukulAlreadySet();
        }
        if (_gurukul == address(0)) {
            revert YodhaNFT__InvalidGurukulAddress();
        }

        s_gurukul = _gurukul;

        emit YodhaNFT__GurukulSet(_gurukul);
    }

    /**
     *
     * @param _tokenURI The URI of the NFT to be minted, which should contain the charecter's images and personality attributes.
     */
    function mintNft(string memory _tokenURI) public {
        if (bytes(_tokenURI).length == 0) {
            revert YodhaNFT__InvalidTokenURI();
        }

        s_tokenIdToUri[s_tokenCounter] = _tokenURI;
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenIdToRanking[s_tokenCounter] = Ranking.UNRANKED;

        s_tokenCounter++;

        emit YodhaNFTMinted(msg.sender, s_tokenCounter - 1, _tokenURI);
    }

    /**
     * @param _tokenId The ID of the NFT for which traits and moves are being assigned.
     * @param _strength The strength trait value (0-100).
     * @param _wit The wit trait value (0-100).
     * @param _charisma The charisma trait value (0-100).
     * @param _defence The defence trait value (0-100).
     * @param _luck The luck trait value (0-100).
     * @param _strike The strike move name string.
     * @param _taunt The taunt move name string.
     * @param _dodge The dodge move name string.
     * @param _special The special move name string.
     * @param _recover The recover move name string.
     * @param _signedData The signed data from the NEAR AI.
     */
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
    ) public {
        if (s_traitsAssigned[_tokenId]) {
            revert YodhaNFT__TraitsAlreadyAssigned();
        }
        if (_tokenId >= s_tokenCounter) {
            revert YodhaNFT__InvalidTokenId();
        }
        if (
            _strength > 10000 ||
            _wit > 10000 ||
            _charisma > 10000 ||
            _defence > 10000 ||
            _luck > 10000
        ) {
            revert YodhaNFT__InvalidTraitsValue();
        }
        if(
            bytes(_strike).length == 0 ||
            bytes(_taunt).length == 0 ||
            bytes(_dodge).length == 0 ||
            bytes(_special).length == 0 ||
            bytes(_recover).length == 0
        ) {
            revert YodhaNFT__InvalidMovesNames();
        }
        if(
            _strength == 0 ||
            _wit == 0 ||
            _charisma == 0 ||
            _defence == 0 ||
            _luck == 0
        ){
            revert YodhaNFT__InvalidTraitsValue();
        }

        bytes32 dataHash = keccak256(
            abi.encodePacked(
                _tokenId, _strength, _wit, _charisma, _defence, _luck, _strike, _taunt, _dodge, _special, _recover
            )
        );
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        address recovered = ECDSA.recover(ethSignedMessage, _signedData);

        if (recovered != i_nearAiPublicKey) {
            revert YodhaNFT__InvalidSignature();
        }

        s_tokenIdToTraits[_tokenId] =
            Traits({strength: _strength, wit: _wit, charisma: _charisma, defence: _defence, luck: _luck});
        s_tokenIdToMoves[_tokenId] =
            Moves({strike: _strike, taunt: _taunt, dodge: _dodge, special: _special, recover: _recover});
        s_traitsAssigned[_tokenId] = true;
        emit YodhaTraitsAndMovesAssigned(_tokenId);
    }

    function updateTraits(
        uint256 _tokenId,
        uint16 _strength,
        uint16 _wit,
        uint16 _charisma,
        uint16 _defence,
        uint16 _luck
    ) external onlyGurukul {
        if (_tokenId >= s_tokenCounter) {
            revert YodhaNFT__InvalidTokenId();
        }
        if (_strength > 10000 || _wit > 10000 || _charisma > 10000 || _defence > 10000 || _luck > 10000) {
            revert YodhaNFT__InvalidTraitsValue();
        }
        s_tokenIdToTraits[_tokenId] =
            Traits({strength: _strength, wit: _wit, charisma: _charisma, defence: _defence, luck: _luck});

        emit YodhaTraitsUpdated(_tokenId);
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
