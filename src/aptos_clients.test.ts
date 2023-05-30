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
        const abi = '{"abi":{"address":"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d","exposed_functions":[{"generic_type_params":[],"is_entry":true,"name":"store_sum_func","params":["signer","u64","u64"],"return":[],"visibility":"script"},{"generic_type_params":[{"constraints":[]}],"is_entry":true,"name":"store_sum_funct","params":["signer","u64","u64"],"return":[],"visibility":"script"},{"generic_type_params":[],"is_entry":true,"name":"sum_func","params":["signer","u64","u64"],"return":[],"visibility":"script"},{"generic_type_params":[{"constraints":[]}],"is_entry":true,"name":"sum_funct","params":["signer","u64","u64"],"return":[],"visibility":"script"},{"generic_type_params":[],"is_entry":true,"name":"test","params":[],"return":[],"visibility":"script"},{"generic_type_params":[],"is_entry":true,"name":"test2","params":["u64","u64"],"return":[],"visibility":"script"}],"friends":[],"name":"ScriptBook","structs":[]},"bytecode":"0xa11ceb0b040000000801000a020a04030e4a045804055c1e077ab70108b102400cf1028e0100000101000200030004040f0f00000500010000060001010000070001000008000101000009010100000a020100040b040100010c050600040d060300040e0401010004100608000311020300021209010002130401010009070d07030c030300020303010303060c030301060c010501090001080002060c030a536372697074426f6f6b065369676e65720a4576656e7450726f7879044d6174680753746f726167650e73746f72655f73756d5f66756e630f73746f72655f73756d5f66756e63740873756d5f66756e630973756d5f66756e637404746573740574657374320973746f72655f73756d0a616464726573735f6f66076765745f73756d0a73746f72655f73756d740353756d086765745f73756d74036164640a656d69745f6576656e740b656d69745f6576656e7474d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d00000000000000000000000000000000000000000000000000000000000000010002000003110e000a010a0211060e00110711080c030b010b02160b0321031006650000000000000027020102000001090e000b010b0238000e001107110a01020202000003080b010b02110b0c030e000b03110c020302000001050e000b010b02380102040200000101020502000001090b000b0116060500000000000000210308066500000000000000270200"}';

        const rawTxn = await TransactionBuilderRemoteABI.build(abi,
            "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d::ScriptBook::test",
            [],
            [],
        );
        
        expect(HexString.fromUint8Array(bcsToBytes(rawTxn)).hex()).toBe(
            HexString.fromUint8Array(bcsToBytes(AccountAddress.fromHex("0x02"))).hex(),
        );
     
    },
    10000,
);
