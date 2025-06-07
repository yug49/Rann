// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ERC721} from "../../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
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
contract KurukshetraNFT is ERC721, Ownable{
    error KurukshetraNFT__NotGurukulOrDao();
    error KurukshetraNFT__NotDao();
    error KurukshetraNFT__KurukshetraAlreadyAtTopRank();
    error KurukshetraNFT__KurukshetraAlreadyAtBottomRank();

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

    event KurukshetraNFTMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event KurukshetraPromoted(uint256 indexed tokenId, Ranking newRanking);
    event KurukshetraDemoted(uint256 indexed tokenId, Ranking newRanking);

    /**
     * 
     * @param _owner The address of the owner of the contract.
     * @dev The owner is the arena contract that deploys the NFT conllection contract which will check if the total staked amount in a dao is what
     */
    constructor(address _owner) ERC721("Kurukshetras", "KSTS") Ownable(_owner){
        s_tokenCounter = 0;
    }

    /**
     * 
     * @param _tokenURI The token URI of the Arena NFT
     * @notice it should contain the three players that will be in the arena at all time
     */
    function mintNft(string memory _tokenURI) public {
        s_tokenIdToUri[s_tokenCounter] = _tokenURI;
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenIdToRanking[s_tokenCounter] = Ranking.UNRANKED;
        s_tokenCounter++;

        emit KurukshetraNFTMinted(msg.sender, s_tokenCounter - 1, _tokenURI);
    }

    /**
     * @dev This function is used to promote the rank of a NFT
     * @param _tokenId The token ID of the NFT to be promoted.
     */
    function promoteNFT(uint256 _tokenId) public onlyOwner {
        if(s_tokenIdToRanking[_tokenId] == Ranking.PLATINUM) {
            revert KurukshetraNFT__KurukshetraAlreadyAtTopRank();
        }
        if(s_tokenIdToRanking[_tokenId] == Ranking.UNRANKED) {
            s_tokenIdToRanking[_tokenId] = Ranking.BRONZE;
        } else if(s_tokenIdToRanking[_tokenId] == Ranking.BRONZE) {
            s_tokenIdToRanking[_tokenId] = Ranking.SILVER;
        } else if(s_tokenIdToRanking[_tokenId] == Ranking.SILVER) {
            s_tokenIdToRanking[_tokenId] = Ranking.GOLD;
        } else if(s_tokenIdToRanking[_tokenId] == Ranking.GOLD) {
            s_tokenIdToRanking[_tokenId] = Ranking.PLATINUM;
        }

        emit KurukshetraPromoted(_tokenId, s_tokenIdToRanking[_tokenId]);
    }

    /**
     * @dev this function demotes the rank of a NFT
     * @param _tokenId The token ID of the NFT to demote
     */
    function demoteNFT(uint256 _tokenId) public onlyOwner {
        if(s_tokenIdToRanking[_tokenId] == Ranking.UNRANKED) {
            revert KurukshetraNFT__KurukshetraAlreadyAtBottomRank();
        }
        if(s_tokenIdToRanking[_tokenId] == Ranking.PLATINUM) {
            s_tokenIdToRanking[_tokenId] = Ranking.GOLD;
        } else if(s_tokenIdToRanking[_tokenId] == Ranking.GOLD) {
            s_tokenIdToRanking[_tokenId] = Ranking.SILVER;
        } else if(s_tokenIdToRanking[_tokenId] == Ranking.SILVER) {
            s_tokenIdToRanking[_tokenId] = Ranking.BRONZE;
        } else if(s_tokenIdToRanking[_tokenId] == Ranking.BRONZE) {
            s_tokenIdToRanking[_tokenId] = Ranking.UNRANKED;
        }

        emit KurukshetraDemoted(_tokenId, s_tokenIdToRanking[_tokenId]);
    }

    /* Helper Getter Functions */
    
    function getRanking(uint256 _tokenId) public view returns (Ranking) {
        return s_tokenIdToRanking[_tokenId];
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        return s_tokenIdToUri[_tokenId];
    }
}
