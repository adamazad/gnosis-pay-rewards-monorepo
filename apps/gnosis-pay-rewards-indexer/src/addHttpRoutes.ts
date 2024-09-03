import {
  GnosisPayTransactionFieldsType_Unpopulated,
  toWeekDataId,
  IndexerStateAtomType,
  WeekIdFormatType,
  GnosisTokenBalanceSnapshotDocumentType,
  isValidWeekDataId,
} from '@karpatkey/gnosis-pay-rewards-sdk';
import {
  createMongooseLogger,
  getGnosisPayTransactionModel,
  getWeekCashbackRewardModel,
  createWeekCashbackRewardDocumentId,
  createWeekCashbackRewardDocument,
  createGnosisPayRewardDistributionModel,
  GnosisPayRewardDistributionDocumentFieldsType,
  getWeekMetricsSnapshotModel,
  GnosisPaySafeAddressDocumentFieldsType_Unpopulated,
  getGnosisPaySafeAddressModel,
  createGnosisPaySafeAddressDocument,
  createGnosisTokenBalanceSnapshotModel,
} from '@karpatkey/gnosis-pay-rewards-sdk/mongoose';
import { Response } from 'express';
import dayjs from 'dayjs';
import dayjsUtc from 'dayjs/plugin/utc.js';
import { Address, isAddress, PublicClient, Transport } from 'viem';
import { gnosis } from 'viem/chains';
import { z, ZodError } from 'zod';

import { takeGnosisTokenBalanceSnapshot } from './process/processGnosisTokenTransferLog.js';
import { getGnosisPaySafeOwners } from './gp/getGnosisPaySafeOwners.js';
import { isGnosisPaySafeAddress } from './gp/isGnosisPaySafeAddress.js';
import { hasGnosisPayOgNft } from './gp/hasGnosisPayOgNft.js';
import { buildExpressApp } from './server.js';

dayjs.extend(dayjsUtc);

export function addHttpRoutes({
  expressApp,
  mongooseModels,
  getIndexerState,
  client,
}: {
  expressApp: ReturnType<typeof buildExpressApp>;
  mongooseModels: {
    gnosisTokenBalanceSnapshotModel: ReturnType<typeof createGnosisTokenBalanceSnapshotModel>;
    gnosisPaySafeAddressModel: ReturnType<typeof getGnosisPaySafeAddressModel>;
    gnosisPayTransactionModel: ReturnType<typeof getGnosisPayTransactionModel>;
    weekCashbackRewardModel: ReturnType<typeof getWeekCashbackRewardModel>;
    gnosisPayRewardDistributionModel: ReturnType<typeof createGnosisPayRewardDistributionModel>;
    weekMetricsSnapshotModel: ReturnType<typeof getWeekMetricsSnapshotModel>;
  };
  client: PublicClient<Transport, typeof gnosis>;
  logger: ReturnType<typeof createMongooseLogger>;
  getIndexerState: () => IndexerStateAtomType;
}) {
  const {
    gnosisTokenBalanceSnapshotModel,
    gnosisPaySafeAddressModel,
    gnosisPayTransactionModel,
    weekCashbackRewardModel,
    gnosisPayRewardDistributionModel,
    weekMetricsSnapshotModel,
  } = mongooseModels;

  expressApp.get<'/'>('/', (_, res) => {
    return res.send({
      status: 'ok',
      statusCode: 200,
    });
  });

  expressApp.get<'/status'>('/status', (_, res) => {
    const state = getIndexerState();
    const indexerState = Object.fromEntries(
      Object.entries(state).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value])
    );

    return res.send({
      data: {
        indexerState,
      },
      status: 'ok',
      statusCode: 200,
    });
  });

  expressApp.get<'/health'>('/health', (_, res) => {
    return res.send({
      status: 'ok',
      statusCode: 200,
    });
  });

  expressApp.get<'/week-snapshots/:weekId'>('/week-snapshots/:weekId', async (req, res) => {
    try {
      const weekId = weekIdSchema.parse(req.params.weekId) as WeekIdFormatType;
      const _query = { week: weekId };
      const weekSafeSnapshot = await weekCashbackRewardModel
        .find(_query)
        .populate<{ transactions: GnosisPayTransactionFieldsType_Unpopulated[] }>('transactions', {
          amountUsd: 1,
          amountToken: 1,
          amount: 1,
          transactionHash: 1,
          gnoBalance: 1,
          type: 1,
        })
        .populate<{ gnoBalanceSnapshots: GnosisTokenBalanceSnapshotDocumentType[] }>('gnoBalanceSnapshots', {
          blockNumber: 1,
          blockTimestamp: 1,
          balance: 1,
        })
        .populate<{ address: GnosisPaySafeAddressDocumentFieldsType_Unpopulated }>('address', { isOg: 1 })
        .lean();

      // Replace address with safe key
      const weekSafeSnapshotWithSafeKey = weekSafeSnapshot.map((safeSnapshot) => {
        (safeSnapshot as any).safe = safeSnapshot.address;
        delete (safeSnapshot as any).address;
        return safeSnapshot;
      });

      return res.json({
        data: weekSafeSnapshotWithSafeKey,
        status: 'ok',
        statusCode: 200,
        _query,
      });
    } catch (error) {
      return returnServerError(res, error as Error);
    }
  });

  expressApp.get<'/weeks'>('/weeks', async (_, res) => {
    try {
      const weeksArray = await weekMetricsSnapshotModel.find({}, { date: 1 }).lean();

      const weeksArrayWithIds = weeksArray.map((week) => ({
        id: week.date.toString(),
        weekId: week.date.toString(),
      }));

      return res.json({
        data: weeksArrayWithIds,
        status: 'ok',
        statusCode: 200,
      });
    } catch (error) {
      return returnServerError(res, error as Error);
    }
  });

  expressApp.get<'/cashbacks/:safeAddress'>('/cashbacks/:safeAddress', async (req, res) => {
    try {
      const safeAddress = addressSchema.parse(req.params.safeAddress).toLowerCase() as Address;

      const week = toWeekDataId(dayjs.utc().unix());
      const documentId = createWeekCashbackRewardDocumentId(week, safeAddress);

      // Try to find the week reward document
      let weekRewardSnapshot = await weekCashbackRewardModel
        .findById(documentId)
        .populate<{ transactions: GnosisPayTransactionFieldsType_Unpopulated[] }>('transactions')
        .populate<{ safe: GnosisPaySafeAddressDocumentFieldsType_Unpopulated }>('safe', {
          isOg: 1,
          address: 1,
        });

      // If the week reward document doesn't have any gno balance snapshots, add one
      if (weekRewardSnapshot === null) {
        const { isGnosisPaySafe } = await isGnosisPaySafeAddress({
          address: safeAddress,
          client,
          gnosisPaySafeAddressModel,
        });

        if (isGnosisPaySafe === false) {
          throw new CustomError('Address is not a Gnosis Safe', {
            cause: 'NOT_GNOSIS_PAY_SAFE',
          });
        }

        const weekRewardDocument = await createWeekCashbackRewardDocument({
          address: safeAddress,
          populateTransactions: true,
          weekCashbackRewardModel,
          week,
        });

        // Take a snapshot of the GNO balance
        await takeGnosisTokenBalanceSnapshot({
          gnosisTokenBalanceSnapshotModel,
          weekCashbackRewardModel,
          gnosisPaySafeAddressModel,
          safeAddress,
          client,
        });

        const { data: safeOwners, error } = await getGnosisPaySafeOwners({
          safeAddress,
          client,
        });

        // zero owners mean that this address is likely not a GP Safe
        if (error !== null || safeOwners.length === 0) {
          throw new CustomError('No owners found for this safe');
        }

        // Find the OG NFT status
        const isOg = (await hasGnosisPayOgNft(client, safeOwners)).some(Boolean);

        // Create a new GnosisPaySafeAddressDocument
        await createGnosisPaySafeAddressDocument(
          {
            safeAddress,
            owners: safeOwners,
            isOg,
          },
          gnosisPaySafeAddressModel
        );

        // Populate the safe info now that we have it
        weekRewardSnapshot = await weekRewardDocument.populate('safe', {
          isOg: 1,
          address: 1,
        });
      }

      // Final data to return to the client
      const weekCashbackRewardJson = weekRewardSnapshot.toJSON();

      return res.json({
        data: weekCashbackRewardJson,
        status: 'ok',
        statusCode: 200,
        _query: {
          address: safeAddress,
        },
      });
    } catch (error) {
      console.log(error);
      return returnServerError(res, error as Error);
    }
  });

  expressApp.get<'/cashbacks/:safeAddress/:week'>('/cashbacks/:safeAddress/:week', async (req, res) => {
    try {
      const safeAddress = addressSchema.parse(req.params.safeAddress);
      const week = req.params.week as ReturnType<typeof toWeekDataId>;
      const documentId = createWeekCashbackRewardDocumentId(week, safeAddress);

      const weekCashbackRewardSnapshot = await weekCashbackRewardModel
        .findById(documentId)
        .populate<{ transactions: GnosisPayTransactionFieldsType_Unpopulated[] }>('transactions')
        .populate<{ safe: GnosisPaySafeAddressDocumentFieldsType_Unpopulated }>('safe', {
          isOg: 1,
          address: 1,
        })
        .lean();

      if (weekCashbackRewardSnapshot === null) {
        return res.status(404).json({
          error: 'No cashbacks found for this address  and week',
          _query: {
            id: documentId,
            address: safeAddress,
            week,
          },
          status: 'error',
          statusCode: 404,
        });
      }

      return res.json({
        data: weekCashbackRewardSnapshot,
        status: 'ok',
        _query: {
          id: documentId,
          address: safeAddress,
          week,
        },
        statusCode: 200,
      });
    } catch (error) {
      return returnServerError(res, error as Error);
    }
  });

  expressApp.get<'/distributions/:safeAddress'>('/distributions/:safeAddress', async (req, res) => {
    try {
      const safe = addressSchema.parse(req.params.safeAddress).toLowerCase();

      const transactions = await gnosisPayRewardDistributionModel
        .find<GnosisPayRewardDistributionDocumentFieldsType>({
          safe,
        })
        .sort({ blockNumber: -1 })
        .lean();

      const totalRewards = transactions.reduce((acc, dist) => dist.amount + acc, 0);

      return res.json({
        data: {
          safe,
          totalRewards,
          transactions,
        },
        status: 'ok',
        statusCode: 200,
        _query: {
          safe,
        },
      });
    } catch (error) {
      return returnServerError(res, error as Error);
    }
  });

  expressApp.get<'/transactions/:safeAddress'>('/transactions/:safeAddress', async (req, res) => {
    try {
      const safeAddress = addressSchema.parse(req.params.safeAddress);

      const transactions = await gnosisPayTransactionModel
        .find({
          safeAddress: new RegExp(safeAddress, 'i'),
        })
        .populate('amountToken')
        .sort({ blockTimestamp: -1 })
        .lean();

      return res.json({
        data: transactions,
        status: 'ok',
        statusCode: 200,
      });
    } catch (error) {
      return returnServerError(res, error as Error);
    }
  });

  return expressApp;
}

class CustomError extends Error {}

/**
 * @param res Express response object
 * @param error Error object
 * @returns Express response object
 */
function returnServerError(res: Response, error?: Error) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: error.message,
      status: 'error',
      statusCode: 400,
    });
  }

  if (error instanceof CustomError) {
    return res.status(500).json({
      error: error.message,
      status: 'error',
      errorStack: error?.stack,
      statusCode: 500,
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    status: 'error',
    errorStack: error?.stack,
    statusCode: 500,
  });
}

const addressSchema = z.string().refine(isAddress, {
  message: 'Invalid EVM address',
});

const weekIdSchema = z
  .string()
  .refine(
    (value: string) => {
      return isValidWeekDataId(value);
    },
    {
      message: 'Invalid week date format',
    }
  )
  .refine(
    (value: string) => {
      const isSunday = dayjs(value).day() === 0;
      return isSunday;
    },
    {
      message: 'Week date must be a Sunday',
    }
  );
