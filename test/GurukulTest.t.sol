// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {Gurukul} from "../src/Gurukul/Gurukul.sol";
import {YodhaNFT} from "../src/Chaavani/YodhaNFT.sol";
import {MockCadenceArch} from "./mocks/MockCadenceArch.sol";
import {ECDSA} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";

contract GurukulTest is Test {
    Gurukul public gurukul;
    YodhaNFT public yodhaNFT;
    MockCadenceArch public mockCadenceArch;

    address public dao = makeAddr("dao");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public gameMaster = makeAddr("gameMaster");
    uint256 public gameMasterPrivateKey = 0x123456789abcdef;

    // Test data
    uint256 public constant INITIAL_NUMBER_OF_QUESTIONS = 10;
    uint256[] public initialQuestionsToOptions = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    string public constant INITIAL_IPFS_CID = "QmTestCID123";
    string public constant NEW_IPFS_CID = "QmNewTestCID456";

    // Events
    event YodhaEnteredGurukul(address indexed player, uint256 indexed tokenId, uint256[] selectedQuestions);
    event YodhaAnsweredQuestions(address indexed player, uint256 indexed tokenId, uint256[] selectedOptions);
    event YodhaTraitsUpdated(uint256 indexed tokenId);
    event QuestionAdded(uint256 newNumberOfQuestions, uint256[] newQuestionsToOptions);
    event QuestionRemoved(uint256 questionIndex);

    function setUp() public {
        // Deploy mock contracts
        mockCadenceArch = new MockCadenceArch();
        yodhaNFT = new YodhaNFT(dao, gameMaster);

        // Deploy Gurukul contract
        gurukul = new Gurukul(
            address(mockCadenceArch),
            dao,
            address(yodhaNFT),
            INITIAL_NUMBER_OF_QUESTIONS,
            vm.addr(gameMasterPrivateKey),
            initialQuestionsToOptions,
            INITIAL_IPFS_CID
        );

        // Set Gurukul in YodhaNFT
        yodhaNFT.setGurukul(address(gurukul));

        // Mint NFTs for testing
        vm.prank(user1);
        yodhaNFT.mintNft("testURI1");

        vm.prank(user2);
        yodhaNFT.mintNft("testURI2");
    }

    /*//////////////////////////////////////////////////////////////
                          CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    function testConstructorWithValidParameters() public view {
        assertEq(gurukul.getNumberOfQuestions(), INITIAL_NUMBER_OF_QUESTIONS);
        assertEq(gurukul.getQuestionToOptions().length, INITIAL_NUMBER_OF_QUESTIONS);
        assertEq(gurukul.getIpfsCID(), INITIAL_IPFS_CID);
    }

    function testConstructorRevertsWithInvalidCadenceArch() public {
        vm.expectRevert(Gurukul.Gurukul__NotValidAddress.selector);
        new Gurukul(
            address(0),
            dao,
            address(yodhaNFT),
            INITIAL_NUMBER_OF_QUESTIONS,
            gameMaster,
            initialQuestionsToOptions,
            INITIAL_IPFS_CID
        );
    }

    function testConstructorRevertsWithInvalidDao() public {
        vm.expectRevert(Gurukul.Gurukul__NotValidAddress.selector);
        new Gurukul(
            address(mockCadenceArch),
            address(0),
            address(yodhaNFT),
            INITIAL_NUMBER_OF_QUESTIONS,
            gameMaster,
            initialQuestionsToOptions,
            INITIAL_IPFS_CID
        );
    }

    function testConstructorRevertsWithInvalidYodhaNFT() public {
        vm.expectRevert(Gurukul.Gurukul__NotValidAddress.selector);
        new Gurukul(
            address(mockCadenceArch),
            dao,
            address(0),
            INITIAL_NUMBER_OF_QUESTIONS,
            gameMaster,
            initialQuestionsToOptions,
            INITIAL_IPFS_CID
        );
    }

    function testConstructorRevertsWithInvalidGameMaster() public {
        vm.expectRevert(Gurukul.Gurukul__NotValidAddress.selector);
        new Gurukul(
            address(mockCadenceArch),
            dao,
            address(yodhaNFT),
            INITIAL_NUMBER_OF_QUESTIONS,
            address(0),
            initialQuestionsToOptions,
            INITIAL_IPFS_CID
        );
    }

    function testConstructorRevertsWithInsufficientQuestions() public {
        vm.expectRevert(Gurukul.Gurukul__NotValidInitialNumberOfQuestions.selector);
        new Gurukul(
            address(mockCadenceArch),
            dao,
            address(yodhaNFT),
            4, // Less than NUMBER_OF_QUESTIONS_PER_SESSION (5)
            gameMaster,
            initialQuestionsToOptions,
            INITIAL_IPFS_CID
        );
    }

    function testConstructorRevertsWithMismatchedQuestionOptions() public {
        uint256[] memory wrongSizeOptions = new uint256[](5);
        wrongSizeOptions[0] = 4;
        wrongSizeOptions[1] = 4;
        wrongSizeOptions[2] = 4;
        wrongSizeOptions[3] = 4;
        wrongSizeOptions[4] = 4;

        vm.expectRevert(Gurukul.Gurukul__NotValidInitialQuestionsToOptionsLength.selector);
        new Gurukul(
            address(mockCadenceArch),
            dao,
            address(yodhaNFT),
            INITIAL_NUMBER_OF_QUESTIONS,
            gameMaster,
            wrongSizeOptions,
            INITIAL_IPFS_CID
        );
    }

    function testConstructorRevertsWithInvalidOptionsCount() public {
        uint256[] memory invalidOptions = new uint256[](10);
        for (uint256 i = 0; i < 10; i++) {
            invalidOptions[i] = i == 5 ? 1 : 4; // One question has only 1 option
        }

        vm.expectRevert(Gurukul.Gurukul__NotEnoughOptionsForQuestion.selector);
        new Gurukul(
            address(mockCadenceArch),
            dao,
            address(yodhaNFT),
            INITIAL_NUMBER_OF_QUESTIONS,
            gameMaster,
            invalidOptions,
            INITIAL_IPFS_CID
        );
    }

    function testConstructorRevertsWithEmptyIpfsCID() public {
        vm.expectRevert(Gurukul.Gurukul__NotValidIfpsAddress.selector);
        new Gurukul(
            address(mockCadenceArch),
            dao,
            address(yodhaNFT),
            INITIAL_NUMBER_OF_QUESTIONS,
            gameMaster,
            initialQuestionsToOptions,
            ""
        );
    }

    /*//////////////////////////////////////////////////////////////
                          ENTER GURUKUL TESTS
    //////////////////////////////////////////////////////////////*/

    function testEnterGurukul() public {
        uint256 tokenId = 1;

        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);

        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory questions = gurukul.getTokenIdToQuestions(tokenId);
        assertEq(questions.length, 5);

        // Check that all questions are within valid range
        for (uint256 i = 0; i < questions.length; i++) {
            assertLt(questions[i], INITIAL_NUMBER_OF_QUESTIONS);
        }
    }

    function testEnterGurukulRevertsIfNotOwner() public {
        uint256 tokenId = 1;
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);

        vm.expectRevert(Gurukul.Gurukul__NotOwner.selector);

        vm.prank(user2);
        gurukul.enterGurukul(tokenId);
    }

    function testEnterGurukulRevertsIfAlreadyEntered() public {
        uint256 tokenId = 1;

        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);

        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        vm.expectRevert(Gurukul.Gurukul__NotOwner.selector);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);
    }

    function testEnterGurukulGeneratesUniqueQuestions() public {
        uint256 tokenId = 1;

        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory questions = gurukul.getTokenIdToQuestions(tokenId);

        // Check that all questions are unique
        for (uint256 i = 0; i < questions.length; i++) {
            for (uint256 j = i + 1; j < questions.length; j++) {
                assertNotEq(questions[i], questions[j], "Questions should be unique");
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                          ANSWER QUESTIONS TESTS
    //////////////////////////////////////////////////////////////*/

    function testAnswerAllotedQuestions() public {
        uint256 tokenId = 1;

        // First enter Gurukul
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);
        selectedOptions[0] = 0;
        selectedOptions[1] = 1;
        selectedOptions[2] = 2;
        selectedOptions[3] = 3;
        selectedOptions[4] = 0;

        vm.expectEmit(true, true, false, true);
        emit YodhaAnsweredQuestions(user1, tokenId, selectedOptions);

        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);

        uint256[] memory answers = gurukul.getTokenIdToAnswers(tokenId);
        assertEq(answers.length, 5);
        for (uint256 i = 0; i < answers.length; i++) {
            assertEq(answers[i], selectedOptions[i]);
        }
    }

    function testAnswerAllotedQuestionsRevertsIfNotOwner() public {
        uint256 tokenId = 1;

        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);

        vm.expectRevert(Gurukul.Gurukul__NotOwner.selector);
        vm.prank(user2);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);
    }

    function testAnswerAllotedQuestionsRevertsIfNotEntered() public {
        uint256 tokenId = 1;
        uint256[] memory selectedOptions = new uint256[](5);

        vm.expectRevert(Gurukul.Gurukul__PlayerHasNotBeenAllotedAnyQuestionsYetKindlyEnterGurukulFirst.selector);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);
    }

    function testAnswerAllotedQuestionsRevertsIfAlreadyAnswered() public {
        uint256 tokenId = 1;

        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);

        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);

        vm.expectRevert(Gurukul.Gurukul__PlayerAlreadyAnsweredTheQuestionsInstructNearAiToUpdateRanking.selector);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);
    }

    function testAnswerAllotedQuestionsRevertsWithWrongNumberOfOptions() public {
        uint256 tokenId = 1;

        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](3); // Wrong number

        vm.expectRevert(Gurukul.Gurukul__InvalidOption.selector);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);
    }

    function testAnswerAllotedQuestionsRevertsWithInvalidOption() public {
        uint256 tokenId = 1;

        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);
        selectedOptions[0] = 5; // Invalid option (max is 3 for 4 options)

        vm.expectRevert(Gurukul.Gurukul__InvalidOption.selector);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);
    }

    /*//////////////////////////////////////////////////////////////
                          UPDATE TRAITS TESTS
    //////////////////////////////////////////////////////////////*/

    function testUpdateTraits() public {
        uint256 tokenId = 1;

        // Setup: Enter Gurukul and answer questions
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);

        // Create signed data
        uint16 strength = 5000;
        uint16 wit = 6000;
        uint16 charisma = 7000;
        uint16 defence = 8000;
        uint16 luck = 9000;

        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, strength, wit, charisma, defence, luck));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(gameMasterPrivateKey, ethSignedMessage);
        bytes memory signedData = abi.encodePacked(r, s, v);

        vm.expectEmit(true, false, false, false);
        emit YodhaTraitsUpdated(tokenId);

        gurukul.updateTraits(tokenId, strength, wit, charisma, defence, luck, signedData);

        // Check that questions and answers are cleared
        assertEq(gurukul.getTokenIdToQuestions(tokenId).length, 0);
        assertEq(gurukul.getTokenIdToAnswers(tokenId).length, 0);
    }

    function testUpdateTraitsRevertsIfNotAnswered() public {
        uint256 tokenId = 1;

        uint16 strength = 5000;
        uint16 wit = 6000;
        uint16 charisma = 7000;
        uint16 defence = 8000;
        uint16 luck = 9000;

        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, strength, wit, charisma, defence, luck));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(gameMasterPrivateKey, ethSignedMessage);
        bytes memory signedData = abi.encodePacked(r, s, v);

        vm.expectRevert(Gurukul.Gurukul__PlayersDidntAnsweredTheQuestionsYet.selector);
        gurukul.updateTraits(tokenId, strength, wit, charisma, defence, luck, signedData);
    }

    function testUpdateTraitsRevertsWithInvalidTraits() public {
        uint256 tokenId = 1;

        // Setup
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);

        uint16 strength = 10001; // Invalid - too high
        uint16 wit = 6000;
        uint16 charisma = 7000;
        uint16 defence = 8000;
        uint16 luck = 9000;

        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, strength, wit, charisma, defence, luck));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(gameMasterPrivateKey, ethSignedMessage);
        bytes memory signedData = abi.encodePacked(r, s, v);

        vm.expectRevert(Gurukul.Gurukul__InvalidTraits.selector);
        gurukul.updateTraits(tokenId, strength, wit, charisma, defence, luck, signedData);
    }

    function testUpdateTraitsRevertsWithInvalidSignature() public {
        uint256 tokenId = 1;

        // Setup
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);

        uint16 strength = 5000;
        uint16 wit = 6000;
        uint16 charisma = 7000;
        uint16 defence = 8000;
        uint16 luck = 9000;

        // Create invalid signature
        bytes memory invalidSignedData = abi.encodePacked(bytes32(0), bytes32(0), uint8(0));

        vm.expectRevert();
        gurukul.updateTraits(tokenId, strength, wit, charisma, defence, luck, invalidSignedData);
    }

    /*//////////////////////////////////////////////////////////////
                          INCREASE QUESTIONS TESTS
    //////////////////////////////////////////////////////////////*/

    function testIncreaseQuestions() public {
        uint256 newNumberOfQuestions = 15;
        uint256[] memory newQuestionsToOptions = new uint256[](15);
        for (uint256 i = 0; i < 15; i++) {
            newQuestionsToOptions[i] = 3;
        }

        vm.expectEmit(false, false, false, true);
        emit QuestionAdded(newNumberOfQuestions, newQuestionsToOptions);

        vm.prank(dao);
        gurukul.increaseQuestions(newNumberOfQuestions, newQuestionsToOptions, NEW_IPFS_CID);

        assertEq(gurukul.getNumberOfQuestions(), newNumberOfQuestions + INITIAL_NUMBER_OF_QUESTIONS);
        assertEq(gurukul.getIpfsCID(), NEW_IPFS_CID);
        assertEq(gurukul.getQuestionToOptions().length, 15 + INITIAL_NUMBER_OF_QUESTIONS);
    }

    function testIncreaseQuestionsRevertsIfNotDao() public {
        uint256 newNumberOfQuestions = 15;
        uint256[] memory newQuestionsToOptions = new uint256[](5);

        vm.expectRevert(Gurukul.Gurukul__NotDAO.selector);
        vm.prank(user1);
        gurukul.increaseQuestions(newNumberOfQuestions, newQuestionsToOptions, NEW_IPFS_CID);
    }

    function testIncreaseQuestionsRevertsWithInvalidNumber() public {
        uint256 newNumberOfQuestions = 5; // Less than current
        uint256[] memory newQuestionsToOptions = new uint256[](5);

        vm.expectRevert(Gurukul.Gurukul__NotValidInitialNumberOfQuestions.selector);
        vm.prank(dao);
        gurukul.increaseQuestions(newNumberOfQuestions, newQuestionsToOptions, NEW_IPFS_CID);
    }

    function testIncreaseQuestionsRevertsWithEmptyIpfs() public {
        uint256 newNumberOfQuestions = 15;
        uint256[] memory newQuestionsToOptions = new uint256[](15);

        vm.expectRevert(Gurukul.Gurukul__NotValidIfpsAddress.selector);
        vm.prank(dao);
        gurukul.increaseQuestions(newNumberOfQuestions, newQuestionsToOptions, "");
    }

    function testIncreaseQuestionsRevertsWithInvalidOptions() public {
        uint256 newNumberOfQuestions = 15;
        uint256[] memory newQuestionsToOptions = new uint256[](15);
        newQuestionsToOptions[0] = 1; // Invalid - too few options

        vm.expectRevert(Gurukul.Gurukul__NotEnoughOptionsForQuestion.selector);
        vm.prank(dao);
        gurukul.increaseQuestions(newNumberOfQuestions, newQuestionsToOptions, NEW_IPFS_CID);
    }

    /*//////////////////////////////////////////////////////////////
                          DELETE QUESTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testDeleteQuestion() public {
        uint256 questionIndex = 5;

        vm.expectEmit(false, false, false, true);
        emit QuestionRemoved(questionIndex);

        vm.prank(dao);
        gurukul.deleteQuestion(questionIndex, NEW_IPFS_CID);

        assertEq(gurukul.getNumberOfQuestions(), INITIAL_NUMBER_OF_QUESTIONS - 1);
        assertEq(gurukul.getIpfsCID(), NEW_IPFS_CID);
        assertEq(gurukul.getQuestionToOptions().length, INITIAL_NUMBER_OF_QUESTIONS - 1);
    }

    function testDeleteQuestionRevertsIfNotDao() public {
        vm.expectRevert(Gurukul.Gurukul__NotDAO.selector);
        vm.prank(user1);
        gurukul.deleteQuestion(0, NEW_IPFS_CID);
    }

    function testDeleteQuestionRevertsWithInvalidIndex() public {
        uint256 invalidIndex = 100;

        vm.expectRevert(Gurukul.Gurukul__NotValidInitialQuestionsToOptionsLength.selector);
        vm.prank(dao);
        gurukul.deleteQuestion(invalidIndex, NEW_IPFS_CID);
    }

    function testDeleteQuestionRevertsWithEmptyIpfs() public {
        vm.expectRevert(Gurukul.Gurukul__NotValidIfpsAddress.selector);
        vm.prank(dao);
        gurukul.deleteQuestion(0, "");
    }

    /*//////////////////////////////////////////////////////////////
                          GETTER FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testGetNumberOfQuestions() public view {
        assertEq(gurukul.getNumberOfQuestions(), INITIAL_NUMBER_OF_QUESTIONS);
    }

    function testGetQuestionToOptions() public view {
        uint256[] memory options = gurukul.getQuestionToOptions();
        assertEq(options.length, INITIAL_NUMBER_OF_QUESTIONS);
        for (uint256 i = 0; i < options.length; i++) {
            assertEq(options[i], 4);
        }
    }

    function testGetTokenIdToQuestions() public {
        uint256 tokenId = 1;

        // Initially empty
        assertEq(gurukul.getTokenIdToQuestions(tokenId).length, 0);

        // After entering Gurukul
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        assertEq(gurukul.getTokenIdToQuestions(tokenId).length, 5);
    }

    function testGetTokenIdToAnswers() public {
        uint256 tokenId = 1;

        // Initially empty
        assertEq(gurukul.getTokenIdToAnswers(tokenId).length, 0);

        // After answering questions
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);

        assertEq(gurukul.getTokenIdToAnswers(tokenId).length, 5);
    }

    function testGetIpfsCID() public view {
        assertEq(gurukul.getIpfsCID(), INITIAL_IPFS_CID);
    }

    function testGetUsersAnswers() public {
        uint256 tokenId = 1;

        // Setup
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        uint256[] memory selectedOptions = new uint256[](5);
        selectedOptions[0] = 0;
        selectedOptions[1] = 1;
        selectedOptions[2] = 2;
        selectedOptions[3] = 3;
        selectedOptions[4] = 0;

        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);

        (uint256[] memory questions, uint256[] memory answers) = gurukul.getUsersAnswers(tokenId);

        assertEq(questions.length, 5);
        assertEq(answers.length, 5);

        for (uint256 i = 0; i < answers.length; i++) {
            assertEq(answers[i], selectedOptions[i]);
        }
    }

    function testGetUsersAnswersRevertsIfNotAnswered() public {
        uint256 tokenId = 1;

        vm.expectRevert(Gurukul.Gurukul__PlayersDidntAnsweredTheQuestionsYet.selector);
        gurukul.getUsersAnswers(tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                          INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testFullWorkflow() public {
        uint256 tokenId = 1;

        // 1. Enter Gurukul
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        // 2. Answer questions
        uint256[] memory selectedOptions = new uint256[](5);
        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId, selectedOptions);

        // 3. Update traits
        uint16 strength = 5000;
        uint16 wit = 6000;
        uint16 charisma = 7000;
        uint16 defence = 8000;
        uint16 luck = 9000;

        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, strength, wit, charisma, defence, luck));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(gameMasterPrivateKey, ethSignedMessage);
        bytes memory signedData = abi.encodePacked(r, s, v);

        gurukul.updateTraits(tokenId, strength, wit, charisma, defence, luck, signedData);

        // 4. Verify state is reset
        assertEq(gurukul.getTokenIdToQuestions(tokenId).length, 0);
        assertEq(gurukul.getTokenIdToAnswers(tokenId).length, 0);

        // 5. Should be able to enter Gurukul again
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId);

        assertEq(gurukul.getTokenIdToQuestions(tokenId).length, 5);
    }

    function testMultipleUsersWorkflow() public {
        uint256 tokenId1 = 1;
        uint256 tokenId2 = 2;

        // User 1 enters Gurukul
        vm.prank(user1);
        yodhaNFT.approve(address(gurukul), tokenId1);
        vm.prank(user1);
        gurukul.enterGurukul(tokenId1);

        // User 2 enters Gurukul
        vm.prank(user2);
        yodhaNFT.approve(address(gurukul), tokenId2);
        vm.prank(user2);
        gurukul.enterGurukul(tokenId2);

        // Both should have questions assigned
        assertEq(gurukul.getTokenIdToQuestions(tokenId1).length, 5);
        assertEq(gurukul.getTokenIdToQuestions(tokenId2).length, 5);

        // Both answer questions
        uint256[] memory selectedOptions = new uint256[](5);

        vm.prank(user1);
        gurukul.answerAllotedQuestions(tokenId1, selectedOptions);

        vm.prank(user2);
        gurukul.answerAllotedQuestions(tokenId2, selectedOptions);

        // Both should have answers recorded
        assertEq(gurukul.getTokenIdToAnswers(tokenId1).length, 5);
        assertEq(gurukul.getTokenIdToAnswers(tokenId2).length, 5);
    }

    /*//////////////////////////////////////////////////////////////
                          EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function testRandomQuestionSelectionWithLimitedQuestions() public {
        // Deploy Gurukul with exactly 5 questions (minimum)
        uint256[] memory minOptions = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            minOptions[i] = 2;
        }

        Gurukul minGurukul =
            new Gurukul(address(mockCadenceArch), dao, address(yodhaNFT), 5, gameMaster, minOptions, INITIAL_IPFS_CID);

        uint256 tokenId = 1;
        vm.prank(user1);
        yodhaNFT.approve(address(minGurukul), tokenId);
        vm.prank(user1);
        minGurukul.enterGurukul(tokenId);

        uint256[] memory questions = minGurukul.getTokenIdToQuestions(tokenId);
        assertEq(questions.length, 5);

        // With only 5 questions and needing 5 unique ones, should get all questions
        bool[] memory questionUsed = new bool[](5);
        for (uint256 i = 0; i < questions.length; i++) {
            assertLt(questions[i], 5);
            assertFalse(questionUsed[questions[i]], "Question should be unique");
            questionUsed[questions[i]] = true;
        }
    }

    function testQuestionDeletionMaintainsOrder() public {
        // Add some questions first
        uint256[] memory newOptions = new uint256[](12);
        newOptions[0] = 3;
        newOptions[1] = 3;
        newOptions[2] = 3;
        newOptions[3] = 3;
        newOptions[4] = 3;
        newOptions[5] = 3;
        newOptions[6] = 3;
        newOptions[7] = 3;
        newOptions[8] = 3;
        newOptions[9] = 3;
        newOptions[10] = 3;
        newOptions[11] = 3;

        vm.prank(dao);
        gurukul.increaseQuestions(12, newOptions, NEW_IPFS_CID);

        // Now delete question at index 5
        vm.prank(dao);
        gurukul.deleteQuestion(5, NEW_IPFS_CID);

        // Verify the array is properly shifted
        uint256[] memory options = gurukul.getQuestionToOptions();
        assertEq(options.length, 21);

        // All remaining questions should have valid option counts
        for (uint256 i = 0; i < options.length; i++) {
            assertGe(options[i], 2);
        }
    }

    function testLargeScaleQuestionManagement() public {
        // Add many questions
        uint256[] memory manyOptions = new uint256[](60);
        for (uint256 i = 0; i < 60; i++) {
            manyOptions[i] = 4;
        }

        vm.prank(dao);
        gurukul.increaseQuestions(60, manyOptions, NEW_IPFS_CID);

        assertEq(gurukul.getNumberOfQuestions(), 70);

        // Delete several questions
        for (uint256 i = 0; i < 10; i++) {
            vm.prank(dao);
            gurukul.deleteQuestion(0, NEW_IPFS_CID); // Always delete first question
        }

        assertEq(gurukul.getNumberOfQuestions(), 60);
    }
}
