// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module startHack::whitelist {
    use sui::table;

    const ENoAccess: u64 = 1;
    const EInvalidCap: u64 = 2;
    const EDuplicate: u64 = 3;
    const ENotInWhitelist: u64 = 4;
    const EWrongVersion: u64 = 5;

    const VERSION: u64 = 1;

    public struct Whitelist has key {
        id: UID,
        version: u64,
        addresses: table::Table<address, bool>,
    }

    public struct Cap has key, store {
        id: UID,
        wl_id: ID,
    }

    public fun create_whitelist(ctx: &mut TxContext): (Cap, Whitelist) {
        let wl = Whitelist {
            id: object::new(ctx),
            version: VERSION,
            addresses: table::new(ctx),
        };
        let cap = Cap {
            id: object::new(ctx),
            wl_id: object::id(&wl),
        };
        (cap, wl)
    }

    public fun share_whitelist(wl: Whitelist) {
        transfer::share_object(wl);
    }

    entry fun create_whitelist_entry(ctx: &mut TxContext) {
        let (cap, wl) = create_whitelist(ctx);
        share_whitelist(wl);
        transfer::public_transfer(cap, ctx.sender());
    }

    public fun add(wl: &mut Whitelist, cap: &Cap, account: address) {
        assert!(cap.wl_id == object::id(wl), EInvalidCap);
        assert!(!wl.addresses.contains(account), EDuplicate);
        wl.addresses.add(account, true);
    }

    public fun remove(wl: &mut Whitelist, cap: &Cap, account: address) {
        assert!(cap.wl_id == object::id(wl), EInvalidCap);
        assert!(wl.addresses.contains(account), ENotInWhitelist);
        wl.addresses.remove(account);
    }

    fun check_policy(caller: address, id: vector<u8>, wl: &Whitelist): bool {
        assert!(wl.version == VERSION, EWrongVersion);

        let prefix = wl.id.to_bytes();
        let mut i = 0;
        if (prefix.length() > id.length()) {
            return false
        };
        while (i < prefix.length()) {
            if (prefix[i] != id[i]) {
                return false
            };
            i = i + 1;
        };

        wl.addresses.contains(caller)
    }

    entry fun seal_approve(id: vector<u8>, wl: &Whitelist, ctx: &TxContext) {
        assert!(check_policy(ctx.sender(), id, wl), ENoAccess);
    }
}
