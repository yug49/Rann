// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IYodhaNFT} from "../Interfaces/IYodhaNFT.sol";
import {ECDSA} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title Gurukul
 * @author Yug Agarwal, Samkit Soni
 * @dev User can interact with the Gurukul contract to train and upgrade the traits of their Yodhas.
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
contract Gurukul {
    error Gurukul__NotOwner();
    error Gurukul__NotValidAddress();
    error Gurukul__NotValidInitialNumberOfQuestions();
    error Gurukul__NotValidInitialQuestionsToOptionsLength();
    error Gurukul__NotEnoughQuestionsSelected();
    error Gurukul__NotEnoughOptionsForQuestion();
    error Gurukul__PlayerAlreadyInGurukulKindlyProceedToAnswerTheAllotedQuestions();
    error Gurukul__PlayerHasNotBeenAllotedAnyQuestionsYetKindlyEnterGurukulFirst();
    error Gurukul__InvalidOption();
    error Gurukul__PlayerAlreadyAnsweredTheQuestionsInstructNearAiToUpdateRanking();
    error Gurukul__PlayersDidntAnsweredTheQuestionsYet();
    error Gurukul__NotValidSignature();
    error Gurukul__InvalidTraits();
    error Gurukul__NotDAO();
    error Gurukul__NotValidIfpsAddress();

    IYodhaNFT private immutable i_yodhaNFT;
    address private immutable i_nearAiPublicKey;
    address private immutable i_cadenceArch;
    address private immutable i_dao;
    string private s_ipfsCID;
    uint256 private s_numberOfQuestions;
    uint256[] private s_questionToOptions;
    uint8 private constant NUMBER_OF_QUESTIONS_PER_SESSION = 5;
    mapping(uint256 => uint256[]) private s_tokenIdToQuestions;
    mapping(uint256 => uint256[]) private s_tokenIdToAnswers;

    /**
     * @param _cadenceArch The address of the Cadence Arch contract
     * @param _dao The address of the DAO contract
     * @param _yodhaNFT The address of the Yodha NFT contract
     * @param _initialNumberOfQuestions The initial number of questions
     * @param _initalQuestionsToOptions The initial mapping of questions to options
     * @param _ipfsCID The IPFS address for storing question metadata
     */
    constructor(
        address _cadenceArch,
        address _dao,
        address _yodhaNFT,
        uint256 _initialNumberOfQuestions,
        address _nearAiPublicKey,
        uint256[] memory _initalQuestionsToOptions,
        string memory _ipfsCID
    ) {
        // Set the address of the Cadence Arch contract
        if (_cadenceArch == address(0)) revert Gurukul__NotValidAddress();
        if (_dao == address(0)) revert Gurukul__NotValidAddress();
        if (_yodhaNFT == address(0)) revert Gurukul__NotValidAddress();
        if (_initialNumberOfQuestions < NUMBER_OF_QUESTIONS_PER_SESSION) {
            revert Gurukul__NotValidInitialNumberOfQuestions();
        }
        if (_initialNumberOfQuestions != _initalQuestionsToOptions.length) {
            revert Gurukul__NotValidInitialQuestionsToOptionsLength();
        }
        for (uint256 i = 0; i < _initalQuestionsToOptions.length; i++) {
            if (_initalQuestionsToOptions[i] < 2) {
                revert Gurukul__NotEnoughOptionsForQuestion();
            }
        }
        if (bytes(_ipfsCID).length == 0) revert Gurukul__NotValidIfpsAddress();
        if (_nearAiPublicKey == address(0)) revert Gurukul__NotValidAddress();

        i_nearAiPublicKey = _nearAiPublicKey;
        i_cadenceArch = _cadenceArch;
        i_dao = _dao;
        i_yodhaNFT = IYodhaNFT(_yodhaNFT);
        s_numberOfQuestions = _initialNumberOfQuestions;
        s_questionToOptions = _initalQuestionsToOptions;
        s_ipfsCID = _ipfsCID;
    }

    event YodhaEnteredGurukul(address indexed player, uint256 indexed tokenId, uint256[] selectedQuestions);
    event YodhaAnsweredQuestions(address indexed player, uint256 indexed tokenId, uint256[] selectedOptions);
    event YodhaTraitsUpdated(uint256 indexed tokenId);
    event QuestionAdded(uint256 newNumberOfQuestions, uint256[] newQuestionsToOptions);
    event QuestionRemoved(uint256 questionIndex);

    /**
     *
     * @param _tokenId The token ID of the Yodha NFT that is entering the Gurukul
     * @dev Allows a Yodha NFT owner to enter the Gurukul and get alloted questions.
     */
    function enterGurukul(uint256 _tokenId) public {
        if (msg.sender != i_yodhaNFT.ownerOf(_tokenId)) revert Gurukul__NotOwner();
        if (s_tokenIdToQuestions[_tokenId].length > 0) {
            revert Gurukul__PlayerAlreadyInGurukulKindlyProceedToAnswerTheAllotedQuestions();
        }
        uint256[] memory alreadySelectedQuestions = new uint256[](NUMBER_OF_QUESTIONS_PER_SESSION);
        for (uint8 i = 0; i < NUMBER_OF_QUESTIONS_PER_SESSION; i++) {
            uint256 randNumber = uint256(_revertibleRandom()) / s_numberOfQuestions;
            for (uint8 j = 0; j < alreadySelectedQuestions.length; j++) {
                // Check if the random number has already been selected
                if (alreadySelectedQuestions[j] == randNumber) {
                    // If it has, generate a new random number
                    randNumber = (randNumber + 1) % s_numberOfQuestions;
                    j = 0; // Reset the loop to check against all previously selected questions
                }
            }
            alreadySelectedQuestions[i] = randNumber;
        }
        s_tokenIdToQuestions[_tokenId] = alreadySelectedQuestions;

        emit YodhaEnteredGurukul(msg.sender, _tokenId, alreadySelectedQuestions);
    }

    /**
     *
     * @param _tokenId The token ID of the Yodha NFT that is answering the questions
     * @dev Allows a Yodha NFT owner to answer the questions that have been alloted to them.
     * @param _selectedOptions The options selected by the Yodha NFT owner for each question
     */
    function answerAllotedQuestions(uint256 _tokenId, uint256[] memory _selectedOptions) public {
        if (msg.sender != i_yodhaNFT.ownerOf(_tokenId)) revert Gurukul__NotOwner();
        if (s_tokenIdToQuestions[_tokenId].length == 0) {
            revert Gurukul__PlayerHasNotBeenAllotedAnyQuestionsYetKindlyEnterGurukulFirst();
        }
        if (s_tokenIdToAnswers[_tokenId].length > 0) {
            revert Gurukul__PlayerAlreadyAnsweredTheQuestionsInstructNearAiToUpdateRanking();
        }
        if (_selectedOptions.length != NUMBER_OF_QUESTIONS_PER_SESSION) {
            revert Gurukul__InvalidOption();
        }
        for (uint8 i = 0; i < NUMBER_OF_QUESTIONS_PER_SESSION; i++) {
            if (_selectedOptions[i] >= s_questionToOptions[s_tokenIdToQuestions[_tokenId][i]]) {
                revert Gurukul__InvalidOption();
            }
        }
        s_tokenIdToAnswers[_tokenId] = _selectedOptions;

        emit YodhaAnsweredQuestions(msg.sender, _tokenId, _selectedOptions);
    }

    /**
     * @param _tokenId The token ID of the Yodha NFT whose traits are being updated
     * @param _strength The new strength value
     * @param _wit The new wit value
     * @param _charisma The new charisma value
     * @param _defence The new defence value
     * @param _luck The new luck value
     * @param _signedData The signed data for verification
     */
    function updateTraits(
        uint256 _tokenId,
        uint16 _strength,
        uint16 _wit,
        uint16 _charisma,
        uint16 _defence,
        uint16 _luck,
        bytes memory _signedData
    ) public {
        if (s_tokenIdToAnswers[_tokenId].length == 0) {
            revert Gurukul__PlayersDidntAnsweredTheQuestionsYet();
        }
        if (_strength > 10000 || _wit > 10000 || _charisma > 10000 || _defence > 10000 || _luck > 10000) {
            revert Gurukul__InvalidTraits();
        }

        bytes32 messageHash = keccak256(abi.encodePacked(_tokenId, _strength, _wit, _charisma, _defence, _luck));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recovered = ECDSA.recover(ethSignedMessage, _signedData);

        if (recovered != i_nearAiPublicKey) {
            revert Gurukul__NotValidSignature();
        }

        i_yodhaNFT.updateTraits(_tokenId, _strength, _wit, _charisma, _defence, _luck);

        s_tokenIdToAnswers[_tokenId] = new uint256[](0);
        s_tokenIdToQuestions[_tokenId] = new uint256[](0);

        emit YodhaTraitsUpdated(_tokenId);
    }

    /**
     *
     * @param _newNumberOfQuestions The new number of questions to be added
     * @param _newQuestionsToOptions The new mapping of questions to options
     */
    function increaseQuestions(
        uint256 _newNumberOfQuestions,
        uint256[] memory _newQuestionsToOptions,
        string memory _newIpfsCID
    ) public {
        if (msg.sender != i_dao) revert Gurukul__NotDAO();
        if (_newNumberOfQuestions <= s_numberOfQuestions) {
            revert Gurukul__NotValidInitialNumberOfQuestions();
        }
        if (bytes(_newIpfsCID).length == 0) revert Gurukul__NotValidIfpsAddress();
        for (uint256 i = 0; i < _newQuestionsToOptions.length; i++) {
            if (_newQuestionsToOptions[i] < 2) {
                revert Gurukul__NotEnoughOptionsForQuestion();
            }
            s_questionToOptions.push(_newQuestionsToOptions[i]);
        }

        s_numberOfQuestions += _newNumberOfQuestions;
        s_ipfsCID = _newIpfsCID;

        emit QuestionAdded(_newNumberOfQuestions, _newQuestionsToOptions);
    }

    /**
     *
     * @param _questionIndex The index of the question to be deleted
     */
    function deleteQuestion(uint256 _questionIndex, string memory _newIpfsCID) public {
        if (msg.sender != i_dao) revert Gurukul__NotDAO();
        if (_questionIndex >= s_questionToOptions.length) {
            revert Gurukul__NotValidInitialQuestionsToOptionsLength();
        }
        if (bytes(_newIpfsCID).length == 0) revert Gurukul__NotValidIfpsAddress();

        for (uint256 i = _questionIndex; i < s_questionToOptions.length - 1; i++) {
            s_questionToOptions[i] = s_questionToOptions[i + 1];
        }

        s_questionToOptions.pop();
        s_numberOfQuestions -= 1;
        s_ipfsCID = _newIpfsCID;

        emit QuestionRemoved(_questionIndex);
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

    /* Helper Getter Functions */
    function getNumberOfQuestions() public view returns (uint256) {
        return s_numberOfQuestions;
    }

    function getQuestionToOptions() public view returns (uint256[] memory) {
        return s_questionToOptions;
    }

    function getTokenIdToQuestions(uint256 _tokenId) public view returns (uint256[] memory) {
        return s_tokenIdToQuestions[_tokenId];
    }

    function getTokenIdToAnswers(uint256 _tokenId) public view returns (uint256[] memory) {
        return s_tokenIdToAnswers[_tokenId];
    }

    function getIpfsCID() public view returns (string memory) {
        return s_ipfsCID;
    }

    // Return arrays for questions and corresponding answers

    function getUsersAnswers(uint256 _tokenId)
        public
        view
        returns (uint256[] memory questions, uint256[] memory answers)
    {
        if (s_tokenIdToAnswers[_tokenId].length == 0) {
            revert Gurukul__PlayersDidntAnsweredTheQuestionsYet();
        }

        questions = s_tokenIdToQuestions[_tokenId];
        answers = s_tokenIdToAnswers[_tokenId];
        return (questions, answers);
    }
}
