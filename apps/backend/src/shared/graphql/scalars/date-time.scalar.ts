import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('DateTime', () => Date)
export class DateTimeScalar implements CustomScalar<string, Date> {
  description = 'DateTime scalar — ISO 8601 string';

  parseValue(value: unknown): Date {
    return new Date(value as string);
  }

  serialize(value: unknown): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value as string).toISOString();
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error('DateTime must be a string');
  }
}
