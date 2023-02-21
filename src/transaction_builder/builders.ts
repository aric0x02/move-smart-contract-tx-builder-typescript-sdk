// Copyright (c) Aptos
// SPDX-License-Identifier: Apache-2.0

import {
    AccountAddress,
    EntryFunction,
    Identifier,
    Script,
    Call,
    TxV1,
    TransactionV1,
    Transaction,
    TransactionArgument,
    CallEntryFunction,
    CallScript,
    ModuleId,
} from "../aptos_types";
import { bcsToBytes, Bytes, Deserializer, Serializer, Uint64, Uint8 } from "../bcs";
import { ArgumentABI, EntryFunctionABI, ScriptABI, TransactionScriptABI, TypeArgumentABI } from "../aptos_types/abi";
import { HexString, MaybeHexString } from "../hex_string";
import { argToTransactionArgument, TypeTagParser, serializeArg } from "./builder_utils";
import * as Gen from "../generated/index";

export { TypeTagParser } from "./builder_utils";


/**
 * Config for creating raw transactions.
 */
interface ABIBuilderConfig {
    sender: MaybeHexString | AccountAddress;
    sequenceNumber: Uint64 | string;
    gasUnitPrice: Uint64 | string;
    maxGasAmount?: Uint64 | string;
    expSecFromNow?: number | string;
    chainId: Uint8 | string;
}

/**
 * Builds raw transactions based on ABI
 */
export class TransactionBuilderABI {
    private readonly abiMap: Map<string, ScriptABI>;


    /**
     * Constructs a TransactionBuilderABI instance
     * @param abis List of binary ABIs.
     * @param builderConfig Configs for creating a raw transaction.
     */
    constructor(abis: Bytes[]) {
        this.abiMap = new Map<string, ScriptABI>();

        abis.forEach((abi) => {
            const deserializer = new Deserializer(abi);
            const scriptABI = ScriptABI.deserialize(deserializer);
            let k: string;
            if (scriptABI instanceof EntryFunctionABI) {
                const funcABI = scriptABI as EntryFunctionABI;
                const { address: addr, name: moduleName } = funcABI.module_name;
                k = `${HexString.fromUint8Array(addr.address).toShortString()}::${moduleName.value}::${funcABI.name}`;
            } else {
                const funcABI = scriptABI as TransactionScriptABI;
                k = funcABI.name;
            }

            if (this.abiMap.has(k)) {
                throw new Error("Found conflicting ABI interfaces");
            }

            this.abiMap.set(k, scriptABI);
        });
    }

    private static toBCSArgs(abiArgs: any[], args: any[]): Bytes[] {
        if (abiArgs.length !== args.length) {
            throw new Error("Wrong number of args provided.");
        }

        return args.map((arg, i) => {
            const serializer = new Serializer();
            serializeArg(arg, abiArgs[i].type_tag, serializer);
            return serializer.getBytes();
        });
    }

    private static toTransactionArguments(abiArgs: any[], args: any[]): TransactionArgument[] {
        if (abiArgs.length !== args.length) {
            throw new Error("Wrong number of args provided.");
        }

        return args.map((arg, i) => argToTransactionArgument(arg, abiArgs[i].type_tag));
    }



    /**
     * Builds a Call. For dApps, chain ID and account sequence numbers are only known to the wallet.
     * Instead of building a RawTransaction (requires chainID and sequenceNumber), dApps can build a Call
     * and pass the payload to the wallet for signing and sending.
     * @param func Fully qualified func names, e.g. 0x1::Coin::transfer
     * @param ty_tags TypeTag strings
     * @param args Function arguments
     * @returns Call
     */
    buildCall(func: string, ty_tags: string[], args: any[]): TxV1 {
        const typeTags = ty_tags.map((ty_arg) => new TypeTagParser(ty_arg).parseTypeTag());

        let payload: Call;
        let bcsargs: Bytes[]
        if (!this.abiMap.has(func)) {
            throw new Error(`Cannot find function: ${func}`);
        }

        const scriptABI = this.abiMap.get(func);

        if (scriptABI instanceof EntryFunctionABI) {
            const funcABI = scriptABI as EntryFunctionABI;
            bcsargs = TransactionBuilderABI.toBCSArgs(funcABI.args, args);
            const [addr] = func.split("::");
            payload = new CallEntryFunction(new EntryFunction(AccountAddress.fromHex(addr), funcABI.module_name.name,
                new Identifier(funcABI.name)));
        } else if (scriptABI instanceof TransactionScriptABI) {
            const funcABI = scriptABI as TransactionScriptABI;
            bcsargs = TransactionBuilderABI.toBCSArgs(funcABI.args, args);
            payload = new CallScript(new Script(funcABI.code));
        } else {
            /* istanbul ignore next */
            throw new Error("Unknown ABI format.");
        }

        return new TxV1([],
            payload, bcsargs, typeTags);
    }

    /**
     * Builds a RawTransaction
     * @param func Fully qualified func names, e.g. 0x1::Coin::transfer
     * @param ty_tags TypeTag strings.
     * @example Below are valid value examples
     * ```
     * // Structs are in format `AccountAddress::ModuleName::StructName`
     * 0x1::aptos_coin::AptosCoin
     * // Vectors are in format `vector<other_tag_string>`
     * vector<0x1::aptos_coin::AptosCoin>
     * bool
     * u8
     * u16
     * u32
     * u64
     * u128
     * u256
     * address
     * ```
     * @param args Function arguments
     * @returns RawTransaction
     */
    build(func: string, ty_tags: string[], args: any[]): Transaction {
        const payload = this.buildCall(func, ty_tags, args);


        if (payload) {
            console.log("==============payload=============", payload)
            return new TransactionV1(
                payload
            );
        }

        throw new Error("Invalid ABI.");
    }
}

export type RemoteABIBuilderConfig = Partial<Omit<ABIBuilderConfig, "sender">> & {
    sender: MaybeHexString | AccountAddress;
};


/**
 * This transaction builder downloads JSON ABIs from the fullnodes.
 * It then translates the JSON ABIs to the format that is accepted by TransactionBuilderABI
 */
export class TransactionBuilderRemoteABI {
    // We don't want the builder to depend on the actual AptosClient. There might be circular dependencies.

    static async fetchABI() {
        const modules = [JSON.parse('{"abi":{"address":"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d","exposed_functions":[{"generic_type_params":[],"is_entry":true,"name":"store_sum_func","params":["signer","u64","u64"],"return":[],"visibility":"script"},{"generic_type_params":[{"constraints":[]}],"is_entry":true,"name":"store_sum_funct","params":["signer","u64","u64"],"return":[],"visibility":"script"},{"generic_type_params":[],"is_entry":true,"name":"sum_func","params":["signer","u64","u64"],"return":[],"visibility":"script"},{"generic_type_params":[{"constraints":[]}],"is_entry":true,"name":"sum_funct","params":["signer","u64","u64"],"return":[],"visibility":"script"},{"generic_type_params":[],"is_entry":true,"name":"test","params":[],"return":[],"visibility":"script"},{"generic_type_params":[],"is_entry":true,"name":"test2","params":["u64","u64"],"return":[],"visibility":"script"}],"friends":[],"name":"ScriptBook","structs":[]},"bytecode":"0xa11ceb0b040000000801000a020a04030e4a045804055c1e077ab70108b102400cf1028e0100000101000200030004040f0f00000500010000060001010000070001000008000101000009010100000a020100040b040100010c050600040d060300040e0401010004100608000311020300021209010002130401010009070d07030c030300020303010303060c030301060c010501090001080002060c030a536372697074426f6f6b065369676e65720a4576656e7450726f7879044d6174680753746f726167650e73746f72655f73756d5f66756e630f73746f72655f73756d5f66756e63740873756d5f66756e630973756d5f66756e637404746573740574657374320973746f72655f73756d0a616464726573735f6f66076765745f73756d0a73746f72655f73756d740353756d086765745f73756d74036164640a656d69745f6576656e740b656d69745f6576656e7474d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d00000000000000000000000000000000000000000000000000000000000000010002000003110e000a010a0211060e00110711080c030b010b02160b0321031006650000000000000027020102000001090e000b010b0238000e001107110a01020202000003080b010b02110b0c030e000b03110c020302000001050e000b010b02380102040200000101020502000001090b000b0116060500000000000000210308066500000000000000270200"}')];
        //await this.aptosClient.getAccountModules(addr);
        const abis = modules
            .map((module) => module.abi)
            .flatMap((abi) =>
                abi!.exposed_functions
                    .filter((ef: any) => ef.is_entry)
                    .map(
                        (ef: any) =>
                        ({
                            fullName: `${abi!.address}::${abi!.name}::${ef.name}`,
                            ...ef,
                        } as Gen.MoveFunction & { fullName: string }),
                    ),
            );

        const abiMap = new Map<string, Gen.MoveFunction & { fullName: string }>();
        abis.forEach((abi) => {
            abiMap.set(abi.fullName, abi);
        });

        return abiMap;
    }

    /**
     * Builds a raw transaction. Only support script function a.k.a entry function payloads
     *
     * @param func fully qualified function name in format <address>::<module>::<function>, e.g. 0x1::coins::transfer
     * @param ty_tags
     * @param args
     * @returns RawTransaction
     */
    static async build(func: Gen.EntryFunctionId, ty_tags: Gen.MoveType[], args: any[]): Promise<Transaction> {
        /* eslint no-param-reassign: ["off"] */
        const normlize = (s: string) => s.replace(/^0[xX]0*/g, "0x");
        func = normlize(func);
        const funcNameParts = func.split("::");
        if (funcNameParts.length !== 3) {
            throw new Error(
                // eslint-disable-next-line max-len
                "'func' needs to be a fully qualified function name in format <address>::<module>::<function>, e.g. 0x1::coins::transfer",
            );
        }

        const [addr, module] = func.split("::");

        // Downloads the JSON abi
        const abiMap = await TransactionBuilderRemoteABI.fetchABI();
        if (!abiMap.has(func)) {
            throw new Error(`${func} doesn't exist.`);
        }

        const funcAbi = abiMap.get(func);

        // Remove all `signer` and `&signer` from argument list because the Move VM injects those arguments. Clients do not
        // need to care about those args. `signer` and `&signer` are required be in the front of the argument list. But we
        // just loop through all arguments and filter out `signer` and `&signer`.
        const originalArgs = funcAbi!.params.filter((param) => param !== "signer" && param !== "&signer");

        // Convert string arguments to TypeArgumentABI
        const typeArgABIs = originalArgs.map((arg, i) => new ArgumentABI(`var${i}`, new TypeTagParser(arg).parseTypeTag()));

        const entryFunctionABI = new EntryFunctionABI(
            funcAbi!.name,
            ModuleId.fromStr(`${addr}::${module}`),
            "", // Doc string
            funcAbi!.generic_type_params.map((_, i) => new TypeArgumentABI(`${i}`)),
            typeArgABIs,
        );

        const builderABI = new TransactionBuilderABI([bcsToBytes(entryFunctionABI)]);

        return builderABI.build(func, ty_tags, args);
    }
}
