// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Kurukshetra} from "../src/Kurukshetra/Kurukshetra.sol";
import {YodhaNFT} from "../src/Chaavani/YodhaNFT.sol";
import {Bazaar} from "../src/Bazaar/Bazaar.sol";
import {Gurukul} from "../src/Gurukul/Gurukul.sol";
import {KurukshetraFactory} from "../src/Kurukshetra/KurukshetraFactory.sol";
import {Script} from "../lib/forge-std/src/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {RannToken} from "../src/RannToken.sol";

contract DeployRann is Script {
    YodhaNFT public s_yodhaNFT;
    Bazaar public s_bazaar;
    Gurukul public s_gurukul;
    KurukshetraFactory public s_kurukshetraFactory;
    RannToken public s_rannToken;
    HelperConfig public s_helperConfig;
    address s_dao;

    /**
     *  @notice Deploys the Rann game contracts including YodhaNFT, Bazaar, Gurukul, KurukshetraFactory, and RannToken.
     */
    function run() external {
        vm.startBroadcast();
        s_helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = s_helperConfig.getConfig();

        s_rannToken = new RannToken();
        s_yodhaNFT = new YodhaNFT(s_dao, config.gameMasterPublicKey);
        s_gurukul = new Gurukul(
            config.cadenceArch,
            s_dao,
            address(s_yodhaNFT),
            config.initialNumberOfQuestions,
            config.gameMasterPublicKey,
            config.initialQuestionsToOptions,
            config.initialIpfsCid
        );
        s_yodhaNFT.setGurukul(address(s_gurukul));
        s_bazaar = new Bazaar(address(s_yodhaNFT), address(s_rannToken));
        s_kurukshetraFactory = new KurukshetraFactory(
            s_dao,
            config.costToInfluence,
            config.costToDefluence,
            address(s_rannToken),
            config.gameMasterPublicKey,
            config.cadenceArch,
            address(s_yodhaNFT),
            config.betAmount
        );
        s_yodhaNFT.setKurukshetraFactory(address(s_kurukshetraFactory));

        vm.stopBroadcast();
    }
}
