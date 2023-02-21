// Copyright (c) Aptos
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-classes-per-file */
import { HexString } from "../hex_string";
import {
    Deserializer,
    Serializer,
    Uint64,
    Bytes,
    Seq,
    Uint8,
    Uint128,
    deserializeVector,
    serializeVector,
    bcsToBytes,
    Uint16,
    Uint256,
} from "../bcs";
import { AccountAddress } from "./account_address";
import { Identifier } from "./identifier";
import { TypeTag } from "./type_tag";

export class TxV1 {
    /**
     * RawTransactions contain the metadata and payloads that can be submitted to Aptos chain for execution.
     * RawTransactions must be signed before Aptos chain can execute them.
     *
     * @param sender Account address of the sender.
     * @param sequence_number Sequence number of this transaction. This must match the sequence number stored in
     *   the sender's account at the time the transaction executes.
     * @param payload Instructions for the Aptos Blockchain, including publishing a module,
     *   execute a entry function or execute a script payload.
     * @param max_gas_amount Maximum total gas to spend for this transaction. The account must have more
     *   than this gas or the transaction will be discarded during validation.
     * @param gas_unit_price Price to be paid per gas unit.
     * @param expiration_timestamp_secs The blockchain timestamp at which the blockchain would discard this transaction.
     * @param chain_id The chain ID of the blockchain that this transaction is intended to be run on.
     */
    constructor(
        public readonly signers: Seq<Signer>,
        public readonly call: Call,
        public readonly args: Seq<Bytes>,
        public readonly type_args: Seq<TypeTag>,
    ) { }

    serialize(serializer: Serializer): void {
        serializeVector<Signer>(this.signers, serializer);
        this.call.serialize(serializer);
        serializer.serializeU32AsUleb128(this.args.length);
        this.args.forEach((item: Bytes) => {
            serializer.serializeBytes(item);
        });
        serializeVector<TypeTag>(this.type_args, serializer);
    }

    static deserialize(deserializer: Deserializer): TxV1 {
        const signers = deserializeVector(deserializer, TransactionArgument);
        const call = Call.deserialize(deserializer);
        const length = deserializer.deserializeUleb128AsU32();
        const list: Seq<Bytes> = [];
        for (let i = 0; i < length; i += 1) {
            list.push(deserializer.deserializeBytes());
        }

        const args = list;
        const type_args = deserializeVector(deserializer, TypeTag);
        return new TxV1(
            signers,
            call,
            args,
            type_args,
        );
    }
}

export class Script {
    /**
     * Scripts contain the Move bytecodes payload that can be submitted to Aptos chain for execution.
     * @param code Move bytecode
     * @param ty_args Type arguments that bytecode requires.
     *
     * @example
     * A coin transfer function has one type argument "CoinType".
     * ```
     * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
     * ```
     * @param args Arugments to bytecode function.
     *
     * @example
     * A coin transfer function has three arugments "from", "to" and "amount".
     * ```
     * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
     * ```
     */
    constructor(
        public readonly code: Bytes,
    ) { }

    serialize(serializer: Serializer): void {
        serializer.serializeBytes(this.code);
    }

    static deserialize(deserializer: Deserializer): Script {
        const code = deserializer.deserializeBytes();
        return new Script(code);
    }
}

export class EntryFunction {
    /**
     * Contains the payload to run a function within a module.
     * @param module_name Fully qualified module name. ModuleId consists of account address and module name.
     * @param function_name The function to run.
     * @param ty_args Type arguments that move function requires.
     *
     * @example
     * A coin transfer function has one type argument "CoinType".
     * ```
     * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
     * ```
     * @param args Arugments to the move function.
     *
     * @example
     * A coin transfer function has three arugments "from", "to" and "amount".
     * ```
     * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
     * ```
     */
    constructor(
        public readonly module_address: AccountAddress,
        public readonly module_name: Identifier,
        public readonly function_name: Identifier,
    ) { }

    /**
     *
     * @param module Fully qualified module name in format "AccountAddress::module_name" e.g. "0x1::coin"
     * @param func Function name
     * @param ty_args Type arguments that move function requires.
     *
     * @example
     * A coin transfer function has one type argument "CoinType".
     * ```
     * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
     * ```
     * @param args Arugments to the move function.
     *
     * @example
     * A coin transfer function has three arugments "from", "to" and "amount".
     * ```
     * public(script) fun transfer<CoinType>(from: &signer, to: address, amount: u64,)
     * ```
     * @returns
     */
    static natural(module_address: string, module: string, func: string): EntryFunction {
        return new EntryFunction(AccountAddress.fromHex(module_address),
             new Identifier(module), new Identifier(func));
    }

    /**
     * `natual` is deprecated, please use `natural`
     *
     * @deprecated.
     */
    static natual(module_address: string, module: string, func: string): EntryFunction {
        return EntryFunction.natural(module_address, module, func);
    }

    serialize(serializer: Serializer): void {
        this.module_address.serialize(serializer);
        this.module_name.serialize(serializer);
        this.function_name.serialize(serializer);
        // serializeVector<Signer>(this.ty_args, serializer);

        // serializer.serializeU32AsUleb128(this.args.length);
        // this.args.forEach((item: Bytes) => {
        //   serializer.serializeBytes(item);
        // });
    }

    static deserialize(deserializer: Deserializer): EntryFunction {
        const module_address = AccountAddress.deserialize(deserializer);
        const module_name = Identifier.deserialize(deserializer);
        const function_name = Identifier.deserialize(deserializer);
        // const ty_args = deserializeVector(deserializer, Signer);

        // const length = deserializer.deserializeUleb128AsU32();
        // const list: Seq<Bytes> = [];
        // for (let i = 0; i < length; i += 1) {
        //   list.push(deserializer.deserializeBytes());
        // }

        // const args = list;
        return new EntryFunction(module_address, module_name, function_name);
    }
}

export class Module {
    /**
     * Contains the bytecode of a Move module that can be published to the Aptos chain.
     * @param code Move bytecode of a module.
     */
    constructor(public readonly code: Bytes) { }

    serialize(serializer: Serializer): void {
        serializer.serializeBytes(this.code);
    }

    static deserialize(deserializer: Deserializer): Module {
        const code = deserializer.deserializeBytes();
        return new Module(code);
    }
}

export class ModuleId {
    /**
     * Full name of a module.
     * @param address The account address.
     * @param name The name of the module under the account at "address".
     */
    constructor(public readonly address: AccountAddress, public readonly name: Identifier) { }

    /**
     * Converts a string literal to a ModuleId
     * @param moduleId String literal in format "AccountAddress::module_name",
     *   e.g. "0x1::coin"
     * @returns
     */
    static fromStr(moduleId: string): ModuleId {
        const parts = moduleId.split("::");
        if (parts.length !== 2) {
            throw new Error("Invalid module id.");
        }
        return new ModuleId(AccountAddress.fromHex(new HexString(parts[0])), new Identifier(parts[1]));
    }

    serialize(serializer: Serializer): void {
        this.address.serialize(serializer);
        this.name.serialize(serializer);
    }

    static deserialize(deserializer: Deserializer): ModuleId {
        const address = AccountAddress.deserialize(deserializer);
        const name = Identifier.deserialize(deserializer);
        return new ModuleId(address, name);
    }
}


export abstract class Call {
    abstract serialize(serializer: Serializer): void;

    static deserialize(deserializer: Deserializer): Call {
        const index = deserializer.deserializeUleb128AsU32();
        switch (index) {
            case 0:
                return CallScript.load(deserializer);
            case 1:
                return CallEntryFunction.load(deserializer);
            default:
                throw new Error(`Unknown variant index for Call: ${index}`);
        }
    }
}

export class CallScript extends Call {
    constructor(public readonly value: Script) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(0);
        this.value.serialize(serializer);
    }

    static load(deserializer: Deserializer): CallScript {
        const value = Script.deserialize(deserializer);
        return new CallScript(value);
    }
}

export class CallEntryFunction extends Call {
    constructor(public readonly value: EntryFunction) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(1);
        this.value.serialize(serializer);
    }

    static load(deserializer: Deserializer): CallEntryFunction {
        const value = EntryFunction.deserialize(deserializer);
        return new CallEntryFunction(value);
    }
}

export class ChainId {
    constructor(public readonly value: Uint8) { }

    serialize(serializer: Serializer): void {
        serializer.serializeU8(this.value);
    }

    static deserialize(deserializer: Deserializer): ChainId {
        const value = deserializer.deserializeU8();
        return new ChainId(value);
    }
}

export abstract class TransactionArgument {
    abstract serialize(serializer: Serializer): void;

    static deserialize(deserializer: Deserializer): TransactionArgument {
        const index = deserializer.deserializeUleb128AsU32();
        switch (index) {
            case 0:
                return TransactionArgumentU8.load(deserializer);
            case 1:
                return TransactionArgumentU64.load(deserializer);
            case 2:
                return TransactionArgumentU128.load(deserializer);
            case 3:
                return TransactionArgumentAddress.load(deserializer);
            case 4:
                return TransactionArgumentU8Vector.load(deserializer);
            case 5:
                return TransactionArgumentBool.load(deserializer);
            case 6:
                return TransactionArgumentU16.load(deserializer);
            case 7:
                return TransactionArgumentU32.load(deserializer);
            case 8:
                return TransactionArgumentU256.load(deserializer);
            default:
                throw new Error(`Unknown variant index for TransactionArgument: ${index}`);
        }
    }
}

export class TransactionArgumentU8 extends TransactionArgument {
    constructor(public readonly value: Uint8) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(0);
        serializer.serializeU8(this.value);
    }

    static load(deserializer: Deserializer): TransactionArgumentU8 {
        const value = deserializer.deserializeU8();
        return new TransactionArgumentU8(value);
    }
}

export class TransactionArgumentU16 extends TransactionArgument {
    constructor(public readonly value: Uint16) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(6);
        serializer.serializeU16(this.value);
    }

    static load(deserializer: Deserializer): TransactionArgumentU16 {
        const value = deserializer.deserializeU16();
        return new TransactionArgumentU16(value);
    }
}

export class TransactionArgumentU32 extends TransactionArgument {
    constructor(public readonly value: Uint16) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(7);
        serializer.serializeU32(this.value);
    }

    static load(deserializer: Deserializer): TransactionArgumentU32 {
        const value = deserializer.deserializeU32();
        return new TransactionArgumentU32(value);
    }
}

export class TransactionArgumentU64 extends TransactionArgument {
    constructor(public readonly value: Uint64) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(1);
        serializer.serializeU64(this.value);
    }

    static load(deserializer: Deserializer): TransactionArgumentU64 {
        const value = deserializer.deserializeU64();
        return new TransactionArgumentU64(value);
    }
}

export class TransactionArgumentU128 extends TransactionArgument {
    constructor(public readonly value: Uint128) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(2);
        serializer.serializeU128(this.value);
    }

    static load(deserializer: Deserializer): TransactionArgumentU128 {
        const value = deserializer.deserializeU128();
        return new TransactionArgumentU128(value);
    }
}

export class TransactionArgumentU256 extends TransactionArgument {
    constructor(public readonly value: Uint256) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(8);
        serializer.serializeU256(this.value);
    }

    static load(deserializer: Deserializer): TransactionArgumentU256 {
        const value = deserializer.deserializeU256();
        return new TransactionArgumentU256(value);
    }
}

export class TransactionArgumentAddress extends TransactionArgument {
    constructor(public readonly value: AccountAddress) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(3);
        this.value.serialize(serializer);
    }

    static load(deserializer: Deserializer): TransactionArgumentAddress {
        const value = AccountAddress.deserialize(deserializer);
        return new TransactionArgumentAddress(value);
    }
}

export class TransactionArgumentU8Vector extends TransactionArgument {
    constructor(public readonly value: Bytes) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(4);
        serializer.serializeBytes(this.value);
    }

    static load(deserializer: Deserializer): TransactionArgumentU8Vector {
        const value = deserializer.deserializeBytes();
        return new TransactionArgumentU8Vector(value);
    }
}

export class TransactionArgumentBool extends TransactionArgument {
    constructor(public readonly value: boolean) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(5);
        serializer.serializeBool(this.value);
    }

    static load(deserializer: Deserializer): TransactionArgumentBool {
        const value = deserializer.deserializeBool();
        return new TransactionArgumentBool(value);
    }
}

export abstract class Signer {
    abstract serialize(serializer: Serializer): void;

    static deserialize(deserializer: Deserializer): Signer {
        const index = deserializer.deserializeUleb128AsU32();
        switch (index) {
            case 0:
                return SignerRoot.load(deserializer);
            case 1:
                return SignerPlaceholder.load(deserializer);
            case 2:
                return SignerName.load(deserializer);
            default:
                throw new Error(`Unknown variant index for Signer: ${index}`);
        }
    }
}

export class SignerRoot extends Signer {
    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(0);
    }

    static load(deserializer: Deserializer): SignerRoot {
        return new SignerRoot();
    }
}

export class SignerPlaceholder extends Signer {
    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(1);
    }

    static load(_deserializer: Deserializer): SignerPlaceholder {
        return new SignerPlaceholder();
    }
}

export class SignerName extends Signer {
    constructor(public readonly value: string) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(2);
        serializer.serializeStr(this.value);
    }

    static load(deserializer: Deserializer): SignerName {
        const value = deserializer.deserializeStr();
        return new SignerName(value);
    }
}

export abstract class Transaction {
    abstract serialize(serializer: Serializer): void;

    static deserialize(deserializer: Deserializer): Transaction {
        const index = deserializer.deserializeUleb128AsU32();
        switch (index) {
            case 0:
                return TransactionV1.load(deserializer);
            default:
                throw new Error(`Unknown variant index for Transaction: ${index}`);
        }
    }
}

export class TransactionV1 extends Transaction {
    constructor(public readonly value: TxV1) {
        super();
    }

    serialize(serializer: Serializer): void {
        serializer.serializeU32AsUleb128(0);
        this.value.serialize(serializer);
    }

    static load(deserializer: Deserializer): TransactionV1 {
        return new TransactionV1(TxV1.deserialize(deserializer));
    }
}
