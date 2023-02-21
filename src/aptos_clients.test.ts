// Copyright (c) Aptos
// SPDX-License-Identifier: Apache-2.0

// import { AptosClient } from "./aptos_client";
import * as Gen from "./generated/index";
import { TransactionBuilderRemoteABI } from "./transaction_builder";
// import { TokenClient } from "./token_client";
import { HexString } from "./hex_string";
// import { getFaucetClient, longTestTimeout, NODE_URL } from "./utils/test_helper.test";
import {  bcsToBytes } from "./bcs";
import { AccountAddress } from "./aptos_types";

test.only(
    "submits transaction with remote ABI",
    async () => {
        const rawTxn = await TransactionBuilderRemoteABI.build(
            "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d::ScriptBook::test",
            [],
            [],
        );
        console.log("==================================", rawTxn)
        expect(HexString.fromUint8Array(bcsToBytes(rawTxn)).hex()).toBe(
            HexString.fromUint8Array(bcsToBytes(AccountAddress.fromHex("0x02"))).hex(),
        );
     
    },
    10000,
);
