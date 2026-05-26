import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { format } from '../../utils/money.util';

export interface MoneyObject {
  amount: number;
  currency: string;
  formatted: string;
}

@Scalar('Money', () => Object)
export class MoneyScalar implements CustomScalar<MoneyObject, MoneyObject> {
  description =
    'Money scalar: { amount: integer cents, currency: string, formatted: string }';

  parseValue(value: unknown): MoneyObject {
    const v = value as MoneyObject;
    return {
      amount: v.amount,
      currency: v.currency,
      formatted: format(v.amount, v.currency),
    };
  }

  serialize(value: unknown): MoneyObject {
    const v = value as { amount: number; currency: string };
    return {
      amount: v.amount,
      currency: v.currency,
      formatted: format(v.amount, v.currency),
    };
  }

  parseLiteral(ast: ValueNode): MoneyObject {
    if (ast.kind !== Kind.OBJECT) {
      throw new Error('Money must be an object');
    }
    const obj = ast.fields.reduce<Record<string, string | number>>(
      (acc, field) => {
        const val = field.value;
        if (val.kind === Kind.INT || val.kind === Kind.FLOAT) {
          acc[field.name.value] = Number(val.value);
        } else if (val.kind === Kind.STRING) {
          acc[field.name.value] = val.value;
        }
        return acc;
      },
      {},
    );
    return this.parseValue(obj);
  }
}
