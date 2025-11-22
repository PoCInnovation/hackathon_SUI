// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module startHack::whitelist {
    use sui::table;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};

    const ENoAccess: u64 = 1;
    const EInvalidCap: u64 = 2;
    const EDuplicate: u64 = 3;
    const ENotInWhitelist: u64 = 4;
    const EWrongVersion: u64 = 5;
    const EInsufficientPayment: u64 = 6;

    const VERSION: u64 = 1;
    const WHITELIST_PRICE: u64 = 500_000_000; // 0.5 SUI in MIST

    public struct Whitelist has key {
        id: UID,
        version: u64,
        addresses: table::Table<address, bool>,
        balance: Balance<SUI>,
        beneficiary: address,
    }

    public struct Cap has key, store {
        id: UID,
        wl_id: ID,
    }

    public fun create_whitelist(beneficiary: address, ctx: &mut TxContext): (Cap, Whitelist) {
        let wl = Whitelist {
            id: object::new(ctx),
            version: VERSION,
            addresses: table::new(ctx),
            balance: balance::zero(),
            beneficiary,
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

    entry fun create_whitelist_entry(beneficiary: address, ctx: &mut TxContext) {
        let (cap, wl) = create_whitelist(beneficiary, ctx);
        share_whitelist(wl);
        transfer::public_transfer(cap, ctx.sender());
    }

    public fun add(wl: &mut Whitelist, cap: &Cap, account: address) {
        assert!(cap.wl_id == object::id(wl), EInvalidCap);
        assert!(!wl.addresses.contains(account), EDuplicate);
        wl.addresses.add(account, true);
    }

    /// Allow anyone to add themselves to the whitelist with payment
    public entry fun add_self_with_payment(wl: &mut Whitelist, payment: Coin<SUI>, ctx: &TxContext) {
        let sender = ctx.sender();
        assert!(!wl.addresses.contains(sender), EDuplicate);
        
        // Verify payment amount
        assert!(coin::value(&payment) >= WHITELIST_PRICE, EInsufficientPayment);
        
        // Add payment to balance
        coin::put(&mut wl.balance, payment);
        
        // Add to whitelist
        wl.addresses.add(sender, true);
    }

    /// Admin can add users for free (with cap)
    public entry fun add_with_cap(wl: &mut Whitelist, cap: &Cap, account: address) {
        assert!(cap.wl_id == object::id(wl), EInvalidCap);
        assert!(!wl.addresses.contains(account), EDuplicate);
        wl.addresses.add(account, true);
    }

    /// Withdraw collected funds (admin only)
    public entry fun withdraw_funds(wl: &mut Whitelist, cap: &Cap, amount: u64, ctx: &mut TxContext) {
        assert!(cap.wl_id == object::id(wl), EInvalidCap);
        let withdrawn = coin::take(&mut wl.balance, amount, ctx);
        transfer::public_transfer(withdrawn, wl.beneficiary);
    }

    /// Withdraw all funds (admin only)
    public entry fun withdraw_all(wl: &mut Whitelist, cap: &Cap, ctx: &mut TxContext) {
        assert!(cap.wl_id == object::id(wl), EInvalidCap);
        let total = balance::value(&wl.balance);
        if (total > 0) {
            let withdrawn = coin::take(&mut wl.balance, total, ctx);
            transfer::public_transfer(withdrawn, wl.beneficiary);
        };
    }

    // View functions
    public fun get_price(): u64 {
        WHITELIST_PRICE
    }

    public fun get_balance(wl: &Whitelist): u64 {
        balance::value(&wl.balance)
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
