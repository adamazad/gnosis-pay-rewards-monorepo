import { Address } from 'viem';
import { Model, Mongoose, Schema } from 'mongoose';
import { weekDataIdFormat } from '@karpatkey/gnosis-pay-rewards-sdk';

export type WeekCashbackRewardDocumentFieldsType = {
  _id: `${typeof weekDataIdFormat}/${Address}`; // e.g. 2024-03-01/0x123456789abcdef123456789abcdef123456789ab
  address: Address;
  week: typeof weekDataIdFormat;
  amount: number;
  /**
   * The raw GNO balance of the user at the end of the week
   */
  gnoBalanceRaw: string;
  /**
   * The lowest GNO balance of the user at the end of the week
   */
  gnoBalance: number;
  /**
   * The net USD volume of the user at the end of the week, refunds will reduce this number
   */
  netUsdVolume: number;
};

const weekCashbackRewardSchema = new Schema<WeekCashbackRewardDocumentFieldsType>({
  address: { type: String, required: true },
  week: {
    type: String,
    required: true,
  },
  amount: { type: Number, required: true },
  netUsdVolume: { type: Number, required: true },
});

export const modelName = 'WeekCashbackReward' as const;


/**
 * @param week - e.g. 2024-03-01
 * @param address - e.g. 0x123456789abcdef123456789abcdef123456789ab
 * @returns
 */
export function toDocumentId(week: typeof weekDataIdFormat, address: Address) {
  return `${week}/${address}`;
}

export function getWeekCashbackRewardModel(mongooseConnection: Mongoose) {
  // Return cached model if it exists
  if (mongooseConnection.models[modelName]) {
    return mongooseConnection.models[modelName] as Model<WeekCashbackRewardDocumentFieldsType>;
  }

  return mongooseConnection.model(modelName, weekCashbackRewardSchema);
}

export async function getOrCreateWeekCashbackRewardDocument({ week, address, weekCashbackRewardModel }: {
  address: Address;
  week: typeof weekDataIdFormat;
  weekCashbackRewardModel: Model<WeekCashbackRewardDocumentFieldsType>;
}) {
  const documentId = toDocumentId(week, address);

  const weekCashbackRewardDocument = await weekCashbackRewardModel.findById(documentId);
  if (weekCashbackRewardDocument === null) {
    return new weekCashbackRewardModel({ _id: documentId, address, week, amount: 0, netUsdVolume: 0 });
  }
  return weekCashbackRewardDocument;
}