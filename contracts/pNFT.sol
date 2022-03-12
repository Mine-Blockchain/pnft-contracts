//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PNFT is 
    ContextUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC721Upgradeable,
    ERC721PausableUpgradeable 
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /*** Events ***/
    event PNFTMint (uint256 indexed tokenId, address indexed to, uint256 skuId, uint256 size, uint256 ctime);

    /*** Constants ***/
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /*** Storage Properties ***/

    struct PNFTMeta {
        uint256 skuId;
        uint256 size;
        uint256 ctime;
    }

    CountersUpgradeable.Counter private _tokenIdTracker;
    mapping(uint256 => PNFTMeta) public nftMeta;
    string public baseURI;

    /*** Contract Logic Starts Here ***/

    function initialize(address _admin) public initializer {
        __ReentrancyGuard_init();
        __ERC721_init("pNFT", "pNFT");
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    // ---------------------------------------------------------
    // Asset Mgr

    function mintPNFT(address to, uint256 skuId, uint256 size) external nonReentrant onlyRole(MINTER_ROLE) returns (uint256) {

        _tokenIdTracker.increment();
        uint256 newTokenId = _tokenIdTracker.current();

        nftMeta[newTokenId] = PNFTMeta(skuId, size, block.timestamp);
        _mint(to, newTokenId);

        emit PNFTMint(newTokenId, to, skuId, size, block.timestamp);

        return newTokenId;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "PNFT: Nonexistent token");

        PNFTMeta memory meta = nftMeta[tokenId];

        return string(abi.encodePacked(
            baseURI,
            "pnft?i=", 
            StringsUpgradeable.toString(meta.skuId),
            "&n=",
            StringsUpgradeable.toString(meta.size),
            "&t=",
            StringsUpgradeable.toString(meta.ctime)
        ));
    }

    function getMeta(uint256 tokenId) public view returns (uint256 skuId, uint256 size, uint256 ctime) {
        PNFTMeta memory meta = nftMeta[tokenId];
        skuId = meta.skuId;
        size = meta.size;
        ctime = meta.ctime;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Upgradeable, ERC721PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // ---------------------------------------------------------
    // Manage

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function setBaseURI(string memory _uri) public onlyRole(DEFAULT_ADMIN_ROLE) {
        baseURI = _uri;
    }

    // ---------------------------------------------------------
    // MISC
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
