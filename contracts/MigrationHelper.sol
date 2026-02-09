// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MigrationHelper
 * @notice Atomically migrates a lending position from Morpho Blue to Fluid
 *         using Morpho's free flash loans. No additional user capital needed.
 *
 * Flow (single atomic transaction):
 *   1. User's smart account calls migrate() via UserOp
 *   2. migrate() flash borrows USDT from Morpho (free, no fees)
 *   3. In onMorphoFlashLoan callback:
 *      a. Repay user's USDT debt on Morpho (onBehalf)
 *      b. Withdraw user's XAUt collateral from Morpho (authorized via setAuthorization)
 *      c. Approve XAUt to Fluid vault
 *      d. Call Fluid vault.operate() to deposit XAUt + borrow USDT
 *      e. Approve Morpho to reclaim flash loan amount
 *   4. Morpho pulls back the flash-borrowed USDT (zero fees)
 *
 * Prerequisites:
 *   - User must call morpho.setAuthorization(address(this), true) BEFORE migrate()
 *   - User must have an active Morpho position (collateral + debt)
 *   - Fluid vault must have sufficient liquidity to borrow
 */

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IMorpho {
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    function flashLoan(address token, uint256 amount, bytes calldata data) external;

    function repay(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes calldata data
    ) external returns (uint256 assetsRepaid, uint256 sharesRepaid);

    function withdrawCollateral(
        MarketParams calldata marketParams,
        uint256 assets,
        address onBehalf,
        address receiver
    ) external;
}

interface IMorphoFlashLoanCallback {
    function onMorphoFlashLoan(uint256 amount, bytes calldata data) external;
}

interface IFluidVault {
    /// @notice Deposit collateral and/or borrow in a single call
    /// @param nftId_ 0 to create new position, or existing NFT ID
    /// @param newCol_ positive = deposit, negative = withdraw
    /// @param newDebt_ positive = borrow, negative = repay
    /// @param to_ address to receive borrow/withdraw amounts
    /// @return nftId the position NFT ID
    /// @return supplyAmt_ final collateral amount
    /// @return borrowAmt_ final debt amount
    function operate(
        uint256 nftId_,
        int256 newCol_,
        int256 newDebt_,
        address to_
    ) external payable returns (uint256, int256, int256);
}

contract MigrationHelper is IMorphoFlashLoanCallback {
    // ─── Immutables ─────────────────────────────────────────────────────────────

    address public immutable MORPHO;
    address public immutable FLUID_VAULT;
    address public immutable LOAN_TOKEN;       // USDT
    address public immutable COLLATERAL_TOKEN; // XAUt

    // ─── Events ─────────────────────────────────────────────────────────────────

    event MigrationExecuted(
        address indexed user,
        uint256 debtRepaid,
        uint256 collateralMigrated,
        uint256 debtBorrowed,
        uint256 fluidNftId
    );

    // ─── Structs ────────────────────────────────────────────────────────────────

    struct MigrationParams {
        address user;
        IMorpho.MarketParams sourceMarket;
        uint256 repayDebtAmount;     // USDT debt to repay on Morpho (0 = use shares for max)
        uint256 repayDebtShares;     // Shares to repay (for exact max repay)
        uint256 collateralAmount;    // XAUt to withdraw from Morpho
        uint256 borrowAmount;        // USDT to borrow from Fluid
        uint256 fluidNftId;          // 0 = new position, or existing NFT ID
    }

    // ─── Constructor ────────────────────────────────────────────────────────────

    constructor(
        address _morpho,
        address _fluidVault,
        address _loanToken,
        address _collateralToken
    ) {
        MORPHO = _morpho;
        FLUID_VAULT = _fluidVault;
        LOAN_TOKEN = _loanToken;
        COLLATERAL_TOKEN = _collateralToken;
    }

    // ─── Internal: Safe Approve ─────────────────────────────────────────────────

    /**
     * @notice Approves `spender` only if current allowance is insufficient.
     *         Sets to type(uint256).max to avoid repeated approvals.
     */
    function _safeApprove(address token, address spender, uint256 amount) internal {
        if (IERC20(token).allowance(address(this), spender) >= amount) return;
        // Use low-level call: USDT doesn't return bool from approve
        (bool success, ) = token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, type(uint256).max));
        require(success, "Approve failed");
    }

    // ─── External: Trigger Migration ────────────────────────────────────────────

    /**
     * @notice Initiates atomic migration from Morpho to Fluid.
     * @dev User must have called morpho.setAuthorization(address(this), true) first.
     *      Called by the user's smart account as part of a batched UserOp.
     */
    function migrate(MigrationParams calldata params) external {
        require(params.user != address(0), "Invalid user");
        require(params.collateralAmount > 0, "No collateral");
        require(params.borrowAmount > 0, "No borrow amount");
        require(
            params.repayDebtAmount > 0 || params.repayDebtShares > 0,
            "No debt to repay"
        );

        // Flash borrow USDT from Morpho to repay the user's debt
        uint256 flashAmount = 2 * params.borrowAmount;

        bytes memory data = abi.encode(params);
        IMorpho(MORPHO).flashLoan(LOAN_TOKEN, flashAmount, data);
    }

    // ─── Flash Loan Callback ────────────────────────────────────────────────────

    /**
     * @notice Called by Morpho during flashLoan execution.
     *         Executes the full migration sequence atomically.
     */
    function onMorphoFlashLoan(uint256 amount, bytes calldata data) external override {
        require(msg.sender == MORPHO, "Only Morpho");

        MigrationParams memory params = abi.decode(data, (MigrationParams));

        // Step 1: Repay user's USDT debt on Morpho
        // If repayDebtShares is specified, we try to repay that exact share amount.
        // We approve the flash loan amount to be safe.
        _safeApprove(LOAN_TOKEN, MORPHO, amount);
        IMorpho(MORPHO).repay(
            params.sourceMarket,
            params.repayDebtAmount,   // assets (0 if using shares)
            params.repayDebtShares,   // shares (0 if using assets)
            params.user,              // onBehalf
            ""
        );

        // Step 2: Withdraw user's XAUt collateral from Morpho
        IMorpho(MORPHO).withdrawCollateral(
            params.sourceMarket,
            params.collateralAmount,
            params.user,        // onBehalf
            address(this)       // receiver (we temporarily hold XAUt)
        );

        // Step 3: Approve XAUt to Fluid vault and open position
        IERC20(COLLATERAL_TOKEN).approve(FLUID_VAULT, params.collateralAmount);
        uint256 loanAmount = amount- IERC20(LOAN_TOKEN).balanceOf(address(this));
        (uint256 nftId, , ) = IFluidVault(FLUID_VAULT).operate(
            params.fluidNftId,                      // 0 = new position
            int256(params.collateralAmount),         // deposit XAUt (positive = deposit)
            int256(loanAmount),             // borrow USDT (positive = borrow)
            address(this)                            // receive borrowed USDT here
        );

        emit MigrationExecuted(
            params.user,
            params.repayDebtAmount,
            params.collateralAmount,
            params.borrowAmount,
            nftId
        );
    }

    // ─── Emergency: Recover stuck tokens ────────────────────────────────────────

    /**
     * @notice Allows anyone to sweep tokens accidentally sent to this contract.
     *         This contract should never hold tokens between transactions.
     * @dev Safe because the contract is stateless — during migration, token
     *      movements are atomic within a single transaction.
     */
    function rescueTokens(address token, address to, uint256 amount) external {
        IERC20(token).transfer(to, amount);
    }
}
