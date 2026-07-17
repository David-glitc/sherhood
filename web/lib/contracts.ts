import { getAddress, type Abi } from "viem"
import PotFactoryAbi from "./PotFactory.abi.json"
import PotAbi from "./Pot.abi.json"
import PotCardAbi from "./PotCard.abi.json"
import RaffleManagerAbi from "./RaffleManager.abi.json"

export const POT_FACTORY_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_POT_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000"
)

export const POT_CARD_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_POT_CARD_ADDRESS || "0x0000000000000000000000000000000000000000"
)

export const MARKETPLACE_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x0000000000000000000000000000000000000000"
)

export const ENTRY_ROUTER_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_ENTRY_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000"
)

export const WETH_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_WETH_ADDRESS || "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73"
)

export const USDG_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_USDG_ADDRESS || "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"
)

/** On-chain fee sink — TreasuryDirect forwards USDG to fee wallet on deposit. */
export const TREASURY_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "0xdfa1c90107faf1a19e53e6eed9ee4aa6ad414085"
)

/** Protocol fee wallet — Treasury owner withdraws USDG here. */
export const TREASURY_FEE_WALLET = getAddress(
  process.env.NEXT_PUBLIC_TREASURY_FEE_WALLET || "0xc24f7118f55d0643a82a1594cbcbb7484011a251"
)

/** @deprecated Legacy raffle prototype — prefer potFactoryConfig */
export const RAFFLE_MANAGER_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_RAFFLE_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000"
)

export const SHRH_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_SHRH_ADDRESS || "0xa1c084c4f7387dfeac2a055d745efc0405867777"
)

export const CONTRACTS_LIVE =
  POT_FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000"

export const potFactoryConfig = {
  address: POT_FACTORY_ADDRESS,
  abi: PotFactoryAbi as Abi,
} as const

export const potAbi = PotAbi as Abi
export const potCardConfig = {
  address: POT_CARD_ADDRESS,
  abi: PotCardAbi as Abi,
} as const

export const MARKETPLACE_ABI = [
  {
    type: "function",
    name: "list",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancel",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buy",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getActiveListings",
    inputs: [],
    outputs: [
      { name: "tokenIds", type: "uint256[]" },
      {
        name: "items",
        type: "tuple[]",
        components: [
          { name: "seller", type: "address" },
          { name: "price", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listings",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "price", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "royaltyBps",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const

export const marketplaceConfig = {
  address: MARKETPLACE_ADDRESS,
  abi: MARKETPLACE_ABI as Abi,
} as const

export const ENTRY_ROUTER_ABI = [
  {
    type: "function",
    name: "depositWithETH",
    inputs: [
      { name: "pot", type: "address" },
      { name: "minUsdgOut", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "depositWithWETH",
    inputs: [
      { name: "pot", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minUsdgOut", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "routerFeeBps",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const

export const entryRouterConfig = {
  address: ENTRY_ROUTER_ADDRESS,
  abi: ENTRY_ROUTER_ABI as Abi,
} as const

export const raffleManagerConfig = {
  address: RAFFLE_MANAGER_ADDRESS,
  abi: RaffleManagerAbi as Abi,
} as const

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const
