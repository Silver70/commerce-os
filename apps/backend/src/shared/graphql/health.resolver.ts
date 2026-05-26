import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
  @Query(() => Boolean)
  _health(): boolean {
    return true;
  }
}
