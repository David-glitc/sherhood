// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PotFactory} from "../src/PotFactory.sol";

/// @notice Deploy PotFactory behind a UUPS (ERC1967) proxy. Returned address is the proxy.
library ProxyDeploy {
    function deployFactory(address owner_, address usdg_, address card_) internal returns (PotFactory) {
        PotFactory impl = new PotFactory();
        bytes memory data = abi.encodeCall(PotFactory.initialize, (owner_, usdg_, card_));
        return PotFactory(address(new ERC1967Proxy(address(impl), data)));
    }
}
