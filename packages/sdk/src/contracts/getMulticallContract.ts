import { Narrow } from 'abitype';
import { GetContractReturnType, PublicClient, getContract } from 'viem';

export const MULTICALL_CONTRACT_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

/**
 * Create a multicall contract instance
 * @param signerOrProvider
 * @returns
 */
export function getMulticallContract(
  client: PublicClient,
): GetContractReturnType<Narrow<typeof Multicall2_ABI>, PublicClient, '0xcA11bde05977b3631167028862bE2a173976CA11'> {
  const multicallContract = getContract({
    client,
    address: MULTICALL_CONTRACT_ADDRESS,
    abi: Multicall2_ABI,
  });

  return multicallContract;
}

export const Multicall2_ABI = [
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [
      {
        type: 'uint256',
        name: 'blockNumber',
        internalType: 'uint256',
      },
      {
        type: 'bytes[]',
        name: 'returnData',
        internalType: 'bytes[]',
      },
    ],
    name: 'aggregate',
    inputs: [
      {
        type: 'tuple[]',
        name: 'calls',
        internalType: 'struct Multicall2.Call[]',
        components: [
          {
            type: 'address',
            name: 'target',
            internalType: 'address',
          },
          {
            type: 'bytes',
            name: 'callData',
            internalType: 'bytes',
          },
        ],
      },
    ],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [
      {
        type: 'uint256',
        name: 'blockNumber',
        internalType: 'uint256',
      },
      {
        type: 'bytes32',
        name: 'blockHash',
        internalType: 'bytes32',
      },
      {
        type: 'tuple[]',
        name: 'returnData',
        internalType: 'struct Multicall2.Result[]',
        components: [
          {
            type: 'bool',
            name: 'success',
            internalType: 'bool',
          },
          {
            type: 'bytes',
            name: 'returnData',
            internalType: 'bytes',
          },
        ],
      },
    ],
    name: 'blockAndAggregate',
    inputs: [
      {
        type: 'tuple[]',
        name: 'calls',
        internalType: 'struct Multicall2.Call[]',
        components: [
          {
            type: 'address',
            name: 'target',
            internalType: 'address',
          },
          {
            type: 'bytes',
            name: 'callData',
            internalType: 'bytes',
          },
        ],
      },
    ],
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'bytes32',
        name: 'blockHash',
        internalType: 'bytes32',
      },
    ],
    name: 'getBlockHash',
    inputs: [
      {
        type: 'uint256',
        name: 'blockNumber',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: 'blockNumber',
        internalType: 'uint256',
      },
    ],
    name: 'getBlockNumber',
    inputs: [],
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'address',
        name: 'coinbase',
        internalType: 'address',
      },
    ],
    name: 'getCurrentBlockCoinbase',
    inputs: [],
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: 'difficulty',
        internalType: 'uint256',
      },
    ],
    name: 'getCurrentBlockDifficulty',
    inputs: [],
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: 'gaslimit',
        internalType: 'uint256',
      },
    ],
    name: 'getCurrentBlockGasLimit',
    inputs: [],
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: 'timestamp',
        internalType: 'uint256',
      },
    ],
    name: 'getCurrentBlockTimestamp',
    inputs: [],
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: 'balance',
        internalType: 'uint256',
      },
    ],
    name: 'getEthBalance',
    inputs: [
      {
        type: 'address',
        name: 'addr',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'bytes32',
        name: 'blockHash',
        internalType: 'bytes32',
      },
    ],
    name: 'getLastBlockHash',
    inputs: [],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [
      {
        type: 'tuple[]',
        name: 'returnData',
        internalType: 'struct Multicall2.Result[]',
        components: [
          {
            type: 'bool',
            name: 'success',
            internalType: 'bool',
          },
          {
            type: 'bytes',
            name: 'returnData',
            internalType: 'bytes',
          },
        ],
      },
    ],
    name: 'tryAggregate',
    inputs: [
      {
        type: 'bool',
        name: 'requireSuccess',
        internalType: 'bool',
      },
      {
        type: 'tuple[]',
        name: 'calls',
        internalType: 'struct Multicall2.Call[]',
        components: [
          {
            type: 'address',
            name: 'target',
            internalType: 'address',
          },
          {
            type: 'bytes',
            name: 'callData',
            internalType: 'bytes',
          },
        ],
      },
    ],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [
      {
        type: 'uint256',
        name: 'blockNumber',
        internalType: 'uint256',
      },
      {
        type: 'bytes32',
        name: 'blockHash',
        internalType: 'bytes32',
      },
      {
        type: 'tuple[]',
        name: 'returnData',
        internalType: 'struct Multicall2.Result[]',
        components: [
          {
            type: 'bool',
            name: 'success',
            internalType: 'bool',
          },
          {
            type: 'bytes',
            name: 'returnData',
            internalType: 'bytes',
          },
        ],
      },
    ],
    name: 'tryBlockAndAggregate',
    inputs: [
      {
        type: 'bool',
        name: 'requireSuccess',
        internalType: 'bool',
      },
      {
        type: 'tuple[]',
        name: 'calls',
        internalType: 'struct Multicall2.Call[]',
        components: [
          {
            type: 'address',
            name: 'target',
            internalType: 'address',
          },
          {
            type: 'bytes',
            name: 'callData',
            internalType: 'bytes',
          },
        ],
      },
    ],
  },
] as const;
