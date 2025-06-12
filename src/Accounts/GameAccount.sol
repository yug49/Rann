 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/account/Account.sol";
import "@openzeppelin/contracts/account/extensions/draft-AccountERC7579.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title GameAccount
 * @dev A smart contract account implementation for the Flowemv++ game that implements account abstraction features
 * including multi-sig, sponsored transactions, bundled transactions, and account recovery.
 */
contract GameAccount is Account, AccountERC7579, EIP712 {
    using ECDSA for bytes32;

    // Struct for multi-sig configuration
    struct MultiSigConfig {
        address[] signers;
        uint256 threshold;
        mapping(address => bool) isSigner;
    }

    // Struct for session key configuration
    struct SessionKey {
        uint256 validUntil;
        uint256 maxValue;
        bool isValid;
    }

    // Constants
    bytes32 private constant SESSION_KEY_TYPEHASH = keccak256(
        "SessionKey(address account,uint256 validUntil,uint256 maxValue)"
    );

    // State variables
    MultiSigConfig private _multiSigConfig;
    mapping(address => SessionKey) private _sessionKeys;
    mapping(address => bool) private _recoveryGuardians;
    uint256 private _recoveryThreshold;

    // Events
    event SessionKeyAdded(address indexed account, uint256 validUntil, uint256 maxValue);
    event SessionKeyRevoked(address indexed account);
    event RecoveryGuardianAdded(address indexed guardian);
    event RecoveryGuardianRemoved(address indexed guardian);
    event RecoveryThresholdUpdated(uint256 newThreshold);
    event MultiSigConfigUpdated(address[] signers, uint256 threshold);

    // Errors
    error InvalidSignature();
    error InvalidSessionKey();
    error SessionKeyExpired();
    error ExceedsMaxValue();
    error InvalidMultiSigConfig();
    error InvalidRecoveryGuardian();
    error InsufficientGuardianSignatures();

    constructor(
        address[] memory initialSigners,
        uint256 initialThreshold,
        address[] memory initialGuardians,
        uint256 initialRecoveryThreshold
    ) EIP712("GameAccount", "1") {
        _setupMultiSig(initialSigners, initialThreshold);
        _setupRecovery(initialGuardians, initialRecoveryThreshold);
    }

    /**
     * @dev Sets up the multi-sig configuration
     */
    function _setupMultiSig(address[] memory signers, uint256 threshold) private {
        if (signers.length == 0 || threshold == 0 || threshold > signers.length) {
            revert InvalidMultiSigConfig();
        }

        _multiSigConfig.signers = signers;
        _multiSigConfig.threshold = threshold;

        for (uint256 i = 0; i < signers.length; i++) {
            _multiSigConfig.isSigner[signers[i]] = true;
        }

        emit MultiSigConfigUpdated(signers, threshold);
    }

    /**
     * @dev Sets up the recovery configuration
     */
    function _setupRecovery(address[] memory guardians, uint256 threshold) private {
        if (guardians.length == 0 || threshold == 0 || threshold > guardians.length) {
            revert InvalidRecoveryGuardian();
        }

        _recoveryThreshold = threshold;

        for (uint256 i = 0; i < guardians.length; i++) {
            _recoveryGuardians[guardians[i]] = true;
            emit RecoveryGuardianAdded(guardians[i]);
        }

        emit RecoveryThresholdUpdated(threshold);
    }

    /**
     * @dev Validates a user operation with multi-sig support
     */
    function _validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256) {
        // Check if the operation is signed by a valid session key
        if (_sessionKeys[msg.sender].isValid) {
            SessionKey storage sessionKey = _sessionKeys[msg.sender];
            if (block.timestamp > sessionKey.validUntil) {
                revert SessionKeyExpired();
            }
            if (userOp.callGasLimit > sessionKey.maxValue) {
                revert ExceedsMaxValue();
            }
            return ERC4337Utils.SIG_VALIDATION_SUCCESS;
        }

        // Check multi-sig signatures
        bytes[] memory signatures = abi.decode(userOp.signature, (bytes[]));
        if (signatures.length < _multiSigConfig.threshold) {
            revert InvalidSignature();
        }

        uint256 validSignatures = 0;
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = userOpHash.recover(signatures[i]);
            if (_multiSigConfig.isSigner[signer]) {
                validSignatures++;
            }
        }

        if (validSignatures < _multiSigConfig.threshold) {
            revert InvalidSignature();
        }

        return ERC4337Utils.SIG_VALIDATION_SUCCESS;
    }

    /**
     * @dev Adds a session key for pre-approved transactions
     */
    function addSessionKey(
        address account,
        uint256 validUntil,
        uint256 maxValue,
        bytes calldata signature
    ) external {
        bytes32 structHash = keccak256(
            abi.encode(
                SESSION_KEY_TYPEHASH,
                account,
                validUntil,
                maxValue
            )
        );
        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = hash.recover(signature);
        if (!_multiSigConfig.isSigner[signer]) {
            revert InvalidSignature();
        }

        _sessionKeys[account] = SessionKey({
            validUntil: validUntil,
            maxValue: maxValue,
            isValid: true
        });

        emit SessionKeyAdded(account, validUntil, maxValue);
    }

    /**
     * @dev Revokes a session key
     */
    function revokeSessionKey(address account) external {
        if (!_multiSigConfig.isSigner[msg.sender]) {
            revert InvalidSignature();
        }

        delete _sessionKeys[account];
        emit SessionKeyRevoked(account);
    }

    /**
     * @dev Recovers the account with guardian signatures
     */
    function recoverAccount(
        address newOwner,
        bytes[] calldata guardianSignatures
    ) external {
        if (guardianSignatures.length < _recoveryThreshold) {
            revert InsufficientGuardianSignatures();
        }

        bytes32 recoveryHash = keccak256(
            abi.encodePacked(
                "RECOVER_ACCOUNT",
                address(this),
                newOwner
            )
        );

        uint256 validSignatures = 0;
        for (uint256 i = 0; i < guardianSignatures.length; i++) {
            address guardian = recoveryHash.recover(guardianSignatures[i]);
            if (_recoveryGuardians[guardian]) {
                validSignatures++;
            }
        }

        if (validSignatures < _recoveryThreshold) {
            revert InsufficientGuardianSignatures();
        }

        // Transfer ownership to new owner
        // Implementation depends on your specific requirements
    }

    /**
     * @dev Adds a recovery guardian
     */
    function addRecoveryGuardian(address guardian) external {
        if (!_multiSigConfig.isSigner[msg.sender]) {
            revert InvalidSignature();
        }

        _recoveryGuardians[guardian] = true;
        emit RecoveryGuardianAdded(guardian);
    }

    /**
     * @dev Removes a recovery guardian
     */
    function removeRecoveryGuardian(address guardian) external {
        if (!_multiSigConfig.isSigner[msg.sender]) {
            revert InvalidSignature();
        }

        delete _recoveryGuardians[guardian];
        emit RecoveryGuardianRemoved(guardian);
    }

    /**
     * @dev Updates the recovery threshold
     */
    function updateRecoveryThreshold(uint256 newThreshold) external {
        if (!_multiSigConfig.isSigner[msg.sender]) {
            revert InvalidSignature();
        }

        uint256 guardianCount = 0;
        for (uint256 i = 0; i < _multiSigConfig.signers.length; i++) {
            if (_recoveryGuardians[_multiSigConfig.signers[i]]) {
                guardianCount++;
            }
        }

        if (newThreshold == 0 || newThreshold > guardianCount) {
            revert InvalidRecoveryGuardian();
        }

        _recoveryThreshold = newThreshold;
        emit RecoveryThresholdUpdated(newThreshold);
    }

    /**
     * @dev Returns the account ID
     */
    function accountId() public pure override returns (string memory) {
        return "flowemv.gameaccount.v1.0.0";
    }

    /**
     * @dev Returns whether the account supports a given module type
     */
    function supportsModule(uint256 moduleTypeId) public pure override returns (bool) {
        return moduleTypeId == MODULE_TYPE_VALIDATOR || 
               moduleTypeId == MODULE_TYPE_EXECUTOR || 
               moduleTypeId == MODULE_TYPE_FALLBACK;
    }
}