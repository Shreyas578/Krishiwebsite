// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AgriMarket - Agricultural Marketplace Smart Contract
 * @dev A decentralized marketplace for buying and selling agricultural products
 *      on the Ethereum blockchain. Designed for deployment on Sepolia testnet.
 */
contract AgriMarket {
    // Events
    event ProductListed(
        uint256 indexed productId,
        address indexed seller,
        string name,
        string category,
        uint256 quantity,
        uint256 pricePerUnit, // in wei
        uint256 timestamp
    );

    event ProductPurchased(
        uint256 indexed productId,
        address indexed buyer,
        address indexed seller,
        uint256 quantity,
        uint256 totalPrice, // in wei
        uint256 timestamp
    );

    event ProductCancelled(
        uint256 indexed productId,
        address indexed seller,
        uint256 timestamp
    );

    event Withdrawal(
        address indexed recipient,
        uint256 amount, // in wei
        uint256 timestamp
    );

    event DemoTransactionRecorded(
        string listingId,
        string orderId,
        address buyer,
        address seller,
        uint256 amount,
        uint256 timestamp
    );

    // Structs
    struct Product {
        uint256 id;
        address seller;
        string name;
        string category; // e.g., "Wheat", "Rice", "Vegetables", "Fruits"
        uint256 quantity; // in units (kg, liters, pieces, etc.)
        uint256 pricePerUnit; // in wei per unit
        bool active;
        uint256 timestamp;
    }

    // State variables
    uint256 public nextProductId;
    mapping(uint256 => Product) public products;
    mapping(address => uint256) public earnings; // Track earnings per user
    address payable public owner;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized as owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // State
    bool public paused = false;

    /**
     * @dev Constructor sets the deployer as the owner
     */
    constructor() {
        owner = payable(msg.sender);
        nextProductId = 1;
    }

    /**
     * @dev Emergency stop mechanism - only owner can pause/unpause
     */
    function pause() external onlyOwner whenNotPaused {
        paused = true;
    }

    function unpause() external onlyOwner {
        require(paused, "Contract is not paused");
        paused = false;
    }

    /**
     * @dev List a new agricultural product for sale
     * @param name Product name
     * @param category Product category (e.g., "Wheat", "Rice")
     * @param quantity Quantity available for sale
     * @param pricePerUnit Price per unit in wei (use web3.utils.toWei for conversion)
     */
    function listProduct(
        string memory name,
        string memory category,
        uint256 quantity,
        uint256 pricePerUnit
    ) external whenNotPaused returns (uint256) {
        require(msg.sender != address(0), "Invalid seller");
        require(bytes(name).length > 0, "Product name cannot be empty");
        require(bytes(category).length > 0, "Product category cannot be empty");
        require(quantity > 0, "Quantity must be greater than 0");
        require(pricePerUnit > 0, "Price per unit must be greater than 0");

        uint256 productId = nextProductId++;

        products[productId] = Product({
            id: productId,
            seller: msg.sender,
            name: name,
            category: category,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            active: true,
            timestamp: block.timestamp
        });

        emit ProductListed(
            productId,
            msg.sender,
            name,
            category,
            quantity,
            pricePerUnit,
            block.timestamp
        );

        return productId;
    }

    /**
     * @dev Purchase a listed product
     * @param productId ID of the product to purchase
     * @param quantityToBuy Quantity to purchase (must be <= available quantity)
     */
    function purchaseProduct(uint256 productId, uint256 quantityToBuy)
        external
        payable
        whenNotPaused
    {
        require(productId > 0 && productId < nextProductId, "Invalid product ID");

        Product storage product = products[productId];
        require(product.active, "Product is not active");
        require(quantityToBuy > 0, "Must buy at least 1 unit");
        require(quantityToBuy <= product.quantity, "Insufficient quantity available");

        uint256 totalPrice = quantityToBuy * product.pricePerUnit;
        require(msg.value == totalPrice, "Incorrect payment amount");

        // Update product quantity
        product.quantity -= quantityToBuy;

        // If quantity reaches 0, deactivate product
        if (product.quantity == 0) {
            product.active = false;
        }

        // Add to seller's earnings
        earnings[product.seller] += totalPrice;

        emit ProductPurchased(
            productId,
            msg.sender,
            product.seller,
            quantityToBuy,
            totalPrice,
            block.timestamp
        );
    }

    /**
     * @dev Record a demo transaction on-chain without strict state validation (for DB sync)
     */
    function recordDemoTransaction(
        string memory listingId,
        string memory orderId,
        address buyer,
        address seller,
        uint256 amount
    ) external whenNotPaused {
        emit DemoTransactionRecorded(listingId, orderId, buyer, seller, amount, block.timestamp);
    }

    /**
     * @dev Cancel a listed product (only by seller)
     * @param productId ID of the product to cancel
     */
    function cancelProduct(uint256 productId) external whenNotPaused {
        require(productId > 0 && productId < nextProductId, "Invalid product ID");

        Product storage product = products[productId];
        require(msg.sender == product.seller, "Only seller can cancel");
        require(product.active, "Product is not active");

        product.active = false;

        emit ProductCancelled(
            productId,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Get all active products (for frontend display)
     * @return Array of active product IDs
     */
    function getActiveProducts() external view returns (uint256[] memory) {
        uint256 count = 0;
        // First count active products
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].active) {
                count++;
            }
        }

        uint256[] memory activeIds = new uint256[](count);
        uint256 index = 0;

        // Then fill the array
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].active) {
                activeIds[index++] = i;
            }
        }

        return activeIds;
    }

    /**
     * @dev Get product details by ID
     * @param productId ID of the product
     */
    function getProduct(uint256 productId)
        external
        view
        returns (
            uint256 id,
            address seller,
            string memory name,
            string memory category,
            uint256 quantity,
            uint256 pricePerUnit,
            bool active,
            uint256 timestamp
        )
    {
        require(productId > 0 && productId < nextProductId, "Invalid product ID");

        Product storage product = products[productId];

        return (
            product.id,
            product.seller,
            product.name,
            product.category,
            product.quantity,
            product.pricePerUnit,
            product.active,
            product.timestamp
        );
    }

    /**
     * @dev Withdraw earned funds (only by the earner)
     */
    function withdraw() external {
        uint256 amount = earnings[msg.sender];
        require(amount > 0, "No earnings to withdraw");

        earnings[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit Withdrawal(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Get earnings of a user
     * @param user Address of the user
     * @return Earnings in wei
     */
    function getEarnings(address user) external view returns (uint256) {
        return earnings[user];
    }

    // Receive Ether function (for direct sends to contract)
    receive() external payable {
        revert("Cannot send ETH directly to contract. Use purchaseProduct() instead.");
    }

    // Fallback function (for direct sends to contract)
    fallback() external payable {
        revert("Cannot send ETH directly to contract. Use purchaseProduct() instead.");
    }
}